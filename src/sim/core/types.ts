export interface Vec2 {
  x: number;
  y: number;
}

export const enum Team {
  Player = 0,
  Enemy = 1,
}

export interface SkillCastRequest {
  skillId: string;
  targetX: number;
  targetY: number;
}

export interface InputFrame {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  firing: boolean;
  /** Usually empty; a targeted skill button/tap produces one entry for the
   *  tick it was confirmed on. Dropped by the sim if the skill is still on
   *  cooldown — casting is a deliberate targeted action, not something
   *  worth buffering the way the held-fire basic attack is. */
  skillCasts: SkillCastRequest[];
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
