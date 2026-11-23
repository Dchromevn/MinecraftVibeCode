// AI sinh vật Vực Lửa Giai đoạn 10b (Minecraft Java, MECHANICS / DESIGN mục Vực Lửa): ma bay (bay lang thang tới điểm ngẫu nhiên ±16,
// nhắm người chơi lệch độ cao ≤ 4, há miệng rồi bắn cầu lửa mỗi 3 giây), kẻ lội dung nham (đi trên dung nham; lên cạn thì lạnh,
// chậm, tìm về dung nham; theo người cầm nấm cong vênh, phối giống), lợn rừng lửa (đuổi húc hất lên, tránh nấm cong vênh / cổng
// Vực Lửa trong 7 block, ăn nấm đỏ thẫm thì phối giống). Người lợn xác sống dùng AI cận chiến chung (trung lập — brain.ts).
import { B, BREED, GHAST, HOGLIN, PLAYER, STRIDER, mobFits, mobReach, randInt, type CellReader, type MobMove } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import { face, hdist, sees, toward, type Brain, type BrainCtx } from "./brain.js";
import type { Mob } from "./mob.js";
import { blazeBrain } from "./brainFortress.js";
import { PiglinBrains } from "./brainPiglin.js";

export interface NetherCtx {
  /** Ma bay m bắn cầu lửa vào t. */
  fireball(m: Mob, t: ServerPlayer): void;
  /** (10c) Quỷ lửa m bắn một cầu lửa nhỏ vào t. */
  blazeFire(m: Mob, t: ServerPlayer): void;
  /** Lợn rừng lửa húc người chơi: sát thương + hất lên. */
  toss(m: Mob, p: ServerPlayer, dmg: number, vy: number): void;
}

const isLava = (c: number): boolean => c >= 0 && (c & 255) === B.LAVA;

/** Kẻ lội dung nham đứng trên / trong dung nham (ấm). */
export function striderWarm(cell: CellReader, m: Mob): boolean {
  return m.body.inLava || isLava(cell(Math.floor(m.x), Math.floor(m.y - 0.5), Math.floor(m.z)));
}

