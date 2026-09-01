import Phaser from 'phaser';

/**
 * Bridges Phaser's raw input into the sim's per-tick InputFrame shape.
 * Movement/firing are level-triggered (sampled fresh each tick); dash is
 * edge-triggered and queued so a press is never lost between render frames
 * even if the fixed-step accumulator runs zero or multiple steps that frame.
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
  }

  get moveX(): number {
    const left = this.keys.A.isDown || this.keys.LEFT.isDown;
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown;
    return (right ? 1 : 0) - (left ? 1 : 0);
  }

  get moveY(): number {
    const up = this.keys.W.isDown || this.keys.UP.isDown;
    const down = this.keys.S.isDown || this.keys.DOWN.isDown;
    return (down ? 1 : 0) - (up ? 1 : 0);
  }

  get firing(): boolean {
    return this.scene.input.activePointer.leftButtonDown() || this.keys.SPACE.isDown;
  }

  /** Consumes one queued dash request, if any. Call this once per fixed sim step. */
  consumeDash(): boolean {
    if (this.dashQueue > 0) {
      this.dashQueue--;
      return true;
    }
    return false;
  }

  /** World-space pointer position, using the scene's active camera. */
  pointerWorld(): { x: number; y: number } {
    const p = this.scene.input.activePointer;
    return this.scene.cameras.main.getWorldPoint(p.x, p.y);
  }
}
