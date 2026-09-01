import Phaser from 'phaser';

/**
 * A fixed-position virtual joystick: always visible (semi-transparent) at
 * the same screen spot, regardless of whether it's currently being
 * touched — unlike a "floating" joystick that spawns wherever you first
 * press. Touching anywhere in its zone still drags the knob, computed
 * relative to the fixed base center rather than the touch-down point.
 */
export class TouchJoystick {
  private readonly maxRadius: number;
  private readonly deadzone: number;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;

  private pointerId: number | null = null;
  private baseX: number;
  private baseY: number;
  private outX = 0;
  private outY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxRadius = 55, deadzone = 0.15) {
    this.maxRadius = maxRadius;
    this.deadzone = deadzone;
    this.baseX = x;
    this.baseY = y;
    this.base = scene.add
      .circle(x, y, maxRadius, 0xffffff, 0.1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setScrollFactor(0)
      .setDepth(200);
    this.knob = scene.add.circle(x, y, maxRadius * 0.45, 0xffffff, 0.22).setScrollFactor(0).setDepth(201);
  }

  get dx(): number {
    return this.outX;
  }

  get dy(): number {
    return this.outY;
  }

  /** Moves the fixed base (and resets the knob to it) — used to keep the
   *  joystick anchored to the same screen corner after a resize. */
  setBasePosition(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;
    this.base.setPosition(x, y);
    if (this.pointerId === null) this.knob.setPosition(x, y);
  }

  /** Claims this pointer as the joystick's owner if it isn't already tracking one. */
  tryClaim(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return;
    this.pointerId = pointer.id;
    this.updatePointer(pointer);
  }

  updatePointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.min(Math.hypot(dx, dy), this.maxRadius);
    const angle = Math.atan2(dy, dx);
    this.knob.setPosition(this.baseX + Math.cos(angle) * dist, this.baseY + Math.sin(angle) * dist);

    const magnitude = dist / this.maxRadius;
    if (magnitude < this.deadzone) {
      this.outX = 0;
      this.outY = 0;
    } else {
      this.outX = Math.cos(angle) * magnitude;
      this.outY = Math.sin(angle) * magnitude;
    }
  }

  release(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.outX = 0;
    this.outY = 0;
    this.knob.setPosition(this.baseX, this.baseY);
  }
}
