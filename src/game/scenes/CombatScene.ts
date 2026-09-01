import Phaser from 'phaser';
import { CombatWorld } from '../../sim/core/combatWorld';
import { WORLD_TUNING, PLAYER_TUNING } from '../../sim/core/tuning';
import { Team, type InputFrame } from '../../sim/core/types';
import { DUMMY } from '../../data/monsters';
import type { EnemyState } from '../../sim/core/entities';
import { InputManager } from '../input/InputManager';
import { ProjectileRenderer } from '../render/ProjectileRenderer';
import { Juice } from '../render/Juice';
import { GAME_CONFIG } from '../config';

const FIXED_DT = WORLD_TUNING.fixedDtMs / 1000;

export class CombatScene extends Phaser.Scene {
  private world!: CombatWorld;
  private inputs!: InputManager;
  private projectileRenderer!: ProjectileRenderer;
  private juice!: Juice;

  private playerSprite!: Phaser.GameObjects.Image;
  private enemySprites = new Map<number, Phaser.GameObjects.Image>();

  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private dashBarFill!: Phaser.GameObjects.Rectangle;
  private debugText!: Phaser.GameObjects.Text;

  private accumulator = 0;
  private hitStopRemainingMs = 0;

  constructor() {
    super('Combat');
  }

  create(): void {
    this.world = new CombatWorld();
    this.inputs = new InputManager(this);
    this.juice = new Juice(this, 'tex-spark');

    this.add
      .tileSprite(0, 0, WORLD_TUNING.arenaWidth, WORLD_TUNING.arenaHeight, 'tex-ground')
      .setOrigin(0, 0)
      .setDepth(-10);

    this.cameras.main.setBounds(0, 0, WORLD_TUNING.arenaWidth, WORLD_TUNING.arenaHeight);

    this.playerSprite = this.add.image(this.world.player.x, this.world.player.y, 'tex-player').setDepth(10);
    this.cameras.main.startFollow(this.playerSprite, true, 1, 1);

    this.projectileRenderer = new ProjectileRenderer(this, 'tex-projectile', WORLD_TUNING.projectileCapacity);

    for (let i = 0; i < GAME_CONFIG.targetEnemyCount; i++) {
      this.spawnEnemyNear(this.world.player.x, this.world.player.y);
    }
    this.time.addEvent({
      delay: GAME_CONFIG.enemyRespawnCheckMs,
      loop: true,
      callback: () => this.maybeSpawnEnemy(),
    });

    this.buildHud();

    this.input.keyboard!.on('keydown-T', () => this.stressTestBurst());
  }

