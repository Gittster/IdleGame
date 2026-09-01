export interface Vec2 {
  x: number;
  y: number;
}

export const enum Team {
  Player = 0,
  Enemy = 1,
}

export interface InputFrame {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  firing: boolean;
  dashRequested: boolean;
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
