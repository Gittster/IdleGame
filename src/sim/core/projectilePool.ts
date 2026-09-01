import { Team } from './types';

/**
 * Structure-of-arrays projectile pool, fixed capacity, zero per-frame
 * allocation. This is what lets combat "scale to lots of projectiles":
 * spawning is an array write, death is a swap-with-last removal, and the
 * whole pool is a handful of contiguous typed-array scans per tick instead
 * of thousands of individual GameObjects/GC churn.
 *
 * Alive projectiles always occupy the dense range [0, count). There are no
 * stable ids across frames — nothing needs to reference a specific
 * projectile beyond the tick it hits or expires on.
 */
export class ProjectilePool {
  readonly capacity: number;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly prevX: Float32Array;
  readonly prevY: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly radius: Float32Array;
  readonly damage: Float32Array;
  readonly life: Float32Array;
  readonly team: Uint8Array;
  readonly pierce: Int16Array;
  /** Render-only hint (a 0xRRGGBB color), so the sim stays the single
   *  source of truth for "what does this projectile look like" instead of
   *  the renderer guessing from team/radius. */
  readonly tint: Uint32Array;

  count = 0;
  /** Incremented whenever a spawn is dropped because the pool is full. */
  droppedSpawns = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.prevX = new Float32Array(capacity);
    this.prevY = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.radius = new Float32Array(capacity);
    this.damage = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.team = new Uint8Array(capacity);
    this.pierce = new Int16Array(capacity);
    this.tint = new Uint32Array(capacity);
  }

  spawn(params: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    damage: number;
    life: number;
    team: Team;
    pierce: number;
    tint: number;
  }): number {
    if (this.count >= this.capacity) {
      this.droppedSpawns++;
      return -1;
    }
    const i = this.count++;
    this.x[i] = params.x;
    this.y[i] = params.y;
    this.prevX[i] = params.x;
    this.prevY[i] = params.y;
    this.vx[i] = params.vx;
    this.vy[i] = params.vy;
    this.radius[i] = params.radius;
    this.damage[i] = params.damage;
    this.life[i] = params.life;
    this.team[i] = params.team;
    this.pierce[i] = params.pierce;
    this.tint[i] = params.tint;
    return i;
  }

  /** Swap-remove: index `i` is replaced by the current last alive entry. */
  removeAt(i: number): void {
    const last = this.count - 1;
    if (i !== last) {
      this.x[i] = this.x[last]!;
      this.y[i] = this.y[last]!;
      this.prevX[i] = this.prevX[last]!;
      this.prevY[i] = this.prevY[last]!;
      this.vx[i] = this.vx[last]!;
      this.vy[i] = this.vy[last]!;
      this.radius[i] = this.radius[last]!;
      this.damage[i] = this.damage[last]!;
      this.life[i] = this.life[last]!;
      this.team[i] = this.team[last]!;
      this.pierce[i] = this.pierce[last]!;
      this.tint[i] = this.tint[last]!;
    }
    this.count--;
  }

  /** Integrates motion and expires stale projectiles. Returns nothing —
   *  hit resolution against enemies happens in the world, which needs to
   *  read prevX/prevY (pre-integration) to do swept collision. */
  integrate(dt: number): void {
    for (let i = 0; i < this.count; i++) {
      this.prevX[i] = this.x[i]!;
      this.prevY[i] = this.y[i]!;
      this.x[i]! += this.vx[i]! * dt;
      this.y[i]! += this.vy[i]! * dt;
      this.life[i]! -= dt;
    }
    // Sweep dead-by-lifetime projectiles out, iterating backwards so
    // swap-removal never skips an entry that was just moved into place.
    for (let i = this.count - 1; i >= 0; i--) {
      if (this.life[i]! <= 0) this.removeAt(i);
    }
  }

  clear(): void {
    this.count = 0;
  }
}