  private spawnEnemyNear(px: number, py: number): void {
    const minDist = GAME_CONFIG.minEnemySpawnDistance;
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      x = Phaser.Math.Between(DUMMY.radius, WORLD_TUNING.arenaWidth - DUMMY.radius);
      y = Phaser.Math.Between(DUMMY.radius, WORLD_TUNING.arenaHeight - DUMMY.radius);
      if (Phaser.Math.Distance.Between(x, y, px, py) >= minDist) break;
    }
    const enemy = this.world.spawnEnemy(DUMMY, x, y);
    const sprite = this.add.image(x, y, 'tex-enemy').setDepth(8);
    this.enemySprites.set(enemy.id, sprite);
  }

  private maybeSpawnEnemy(): void {
    if (this.world.enemies.length < GAME_CONFIG.targetEnemyCount) {
      this.spawnEnemyNear(this.world.player.x, this.world.player.y);
    }
  }

  private stressTestBurst(): void {
    const p = this.world.player;
    const n = GAME_CONFIG.stressTestBurstSize;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.05;
      this.world.projectiles.spawn({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * GAME_CONFIG.stressTestProjectileSpeed,
        vy: Math.sin(angle) * GAME_CONFIG.stressTestProjectileSpeed,
        radius: 5,
        damage: 0,
        life: GAME_CONFIG.stressTestProjectileLife,
        team: Team.Player,
        pierce: 9999,
      });
    }
  }

  private buildHud(): void {
    const bg = this.add.rectangle(16, 16, 160, 14, 0x000000, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    bg.setStrokeStyle(1, 0xffffff, 0.4);
    this.hpBarFill = this.add.rectangle(18, 18, 156, 10, 0x4be36a, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

    const dashBg = this.add.rectangle(16, 34, 80, 6, 0x000000, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    dashBg.setStrokeStyle(1, 0xffffff, 0.3);
    this.dashBarFill = this.add.rectangle(17, 35, 78, 4, 0x66c2ff, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

    this.add
      .text(16, 48, 'WASD move · mouse aim · click/space fire · shift/right-click dash · T = stress test', {
        fontSize: '12px',
        color: '#ffffffaa',
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.debugText = this.add
      .text(16, 66, '', { fontSize: '12px', color: '#9be89b' })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(_time: number, delta: number): void {
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs -= delta;
      this.render(this.accumulator / WORLD_TUNING.fixedDtMs);
      return;
    }

    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= WORLD_TUNING.fixedDtMs && steps < WORLD_TUNING.maxStepsPerFrame) {
      this.stepSim();
      this.accumulator -= WORLD_TUNING.fixedDtMs;
      steps++;
    }
    if (steps >= WORLD_TUNING.maxStepsPerFrame) this.accumulator = 0;

    const alpha = this.accumulator / WORLD_TUNING.fixedDtMs;
    this.render(alpha);
  }

  private stepSim(): void {
    const mouse = this.inputs.pointerWorld();
    const frame: InputFrame = {
      moveX: this.inputs.moveX,
      moveY: this.inputs.moveY,
      aimX: mouse.x - this.world.player.x,
      aimY: mouse.y - this.world.player.y,
      firing: this.inputs.firing,
      dashRequested: this.inputs.consumeDash(),
    };
    this.world.step(FIXED_DT, frame, DUMMY);
    this.handleFrameEvents();
  }

  private handleFrameEvents(): void {
    const events = this.world.events;

    for (const hit of events.hits) {
      if (hit.target === 'enemy') {
        this.juice.hitSpark(hit.x, hit.y, 0xffe066, hit.killed ? 14 : 5);
        this.juice.shake(hit.killed ? 0.008 : 0.002, hit.killed ? 120 : 50);
        if (hit.killed) this.hitStopRemainingMs = Math.max(this.hitStopRemainingMs, 35);
      } else {
        this.juice.hitSpark(hit.x, hit.y, 0xff3344, 12);
        this.juice.shake(0.012, 140);
        this.hitStopRemainingMs = Math.max(this.hitStopRemainingMs, 90);
      }
    }

    for (const dead of events.enemyDied) {
      const sprite = this.enemySprites.get(dead.id);
      if (sprite) {
        sprite.destroy();
        this.enemySprites.delete(dead.id);
      }
    }

    for (const dash of events.dashes) {
      const rotation = Math.atan2(dash.dirY, dash.dirX);
      this.juice.dashGhost(dash.x, dash.y, rotation, 'tex-player', 0x4da3ff);
    }

    for (const fired of events.fired) {
      if (fired.team === Team.Player) this.juice.punchScale(this.playerSprite, 0.18, 70);
    }
  }

  private render(alpha: number): void {
    const p = this.world.player;
    this.playerSprite.x = lerp(p.prevX, p.x, alpha);
    this.playerSprite.y = lerp(p.prevY, p.y, alpha);

    const mouse = this.inputs.pointerWorld();
    this.playerSprite.rotation = Math.atan2(mouse.y - this.playerSprite.y, mouse.x - this.playerSprite.x);

    if (p.iFrameTimer > 0) {
      this.playerSprite.alpha = Math.floor(this.time.now / 60) % 2 === 0 ? 0.35 : 0.85;
    } else {
      this.playerSprite.alpha = 1;
    }

    this.syncEnemySprites(alpha);
    this.projectileRenderer.sync(this.world.projectiles, alpha);
    this.updateHud();
  }

  private syncEnemySprites(alpha: number): void {
    for (const enemy of this.world.enemies) {
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite) {
        sprite = this.add.image(enemy.x, enemy.y, 'tex-enemy').setDepth(8);
        this.enemySprites.set(enemy.id, sprite);
      }
      sprite.x = lerp(enemy.prevX, enemy.x, alpha);
      sprite.y = lerp(enemy.prevY, enemy.y, alpha);
      this.applyHitFlash(sprite, enemy);
    }
  }

  private applyHitFlash(sprite: Phaser.GameObjects.Image, enemy: EnemyState): void {
    if (enemy.hitFlashTimer > 0) {
      sprite.setTint(0xffffff);
    } else {
      sprite.clearTint();
    }
  }

  private updateHud(): void {
    const p = this.world.player;
    const hpRatio = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.hpBarFill.width = 156 * hpRatio;
    this.hpBarFill.fillColor = hpRatio > 0.35 ? 0x4be36a : 0xe3564b;

    const dash = PLAYER_TUNING.dash;
    const dashRatio = 1 - Phaser.Math.Clamp(p.dashCooldown / dash.cooldown, 0, 1);
    this.dashBarFill.width = 78 * dashRatio;

    const pool = this.world.projectiles;
    this.debugText.setText(
      `FPS ${Math.round(this.game.loop.actualFps)} | projectiles ${pool.count}/${pool.capacity} | dropped ${pool.droppedSpawns} | enemies ${this.world.enemies.length}`
    );
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
