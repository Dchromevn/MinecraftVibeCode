// AI sinh vật (Giai đoạn 7a, MECHANICS.md 8.4): quái đuổi đánh (xác sống, nhện — nhện leo tường, ban ngày trung lập),
// bộ xương giữ khoảng cách bắn tên, động vật đi lang thang / chạy khi bị đánh / đi theo người cầm đồ ăn / phối giống.
// Mỗi tick đặt vận tốc mong muốn (m.move) để Mobs chạy vật lý.
import {
  ANIMALS, BREED, MOB_AI, PLAYER, lineBlocked, mobReach, type CellReader, type MobMove, type Rng,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { Mob, PathNode } from "./mob.js";
import type { PathFinder } from "./pathfind.js";
import { SpecialBrains, type SpecialCtx } from "./brainSpecial.js";
import { AnimalBrains, type AnimalCtx } from "./brainAnimals.js";
import { VillageBrains, type VillageCtx } from "./brainVillage.js";
import { IllagerBrains, type IllagerCtx } from "./brainIllager.js";
import { SpellBrains, type SpellCtx } from "./brainSpell.js";
import { NetherBrains, type NetherCtx } from "./brainNether.js";
import type { PiglinCtx } from "./brainPiglin.js";
import { isZombie } from "./villagers.js";

export interface BrainCtx extends SpecialCtx, AnimalCtx, VillageCtx, IllagerCtx, SpellCtx, NetherCtx, PiglinCtx {
  cell: CellReader;
  paths: PathFinder;
  rng: Rng;
  dt: number;
  /** (7d) Sinh vật bị dắt đang ở xa đầu dây: vị trí cần đi tới; null = tự do. */
  leashPull(m: Mob): { x: number; y: number; z: number } | null;
  /** Người chơi có thể bị nhắm / đi theo (còn sống, không bay). */
  players: ServerPlayer[];
  /** Ánh sáng thực tế (trời đã trừ theo giờ, max với block) ở ô; âm = chưa biết. */
  brightness(x: number, y: number, z: number): number;
  meleeHit(m: Mob, p: ServerPlayer): void;
  shoot(m: Mob, p: ServerPlayer): void;
  /** Bạn tình gần nhất cùng loài đang muốn phối giống. */
  partner(m: Mob): Mob | null;
  breed(a: Mob, b: Mob): void;
  layEgg(m: Mob): void;
  eatGrass(m: Mob): void;
}

const SPIDER_DAY_LIGHT = 12, SKELETON_RANGE = 15, SKELETON_MIN = 5, AIM_S = 1;

export const hdist = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
const node = (x: number, y: number, z: number): PathNode => ({ x: Math.floor(x), y: Math.floor(y + 0.01), z: Math.floor(z) });

export function face(m: Mob, x: number, z: number): void {
  const dx = x - m.x, dz = z - m.z;
  if (dx * dx + dz * dz > 1e-6) m.yaw = Math.atan2(-dx, -dz);
}

export function toward(mv: MobMove, m: Mob, x: number, z: number, speed: number): void {
  const dx = x - m.x, dz = z - m.z, d = Math.hypot(dx, dz);
  if (d < 1e-3) return;
  mv.vx = (dx / d) * speed;
  mv.vz = (dz / d) * speed;
  face(m, x, z);
}

/** Người chơi nhìn thấy được từ mắt sinh vật (không có block chắn). */
export function sees(ctx: BrainCtx, m: Mob, p: ServerPlayer): boolean {
  const o = [m.x, m.eyeY, m.z], ty = p.y + PLAYER.EYE_HEIGHT * 0.8;
  const d = [p.x - o[0]!, ty - o[1]!, p.z - o[2]!], len = Math.hypot(d[0]!, d[1]!, d[2]!);
  if (len < 1e-3) return true;
  return !lineBlocked(ctx.cell, o, d.map((v) => v / len), len);
}

export class Brain {
  private readonly special: SpecialBrains;
  readonly animals: AnimalBrains;
  private readonly village: VillageBrains;
  private readonly illager: IllagerBrains;
  private readonly spell: SpellBrains;
  private readonly nether: NetherBrains; // (10b)

  constructor(private readonly ctx: BrainCtx) {
    this.special = new SpecialBrains(ctx, this);
    this.animals = new AnimalBrains(ctx, this);
    this.village = new VillageBrains(ctx, this, this.animals);
    this.illager = new IllagerBrains(ctx, this);
    this.spell = new SpellBrains(ctx, this);
    this.nether = new NetherBrains(ctx, this);
  }

  /** Một tick AI: trả về vận tốc mong muốn. */
  think(m: Mob): MobMove {
    const ctx = this.ctx, dt = ctx.dt;
    const mv: MobMove = {
      vx: 0, vz: 0, jump: false, climb: m.def.brain === "spider", slowFall: m.def.key === "chicken", fly: !!m.def.flies, swim: !!m.def.swims || !!m.def.aquatic, fallSafe: m.def.fallSafe,
    };
    m.attackCdS = Math.max(0, m.attackCdS - dt);
    m.repathS -= dt;
    m.lookS -= dt;
    m.angryS = Math.max(0, m.angryS - dt);
    const lp = !m.def.hostile ? ctx.leashPull(m) : null; // (7d) đang bị dắt mà xa người / cọc / con dẫn đầu: đi về phía đó
    if (lp) this.chase(m, mv, lp.x, lp.y, lp.z, m.def.run);
    else if (m.def.hostile) this.hostile(m, mv);
    else if (m.def.brain === "allay") this.illager.allay(m, mv); // (8b)
    else if (!this.nether.passive(m, mv) && !this.village.think(m, mv) && !this.animals.think(m, mv)) this.animalBase(m, mv); // (7c, 8a, 10b) loài riêng trước, không thì AI chung
    // đi theo đường: nhảy khi ô kế cao hơn hoặc đụng tường; kẹt lâu thì bỏ đường
    if (m.jumpNext || (m.body.collidedH && m.body.onGround && (mv.vx || mv.vz))) mv.jump = true;
    m.jumpNext = false;
    return mv;
  }

  // ---------- quái ----------
  acquire(m: Mob): void {
    const ctx = this.ctx;
    if (m.target && (m.target.dead || m.target.flying || !ctx.players.includes(m.target) ||
      hdist(m.x, m.z, m.target.x, m.target.z) > m.def.follow * 1.3)) m.target = null;
    if (m.def.brain === "spider" && m.target && m.angryS <= 0 && this.daylit(m) && ctx.rng() < 0.01) m.target = null;
    if (m.def.neutral) return void (m.angryS <= 0 && (m.target = null)); // (10b) người lợn xác sống: chỉ đánh người đã chọc (nó / bầy) khi còn giận
    if (m.target || m.lookS > 0 || m.def.brain === "enderman" || m.def.brain === "ghast" || m.def.brain === "piglin" || m.def.brain === "zoglin") return; // kẻ hư không chỉ tức khi bị nhìn / bị đánh; ma bay, (10d1) người lợn, lợn rừng xác sống tự nhắm
    m.lookS = 0.5;
    if (m.def.brain === "spider" && m.angryS <= 0 && this.daylit(m)) return; // nhện ban ngày trung lập
    let best: ServerPlayer | null = null, bd = m.def.follow;
    for (const p of ctx.players) {
      const d = Math.hypot(p.x - m.x, p.y - m.y, p.z - m.z);
      if (d < bd && sees(ctx, m, p)) {
        bd = d;
        best = p;
      }
    }
    m.target = best;
  }

  private daylit(m: Mob): boolean {
    return this.ctx.brightness(Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z)) >= SPIDER_DAY_LIGHT;
  }

  private hostile(m: Mob, mv: MobMove): void {
    this.acquire(m);
    if (this.spell.think(m, mv)) return; // (8c) pháp sư, tiểu quỷ
    if (this.nether.hostile(m, mv)) return; // (10b) ma bay, lợn rừng lửa
    if (this.special.think(m, mv)) return; // quái nổ, kẻ hư không, khối nhầy, bóng ma đêm, phù thủy (7b)
    const t = m.target;
    if (!t && isZombie(m) && this.village.zombieHunt(m, mv)) return; // (8a) xác sống săn dân làng
    if (!t && this.illager.patrol(m, mv)) return; // (8b) kẻ cướp đi tuần
    if (!t) return this.wander(m, mv, m.def.walk);
    const d = hdist(m.x, m.z, t.x, t.z), dy = t.y - m.y;
    if (m.def.brain === "ranged") return this.ranged(m, mv, t, d);
    // xác đuối dưới nước: bơi lên / xuống theo mục tiêu
    if (m.def.swims && m.body.inWater) mv.vy = Math.max(-3, Math.min(3, (t.y - m.y) * 2));
    const reach = mobReach(m.def, PLAYER.WIDTH) * (m.baby ? 0.75 : 1);
    const close = d < 2.5 && Math.abs(dy) < 1.5;
    if (close) toward(mv, m, t.x, t.z, m.def.run * (m.baby ? 1.5 : 1));
    else this.chase(m, mv, t.x, t.y, t.z, m.def.run * (m.baby ? 1.5 : 1));
    // nhện: vồ tới khi cách 2–4 block
    if (m.def.brain === "spider" && d > 2 && d < 4 && m.body.onGround && this.ctx.rng() < 0.1) {
      m.body.vy = 6;
      toward(mv, m, t.x, t.z, m.def.run * 1.6);
    }
    if (d <= reach && dy > -m.height && dy < PLAYER.HEIGHT && m.attackCdS <= 0 && sees(this.ctx, m, t)) {
      this.ctx.meleeHit(m, t);
      m.attackCdS = m.def.attackS;
    }
  }

  private ranged(m: Mob, mv: MobMove, t: ServerPlayer, d: number): void {
    const visible = d <= SKELETON_RANGE && sees(this.ctx, m, t);
    if (!visible) {
      m.aimS = 0;
      return this.chase(m, mv, t.x, t.y, t.z, m.def.run);
    }
    m.path = null;
    if (d < SKELETON_MIN) {
      // lùi lại, vẫn nhìn mục tiêu
      toward(mv, m, m.x - (t.x - m.x), m.z - (t.z - m.z), m.def.walk);
    }
    face(m, t.x, t.z);
    m.pitch = Math.atan2(t.y + 1 - m.eyeY, d); // dương = ngẩng lên (như người chơi)
    m.aimS += this.ctx.dt;
    if (m.aimS >= AIM_S && m.attackCdS <= 0) {
      this.ctx.shoot(m, t);
      m.attackCdS = m.def.attackS;
      m.aimS = 0;
    }
  }

  // ---------- động vật ----------
  /** (7c) Bị đánh: loài biết đánh lại (sói, gấu, lạc đà không bướu, cá heo) thì nhắm kẻ đánh, trả về true. */
  onHurt(m: Mob, by: ServerPlayer | null): boolean {
    return this.village.onHurt(m, by) || this.animals.onHurt(m, by);
  }

  /** AI động vật chung: chạy trốn, phối giống, đi theo đồ ăn, đi lang thang. */
  animalBase(m: Mob, mv: MobMove): void {
    const ctx = this.ctx, dt = ctx.dt;
    m.panicS = Math.max(0, m.panicS - dt);
    m.loveS = Math.max(0, m.loveS - dt);
    m.breedCdS = Math.max(0, m.breedCdS - dt);
    if (m.def.key === "chicken" && !m.baby) {
      m.eggS -= dt;
      if (m.eggS <= 0) {
        ctx.layEgg(m);
        m.eggS = ANIMALS.EGG_MIN_S + ctx.rng() * (ANIMALS.EGG_MAX_S - ANIMALS.EGG_MIN_S);
      }
    }
    if (m.def.key === "sheep" && m.sheared && ctx.rng() < ANIMALS.REGROW_CHANCE * dt) ctx.eatGrass(m);
    if (m.panicS > 0) {
      if (!m.path || m.pathI >= m.path.length) {
        const from = m.panicFrom ?? { x: m.x + ctx.rng() - 0.5, z: m.z + ctx.rng() - 0.5 };
        const a = Math.atan2(m.z - from.z, m.x - from.x) + (ctx.rng() - 0.5) * 1.5, r = 6 + ctx.rng() * 4;
        this.goTo(m, m.x + Math.cos(a) * r, m.y, m.z + Math.sin(a) * r, true);
      }
      return this.follow(m, mv, m.def.run);
    }
    if (m.loveS > 0) {
      const p = ctx.partner(m);
      if (p) {
        if (hdist(m.x, m.z, p.x, p.z) < 1.5) return ctx.breed(m, p);
        toward(mv, m, p.x, p.z, m.def.walk * 1.2);
        return;
      }
    }
    // đi theo người cầm món ưa thích
    const food = m.def.food ?? [];
    let lure: ServerPlayer | null = null, ld: number = MOB_AI.TEMPT_RANGE;
    for (const p of ctx.players) {
      const held = p.inv.held?.item;
      if (!held || !food.includes(held)) continue;
      const d = Math.hypot(p.x - m.x, p.y - m.y, p.z - m.z);
      if (d < ld) {
        ld = d;
        lure = p;
      }
    }
    if (lure) {
      m.path = null;
      face(m, lure.x, lure.z);
      if (ld > MOB_AI.TEMPT_STOP) toward(mv, m, lure.x, lure.z, m.def.walk * 1.1);
      return;
    }
    this.wander(m, mv, m.def.walk);
  }

  // ---------- di chuyển ----------
  wander(m: Mob, mv: MobMove, speed: number): void {
    const ctx = this.ctx;
    if (m.path && m.pathI < m.path.length) return this.follow(m, mv, speed);
    m.path = null;
    m.idleS -= ctx.dt;
    if (m.idleS > 0) return;
    m.idleS = MOB_AI.WANDER_IDLE_MIN_S + ctx.rng() * (MOB_AI.WANDER_IDLE_MAX_S - MOB_AI.WANDER_IDLE_MIN_S);
    const r = MOB_AI.WANDER_RANGE, a = ctx.rng() * Math.PI * 2, dist = 3 + ctx.rng() * (r - 3);
    this.goTo(m, m.x + Math.cos(a) * dist, m.y, m.z + Math.sin(a) * dist, true);
  }

  /** Đuổi theo điểm (x, y, z): tìm lại đường mỗi REPATH_S giây hoặc khi đích đổi xa. */
  chase(m: Mob, mv: MobMove, x: number, y: number, z: number, speed: number): void {
    const g = node(x, y, z), old = m.pathGoal;
    const moved = !old || Math.abs(old.x - g.x) + Math.abs(old.z - g.z) + Math.abs(old.y - g.y) > 1;
    if (!m.path || m.pathI >= m.path.length || (m.repathS <= 0 && moved)) this.goTo(m, x, y, z, false);
    this.follow(m, mv, speed);
  }

  /** Lập đường tới (x, y, z); ground: tìm chỗ đứng gần đó trước (đi lang thang / chạy trốn). */
  goTo(m: Mob, x: number, y: number, z: number, ground: boolean): void {
    const cells = Math.max(1, Math.ceil(m.height - 0.05));
    const to = node(x, y, z);
    if (ground) {
      const gy = this.ctx.paths.ground(to.x, to.y, to.z, cells);
      if (gy === null) return;
      to.y = gy;
    }
    const p = this.ctx.paths.find(node(m.x, m.y, m.z), to, cells);
    if (p === null) return; // hết ngân sách tick này: thử lại tick sau
    m.path = p.length ? p : null;
    m.pathI = 0;
    m.pathGoal = to;
    m.repathS = MOB_AI.REPATH_S;
    m.stuckS = 0;
  }

  /** Đi theo đường đã lập. */
  private follow(m: Mob, mv: MobMove, speed: number): void {
    const path = m.path;
    if (!path) return;
    let n = path[m.pathI];
    while (n && hdist(m.x, m.z, n.x + 0.5, n.z + 0.5) < 0.35 + m.width * 0.2 && Math.abs(m.y - n.y) < 1.1) n = path[++m.pathI];
    if (!n) {
      m.path = null;
      return;
    }
    toward(mv, m, n.x + 0.5, n.z + 0.5, speed);
    if (n.y > m.y + 0.5 && hdist(m.x, m.z, n.x + 0.5, n.z + 0.5) < 1.6) m.jumpNext = true;
    // kẹt: gần như không di chuyển một lúc thì bỏ đường
    const v = Math.hypot(m.body.vx, m.body.vz);
    m.stuckS = v < speed * 0.2 ? m.stuckS + this.ctx.dt : 0;
    if (m.stuckS > MOB_AI.STUCK_S) {
      m.path = null;
      m.stuckS = 0;
      m.jumpNext = true;
    }
  }
}

/** Thời gian trứng đầu tiên của gà mới sinh. */
export const firstEggS = (rng: Rng): number => ANIMALS.EGG_MIN_S + rng() * (ANIMALS.EGG_MAX_S - ANIMALS.EGG_MIN_S);
/** Con non mới sinh: thời gian lớn. */
export const BABY_GROW_S = BREED.GROW_S;
