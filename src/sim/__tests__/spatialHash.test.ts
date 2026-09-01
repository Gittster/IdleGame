import { describe, it, expect } from 'vitest';
import { SpatialHash } from '../core/spatialHash';

describe('SpatialHash', () => {
  it('finds ids inserted in the same and adjacent cells', () => {
    const hash = new SpatialHash(100);
    hash.insert(1, 10, 10);
    hash.insert(2, 150, 10); // adjacent cell
    hash.insert(3, 5000, 5000); // far away, different neighborhood

    const out: number[] = [];
    hash.queryNeighbors(20, 20, out);

    expect(out).toContain(1);
    expect(out).toContain(2);
    expect(out).not.toContain(3);
  });

  it('returns nothing for an empty grid', () => {
    const hash = new SpatialHash(100);
    const out: number[] = [];
    hash.queryNeighbors(0, 0, out);
    expect(out).toHaveLength(0);
  });

  it('clear() removes previously inserted entries', () => {
    const hash = new SpatialHash(100);
    hash.insert(1, 0, 0);
    hash.clear();
    const out: number[] = [];
    hash.queryNeighbors(0, 0, out);
    expect(out).toHaveLength(0);
  });

  it('handles negative coordinates correctly', () => {
    const hash = new SpatialHash(100);
    hash.insert(1, -10, -10);
    const out: number[] = [];
    hash.queryNeighbors(-20, -20, out);
    expect(out).toContain(1);
  });
});
