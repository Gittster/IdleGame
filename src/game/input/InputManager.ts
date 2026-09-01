import Phaser from 'phaser';
import { TouchJoystick } from './TouchJoystick';

function isMobileDevice(scene: Phaser.Scene): boolean {
  const device = scene.sys.game.device;
  return device.input.touch && !device.os.desktop;
}

/**
 * Bridges Phaser's raw input into the sim's per-tick InputFrame shape.
 * Movement/firing are level-triggered (sampled fresh each tick); dash is
 * edge-triggered and queued so a press is never lost between render frames
 * even if the fixed-step accumulator runs zero or multiple steps that frame.
 *
 * On a touch-capable, non-desktop device this switches to a pair of
 * floating HUD joysticks (left half of the screen = move, right half =
 * aim-and-fire) instead of WASD + mouse; callers don't need to care which
 * mode is active, they just read moveX/moveY/firing/aimVector as usual.
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
    SHIFT: Phaser.Input.Keyboard.Key;
  };

  private dashQueue = 0;

  readonly isTouch: boolean;
  private readonly moveStick: TouchJoystick | null = null;
  private readonly aimStick: TouchJoystick | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,SHIFT') as unknown as typeof this.keys;
    kb.on('keydown-SHIFT', () => {
      this.dashQueue++;
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.dashQueue++;
    });

    this.isTouch = isMobileDevice(scene);
    if (this.isTouch) {
      this.moveStick = new TouchJoystick(scene);
      this.aimStick = new TouchJoystick(scene);
      this.setupTouchZones();
    }
  }

  private setupTouchZones(): void {
    const moveStick = this.moveStick!;
    const aimStick = this.aimStick!;

    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const half = this.scene.scale.width / 2;
      if (p.x < half) moveStick.tryClaim(p);
      else aimStick.tryClaim(p);
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      moveStick.updatePointer(p);
      aimStick.updatePointer(p);
    });
    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      moveStick.release(p);
      aimStick.release(p);
    });
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
    return this.scene.input.activePointer.leftButtonDown() || this.keys.SPACE.isDown;
  }

  /**
   * A direction vector to aim along, relative to `originX/originY` (the
   * player's current position). On touch this is just the aim stick's
   * deflection (already a direction, independent of the player's
   * position); on desktop it's the mouse's world position minus the
   * player's position. Returns {0,0} when there is no current aim input
   * (e.g. the aim stick is centered) — callers should keep the last facing
   * rather than snapping to angle 0.
   */
  aimVector(originX: number, originY: number): { x: number; y: number } {
    if (this.isTouch) {
      return { x: this.aimStick!.dx, y: this.aimStick!.dy };
    }
    const p = this.scene.input.activePointer;
    const world = this.scene.cameras.main.getWorldPoint(p.x, p.y);
    return { x: world.x - originX, y: world.y - originY };
  }

  /** Consumes one queued dash request, if any. Call this once per fixed sim step. */
  consumeDash(): boolean {
    if (this.dashQueue > 0) {
      this.dashQueue--;
      return true;
    }
    return false;
  }
}
