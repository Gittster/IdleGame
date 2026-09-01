import Phaser from 'phaser';
import type { ProjectilePool } from '../../sim/core/projectilePool';

/**
 * Renders the entire projectile pool through a single Blitter — Phaser's
 * "many identical sprites, minimal per-instance overhead" primitive. Bobs
 * are pre-allocated once up to pool capacity and never created/destroyed
 * at runtime; each render frame just repositions/toggles the ones needed,
 * which is what keeps this cheap even with thousands of live projectiles.
 */
export class ProjectileRenderer {
  private readonly blitter: Phaser.GameObjects.Blitter;
  private readonly bobs: Phaser.GameObjects.Bob[] = [];

  constructor(scene: Phaser.Scene, textureKey: string, capacity: number) {
    this.blitter = scene.add.blitter(0, 0, textureKey);
    for (let i = 0; i < capacity; i++) {
      const bob = this.blitter.create(0, 0);
      bob.visible = false;
      this.bobs.push(bob);
    }
  }

  /** `alpha` is the interpolation factor within the current render frame,
   *  in [0,1], between the previous and current fixed-step sim state. */
  sync(pool: ProjectilePool, alpha: number): void {
    const n = this.bobs.length;
    for (let i = 0; i < n; i++) {
      const bob = this.bobs[i]!;
      if (i >= pool.count) {
        if (bob.visible) bob.visible = false;
        continue;
      }
      bob.visible = true;
      bob.x = lerp(pool.prevX[i]!, pool.x[i]!, alpha);
      bob.y = lerp(pool.prevY[i]!, pool.y[i]!, alpha);
      bob.tint = pool.tint[i]!;
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
