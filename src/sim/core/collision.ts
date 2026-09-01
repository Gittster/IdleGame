/**
 * Pure collision math. Kept dependency-free and unit-testable.
 *
 * Fast projectiles can travel further in one tick than their own radius,
 * so a same-frame point-in-circle test at the new position would let them
 * tunnel through thin hitboxes. Instead we test the swept segment from the
 * projectile's previous position to its new position against the target's
 * circle — this is what keeps hitboxes "tight" (matched to visual radius)
 * without needing sub-stepping.
 */

/** Closest point on segment AB to point P, returned as a param t in [0,1]. */
export function closestPointParamOnSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 1e-9) return 0;
  const t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

/**
 * Swept test: does a circle of radius `movingRadius` traveling in a straight
 * line from (ax,ay) to (bx,by) ever overlap the stationary circle centered
 * at (cx,cy) with radius `targetRadius`?
 */
export function sweptCircleHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  movingRadius: number,
  cx: number,
  cy: number,
  targetRadius: number
): boolean {
  const t = closestPointParamOnSegment(ax, ay, bx, by, cx, cy);
  const closestX = ax + (bx - ax) * t;
  const closestY = ay + (by - ay) * t;
  const dx = closestX - cx;
  const dy = closestY - cy;
  const rSum = movingRadius + targetRadius;
  return dx * dx + dy * dy <= rSum * rSum;
}

export function circleOverlaps(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const rSum = ar + br;
  return dx * dx + dy * dy <= rSum * rSum;
}
