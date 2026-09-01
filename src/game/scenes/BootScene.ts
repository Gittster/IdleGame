import Phaser from 'phaser';

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
    this.makeCircleTexture('tex-projectile', 6, 0xffffff, 0xffffff);
    this.makeCircleTexture('tex-spark', 3, 0xffffff, 0xffffff);
    this.makeGroundTile();

    this.scene.start('Combat');
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

  private makeGroundTile(): void {
    const size = 64;
    const g = this.add.graphics();
    g.fillStyle(0x14141c, 1);
    g.fillRect(0, 0, size, size);
    g.lineStyle(1, 0x22222e, 1);
    g.strokeRect(0, 0, size, size);
    g.generateTexture('tex-ground', size, size);
    g.destroy();
  }
}
