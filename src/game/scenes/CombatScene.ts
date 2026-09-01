import Phaser from 'phaser';
import { CombatWorld } from '../../sim/core/combatWorld';
import { WORLD_TUNING } from '../../sim/core/tuning';
import { Team, type InputFrame } from '../../sim/core/types';
import { DUMMY } from '../../data/monsters';
import { POWER_BOLT } from '../../data/skills';
import type { EnemyState } from '../../sim/core/entities';
import { InputManager } from '../input/InputManager';
import { ProjectileRenderer } from '../render/ProjectileRenderer';
import { Juice } from '../render/Juice';
import { GAME_CONFIG } from '../config';

const FIXED_DT = WORLD_TUNING.fixedDtMs / 1000;
const SKILL_BUTTON_RADIUS = 34;
const FULLSCREEN_BUTTON_RADIUS = 22;
const MAX_ENEMY_INDICATORS = 14;
const INDICATOR_EDGE_MARGIN = 28;

export class CombatScene extends Phaser.Scene {
  private world!: CombatWorld;
  private inputs!: InputManager;
  private projectileRenderer!: ProjectileRenderer;
  private juice!: Juice;

  private playerSprite!: Phaser.GameObjects.Image;
  private enemySprites = new Map<number, Phaser.GameObjects.Image>();
  private enemyIndicators: Phaser.GameObjects.Image[] = [];

  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private debugText!: Phaser.GameObjects.Text;

  private skillButtonPos = { x: 0, y: 0 };
  private skillButtonContainer!: Phaser.GameObjects.Container;
  private skillIcon!: Phaser.GameObjects.Arc;
  private skillCooldownText!: Phaser.GameObjects.Text;

  private fullscreenButtonPos = { x: 0, y: 0 };
  private fullscreenButton?: Phaser.GameObjects.Text;

  private accumulator = 0;
  private hitStopRemainingMs = 0;
  /** Preserves facing when the aim input is momentarily neutral (e.g. a
   *  recentered touch stick) instead of snapping the sprite to angle 0. */
  private lastAimAngle = 0;

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
    this.buildEnemyIndicators();

    for (let i = 0; i < GAME_CONFIG.targetEnemyCount; i++) {
      this.spawnEnemyNear(this.world.player.x, this.world.player.y);
    }
    this.time.addEvent({
      delay: GAME_CONFIG.enemyRespawnCheckMs,
      loop: true,
      callback: () => this.maybeSpawnEnemy(),
    });

    this.buildHud();
    this.wirePointerRouting();
    this.scale.on('resize', () => this.repositionHud());

