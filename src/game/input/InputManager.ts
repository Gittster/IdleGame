import Phaser from 'phaser';
import { TouchJoystick } from './TouchJoystick';
import type { SkillCastRequest } from '../../sim/core/types';

function isMobileDevice(scene: Phaser.Scene): boolean {
  const device = scene.sys.game.device;
  return device.input.touch && !device.os.desktop;
}

const MOVE_STICK_MARGIN = 110;

function moveStickPosition(scene: Phaser.Scene): { x: number; y: number } {
  return { x: MOVE_STICK_MARGIN, y: scene.scale.height - MOVE_STICK_MARGIN };
}

/**
 * Bridges Phaser's raw input into the sim's per-tick InputFrame shape.
 * Movement/firing are level-triggered (sampled fresh each tick).
 *
 * On a touch-capable, non-desktop device this switches to touch controls
 * instead of WASD + mouse: a fixed, always-visible joystick in the bottom
 * left for movement, and firing/aiming driven directly by wherever the
 * right side of the screen is currently pressed — the aim vector is the
 * touch's position relative to the player, exactly like desktop mouse
 * aim, just read from a touch instead of the mouse pointer. There's no
 * separate aim joystick; holding a touch on the right half IS aiming at
 * it, the same "point at what you want to hit" gesture as a mouse.
 *
 * The joystick is exposed as plain claim/update/release methods rather
 * than self-wiring to Phaser's pointer events, because the scene needs to
 * decide routing priority first (a tap confirming a skill target, or
 * landing on a HUD button, should never also claim the joystick or start
 * firing).
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
    SPACE: Phaser.Input.Keyboard.Key;
  };

  readonly isTouch: boolean;
  private readonly moveStick: TouchJoystick | null = null;
  /** The touch currently held on the right half of the screen, if any —
   *  its live x/y (Phaser mutates the same Pointer instance in place) is
   *  read directly wherever an aim vector is needed. */
  private fireTouch: Phaser.Input.Pointer | null = null;

  private pendingSkillId: string | null = null;
  private readonly pendingCasts: SkillCastRequest[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE') as unknown as typeof this.keys;

    this.isTouch = isMobileDevice(scene);
    if (this.isTouch) {
      const pos = moveStickPosition(scene);
      this.moveStick = new TouchJoystick(scene, pos.x, pos.y);
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
    if (this.isTouch) return this.fireTouch !== null;
    return this.scene.input.activePointer.leftButtonDown() || this.keys.SPACE.isDown;
  }

  /**
   * A direction vector to aim/face along, relative to `originX/originY`
   * (the player's current position) — the world position of whatever's
   * currently doing the aiming (the fire touch on mobile, the mouse on
   * desktop) minus the player's position. Returns {0,0} when there's no
   * current aim input (no active fire touch) — callers should keep the
   * last facing rather than snapping to angle 0.
   */
  aimVector(originX: number, originY: number): { x: number; y: number } {
    const pointer = this.isTouch ? this.fireTouch : this.scene.input.activePointer;
    if (!pointer) return { x: 0, y: 0 };
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
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
   * also let this touch claim the joystick or start firing.
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

  /** Claims this touch: left half drags the move joystick, right half
   *  becomes the fire/aim touch (first one wins if more than one lands
   *  there). No-op on desktop. */
  claimTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.isTouch) return;
    const half = this.scene.scale.width / 2;
    if (pointer.x < half) {
      this.moveStick!.tryClaim(pointer);
    } else if (this.fireTouch === null) {
      this.fireTouch = pointer;
    }
  }

  updateTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.isTouch) return;
    this.moveStick!.updatePointer(pointer);
  }

  releaseTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.isTouch) return;
    this.moveStick!.release(pointer);
    if (this.fireTouch !== null && this.fireTouch.id === pointer.id) {
      this.fireTouch = null;
    }
  }

  /** Re-anchors the joystick to the bottom-left corner after a resize. */
  repositionTouchControls(): void {
    if (!this.isTouch) return;
    const pos = moveStickPosition(this.scene);
    this.moveStick!.setBasePosition(pos.x, pos.y);
  }
}
