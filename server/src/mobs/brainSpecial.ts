// AI riêng của quái Giai đoạn 7b (MECHANICS.md 8.4): quái nổ (lại gần ≤ 3 block thì xì 1.5 giây rồi nổ, người chạy xa > 7
// block thì xẹp), kẻ hư không (bị nhìn vào mặt / bị đánh thì tức, đuổi, dịch chuyển tới gần; lúc yên thì nhặt / đặt
// block), khối nhầy (nhảy từng cú), bóng ma đêm (bay vòng trên cao rồi lao xuống cắn), phù thủy (ném bình, tự uống hồi máu).
import { MAGMA, PLAYER, isFlower, lineBlocked, mobReach, type CellReader, type MobMove, type Rng } from "../../../shared/src/index.js";
import { B, CATS } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import { face, hdist, sees, toward, type Brain, type BrainCtx } from "./brain.js";
import type { Mob } from "./mob.js";

export type PotionKind = "harm" | "poison" | "slowness" | "weakness" | "fire_resistance"; // (10d1) thuốc kháng lửa ném của người chơi

export interface SpecialCtx {
  cell: CellReader;
  rng: Rng;
  dt: number;
  players: ServerPlayer[];
  meleeHit(m: Mob, p: ServerPlayer): void;
  explode(m: Mob): void;
  /** Dịch chuyển tới chỗ đứng ngẫu nhiên (gần điểm near nếu có); true nếu được. */
  teleport(m: Mob, near?: { x: number; y: number; z: number }, r?: number): boolean;
  potion(m: Mob, p: ServerPlayer, kind: PotionKind): void;
  /** Quái được sửa block ở cột (x, z) không (cấu hình mobGriefing, vùng an toàn). */
  canGrief(x: number, z: number): boolean;
  setBlock(x: number, y: number, z: number, id: number): void;
  /** Ban ngày và sinh vật đứng chỗ thấy trời. */
  sunlit(m: Mob): boolean;
}

const FUSE_S = 1.5;
const FUSE_START = 3;
const FUSE_CANCEL = 7;
const STARE_RANGE = 64;
const WITCH_RANGE = 10;
/** Khối kẻ hư không nhặt được (những khối có trong game). */
const HOLDABLE = new Set<number>([B.GRASS, B.DIRT, B.SAND, B.GRAVEL, B.CACTUS, B.PUMPKIN, B.MELON, B.TNT,
  B.SOUL_SAND, B.SOUL_SOIL, B.CRIMSON_NYLIUM, B.WARPED_NYLIUM, B.CRIMSON_FUNGUS, B.WARPED_FUNGUS, B.CRIMSON_ROOTS, B.WARPED_ROOTS]); // (10b)
const holdable = (id: number): boolean => HOLDABLE.has(id) || isFlower(id);

