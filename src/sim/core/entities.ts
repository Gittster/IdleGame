export interface PlayerState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  aimX: number;
  aimY: number;
  hp: number;
  maxHp: number;
  iFrameTimer: number;
  attackCooldown: number;
  /** Set when a fire request arrives slightly before the weapon is ready;
   *  consumed the instant cooldown clears so inputs never get "eaten". */
  fireBuffer: number;
  dashCooldown: number;
  dashTimer: number;
  dashDirX: number;
  dashDirY: number;
}

export function createPlayer(x: number, y: number, maxHp: number): PlayerState {
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: 0,
    aimX: 1,
    aimY: 0,
    hp: maxHp,
    maxHp,
    iFrameTimer: 0,
    attackCooldown: 0,
    fireBuffer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashDirX: 0,
    dashDirY: 0,
  };
}

export interface EnemyState {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  radius: number;
  hp: number;
  maxHp: number;
  hitFlashTimer: number;
  knockbackX: number;
  knockbackY: number;
  fireCooldown: number;
  alive: boolean;
}

let nextEnemyId = 1;

export function createEnemy(x: number, y: number, radius: number, maxHp: number): EnemyState {
  return {
    id: nextEnemyId++,
    x,
    y,
    prevX: x,
    prevY: y,
    radius,
    hp: maxHp,
    maxHp,
    hitFlashTimer: 0,
    knockbackX: 0,
    knockbackY: 0,
    fireCooldown: Math.random() * 1.5,
    alive: true,
  };
}