    this.input.keyboard!.on('keydown-T', () => this.stressTestBurst());
    this.input.keyboard!.on('keydown-Q', () => this.inputs.requestSkillCast(POWER_BOLT.id));
  }

  /**
   * A single pointerdown handler, in priority order, so a touch can never
   * be claimed twice: confirming an armed skill's target beats pressing
   * the skill button, which beats falling through to plain joystick
   * claiming. (On desktop the joystick claim is a no-op, and skill casts
   * happen instantly rather than arming, so this ordering costs nothing
   * there — it's the touch flow it's protecting.)
   */
  private wirePointerRouting(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.inputs.resolveSkillTarget(p)) return;
      if (this.isWithin(p, this.fullscreenButtonPos, FULLSCREEN_BUTTON_RADIUS)) {
        this.toggleFullscreen();
        return;
      }
      if (this.isWithin(p, this.skillButtonPos, SKILL_BUTTON_RADIUS)) {
        this.inputs.requestSkillCast(POWER_BOLT.id);
        return;
      }
      this.inputs.claimJoystickTouch(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.inputs.updateJoystickTouch(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.inputs.releaseJoystickTouch(p));
  }

  private isWithin(p: Phaser.Input.Pointer, pos: { x: number; y: number }, radius: number): boolean {
    return Phaser.Math.Distance.Between(p.x, p.y, pos.x, pos.y) <= radius;
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  /** Repositions HUD elements anchored to the screen's edges after the
   *  canvas resizes (rotation, or a mobile browser's chrome collapsing) —
   *  RESIZE scale mode means scale.width/height genuinely change, unlike
   *  the old fixed-resolution FIT setup. */
  private repositionHud(): void {
    this.skillButtonPos = this.skillButtonCenter();
    this.skillButtonContainer.setPosition(this.skillButtonPos.x, this.skillButtonPos.y);

    if (this.fullscreenButton) {
      this.fullscreenButtonPos = this.fullscreenButtonCenter();
      this.fullscreenButton.setPosition(this.fullscreenButtonPos.x, this.fullscreenButtonPos.y);
    }
  }

  /** Right edge, upper-middle of the screen — clear of both the top-right
   *  fullscreen toggle and the aim joystick's usual lower reach. */
  private skillButtonCenter(): { x: number; y: number } {
    return { x: this.scale.width - 64, y: this.scale.height * 0.35 };
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
        tint: 0xffe066,
      });
    }
  }

  private buildHud(): void {
    const bg = this.add.rectangle(16, 16, 160, 14, 0x000000, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    bg.setStrokeStyle(1, 0xffffff, 0.4);
    this.hpBarFill = this.add.rectangle(18, 18, 156, 10, 0x4be36a, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

    const instructions = this.inputs.isTouch
      ? 'left stick: move · right stick: aim & fire\ntap the skill icon, then tap a target'
      : 'WASD move · mouse aim · click/space fire\nQ or click the skill icon to cast at cursor · T = stress test';
    const instructionsText = this.add
      .text(16, 36, instructions, { fontSize: '12px', color: '#ffffffaa' })
      .setScrollFactor(0)
      .setDepth(100);

    this.debugText = this.add
      .text(16, instructionsText.y + instructionsText.height + 8, '', { fontSize: '12px', color: '#9be89b' })
      .setScrollFactor(0)
      .setDepth(100);

    this.buildSkillButton();
    this.buildFullscreenButton();
  }

  private buildSkillButton(): void {
    this.skillButtonPos = this.skillButtonCenter();

    const ring = this.add.circle(0, 0, SKILL_BUTTON_RADIUS, 0x000000, 0.35).setStrokeStyle(2, 0xffffff, 0.4);
    this.skillIcon = this.add.circle(0, 0, SKILL_BUTTON_RADIUS - 6, POWER_BOLT.tint, 0.95);
    this.skillCooldownText = this.add
      .text(0, 0, '', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    this.skillButtonContainer = this.add
      .container(this.skillButtonPos.x, this.skillButtonPos.y, [ring, this.skillIcon, this.skillCooldownText])
      .setScrollFactor(0)
      .setDepth(149);
  }

  private buildFullscreenButton(): void {
    if (!this.sys.game.device.fullscreen.available) return;
    this.fullscreenButtonPos = this.fullscreenButtonCenter();
    this.fullscreenButton = this.add
      .text(this.fullscreenButtonPos.x, this.fullscreenButtonPos.y, '⛶', { fontSize: '22px', color: '#ffffffcc' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150);
  }

  private fullscreenButtonCenter(): { x: number; y: number } {
    return { x: this.scale.width - 16 - FULLSCREEN_BUTTON_RADIUS, y: 16 + FULLSCREEN_BUTTON_RADIUS };
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
    const aim = this.inputs.aimVector(this.world.player.x, this.world.player.y);
    const frame: InputFrame = {
      moveX: this.inputs.moveX,
      moveY: this.inputs.moveY,
      aimX: aim.x,
      aimY: aim.y,
      firing: this.inputs.firing,
      skillCasts: this.inputs.consumeSkillCasts(),
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

    for (const cast of events.skillCasts) {
      this.lastAimAngle = Math.atan2(cast.dirY, cast.dirX);
      this.juice.hitSpark(cast.x, cast.y, POWER_BOLT.tint, 18);
      this.juice.punchScale(this.playerSprite, 0.36, 100);
      this.juice.shake(0.006, 90);
    }

    for (const fired of events.fired) {
      if (fired.team === Team.Player) this.juice.punchScale(this.playerSprite, 0.18, 70);
    }
  }

  private render(alpha: number): void {
    const p = this.world.player;
    this.playerSprite.x = lerp(p.prevX, p.x, alpha);
    this.playerSprite.y = lerp(p.prevY, p.y, alpha);

    const aim = this.inputs.aimVector(this.playerSprite.x, this.playerSprite.y);
    if (aim.x !== 0 || aim.y !== 0) this.lastAimAngle = Math.atan2(aim.y, aim.x);
    this.playerSprite.rotation = this.lastAimAngle;

    if (p.iFrameTimer > 0) {
      this.playerSprite.alpha = Math.floor(this.time.now / 60) % 2 === 0 ? 0.35 : 0.85;
    } else {
      this.playerSprite.alpha = 1;
    }

    this.syncEnemySprites(alpha);
    this.updateEnemyIndicators();
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

  private buildEnemyIndicators(): void {
    for (let i = 0; i < MAX_ENEMY_INDICATORS; i++) {
      const indicator = this.add
        .image(0, 0, 'tex-indicator')
        .setTint(0xe0455a)
        .setAlpha(0.85)
        .setScrollFactor(0)
        .setDepth(60)
        .setVisible(false);
      this.enemyIndicators.push(indicator);
    }
  }

  /** Points a small arrow at the edge of the screen toward each enemy
   *  that's currently off-camera, so there's always a cue for which way
   *  to move even when nothing enemy-shaped is on screen. */
  private updateEnemyIndicators(): void {
    const view = this.cameras.main.worldView;
    const hw = this.scale.width / 2;
    const hh = this.scale.height / 2;
    const insetW = hw - INDICATOR_EDGE_MARGIN;
    const insetH = hh - INDICATOR_EDGE_MARGIN;
    const px = this.world.player.x;
    const py = this.world.player.y;

    let shown = 0;
    for (const enemy of this.world.enemies) {
      if (shown >= this.enemyIndicators.length) break;
      if (view.contains(enemy.x, enemy.y)) continue;

      const dx = enemy.x - px;
      const dy = enemy.y - py;
      if (dx === 0 && dy === 0) continue;

      const scaleX = dx !== 0 ? insetW / Math.abs(dx) : Infinity;
      const scaleY = dy !== 0 ? insetH / Math.abs(dy) : Infinity;
      const t = Math.min(scaleX, scaleY);

      const indicator = this.enemyIndicators[shown]!;
      indicator.setPosition(hw + dx * t, hh + dy * t);
      indicator.setRotation(Math.atan2(dy, dx));
      indicator.setVisible(true);
      shown++;
    }

    for (let i = shown; i < this.enemyIndicators.length; i++) {
      this.enemyIndicators[i]!.setVisible(false);
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

    const remaining = p.skillCooldowns[POWER_BOLT.id] ?? 0;
    if (remaining > 0) {
      this.skillIcon.setAlpha(0.35);
      this.skillCooldownText.setText(remaining.toFixed(1));
    } else {
      this.skillIcon.setAlpha(1);
      this.skillCooldownText.setText('');
    }

    const pool = this.world.projectiles;
    this.debugText.setText(
      `FPS ${Math.round(this.game.loop.actualFps)} | projectiles ${pool.count}/${pool.capacity} | dropped ${pool.droppedSpawns} | enemies ${this.world.enemies.length}`
    );
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
