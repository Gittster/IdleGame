import { Team, type InputFrame, normalize } from './types';
import { PLAYER_TUNING, WORLD_TUNING, BASIC_ATTACK_TUNING } from './tuning';
import { ProjectilePool } from './projectilePool';
import { SpatialHash } from './spatialHash';
import { sweptCircleHitsCircle } from './collision';
import { createPlayer, createEnemy, type PlayerState, type EnemyState } from './entities';
import type { MonsterDef } from '../../data/monsters';
import { SKILLS } from '../../data/skills';

export interface HitEvent {
  x: number;
  y: number;
  damage: number;
  target: 'enemy' | 'player';
  killed: boolean;
}

export interface SkillCastEvent {
  skillId: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
}

/** Everything that happened during the most recent step, for the render
 *  layer to react to (hit-stop, screen shake, flashes) without the sim
 *  needing to know rendering exists. Cleared and reused every step. */
export class FrameEvents {
  readonly hits: HitEvent[] = [];
  readonly enemyDied: EnemyState[] = [];
  readonly skillCasts: SkillCastEvent[] = [];
  readonly fired: { x: number; y: number; team: Team }[] = [];

  clear(): void {
    this.hits.length = 0;
    this.enemyDied.length = 0;
    this.skillCasts.length = 0;
    this.fired.length = 0;
  }
}

export class CombatWorld {
  readonly player: PlayerState;
  readonly enemies: EnemyState[] = [];
  readonly projectiles: ProjectilePool;
  readonly events = new FrameEvents();

  private readonly enemyHash: SpatialHash;
  private readonly neighborBuf: number[] = [];

  constructor() {
    this.player = createPlayer(WORLD_TUNING.arenaWidth / 2, WORLD_TUNING.arenaHeight / 2, PLAYER_TUNING.maxHp);
    this.projectiles = new ProjectilePool(WORLD_TUNING.projectileCapacity);
    this.enemyHash = new SpatialHash(WORLD_TUNING.hashCellSize);
  }

  spawnEnemy(def: MonsterDef, x: number, y: number): EnemyState {
    const e = createEnemy(x, y, def.radius, def.maxHp);
    this.enemies.push(e);
    return e;
  }

  private removeEnemyAt(i: number): void {
    const last = this.enemies.length - 1;
    if (i !== last) this.enemies[i] = this.enemies[last]!;
    this.enemies.pop();
  }

  step(dt: number, input: InputFrame, enemyDef: MonsterDef): void {
    this.events.clear();
    this.stepPlayerMovement(dt, input);
    this.stepPlayerAttack(dt, input);
    this.stepPlayerSkills(dt, input);
    this.stepEnemies(dt, enemyDef);
    this.projectiles.integrate(dt);
    this.resolveCollisions();
  }

  private stepPlayerMovement(dt: number, input: InputFrame): void {
    const p = this.player;
    p.prevX = p.x;
    p.prevY = p.y;
    p.aimX = input.aimX;
    p.aimY = input.aimY;

    if (p.iFrameTimer > 0) p.iFrameTimer -= dt;

    const dir = normalize({ x: input.moveX, y: input.moveY });
    const targetVx = dir.x * PLAYER_TUNING.maxSpeed;
    const targetVy = dir.y * PLAYER_TUNING.maxSpeed;
    const hasInput = dir.x !== 0 || dir.y !== 0;
    const rate = hasInput ? PLAYER_TUNING.acceleration : PLAYER_TUNING.deceleration;
    p.vx = moveToward(p.vx, targetVx, rate * dt);
    p.vy = moveToward(p.vy, targetVy, rate * dt);

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const r = PLAYER_TUNING.radius;
    p.x = clamp(p.x, r, WORLD_TUNING.arenaWidth - r);
    p.y = clamp(p.y, r, WORLD_TUNING.arenaHeight - r);
  }

  private stepPlayerAttack(dt: number, input: InputFrame): void {
    const p = this.player;
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (input.firing) {
      p.fireBuffer = BASIC_ATTACK_TUNING.bufferWindow;
    } else if (p.fireBuffer > 0) {
      p.fireBuffer -= dt;
    }

    if (p.attackCooldown <= 0 && p.fireBuffer > 0) {
      const aim = normalize({ x: p.aimX, y: p.aimY });
      const dirX = aim.x !== 0 || aim.y !== 0 ? aim.x : 1;
      const dirY = aim.x !== 0 || aim.y !== 0 ? aim.y : 0;
      const spawnDist = PLAYER_TUNING.radius + BASIC_ATTACK_TUNING.projectileRadius + 2;
      this.projectiles.spawn({
        x: p.x + dirX * spawnDist,
        y: p.y + dirY * spawnDist,
        vx: dirX * BASIC_ATTACK_TUNING.projectileSpeed,
        vy: dirY * BASIC_ATTACK_TUNING.projectileSpeed,
        radius: BASIC_ATTACK_TUNING.projectileRadius,
        damage: BASIC_ATTACK_TUNING.damage,
        life: BASIC_ATTACK_TUNING.projectileLife,
        team: Team.Player,
        pierce: BASIC_ATTACK_TUNING.pierce,
        tint: BASIC_ATTACK_TUNING.tint,
      });
      this.events.fired.push({ x: p.x, y: p.y, team: Team.Player });
      p.attackCooldown = BASIC_ATTACK_TUNING.cooldown;
      p.fireBuffer = 0;
    }
  }

