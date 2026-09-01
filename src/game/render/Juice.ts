import Phaser from 'phaser';

/**
 * Small, self-contained "feel" effects. None of this touches sim truth —
 * it only reacts to events the sim already produced.
 */
export class Juice {
  private readonly scene: Phaser.Scene;
  private readonly sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, sparkTexture: string) {
    this.scene = scene;
    this.sparkEmitter = scene.add.particles(0, 0, sparkTexture, {
      lifespan: 220,
      speed: { min: 60, max: 180 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.sparkEmitter.setDepth(50);
  }

  hitSpark(x: number, y: number, tint: number, count = 6): void {
    this.sparkEmitter.setParticleTint(tint);
    this.sparkEmitter.explode(count, x, y);
  }

  shake(intensity: number, durationMs = 90): void {
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  punchScale(target: Phaser.GameObjects.Components.Transform, amount = 0.28, durationMs = 90): void {
    const obj = target as unknown as Phaser.GameObjects.Sprite;
    this.scene.tweens.add({
      targets: obj,
      scaleX: 1 + amount,
      scaleY: 1 - amount * 0.6,
      duration: durationMs * 0.35,
      yoyo: true,
      ease: Phaser.Math.Easing.Sine.Out,
    });
  }
}