export class SpecialBrains {
  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain) {}

  /** Xử lý loài đặc biệt; false nếu loài này dùng AI chung. */
  think(m: Mob, mv: MobMove): boolean {
    switch (m.def.brain) {
      case "creeper": return this.creeper(m, mv), true;
      case "enderman": return this.enderman(m, mv), true;
      case "slime": return this.slime(m, mv), true;
      case "flyer": return this.phantom(m, mv), true;
      case "witch": return this.witch(m, mv), true;
      default: return false;
    }
  }

  private creeper(m: Mob, mv: MobMove): void {
    const t = m.target, dt = this.ctx.dt;
    const cat = m.ignited ? null : this.ctx.near(m, CATS.CREEPER_AVOID_R).find((o) => o.def.key === "cat"); // (8a) sợ mèo
    if (cat) {
      m.fuseS = 0;
      m.path = null;
      return toward(mv, m, m.x * 2 - cat.x, m.z * 2 - cat.z, m.def.run);
    }
    const d = t ? Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z) : Infinity;
    const swelling = m.ignited || (m.fuseS > 0 ? d <= FUSE_CANCEL : d <= FUSE_START && !!t && sees(this.ctx, m, t));
    if (swelling) {
      m.path = null;
      if (t) face(m, t.x, t.z);
      m.fuseS += dt;
      if (m.fuseS >= FUSE_S) this.ctx.explode(m);
      return;
    }
    m.fuseS = Math.max(0, m.fuseS - dt);
    if (!t) return this.brain.wander(m, mv, m.def.walk);
    if (hdist(m.x, m.z, t.x, t.z) < 2 && Math.abs(t.y - m.y) < 1.5) toward(mv, m, t.x, t.z, m.def.run);
    else this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
  }

  /** Người chơi đang nhìn thẳng vào đầu kẻ hư không (trong 64 block, không bị chắn). */
  private stared(m: Mob): ServerPlayer | null {
    for (const p of this.ctx.players) {
      const eye = p.eye(), dx = m.x - eye[0], dy = m.eyeY - eye[1], dz = m.z - eye[2], dist = Math.hypot(dx, dy, dz);
      if (dist > STARE_RANGE || dist < 0.5) continue;
      const look = p.lookDir(), dot = (look.x * dx + look.y * dy + look.z * dz) / dist;
      if (dot <= 1 - 0.025 / dist) continue;
      if (!lineBlocked(this.ctx.cell, eye, [dx / dist, dy / dist, dz / dist], dist - 0.3)) return p;
    }
    return null;
  }

  private enderman(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    m.teleCdS = Math.max(0, m.teleCdS - ctx.dt);
    // ban ngày ngoài trời: thỉnh thoảng bỏ mục tiêu và dịch chuyển đi chỗ khác (như Minecraft)
    if (m.teleCdS <= 0 && ctx.sunlit(m) && ctx.rng() < ctx.dt / 5) {
      m.target = null;
      if (ctx.teleport(m)) m.teleCdS = 2;
      return;
    }
    if (!m.target && m.lookS <= 0) {
      m.lookS = 0.25;
      m.target = this.stared(m);
      if (m.target) m.angryS = 60;
    }
    const t = m.target;
    if (!t) {
      this.grief(m);
      return this.brain.wander(m, mv, m.def.walk);
    }
    const d = Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z);
    // xa hoặc kẹt: dịch chuyển lại gần mục tiêu
    if (m.teleCdS <= 0 && (d > 16 || m.stuckS > 1) && ctx.rng() < 0.05) {
      if (ctx.teleport(m, t)) m.teleCdS = 2;
      return;
    }
    if (hdist(m.x, m.z, t.x, t.z) < 2.5 && Math.abs(t.y - m.y) < 2) toward(mv, m, t.x, t.z, m.def.run);
    else this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
    if (hdist(m.x, m.z, t.x, t.z) <= mobReach(m.def, PLAYER.WIDTH) && Math.abs(t.y - m.y) < 2.5 && m.attackCdS <= 0) {
      ctx.meleeHit(m, t);
      m.attackCdS = m.def.attackS;
    }
  }

  /** Kẻ hư không lúc yên: thỉnh thoảng nhặt một khối gần đó, đang cầm thì thỉnh thoảng đặt xuống chỗ khác. */
  private grief(m: Mob): void {
    const ctx = this.ctx, rng = ctx.rng;
    if (!m.carry) {
      if (rng() >= ctx.dt / 1) return; // khoảng 1 lần thử mỗi giây
      const x = Math.floor(m.x + rng() * 4 - 2), y = Math.floor(m.y + rng() * 3), z = Math.floor(m.z + rng() * 4 - 2);
      const c = ctx.cell(x, y, z);
      if (c <= 0 || !holdable(c & 255) || !ctx.canGrief(x, z)) return;
      m.carry = c & 255;
      ctx.setBlock(x, y, z, B.AIR);
      return;
    }
    if (rng() >= ctx.dt / 100) return; // đặt xuống: hiếm
    const x = Math.floor(m.x + rng() * 2 - 1), y = Math.floor(m.y + rng() * 2), z = Math.floor(m.z + rng() * 2 - 1);
    const below = ctx.cell(x, y - 1, z);
    if (ctx.cell(x, y, z) !== B.AIR || below <= 0 || (below & 255) === B.WATER || !ctx.canGrief(x, z)) return;
    ctx.setBlock(x, y, z, m.carry);
    m.carry = 0;
  }

  private slime(m: Mob, mv: MobMove): void {
    const t = m.target, ctx = this.ctx;
    m.hopS -= ctx.dt;
    const b = m.body;
    if (b.onGround && m.hopS > 0) return; // đứng chờ cú nhảy kế
    let tx: number, tz: number;
    if (t) {
      tx = t.x;
      tz = t.z;
      face(m, t.x, t.z);
    } else {
      const a = m.yaw + (ctx.rng() - 0.5) * (b.onGround ? 1.5 : 0);
      tx = m.x - Math.sin(a) * 5;
      tz = m.z - Math.cos(a) * 5;
    }
    toward(mv, m, tx, tz, t ? m.def.run : m.def.walk);
    const magma = m.def.key === "magma_cube"; // (10b) khối nhầy dung nham: nhảy cao hơn, cỡ nhỏ nhất cũng cắn
    if (b.onGround) {
      mv.jump = true;
      if (magma) mv.jumpV = MAGMA.JUMP_V;
      m.hopS = t ? 0.5 + ctx.rng() * 0.5 : 1 + ctx.rng() * 2;
    }
    if (t && (m.variant >= 2 || magma) && m.attackCdS <= 0) {
      const reach = m.width / 2 + PLAYER.WIDTH / 2 + 0.3;
      if (hdist(m.x, m.z, t.x, t.z) <= reach && t.y - m.y < m.height && m.y - t.y < PLAYER.HEIGHT) {
        ctx.meleeHit(m, t);
        m.attackCdS = m.def.attackS;
      }
    }
  }

  private phantom(m: Mob, mv: MobMove): void {
    const t = m.target, ctx = this.ctx;
    const cx = t ? t.x : (m.pathGoal?.x ?? m.x), cz = t ? t.z : (m.pathGoal?.z ?? m.z);
    if (!m.pathGoal) m.pathGoal = { x: Math.floor(m.x), y: Math.floor(m.y), z: Math.floor(m.z) };
    const cat = t ? this.ctx.near(m, 64).some((o) => o.def.key === "cat" && Math.hypot(o.x - t.x, o.z - t.z) < CATS.PHANTOM_AVOID_R) : false;
    if (cat) m.swoopS = 0; // (8a) người có mèo ở gần: không lao xuống
    if (t && m.swoopS > 0) {
      // lao xuống cắn
      m.swoopS += ctx.dt;
      const dx = t.x - m.x, dy = t.y + 0.9 - m.y, dz = t.z - m.z, d = Math.hypot(dx, dy, dz) || 1;
      mv.vx = (dx / d) * m.def.run;
      mv.vy = (dy / d) * m.def.run;
      mv.vz = (dz / d) * m.def.run;
      face(m, t.x, t.z);
      if (d < 1.4 && m.attackCdS <= 0) {
        ctx.meleeHit(m, t);
        m.attackCdS = m.def.attackS;
        m.swoopS = 0;
      } else if (m.swoopS > 3 || m.body.collidedH) m.swoopS = 0;
      return;
    }
    // bay vòng quanh (trên đầu mục tiêu hoặc quanh điểm gốc)
    const a = Math.atan2(m.z - cz, m.x - cx) + 0.6, r = 10;
    const gx = cx + Math.cos(a) * r, gz = cz + Math.sin(a) * r, gy = (t ? t.y : m.pathGoal.y) + 12;
    toward(mv, m, gx, gz, m.def.walk);
    mv.vy = Math.max(-3, Math.min(3, (gy - m.y) * 0.8));
    if (t && !cat && m.attackCdS <= 0 && ctx.rng() < ctx.dt / 3) m.swoopS = 0.01;
  }

  private witch(m: Mob, mv: MobMove): void {
    const t = m.target, ctx = this.ctx;
    m.drinkCdS = Math.max(0, m.drinkCdS - ctx.dt);
    if (m.health < m.def.health / 2 && m.drinkCdS <= 0) {
      m.health = Math.min(m.def.health, m.health + 4); // uống bình hồi máu
      m.drinkCdS = 8;
    }
    if (!t) return this.brain.wander(m, mv, m.def.walk);
    const d = Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z);
    if (d > WITCH_RANGE || !sees(ctx, m, t)) return this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
    m.path = null;
    face(m, t.x, t.z);
    if (m.attackCdS > 0) return;
    m.attackCdS = m.def.attackS;
    const s = t.state;
    const kind: PotionKind = t.sprinting && s.fxSlowS <= 0 ? "slowness" : t.health >= 8 && s.fxPoisonS <= 0 ? "poison"
      : d <= 3 && s.fxWeakS <= 0 ? "weakness" : "harm";
    ctx.potion(m, t, kind);
  }
}
