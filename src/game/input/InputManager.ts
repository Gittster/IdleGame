import Phaser from 'phaser';
import { TouchJoystick } from './TouchJoystick';
import type { SkillCastRequest } from '../../sim/core/types';

function isMobileDevice(scene: Phaser.Scene): boolean {
  const device = scene.sys.game.device;
  return device.input.touch && !device.os.desktop;
}

/**
 * Bridges Phaser's raw input into the sim's per-tick InputFrame shape.
 * Movement/firing are level-triggered (sampled fresh each tick).
 *
 * On a touch-capable, non-desktop device this switches to a pair of
 * floating HUD joysticks (left half of the screen = move, right half =
 * aim-and-fire) instead of WASD + mouse. The joystick primitives are
 * exposed as plain claim/update/release methods rather than self-wiring
 * to Phaser's pointer events, because the scene needs to decide routing
 * priority first (a tap confirming a skill target, or landing on a HUD
 * button, should never also claim a joystick).
 */
export class InputManager {
  private readonly scene: Phaser.Scene;
  private readonly keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
  };

  readonly isTouch: boolean;
  private readonly moveStick: TouchJoystick | null = null;
  private readonly aimStick: TouchJoystick | null = null;

  private pendingSkillId: string | null = null;
  private readonly pendingCasts: SkillCastRequest[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as unknown as typeof this.keys;

    this.isTouch = isMobileDevice(scene);
    if (this.isTouch) {
      this.moveStick = new TouchJoystick(scene);
      this.aimStick = new TouchJoystick(scene);
    }
  }

  get moveX(): number {
    if (this.isTouch) return this.moveStick!.dx;
    const left = this.keys.A.isDown || this.keys.LEFT.isDown;
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown;
    return (right ? 1 : 0) - (left ? 1 : 0);
  }

  get moveY(): number {
    if (this.isTouch) return this.moveStick!.dy;
    const up = this.keys.W.isDown || this.keys.UP.isDown;
    const down = this.keys.S.isDown || this.keys.DOWN.isDown;
    return (down ? 1 : 0) - (up ? 1 : 0);
  }

  get firing(): boolean {
    if (this.isTouch) return this.aimStick!.active;
    // Space is the pause key (see App.tsx's global keydown handler) —
    // mouse click is the only desktop fire trigger now.
    return this.scene.input.activePointer.leftButtonDown();
  }

  /**
   * A direction vector to aim/face along, relative to `originX/originY`
   * (the player's current position). On touch this is just the aim
   * stick's deflection (already a direction, independent of the player's
   * position); on desktop it's the mouse's world position minus the
   * player's position. Returns {0,0} when there is no current aim input
   * (e.g. the aim stick is centered) — callers should keep the last
   * facing rather than snapping to angle 0.
   */
  aimVector(originX: number, originY: number): { x: number; y: number } {
    if (this.isTouch) {
      return { x: this.aimStick!.dx, y: this.aimStick!.dy };
    }
    const p = this.scene.input.activePointer;
    const world = this.scene.cameras.main.getWorldPoint(p.x, p.y);
    return { x: world.x - originX, y: world.y - originY };
  }

  get hasPendingSkillTarget(): boolean {
    return this.pendingSkillId !== null;
  }

  /**
   * Presses a skill's button. On desktop this casts immediately at the
   * current mouse position — there's no reason to make a mouse-driven
   * player take an extra step when the target is already under the
   * cursor. On touch, where there's no persistent pointer to read a
   * target from, this arms the skill so the very next screen tap becomes
   * its target instead.
   */
  requestSkillCast(skillId: string): void {
    if (this.isTouch) {
      this.pendingSkillId = skillId;
      return;
    }
    const p = this.scene.input.activePointer;
    const world = this.scene.cameras.main.getWorldPoint(p.x, p.y);
    this.pendingCasts.push({ skillId, targetX: world.x, targetY: world.y });
  }

  /**
   * Consumes the given touch as the target for a pending armed skill, if
   * there is one. Returns true when it did, so the caller knows not to
   * also let this touch claim a joystick.
   */
  resolveSkillTarget(pointer: Phaser.Input.Pointer): boolean {
    if (this.pendingSkillId === null) return false;
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.pendingCasts.push({ skillId: this.pendingSkillId, targetX: world.x, targetY: world.y });
    this.pendingSkillId = null;
    return true;
  }

  /** Drains and returns any skill casts queued since the last call. Call
   *  this once per fixed sim step. */
  consumeSkillCasts(): SkillCastRequest[] {
    if (this.pendingCasts.length === 0) return [];
    const casts = this.pendingCasts.slice();
    this.pendingCasts.length = 0;
    return casts;
  }

  /** Claims this touch for whichever joystick owns its half of the
   *  screen. No-op on desktop. */
  claimJoystickTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.isTouch) return;
    const half = this.scene.scale.width / 2;
    if (pointer.x < half) this.moveStick!.tryClaim(pointer);
    else this.aimStick!.tryClaim(pointer);
  }

  updateJoystickTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.isTouch) return;
    this.moveStick!.updatePointer(pointer);
    this.aimStick!.updatePointer(pointer);
  }

  releaseJoystickTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.isTouch) return;
    this.moveStick!.release(pointer);
    this.aimStick!.release(pointer);
  }
}
