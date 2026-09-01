import { describe, it, expect } from 'vitest';
import { CombatWorld } from '../core/combatWorld';
import type { InputFrame } from '../core/types';
import { DUMMY } from '../../data/monsters';
import type { MonsterDef } from '../../data/monsters';
import { POWER_BOLT } from '../../data/skills';
import { UPGRADES } from '../../data/upgrades';
import { PLAYER_TUNING, WORLD_TUNING, BASIC_ATTACK_TUNING } from '../core/tuning';
import type { ZoneDef } from '../../data/zones';
import { PlayerProgress } from '../core/playerProgress';

function noInput(): InputFrame {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, firing: false, skillCasts: [] };
}

/** A small, deterministic zone for tests that care about bounds/obstacles/
 *  kill-counter behavior specifically, rather than the real production zone. */
function makeZone(overrides: Partial<ZoneDef> = {}): ZoneDef {
  return {
    id: 'test-zone',
    name: 'Test Zone',
    bounds: { centerX: 0, centerY: 0, radiusX: 100, radiusY: 80 },
    playerSpawn: { x: 0, y: 0 },
    obstacles: [],
    monster: DUMMY,
    maxAlive: 4,
    killsToClear: 3,
    nextZoneId: null,
    groundColor: 0xffffff,
    outlineColor: 0x000000,
    ...overrides,
  };
}

/** A guaranteed-drop monster fixture — the real monsters' drop chances
 *  are <100%, which would make loot tests flaky. */
function makeLootMonster(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    ...DUMMY,
    goldDrop: { min: 5, max: 5 },
    lootTable: [{ itemId: 'crab-shell', chance: 1, min: 2, max: 2 }],
    ...overrides,
  };
}

