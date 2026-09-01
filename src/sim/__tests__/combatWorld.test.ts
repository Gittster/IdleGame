import { describe, it, expect } from 'vitest';
import { CombatWorld } from '../core/combatWorld';
import type { InputFrame } from '../core/types';
import { DUMMY } from '../../data/monsters';
import { PLAYER_TUNING, WORLD_TUNING } from '../core/tuning';

function noInput(): InputFrame {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, firing: false, dashRequested: false };
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

  it('dash briefly grants a large speed boost then returns to normal movement', () => {
    const world = new CombatWorld();
    const startX = world.player.x;
    world.step(1 / 60, { ...noInput(), dashRequested: true }, DUMMY);
    expect(Math.abs(world.player.vx)).toBeGreaterThan(PLAYER_TUNING.maxSpeed);
    expect(world.player.x).not.toBe(startX);
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