  private stepPlayerSkills(dt: number, input: InputFrame): void {
    const p = this.player;
    for (const skillId in p.skillCooldowns) {
      if (p.skillCooldowns[skillId]! > 0) p.skillCooldowns[skillId]! -= dt;
    }

    for (const cast of input.skillCasts) {
      const def = SKILLS[cast.skillId];
      if (!def) continue;
      const remaining = p.skillCooldowns[def.id] ?? 0;
      if (remaining > 0) continue;

      const dir = normalize({ x: cast.targetX - p.x, y: cast.targetY - p.y });
      const dirX = dir.x !== 0 || dir.y !== 0 ? dir.x : 1;
      const dirY = dir.x !== 0 || dir.y !== 0 ? dir.y : 0;
      const spawnDist = PLAYER_TUNING.radius + def.projectileRadius + 2;
      this.projectiles.spawn({
        x: p.x + dirX * spawnDist,
        y: p.y + dirY * spawnDist,
        vx: dirX * def.projectileSpeed,
        vy: dirY * def.projectileSpeed,
        radius: def.projectileRadius,
        damage: def.damage,
        life: def.projectileLife,
        team: Team.Player,
        pierce: def.pierce,
        tint: def.tint,
      });
      p.skillCooldowns[def.id] = def.cooldown;
      this.events.skillCasts.push({ skillId: def.id, x: p.x, y: p.y, dirX, dirY });
    }
  }

  private stepEnemies(dt: number, def: MonsterDef): void {
    for (const e of this.enemies) {
      e.prevX = e.x;
      e.prevY = e.y;
      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;

      if (Math.abs(e.knockbackX) > 0.5 || Math.abs(e.knockbackY) > 0.5) {
        e.x += e.knockbackX * dt;
        e.y += e.knockbackY * dt;
        e.knockbackX *= 0.86;
        e.knockbackY *= 0.86;
      } else {
        e.knockbackX = 0;
        e.knockbackY = 0;
      }

      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0) {
        e.fireCooldown = def.projectile.cooldown;
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const jitter = (Math.random() - 0.5) * 0.3;
        const angle = Math.atan2(dy, dx) + jitter;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        this.projectiles.spawn({
          x: e.x + dirX * (e.radius + def.projectile.radius + 2),
          y: e.y + dirY * (e.radius + def.projectile.radius + 2),
          vx: dirX * def.projectile.speed,
          vy: dirY * def.projectile.speed,
          radius: def.projectile.radius,
          damage: def.projectile.damage,
          life: def.projectile.life,
          team: Team.Enemy,
          pierce: 0,
          tint: def.projectile.tint,
        });
        this.events.fired.push({ x: e.x, y: e.y, team: Team.Enemy });
      }
    }
  }

  private resolveCollisions(): void {
    this.enemyHash.clear();
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!;
      this.enemyHash.insert(i, e.x, e.y);
    }

    const pool = this.projectiles;
    for (let i = pool.count - 1; i >= 0; i--) {
      if (pool.team[i] === Team.Player) {
        this.resolvePlayerProjectile(i);
      } else {
        this.resolveEnemyProjectile(i);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i]!.hp <= 0) {
        const dead = this.enemies[i]!;
        dead.alive = false;
        this.events.enemyDied.push(dead);
        this.removeEnemyAt(i);
      }
    }
  }

  private resolvePlayerProjectile(i: number): void {
    const pool = this.projectiles;
    const midX = (pool.prevX[i]! + pool.x[i]!) / 2;
    const midY = (pool.prevY[i]! + pool.y[i]!) / 2;
    this.enemyHash.queryNeighbors(midX, midY, this.neighborBuf);

    for (const enemyIdx of this.neighborBuf) {
      const e = this.enemies[enemyIdx];
      if (!e || !e.alive) continue;
      const hit = sweptCircleHitsCircle(
        pool.prevX[i]!,
        pool.prevY[i]!,
        pool.x[i]!,
        pool.y[i]!,
        pool.radius[i]!,
        e.x,
        e.y,
        e.radius
      );
      if (!hit) continue;

      const dmg = pool.damage[i]!;
      e.hp -= dmg;
      e.hitFlashTimer = 0.08;
      const kb = normalize({ x: pool.vx[i]!, y: pool.vy[i]! });
      const knockForce = 260;
      e.knockbackX = kb.x * knockForce;
      e.knockbackY = kb.y * knockForce;

      this.events.hits.push({ x: pool.x[i]!, y: pool.y[i]!, damage: dmg, target: 'enemy', killed: e.hp <= 0 });

      if (pool.pierce[i]! > 0) {
        pool.pierce[i]!--;
      } else {
        pool.removeAt(i);
      }
      return;
    }
  }

  private resolveEnemyProjectile(i: number): void {
    if (this.player.iFrameTimer > 0) return;
    const pool = this.projectiles;
    const p = this.player;
    const hit = sweptCircleHitsCircle(
      pool.prevX[i]!,
      pool.prevY[i]!,
      pool.x[i]!,
      pool.y[i]!,
      pool.radius[i]!,
      p.x,
      p.y,
      PLAYER_TUNING.hurtboxRadius
    );
    if (!hit) return;

    const dmg = pool.damage[i]!;
    p.hp = Math.max(0, p.hp - dmg);
    p.iFrameTimer = PLAYER_TUNING.iFrameDuration;
    const kb = normalize({ x: pool.vx[i]!, y: pool.vy[i]! });
    p.vx += kb.x * 180;
    p.vy += kb.y * 180;

    this.events.hits.push({ x: p.x, y: p.y, damage: dmg, target: 'player', killed: p.hp <= 0 });
    pool.removeAt(i);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
