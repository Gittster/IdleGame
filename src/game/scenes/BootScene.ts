import Phaser from 'phaser';
import { BASIC_ATTACK_TUNING } from '../../sim/core/tuning';
import { REQUIRED_FONT_FACES } from '../ui/theme';

/**
 * Generates all placeholder ("programmer art") textures procedurally so the
 * combat scaffold needs zero asset files to run. Swap these for real art
 * later without touching any gameplay code — nothing downstream cares how
 * a texture key was produced.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makePlayerTexture();
    this.makeCircleTexture('tex-enemy', 18, 0xe0455a, 0x7a1420);
    // Kept exactly at the basic attack's hitbox radius — any mismatch
    // between how big a projectile looks and its actual collision circle
    // reads as "that should have hit" when it doesn't (or vice versa).
    this.makeCircleTexture('tex-projectile', BASIC_ATTACK_TUNING.projectileRadius, 0xffffff, 0xffffff);
    this.makeCircleTexture('tex-spark', 3, 0xffffff, 0xffffff);
    this.makeCircleTexture('tex-gold-drop', 8, 0xffd23f, 0x8a6a1a);
    this.makeItemDropTexture();
    this.makeIndicatorTexture();

    this.waitForFonts().then(() => this.scene.start('Combat'));
  }

  /**
   * Canvas text (what every Phaser Text object draws with) renders with
   * whatever font is loaded *at that instant* — it won't retroactively
   * redraw if a webfont finishes downloading after the fact. So the
   * Combat scene, and the HUD text it builds on the first frame, has to
   * wait for the real fonts to be ready; otherwise every label
   * permanently locks in the browser's fallback serif. A short timeout
   * keeps a slow/blocked font request from hanging the game forever —
   * worst case it just boots with the fallback font that one time.
   */
  private async waitForFonts(): Promise<void> {
    const loads = REQUIRED_FONT_FACES.map((spec) => document.fonts.load(spec).catch(() => undefined));
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await Promise.race([Promise.all(loads), timeout]);
  }

  /** A small arrow pointing along local +x, used to mark the direction of
   *  off-screen enemies at the edge of the viewport. */
  private makeIndicatorTexture(): void {
    const w = 20;
    const h = 16;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(2, 2, 2, h - 2, w - 2, h / 2);
    g.generateTexture('tex-indicator', w, h);
    g.destroy();
  }

  /** A generic diamond shape for item drops — tinted per-item at render
   *  time (see CombatScene), so one texture covers every item in
   *  src/data/items.ts without needing per-item art yet. */
  private makeItemDropTexture(): void {
    const size = 20;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.lineStyle(2, 0x141414, 1);
    g.beginPath();
    g.moveTo(size / 2, 1);
    g.lineTo(size - 1, size / 2);
    g.lineTo(size / 2, size - 1);
    g.lineTo(1, size / 2);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('tex-item-drop', size, size);
    g.destroy();
  }

  private makePlayerTexture(): void {
    const r = 16;
    const size = r * 2 + 4;
    const g = this.add.graphics();
    g.fillStyle(0x4da3ff, 1);
    g.lineStyle(2, 0x1a4d80, 1);
    g.fillCircle(size / 2, size / 2, r);
    g.strokeCircle(size / 2, size / 2, r);
    // Facing indicator: a small triangle pointing along local +x, so
    // rotating the whole sprite to the aim angle reads as a facing cue.
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(size / 2 + r - 2, size / 2, size / 2 + r + 8, size / 2 - 5, size / 2 + r + 8, size / 2 + 5);
    g.generateTexture('tex-player', size, size);
    g.destroy();
  }

  private makeCircleTexture(key: string, radius: number, fill: number, stroke: number): void {
    const size = radius * 2 + 4;
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.lineStyle(2, stroke, 1);
    g.fillCircle(size / 2, size / 2, radius);
    g.strokeCircle(size / 2, size / 2, radius);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
