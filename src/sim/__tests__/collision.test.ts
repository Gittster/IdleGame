import { describe, it, expect } from 'vitest';
import { sweptCircleHitsCircle, circleOverlaps, closestPointParamOnSegment } from '../core/collision';

describe('closestPointParamOnSegment', () => {
  it('clamps to the segment endpoints', () => {
    expect(closestPointParamOnSegment(0, 0, 10, 0, -5, 0)).toBe(0);
    expect(closestPointParamOnSegment(0, 0, 10, 0, 15, 0)).toBe(1);
    expect(closestPointParamOnSegment(0, 0, 10, 0, 5, 5)).toBeCloseTo(0.5);
  });
});

describe('sweptCircleHitsCircle', () => {
  it('detects a direct hit when travelling straight through a target', () => {
    const hit = sweptCircleHitsCircle(0, 0, 100, 0, 5, 50, 0, 10);
    expect(hit).toBe(true);
  });

  it('misses a target far off the travel line', () => {
    const hit = sweptCircleHitsCircle(0, 0, 100, 0, 5, 50, 200, 10);
    expect(hit).toBe(false);
  });

  it('catches a fast-moving projectile that would tunnel through a same-frame point check', () => {
    // A projectile moving 400px in one tick, target sitting at x=200 with a
    // small radius: a naive "is the new position inside the circle" check
    // would miss this because the new position (400,0) is well past the
    // target, but the swept segment clearly passes through it.
    const hit = sweptCircleHitsCircle(0, 0, 400, 0, 3, 200, 0, 8);
    expect(hit).toBe(true);
  });

  it('respects the combined radius as a miss margin', () => {
    // Perpendicular distance is exactly on the boundary of the combined radius.
    const onEdge = sweptCircleHitsCircle(0, 0, 100, 0, 5, 50, 15, 10);
    expect(onEdge).toBe(true);
    const justOutside = sweptCircleHitsCircle(0, 0, 100, 0, 5, 50, 15.1, 10);
    expect(justOutside).toBe(false);
  });
});

describe('circleOverlaps', () => {
  it('detects overlap and non-overlap', () => {
    expect(circleOverlaps(0, 0, 5, 8, 0, 5)).toBe(true);
    expect(circleOverlaps(0, 0, 5, 11, 0, 5)).toBe(false);
  });
});
