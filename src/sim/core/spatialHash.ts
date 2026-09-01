/**
 * Uniform-grid spatial hash used to broadphase "which enemies are near this
 * projectile" without an O(projectiles * enemies) scan. Rebuilt every tick
 * from scratch (cheap: enemy counts are small relative to projectile counts,
 * and a rebuild avoids any stale-bucket bookkeeping).
 */
export class SpatialHash {
  private readonly cellSize: number;
  private readonly buckets = new Map<number, number[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): number {
    // Pack two 20-bit-ish signed cell coords into one number key.
    return cx * 100000 + cy;
  }

  private cellOf(x: number, y: number): [number, number] {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
  }

  clear(): void {
    this.buckets.clear();
  }

  insert(id: number, x: number, y: number): void {
    const [cx, cy] = this.cellOf(x, y);
    const k = this.key(cx, cy);
    let bucket = this.buckets.get(k);
    if (!bucket) {
      bucket = [];
      this.buckets.set(k, bucket);
    }
    bucket.push(id);
  }

  /**
   * Returns ids in the 3x3 cell neighborhood around (x, y), covering any
   * query radius up to `cellSize` without missing cross-cell overlaps.
   */
  queryNeighbors(x: number, y: number, out: number[]): void {
    out.length = 0;
    const [cx, cy] = this.cellOf(x, y);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = this.buckets.get(this.key(cx + dx, cy + dy));
        if (bucket) {
          for (const id of bucket) out.push(id);
        }
      }
    }
  }
}
