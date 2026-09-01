/**
 * All hand-tuned "feel" numbers live here so combat responsiveness can be
 * iterated on without hunting through logic. Units: pixels, seconds.
 */

export const WORLD_TUNING = {
  /** Sim runs at a fixed tick rate, decoupled from render frame rate. */
  fixedDtMs: 1000 / 60,
  /** Never simulate more than this many fixed steps in one render frame
   *  (avoids a "spiral of death" after a tab is backgrounded). */
  maxStepsPerFrame: 8,
  arenaWidth: 3200,
  arenaHeight: 3200,
  projectileCapacity: 4096,
  /** Spatial hash cell size for enemy broadphase queries. */
  hashCellSize: 96,
};

export const PLAYER_TUNING = {
  radius: 16,
  hurtboxRadius: 14,
  maxSpeed: 340,
  /** Reaching max speed from a standstill in ~0.06s is what makes input feel instant. */
  acceleration: 6000,
  /** Deceleration is slightly softer than acceleration so stops aren't robotic. */
  deceleration: 4200,
  maxHp: 100,
  iFrameDuration: 0.5,
};

export const BASIC_ATTACK_TUNING = {
  cooldown: 0.12,
  /** Input buffering: a fire request this early is remembered and fired
   *  the instant the cooldown clears, instead of being dropped. */
  bufferWindow: 0.1,
  projectileSpeed: 980,
  projectileRadius: 5,
  projectileLife: 0.9,
  damage: 8,
  pierce: 0,
  tint: 0xffe066,
};