describe('CombatWorld', () => {
  it('accelerates the player toward max speed while a move key is held', () => {
    const world = new CombatWorld();
    const startX = world.player.x;
    for (let i = 0; i < 30; i++) {
      world.step(1 / 60, { ...noInput(), moveX: 1, moveY: 0 });
    }
    expect(world.player.x).toBeGreaterThan(startX);
    expect(world.player.vx).toBeGreaterThan(0);
    expect(world.player.vx).toBeLessThanOrEqual(PLAYER_TUNING.maxSpeed + 1e-6);
  });

  it('decelerates back to a stop once input is released', () => {
    const world = new CombatWorld();
    for (let i = 0; i < 30; i++) world.step(1 / 60, { ...noInput(), moveX: 1 });
    for (let i = 0; i < 60; i++) world.step(1 / 60, noInput());
    expect(Math.abs(world.player.vx)).toBeLessThan(1);
  });

  it('fires a projectile toward the aim direction on request', () => {
    const world = new CombatWorld();
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true });
    expect(world.projectiles.count).toBe(1);
    expect(world.projectiles.vx[0]).toBeGreaterThan(0);
  });

  it('spawns the basic attack exactly at the player center, not offset toward the aim', () => {
    const world = new CombatWorld();
    const { x: px, y: py } = world.player;
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true });
    // prevX/prevY hold the spawn position from before this tick's
    // integrate() advanced it — x/y have already moved by one tick.
    expect(world.projectiles.prevX[0]).toBe(px);
    expect(world.projectiles.prevY[0]).toBe(py);
  });

  it('respects the attack cooldown between shots', () => {
    const world = new CombatWorld();
    world.step(1 / 60, { ...noInput(), firing: true });
    world.step(1 / 60, { ...noInput(), firing: true });
    expect(world.projectiles.count).toBe(1);
  });

  it('deals damage and removes an enemy that drops to zero hp', () => {
    const world = new CombatWorld();
    const enemy = world.spawnEnemy(DUMMY, world.player.x + 40, world.player.y);
    enemy.hp = 1;
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true });
    // Let the projectile travel to the enemy.
    for (let i = 0; i < 10 && world.enemies.length > 0; i++) {
      world.step(1 / 60, noInput());
    }
    expect(world.enemies).toHaveLength(0);
    expect(world.events.enemyDied.length + world.events.hits.length).toBeGreaterThan(0);
  });

  it('casts a skill toward the tapped target on request', () => {
    const world = new CombatWorld();
    const { x: px, y: py } = world.player;
    const target = { x: px + 100, y: py };
    world.step(1 / 60, { ...noInput(), skillCasts: [{ skillId: POWER_BOLT.id, targetX: target.x, targetY: target.y }] });
    expect(world.projectiles.count).toBe(1);
    expect(world.projectiles.vx[0]).toBeGreaterThan(0);
    expect(world.projectiles.damage[0]).toBe(POWER_BOLT.damage);
    expect(world.player.skillCooldowns[POWER_BOLT.id]).toBe(POWER_BOLT.cooldown);
    // Spawns at the player's exact center, same as the basic attack.
    expect(world.projectiles.prevX[0]).toBe(px);
    expect(world.projectiles.prevY[0]).toBe(py);
  });

  it('drops a skill cast request while the skill is on cooldown', () => {
    const world = new CombatWorld();
    const cast = { skillId: POWER_BOLT.id, targetX: world.player.x + 100, targetY: world.player.y };
    world.step(1 / 60, { ...noInput(), skillCasts: [cast] });
    world.step(1 / 60, { ...noInput(), skillCasts: [cast] });
    expect(world.projectiles.count).toBe(1);
  });

  it('spawns enemy projectiles exactly at the enemy center', () => {
    const world = new CombatWorld();
    const enemy = world.spawnEnemy(DUMMY, world.player.x + 200, world.player.y);
    enemy.fireCooldown = 0;
    world.step(1 / 60, noInput());
    const enemyShotIndex = world.projectiles.count - 1;
    expect(world.projectiles.prevX[enemyShotIndex]).toBe(enemy.x);
    expect(world.projectiles.prevY[enemyShotIndex]).toBe(enemy.y);
  });

  it('ignores a cast request for an unknown skill id', () => {
    const world = new CombatWorld();
    world.step(1 / 60, { ...noInput(), skillCasts: [{ skillId: 'not_a_skill', targetX: 0, targetY: 0 }] });
    expect(world.projectiles.count).toBe(0);
  });

  it('keeps the player within the zone\'s elliptical bounds', () => {
    const zone = makeZone();
    const world = new CombatWorld(zone);
    for (let i = 0; i < 500; i++) {
      world.step(1 / 60, { ...noInput(), moveX: -1, moveY: -1 });
    }
    const { centerX, centerY, radiusX, radiusY } = zone.bounds;
    const r = PLAYER_TUNING.radius;
    const dx = (world.player.x - centerX) / (radiusX - r);
    const dy = (world.player.y - centerY) / (radiusY - r);
    expect(dx * dx + dy * dy).toBeLessThanOrEqual(1 + 1e-6);
  });

  it('never exceeds pool capacity even under sustained fire', () => {
    const world = new CombatWorld();
    for (let i = 0; i < 2000; i++) {
      world.step(1 / 60, { ...noInput(), firing: true, aimX: Math.random(), aimY: Math.random() });
    }
    expect(world.projectiles.count).toBeLessThanOrEqual(WORLD_TUNING.projectileCapacity);
  });

  it('blocks player movement into a static obstacle', () => {
    const zone = makeZone({ obstacles: [{ x: 40, y: 0, radius: 20 }], playerSpawn: { x: 0, y: 0 } });
    const world = new CombatWorld(zone);
    for (let i = 0; i < 120; i++) {
      world.step(1 / 60, { ...noInput(), moveX: 1, moveY: 0 });
    }
    const dist = Math.hypot(world.player.x - 40, world.player.y);
    expect(dist).toBeGreaterThanOrEqual(20 + PLAYER_TUNING.radius - 1e-6);
  });

  it('destroys a projectile that hits a static obstacle instead of passing through', () => {
    const zone = makeZone({ obstacles: [{ x: 50, y: 0, radius: 15 }], playerSpawn: { x: 0, y: 0 } });
    const world = new CombatWorld(zone);
    const enemy = world.spawnEnemy(DUMMY, 100, 0); // directly behind the obstacle
    enemy.hp = 1;
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true });
    for (let i = 0; i < 10; i++) world.step(1 / 60, noInput());
    expect(world.enemies).toHaveLength(1);
    expect(world.enemies[0]!.hp).toBe(1);
    expect(world.projectiles.count).toBe(0);
  });

  it('canSpawnMore respects maxAlive and stops once the zone is cleared', () => {
    const zone = makeZone({ maxAlive: 2, killsToClear: 1 });
    const world = new CombatWorld(zone);
    expect(world.canSpawnMore()).toBe(true);
    world.spawnEnemy(DUMMY, 10, 0);
    world.spawnEnemy(DUMMY, 20, 0);
    expect(world.canSpawnMore()).toBe(false);
  });

  it('flags zoneCleared exactly on the tick the kill quota reaches zero', () => {
    const zone = makeZone({ killsToClear: 1 });
    const world = new CombatWorld(zone);
    const enemy = world.spawnEnemy(DUMMY, 30, 0);
    enemy.hp = 1;

    // Spawning and hitting can both happen within the same fixed step
    // (a fast projectile can integrate far enough to hit on the tick it's
    // fired), so the event has to be checked after every step from the
    // very first one, not just in a follow-up loop.
    let sawZoneCleared = false;
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true });
    sawZoneCleared ||= world.events.zoneCleared;
    for (let i = 0; i < 10 && !sawZoneCleared; i++) {
      world.step(1 / 60, noInput());
      sawZoneCleared ||= world.events.zoneCleared;
    }
    expect(sawZoneCleared).toBe(true);
    expect(world.killsRemaining).toBe(0);
    expect(world.isZoneCleared).toBe(true);
    expect(world.canSpawnMore()).toBe(false);
  });

  it("loadZone resets enemies, projectiles, and the kill counter, and repositions/heals the player", () => {
    const zoneA = makeZone({ killsToClear: 5, playerSpawn: { x: 0, y: 0 } });
    const zoneB = makeZone({ id: 'zone-b', killsToClear: 8, playerSpawn: { x: 500, y: 500 } });
    const world = new CombatWorld(zoneA);
    world.spawnEnemy(DUMMY, 10, 10);
    world.player.hp = 1;
    world.step(1 / 60, { ...noInput(), firing: true });

    world.loadZone(zoneB);

    expect(world.currentZone).toBe(zoneB);
    expect(world.killsRemaining).toBe(8);
    expect(world.enemies).toHaveLength(0);
    expect(world.projectiles.count).toBe(0);
    expect(world.player.x).toBe(500);
    expect(world.player.y).toBe(500);
    expect(world.player.hp).toBe(world.player.maxHp);
  });

  it('drops gold and loot-table items on a kill, added to progress once the player walks over them', () => {
    const zone = makeZone({ monster: makeLootMonster(), playerSpawn: { x: 0, y: 0 } });
    const world = new CombatWorld(zone);
    const enemy = world.spawnEnemy(zone.monster, 70, 0);
    enemy.hp = 1;

    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true });
    for (let i = 0; i < 10 && world.enemies.length > 0; i++) world.step(1 / 60, noInput());

    // The kill spot is well outside pickup range of the still-stationary player.
    expect(world.groundDrops.length).toBeGreaterThan(0);
    expect(world.progress.gold).toBe(0);

    for (let i = 0; i < 60 && world.groundDrops.length > 0; i++) {
      world.step(1 / 60, { ...noInput(), moveX: 1, moveY: 0 });
    }

    expect(world.groundDrops).toHaveLength(0);
    expect(world.progress.gold).toBe(5);
    expect(world.progress.inventory.slots.some((s) => s?.itemId === 'crab-shell' && s.qty === 2)).toBe(true);
  });

  it('leaves an item drop on the ground (with its remaining qty) when the inventory has no room for it', () => {
    const monster = makeLootMonster({ goldDrop: { min: 0, max: 0 } });
    const zone = makeZone({ monster, playerSpawn: { x: 0, y: 0 } });
    const progress = new PlayerProgress(zone.id, 1);
    progress.inventory.addItem('ash-cinder', 1, 20); // fills the only slot with a different item
    const world = new CombatWorld(zone, progress);
    const enemy = world.spawnEnemy(zone.monster, 70, 0);
    enemy.hp = 1;

    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true });
    for (let i = 0; i < 10 && world.enemies.length > 0; i++) world.step(1 / 60, noInput());
    for (let i = 0; i < 60; i++) world.step(1 / 60, { ...noInput(), moveX: 1, moveY: 0 });

    expect(world.groundDrops.some((d) => d.kind === 'item' && d.itemId === 'crab-shell')).toBe(true);
    expect(progress.inventory.slots.every((s) => s?.itemId !== 'crab-shell')).toBe(true);
  });

  it('Auto-Targeting fires automatically at the nearest enemy with no aim/fire input, at half the normal fire rate', () => {
    const world = new CombatWorld();
    world.progress.unlockedUpgrades.add(UPGRADES['auto-targeting']!.id);
    world.progress.autoTargetEnabled = true;
    world.spawnEnemy(DUMMY, world.player.x + 60, world.player.y);

    world.step(1 / 60, noInput());

    expect(world.projectiles.count).toBe(1);
    expect(world.projectiles.vx[0]).toBeGreaterThan(0); // fired toward the enemy, unaimed
    expect(world.player.attackCooldown).toBeCloseTo(BASIC_ATTACK_TUNING.cooldown * 2, 5);
  });

  it('Auto-Targeting does nothing while no enemy is in the zone', () => {
    const world = new CombatWorld();
    world.progress.unlockedUpgrades.add(UPGRADES['auto-targeting']!.id);
    world.progress.autoTargetEnabled = true;

    world.step(1 / 60, noInput());

    expect(world.projectiles.count).toBe(0);
  });

  it('Empowered Bolt increases Power Bolt damage by its multiplier', () => {
    const world = new CombatWorld();
    world.progress.unlockedUpgrades.add(UPGRADES['empowered-bolt']!.id);
    const target = { x: world.player.x + 100, y: world.player.y };

    world.step(1 / 60, { ...noInput(), skillCasts: [{ skillId: POWER_BOLT.id, targetX: target.x, targetY: target.y }] });

    expect(world.projectiles.damage[0]).toBe(POWER_BOLT.damage * 1.5);
  });

  it("Traveler's Charm grants +15 max HP, applied when a CombatWorld is constructed", () => {
    const zone = makeZone();
    const progress = new PlayerProgress(zone.id);
    progress.unlockedUpgrades.add(UPGRADES['travelers-charm']!.id);

    const world = new CombatWorld(zone, progress);

    expect(world.player.maxHp).toBe(PLAYER_TUNING.maxHp + 15);
    expect(world.player.hp).toBe(world.player.maxHp);
  });
});
