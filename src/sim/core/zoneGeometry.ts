/** Pure geometry helpers for bounded zones: an elliptical play-area
 *  boundary plus circular static obstacles. Kept separate from
 *  combatWorld.ts because both are plain math, easily unit-tested in
 *  isolation from sim state. */

export interface EllipseBounds {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
}

export interface CircleObstacle {
  x: number;
  y: number;
  radius: number;
}

/**
 * Clamps (x,y) to lie within the ellipse, shrunk inward by `margin` (an
 * entity's own radius, so its edge — not its center — stays inside the
 * boundary). Uses the standard "normalize into unit-circle space" trick:
 * not the exact closest point on an eccentric ellipse, but a cheap,
 * stable approximation that's more than good enough for keeping a player
 * inside a play area.
 */
export function clampToEllipse(x: number, y: number, bounds: EllipseBounds, margin = 0): { x: number; y: number } {
  const rx = Math.max(bounds.radiusX - margin, 1);
  const ry = Math.max(bounds.radiusY - margin, 1);
  const dx = (x - bounds.centerX) / rx;
  const dy = (y - bounds.centerY) / ry;
  const distSq = dx * dx + dy * dy;
  if (distSq <= 1) return { x, y };
  const dist = Math.sqrt(distSq);
  return {
    x: bounds.centerX + (dx / dist) * rx,
    y: bounds.centerY + (dy / dist) * ry,
  };
}

/** True if (x,y) lies within the ellipse (no margin — a point test, used
 *  for "is this thing currently inside the zone" rather than clamping). */
export function isInsideEllipse(x: number, y: number, bounds: EllipseBounds): boolean {
  const dx = (x - bounds.centerX) / bounds.radiusX;
  const dy = (y - bounds.centerY) / bounds.radiusY;
  return dx * dx + dy * dy <= 1;
}

/**
 * Pushes a moving circle (position x,y, radius `radius`) out of a static
 * circular obstacle if it's currently overlapping, along the line
 * between the two centers. No-op if not overlapping.
 */
export function pushOutOfCircle(x: number, y: number, radius: number, obstacle: CircleObstacle): { x: number; y: number } {
  const dx = x - obstacle.x;
  const dy = y - obstacle.y;
  const dist = Math.hypot(dx, dy);
  const minDist = radius + obstacle.radius;
  if (dist >= minDist) return { x, y };
  if (dist < 1e-6) return { x: obstacle.x + minDist, y: obstacle.y };
  const nx = dx / dist;
  const ny = dy / dist;
  return { x: obstacle.x + nx * minDist, y: obstacle.y + ny * minDist };
}
