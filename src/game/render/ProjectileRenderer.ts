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
  /** Blitter draws each Bob's frame top-left-anchored at (bob.x, bob.y) —
   *  there's no origin/pivot concept like a Sprite has. Left uncorrected,
   *  every projectile renders half a texture-width/height away from its
   *  true simulated position, which is exactly the kind of thing that
   *  makes a hit that looks like it grazed an enemy actually miss (the
   *  visible dot and the real hitbox aren't in the same place). Subtract
   *  this offset so bob.x/y line up with the sim's true x/y. */
  private readonly halfW: number;
  private readonly halfH: number;

  constructor(scene: Phaser.Scene, textureKey: string, capacity: number) {
    this.blitter = scene.add.blitter(0, 0, textureKey);
    const frame = scene.textures.get(textureKey).get();
    this.halfW = frame.width / 2;
    this.halfH = frame.height / 2;
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
      bob.x = lerp(pool.prevX[i]!, pool.x[i]!, alpha) - this.halfW;
      bob.y = lerp(pool.prevY[i]!, pool.y[i]!, alpha) - this.halfH;
      bob.tint = pool.tint[i]!;
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
