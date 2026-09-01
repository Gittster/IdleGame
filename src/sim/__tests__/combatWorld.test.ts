import { describe, it, expect } from 'vitest';
import { CombatWorld } from '../core/combatWorld';
import type { InputFrame } from '../core/types';
import { DUMMY } from '../../data/monsters';
import { POWER_BOLT } from '../../data/skills';
import { PLAYER_TUNING, WORLD_TUNING } from '../core/tuning';

function noInput(): InputFrame {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, firing: false, skillCasts: [] };
}

describe('CombatWorld', () => {
  it('accelerates the player toward max speed while a move key is held', () => {
    const world = new CombatWorld();
    const startX = world.player.x;
    for (let i = 0; i < 30; i++) {
      world.step(1 / 60, { ...noInput(), moveX: 1, moveY: 0 }, DUMMY);
    }
    expect(world.player.x).toBeGreaterThan(startX);
    expect(world.player.vx).toBeGreaterThan(0);
    expect(world.player.vx).toBeLessThanOrEqual(PLAYER_TUNING.maxSpeed + 1e-6);
  });

  it('decelerates back to a stop once input is released', () => {
    const world = new CombatWorld();
    for (let i = 0; i < 30; i++) world.step(1 / 60, { ...noInput(), moveX: 1 }, DUMMY);
    for (let i = 0; i < 60; i++) world.step(1 / 60, noInput(), DUMMY);
    expect(Math.abs(world.player.vx)).toBeLessThan(1);
  });

  it('fires a projectile toward the aim direction on request', () => {
    const world = new CombatWorld();
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true }, DUMMY);
    expect(world.projectiles.count).toBe(1);
    expect(world.projectiles.vx[0]).toBeGreaterThan(0);
  });

  it('spawns the basic attack exactly at the player center, not offset toward the aim', () => {
    const world = new CombatWorld();
    const { x: px, y: py } = world.player;
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true }, DUMMY);
    // prevX/prevY hold the spawn position from before this tick's
    // integrate() advanced it — x/y have already moved by one tick.
    expect(world.projectiles.prevX[0]).toBe(px);
    expect(world.projectiles.prevY[0]).toBe(py);
  });

  it('respects the attack cooldown between shots', () => {
    const world = new CombatWorld();
    world.step(1 / 60, { ...noInput(), firing: true }, DUMMY);
    world.step(1 / 60, { ...noInput(), firing: true }, DUMMY);
    expect(world.projectiles.count).toBe(1);
  });

  it('deals damage and removes an enemy that drops to zero hp', () => {
    const world = new CombatWorld();
    const enemy = world.spawnEnemy(DUMMY, world.player.x + 40, world.player.y);
    enemy.hp = 1;
    world.step(1 / 60, { ...noInput(), aimX: 1, aimY: 0, firing: true }, DUMMY);
    // Let the projectile travel to the enemy.
    for (let i = 0; i < 10 && world.enemies.length > 0; i++) {
      world.step(1 / 60, noInput(), DUMMY);
    }
    expect(world.enemies).toHaveLength(0);
    expect(world.events.enemyDied.length + world.events.hits.length).toBeGreaterThan(0);
  });

  it('casts a skill toward the tapped target on request', () => {
    const world = new CombatWorld();
    const { x: px, y: py } = world.player;
    const target = { x: px + 100, y: py };
    world.step(1 / 60, { ...noInput(), skillCasts: [{ skillId: POWER_BOLT.id, targetX: target.x, targetY: target.y }] }, DUMMY);
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
    world.step(1 / 60, { ...noInput(), skillCasts: [cast] }, DUMMY);
    world.step(1 / 60, { ...noInput(), skillCasts: [cast] }, DUMMY);
    expect(world.projectiles.count).toBe(1);
  });

  it('spawns enemy projectiles exactly at the enemy center', () => {
    const world = new CombatWorld();
    const enemy = world.spawnEnemy(DUMMY, world.player.x + 200, world.player.y);
    enemy.fireCooldown = 0;
    world.step(1 / 60, noInput(), DUMMY);
    const enemyShotIndex = world.projectiles.count - 1;
    expect(world.projectiles.prevX[enemyShotIndex]).toBe(enemy.x);
    expect(world.projectiles.prevY[enemyShotIndex]).toBe(enemy.y);
  });

  it('ignores a cast request for an unknown skill id', () => {
    const world = new CombatWorld();
    world.step(1 / 60, { ...noInput(), skillCasts: [{ skillId: 'not_a_skill', targetX: 0, targetY: 0 }] }, DUMMY);
    expect(world.projectiles.count).toBe(0);
  });

  it('keeps the player within arena bounds', () => {
    const world = new CombatWorld();
    for (let i = 0; i < 500; i++) {
      world.step(1 / 60, { ...noInput(), moveX: -1, moveY: -1 }, DUMMY);
    }
    expect(world.player.x).toBeGreaterThanOrEqual(PLAYER_TUNING.radius - 1e-6);
    expect(world.player.y).toBeGreaterThanOrEqual(PLAYER_TUNING.radius - 1e-6);
  });

  it('never exceeds pool capacity even under sustained fire', () => {
    const world = new CombatWorld();
    for (let i = 0; i < 2000; i++) {
      world.step(1 / 60, { ...noInput(), firing: true, aimX: Math.random(), aimY: Math.random() }, DUMMY);
    }
    expect(world.projectiles.count).toBeLessThanOrEqual(WORLD_TUNING.projectileCapacity);
  });
});