export class NetherBrains {
  private readonly piglins: PiglinBrains; // (10d1)
  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain) {
    this.piglins = new PiglinBrains(ctx, brain);
  }

  /** Quái Vực Lửa riêng; false nếu không phải. */
  hostile(m: Mob, mv: MobMove): boolean {
    if (m.def.brain === "ghast") return this.ghast(m, mv), true;
    if (m.def.brain === "hoglin") return this.hoglin(m, mv), true;
    if (m.def.brain === "blaze") return blazeBrain(this.ctx, m, mv), true; // (10c)
    return this.piglins.think(m, mv); // (10d1) người lợn, vệ binh, lợn rừng xác sống
  }

  /** Sinh vật hiền Vực Lửa (kẻ lội dung nham); false nếu không phải. */
  passive(m: Mob, mv: MobMove): boolean {
    if (m.def.brain !== "strider") return false;
    this.strider(m, mv);
    return true;
  }

  // ---------- ma bay ----------
  private ghast(m: Mob, mv: MobMove): void {
    const ctx = this.ctx, dt = ctx.dt;
    let t = m.target;
    if (t && (t.dead || t.flying || !ctx.players.includes(t) || Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z) > m.def.follow)) t = m.target = null;
    if (!t && m.lookS <= 0) { // chỉ nhắm người chơi gần ngang tầm (lệch độ cao ≤ 4) và thấy được
      m.lookS = 0.5;
      let bd: number = GHAST.RANGE;
      for (const p of ctx.players) {
        const d = Math.hypot(p.x - m.x, p.y - m.y, p.z - m.z);
        if (d < bd && Math.abs(p.y - m.y) <= GHAST.ACQUIRE_DY && sees(ctx, m, p)) {
          bd = d;
          t = m.target = p;
        }
      }
    }
    // bay lang thang: điểm ngẫu nhiên ±16 (cả độ cao), tới nơi / bị chặn thì chọn điểm khác
    const g = m.pathGoal;
    if (!g || Math.hypot(g.x + 0.5 - m.x, g.y - m.y, g.z + 0.5 - m.z) < 2 || m.body.collidedH || (m.stuckS += dt) > 6) {
      m.stuckS = 0;
      for (let k = 0; k < 8; k++) {
        const W = GHAST.WANDER, x = Math.floor(m.x + (ctx.rng() * 2 - 1) * W), z = Math.floor(m.z + (ctx.rng() * 2 - 1) * W);
        const y = Math.max(8, Math.min(116, Math.floor(m.y + (ctx.rng() * 2 - 1) * W)));
        if (mobFits(ctx.cell, m.width, m.height, x + 0.5, y, z + 0.5)) {
          m.pathGoal = { x, y, z };
          break;
        }
      }
    }
    if (m.pathGoal) {
      const dx = m.pathGoal.x + 0.5 - m.x, dy = m.pathGoal.y - m.y, dz = m.pathGoal.z + 0.5 - m.z, d = Math.hypot(dx, dy, dz) || 1;
      mv.vx = (dx / d) * m.def.walk;
      mv.vy = (dy / d) * m.def.walk;
      mv.vz = (dz / d) * m.def.walk;
      if (!t) face(m, m.pathGoal.x + 0.5, m.pathGoal.z + 0.5);
    }
    if (!t) {
      m.aimS = Math.max(0, m.aimS - dt);
      return;
    }
    face(m, t.x, t.z);
    const d = Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z);
    m.pitch = Math.atan2(t.y + 1 - m.eyeY, hdist(m.x, m.z, t.x, t.z));
    if (d > GHAST.RANGE || !sees(ctx, m, t)) {
      m.aimS = Math.max(0, m.aimS - dt);
      return;
    }
    m.aimS += dt; // âm = đang chờ lượt bắn kế
    if (m.aimS >= GHAST.CHARGE_S) {
      ctx.fireball(m, t);
      m.aimS = GHAST.CHARGE_S - GHAST.FIRE_S;
    }
  }

  // ---------- kẻ lội dung nham ----------
  private strider(m: Mob, mv: MobMove): void {
    const ctx = this.ctx, warm = striderWarm(ctx.cell, m);
    m.cold = !warm;
    if (m.rider) return;
    const lured = m.loveS > 0 || m.panicS > 0 || ctx.players.some((p) => p.inv.held?.item === "warped_fungus" && Math.hypot(p.x - m.x, p.z - m.z) < 10);
    if (!warm) {
      // trên cạn: tìm dung nham gần nhất (mỗi 2 giây dò một lần), không có thì như động vật thường (chậm)
      if (!lured && (m.lookS <= 0 || !m.home)) {
        m.lookS = 2;
        m.home = this.lavaNear(m);
      }
      if (!lured && m.home) return toward(mv, m, m.home.x + 0.5, m.home.z + 0.5, STRIDER.LAND_SPEED * STRIDER.COLD_FACTOR);
      this.brain.animalBase(m, mv);
      mv.vx *= STRIDER.COLD_FACTOR;
      mv.vz *= STRIDER.COLD_FACTOR;
      return;
    }
    m.home = null;
    if (lured) return this.brain.animalBase(m, mv); // đi theo / phối giống (đi thẳng trên dung nham)
    // lang thang trên dung nham: giữ hướng một lúc, gặp bờ thì quay lại
    m.idleS -= ctx.dt;
    if (m.idleS <= 0) {
      m.idleS = 2 + ctx.rng() * 6;
      m.yaw = ctx.rng() < 0.3 ? m.yaw : ctx.rng() * Math.PI * 2;
      m.speed = ctx.rng() < 0.25 ? 0 : STRIDER.LAVA_SPEED;
    }
    const ax = m.x - Math.sin(m.yaw) * 1.5, az = m.z - Math.cos(m.yaw) * 1.5;
    if (!isLava(ctx.cell(Math.floor(ax), Math.floor(m.y - 0.5), Math.floor(az)))) m.yaw += Math.PI * (0.5 + ctx.rng());
    mv.vx = -Math.sin(m.yaw) * m.speed;
    mv.vz = -Math.cos(m.yaw) * m.speed;
  }

  /** Mặt dung nham gần m (trong 8 block), hoặc null. */
  private lavaNear(m: Mob): { x: number; y: number; z: number } | null {
    const c = this.ctx.cell;
    for (let t = 0; t < 40; t++) {
      const x = Math.floor(m.x) + randInt(this.ctx.rng, -8, 8), z = Math.floor(m.z) + randInt(this.ctx.rng, -8, 8);
      for (let y = Math.floor(m.y) + 2; y > m.y - 4; y--)
        if (isLava(c(x, y, z)) && !isLava(c(x, y + 1, z))) return { x, y: y + 1, z };
    }
    return null;
  }

  // ---------- lợn rừng lửa ----------
  private hoglin(m: Mob, mv: MobMove): void {
    const ctx = this.ctx, dt = ctx.dt;
    m.loveS = Math.max(0, m.loveS - dt);
    m.breedCdS = Math.max(0, m.breedCdS - dt);
    m.panicS = Math.max(0, m.panicS - dt);
    if (m.loveS > 0) { // đã ăn nấm đỏ thẫm: tìm bạn phối giống, không đánh
      const p = ctx.partner(m);
      m.target = null;
      if (p) {
        if (hdist(m.x, m.z, p.x, p.z) < 2) return ctx.breed(m, p);
        return toward(mv, m, p.x, p.z, m.def.walk * 1.2);
      }
    }
    if ((m.teleCdS -= dt) <= 0) { // dò nấm cong vênh / cổng Vực Lửa quanh đây (mỗi giây)
      m.teleCdS = HOGLIN.AVOID_SCAN_S;
      const f = this.scary(m);
      if (f) {
        m.panicS = HOGLIN.AVOID_SCAN_S + 0.5;
        m.panicFrom = f;
      }
    }
    if (m.panicS > 0 && m.panicFrom) {
      m.target = null;
      m.path = null;
      return toward(mv, m, m.x * 2 - m.panicFrom.x, m.z * 2 - m.panicFrom.z, m.def.run);
    }
    if (m.prey && (m.prey.dead || hdist(m.x, m.z, m.prey.x, m.prey.z) > 24)) m.prey = null;
    const o = m.prey; // (10d1) bị người lợn / lợn rừng xác sống đánh: đánh trả
    if (o && !m.baby) {
      toward(mv, m, o.x, o.z, m.def.run);
      if (hdist(m.x, m.z, o.x, o.z) <= mobReach(m.def, o.width) && m.attackCdS <= 0) {
        ctx.bite(m, o, randInt(ctx.rng, HOGLIN.DAMAGE[0], HOGLIN.DAMAGE[1]));
        m.attackCdS = m.def.attackS;
      }
      return;
    }
    const t = m.target;
    if (!t || m.baby) return this.brain.wander(m, mv, m.def.walk);
    const d = hdist(m.x, m.z, t.x, t.z);
    if (d < 2.5 && Math.abs(t.y - m.y) < 1.5) toward(mv, m, t.x, t.z, m.def.run);
    else this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
    if (d <= mobReach(m.def, PLAYER.WIDTH) && t.y - m.y < m.height && m.y - t.y < PLAYER.HEIGHT && m.attackCdS <= 0) {
      ctx.toss(m, t, randInt(ctx.rng, HOGLIN.DAMAGE[0], HOGLIN.DAMAGE[1]), HOGLIN.TOSS_V);
      m.attackCdS = m.def.attackS;
    }
  }

  /** Nấm cong vênh (block) hoặc cổng Vực Lửa trong 7 block quanh m: vị trí, hoặc null (dò thưa: 300 ô ngẫu nhiên). */
  private scary(m: Mob): { x: number; z: number } | null {
    const c = this.ctx.cell, R = HOGLIN.AVOID_R, rng = this.ctx.rng;
    for (let k = 0; k < 300; k++) {
      const x = Math.floor(m.x) + randInt(rng, -R, R), y = Math.floor(m.y) + randInt(rng, -2, 3), z = Math.floor(m.z) + randInt(rng, -R, R);
      const id = c(x, y, z) & 255;
      if (id === B.WARPED_FUNGUS || id === B.NETHER_PORTAL) return { x: x + 0.5, z: z + 0.5 };
    }
    return null;
  }
}

/** Cho lợn rừng lửa ăn nấm đỏ thẫm (chuột phải): con non lớn nhanh, con lớn muốn phối giống. true = đã xử lý. */
export function feedHoglin(p: ServerPlayer, m: Mob): boolean {
  if (m.def.key !== "hoglin" || p.inv.held?.item !== "crimson_fungus") return false;
  if (m.baby) m.growS -= m.growS * BREED.FEED_GROW_FRACTION;
  else if (m.breedCdS <= 0 && m.loveS <= 0) m.loveS = BREED.LOVE_S;
  else return true;
  p.inv.takeHeld(1);
  p.invDirty = true;
  return true;
}
