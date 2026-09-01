import { describe, it, expect } from 'vitest';
import { ProjectilePool } from '../core/projectilePool';
import { Team } from '../core/types';

function spawnAt(pool: ProjectilePool, x: number, life = 1): number {
  return pool.spawn({ x, y: 0, vx: 10, vy: 0, radius: 4, damage: 1, life, team: Team.Player, pierce: 0, tint: 0xffffff });
}

describe('ProjectilePool', () => {
  it('spawns increment count and store the given values', () => {
    const pool = new ProjectilePool(4);
    const idx = spawnAt(pool, 1);
    expect(pool.count).toBe(1);
    expect(pool.x[idx]).toBe(1);
  });

  it('refuses to spawn beyond capacity and tracks drops', () => {
    const pool = new ProjectilePool(2);
    spawnAt(pool, 0);
    spawnAt(pool, 1);
    const result = spawnAt(pool, 2);
    expect(result).toBe(-1);
    expect(pool.count).toBe(2);
    expect(pool.droppedSpawns).toBe(1);
  });

  it('integrates position by velocity * dt', () => {
    const pool = new ProjectilePool(4);
    spawnAt(pool, 0);
    pool.integrate(0.5);
    expect(pool.x[0]).toBeCloseTo(5); // vx=10 * dt=0.5
  });

  it('expires projectiles whose life has run out', () => {
    const pool = new ProjectilePool(4);
    spawnAt(pool, 0, 0.1);
    pool.integrate(0.2);
    expect(pool.count).toBe(0);
  });

  it('swap-removes without corrupting the remaining alive entries', () => {
    const pool = new ProjectilePool(8);
    spawnAt(pool, 100, 10);
    spawnAt(pool, 200, 10);
    spawnAt(pool, 300, 10);
    // Remove the middle one; the last one should now live at index 1.
    pool.removeAt(1);
    expect(pool.count).toBe(2);
    expect(pool.x[0]).toBe(100);
    expect(pool.x[1]).toBe(300);
  });

  it('clear() resets count to zero without affecting future spawns', () => {
    const pool = new ProjectilePool(4);
    spawnAt(pool, 0);
    spawnAt(pool, 1);
    pool.clear();
    expect(pool.count).toBe(0);
    const idx = spawnAt(pool, 99);
    expect(idx).toBe(0);
    expect(pool.x[0]).toBe(99);
  });

  it('holds thousands of live projectiles without dropping any', () => {
    const capacity = 4096;
    const pool = new ProjectilePool(capacity);
    for (let i = 0; i < capacity; i++) spawnAt(pool, i, 100);
    expect(pool.count).toBe(capacity);
    expect(pool.droppedSpawns).toBe(0);
    pool.integrate(1 / 60);
    expect(pool.count).toBe(capacity);
  });
});
