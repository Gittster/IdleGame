import Phaser from 'phaser';

/**
 * A "floating" virtual joystick: invisible until the owning half of the
 * screen is touched, then it appears centered on that touch and the knob
 * drags within a fixed radius of it — the classic mobile twin-stick
 * pattern, rather than a joystick pinned to one fixed spot on screen.
 */
export class TouchJoystick {
  private readonly maxRadius: number;
  private readonly deadzone: number;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;

  private pointerId: number | null = null;
  private baseX = 0;
  private baseY = 0;
  private outX = 0;
  private outY = 0;

  constructor(scene: Phaser.Scene, maxRadius = 55, deadzone = 0.15) {
    this.maxRadius = maxRadius;
    this.deadzone = deadzone;
    this.base = scene.add
      .circle(0, 0, maxRadius, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    this.knob = scene.add
      .circle(0, 0, maxRadius * 0.45, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(201)
      .setVisible(false);
  }

  get dx(): number {
    return this.outX;
  }

  get dy(): number {
    return this.outY;
  }

  /** True once the stick is deflected past its deadzone. */
  get active(): boolean {
    return this.pointerId !== null && (this.outX !== 0 || this.outY !== 0);
  }

  get isHeld(): boolean {
    return this.pointerId !== null;
  }

  /** Claims this pointer as the joystick's owner if it isn't already tracking one. */
  tryClaim(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return;
    this.pointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.base.setPosition(this.baseX, this.baseY).setVisible(true);
    this.knob.setPosition(this.baseX, this.baseY).setVisible(true);
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
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }
}
