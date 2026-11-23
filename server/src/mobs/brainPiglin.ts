// AI Giai đoạn 10d1 (Minecraft Java: PiglinAi, PiglinBruteAi, Zoglin — DESIGN mục Vực Lửa → 10d1):
// - Người lợn: đánh người chơi không mặc món giáp vàng nào (đang tức thì đánh cả người mặc vàng); một nửa cầm nỏ (bắn như kẻ cướp),
//   một nửa cầm kiếm vàng; thấy đồ vàng rơi trong 9 block thì đi nhặt, cầm ngắm 6 giây — thỏi vàng thì ném ra một món đổi (bảng
//   piglin_bartering), đồ vàng khác cất vào túi; nhìn chằm chằm người cầm đồ vàng; tránh lửa / đuốc linh hồn, chạy khỏi người lợn xác
//   sống / lợn rừng xác sống, chạy khi lợn rừng lửa đông hơn; đánh bộ xương héo; thỉnh thoảng cả bầy săn lợn rừng lửa (nghỉ 30–120 giây).
//   Con non không đánh, bị đánh thì chạy; nhặt đồ vàng nhưng không đổi.
// - Người lợn vệ binh: luôn đánh người chơi (vàng không có tác dụng), rìu vàng 13; đánh bộ xương héo.
// - Lợn rừng xác sống: đánh người chơi và mọi sinh vật trừ quái nổ và đồng loại, húc 3–8 hất lên.
import {
  BARTER, BARTER_ITEM, PIGLIN, PIGLIN_LOVED, PIGLIN_REPELLENTS, PILLAGER, PLAYER, ZOGLIN, itemDef, lineBlocked, mobReach, randInt, stack,
  type CellReader, type ItemEntity, type ItemStack, type MobMove, type Rng,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import { face, hdist, sees, toward, type Brain, type BrainCtx } from "./brain.js";
import type { Mob } from "./mob.js";

export interface PiglinCtx {
  /** Vật phẩm đang rơi trên đất (người lợn nhặt đồ vàng). */
  groundItems(): ItemEntity[];
  /** Ném món s từ sinh vật m về phía điểm to (null: rơi tại chỗ). */
  dropFrom(m: Mob, s: ItemStack, to: { x: number; z: number } | null): void;
}

const LOVED: ReadonlySet<string> = new Set(PIGLIN_LOVED.filter((k) => itemDef(k)));
export const isPiglin = (m: Mob): boolean => m.def.brain === "piglin";
/** Người chơi mặc ít nhất một món giáp vàng. */
export const wearsGold = (p: ServerPlayer): boolean => p.inv.armor.some((s) => !!s && itemDef(s.item)?.armor?.tier === "gold");
const dist3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Một món đổi vàng ngẫu nhiên theo trọng số (bảng piglin_bartering); sách / ủng có Tốc độ linh hồn cấp ngẫu nhiên. */
export function rollBarter(rng: Rng): ItemStack {
  let r = rng() * BARTER.reduce((s, e) => s + e.w, 0);
  const e = BARTER.find((v) => (r -= v.w) < 0) ?? BARTER[BARTER.length - 1]!;
  const s = stack(e.item, randInt(rng, e.min, e.max));
  if (e.ench) s.ench = { [e.ench.key]: randInt(rng, 1, e.ench.max) };
  return s;
}

/** Từ mắt sinh vật m thấy được điểm (x, y, z) không (không có block chắn). */
export function canSee(cell: CellReader, m: Mob, x: number, y: number, z: number): boolean {
  const o = [m.x, m.eyeY, m.z], d = [x - o[0]!, y - o[1]!, z - o[2]!], len = Math.hypot(d[0]!, d[1]!, d[2]!);
  return len < 1e-3 || !lineBlocked(cell, o, d.map((v) => v / len), len);
}

/** Người chơi p mở rương / đào khối vàng ở (x, y, z): người lợn trong 16 block thấy p thì tức 30 giây. */
export function alarmPiglins(list: readonly Mob[], p: ServerPlayer, x: number, y: number, z: number, cell: CellReader): void {
  if (p.flying) return;
  for (const m of list)
    if (m.def.key === "piglin" && !m.dead && !m.baby && dist3(m, { x, y, z }) <= PIGLIN.ALERT_R && canSee(cell, m, p.x, p.y + PLAYER.EYE_HEIGHT * 0.8, p.z))
      Object.assign(m, { target: p, angryS: PIGLIN.ANGER_S });
}

/** Bị đánh (gọi từ Mobs.hurt): người lợn bị người chơi đánh thì cả bầy quanh đó tức; người lợn / lợn rừng bị sinh vật đánh thì đánh trả. */
export function piglinHurt(list: readonly Mob[], m: Mob, by: ServerPlayer | null, byMob: Mob | null): void {
  if (by && m.def.key === "piglin")
    for (const o of list) if (o.def.key === "piglin" && !o.dead && !o.baby && o !== m && dist3(o, m) <= PIGLIN.ALERT_R) Object.assign(o, { target: by, angryS: PIGLIN.ANGER_S });
  if (byMob && byMob !== m && !byMob.dead && (isPiglin(m) || m.def.key === "hoglin" || m.def.key === "zoglin")) m.prey = byMob;
}

/** Người chơi đưa đồ vàng (chuột phải): người lợn lớn không tức người này thì cầm ngắm. true = đã xử lý. */
export function giveGold(p: ServerPlayer, m: Mob): boolean {
  const held = p.inv.held;
  if (m.def.key !== "piglin" || !held || !LOVED.has(held.item)) return false;
  if (m.baby || m.admireS > 0 || m.held || m.target === p) return true;
  Object.assign(m, { held: { ...held, count: 1 }, admireS: PIGLIN.ADMIRE_S, giver: { x: p.x, z: p.z }, path: null });
  p.inv.takeHeld(1);
  p.invDirty = true;
  return true;
}

export class PiglinBrains {
  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain) {}

  /** Người lợn / vệ binh / lợn rừng xác sống; false nếu không phải. */
  think(m: Mob, mv: MobMove): boolean {
    if (m.def.brain === "zoglin") return this.zoglin(m, mv), true;
    if (!isPiglin(m)) return false;
    this.piglin(m, mv);
    return true;
  }

  private piglin(m: Mob, mv: MobMove): void {
    const ctx = this.ctx, dt = ctx.dt, brute = m.def.key === "piglin_brute";
    if (!m.variant) { // lần đầu: phát vũ khí (1 cận chiến, 2 nỏ), vừa "săn xong" như Minecraft (không săn ngay khi mới sinh)
      m.variant = brute || m.baby || ctx.rng() >= PIGLIN.CROSSBOW_CHANCE ? 1 : 2;
      m.huntCdS = PIGLIN.HUNT_CD_S[0] + ctx.rng() * (PIGLIN.HUNT_CD_S[1] - PIGLIN.HUNT_CD_S[0]);
    }
    m.huntCdS = Math.max(0, m.huntCdS - dt);
    if ((m.scanS -= dt) <= 0) {
      m.scanS = PIGLIN.SCAN_S;
      this.scan(m, brute);
    }
    if (m.admireS > 0) { // đang cầm vàng ngắm: đứng yên, nhìn xuống món đồ
      m.admireS -= dt;
      m.path = null;
      m.pitch = -0.6;
      if (m.admireS <= 0) this.doneAdmiring(m);
      if (!m.target) return;
    }
    if (m.panicS > 0 && m.panicFrom) {
      m.panicS -= dt;
      m.path = null;
      return toward(mv, m, m.x * 2 - m.panicFrom.x, m.z * 2 - m.panicFrom.z, m.def.run);
    }
    const t = this.target(m, brute);
    if (!t && !brute && !m.held && this.fetch(m, mv)) return;
    if (!t && m.prey) return this.fightMob(m, mv, m.prey);
    if (!t) {
      const fan = brute || m.baby ? null : ctx.players.find((p) => p.inv.held && LOVED.has(p.inv.held.item) && dist3(p, m) <= PIGLIN.STARE_R);
      if (!fan) return this.brain.wander(m, mv, m.def.walk);
      m.path = null; // nhìn chằm chằm người cầm đồ vàng
      face(m, fan.x, fan.z);
      m.pitch = Math.atan2(fan.y + PLAYER.EYE_HEIGHT - m.eyeY, hdist(m.x, m.z, fan.x, fan.z));
      return;
    }
    if (m.variant === 2) return this.ranged(m, mv, t);
    this.melee(m, mv, t);
  }

  /** Mục tiêu là người chơi: còn hợp lệ, con non thì chạy, người mặc vàng thì thôi (trừ khi đang tức); tìm người mới mỗi 0.5 giây. */
  private target(m: Mob, brute: boolean): ServerPlayer | null {
    const ctx = this.ctx;
    let t = m.target;
    if (t && (t.dead || t.flying || !ctx.players.includes(t) || hdist(m.x, m.z, t.x, t.z) > m.def.follow * 1.3)) t = m.target = null;
    if (m.baby) {
      if (t) Object.assign(m, { panicS: 3, panicFrom: { x: t.x, z: t.z }, target: null });
      return null;
    }
    if (t && !brute && m.angryS <= 0 && wearsGold(t)) t = m.target = null;
    if (!t && m.lookS <= 0) {
      m.lookS = 0.5;
      let bd = m.def.follow;
      for (const p of ctx.players) {
        const d = dist3(p, m);
        if (d < bd && (brute || !wearsGold(p)) && sees(ctx, m, p)) [bd, t] = [d, p];
      }
      m.target = t;
    }
    return t;
  }

  /** Đi nhặt đồ vàng gần nhất trên đất (true = đang làm việc này). */
  private fetch(m: Mob, mv: MobMove): boolean {
    let best: ItemEntity | null = null, bd: number = PIGLIN.WANT_R;
    for (const e of this.ctx.groundItems()) {
      if (e.pickupDelay > 0 || !LOVED.has(e.stack.item)) continue;
      const d = dist3(e, m);
      if (d < bd && (e.stack.item !== "gold_nugget" || m.pocket.length < PIGLIN.POCKET)) [bd, best] = [d, e];
    }
    if (!best) return false;
    if (bd > PIGLIN.PICK_R) return this.brain.chase(m, mv, best.x, best.y, best.z, m.def.walk * 1.3), true;
    const items = this.ctx.groundItems(), whole = best.stack.item === "gold_nugget"; // mảnh vàng: cất cả chồng, không ngắm
    const took = whole ? best.stack : { ...best.stack, count: 1 };
    if (whole || --best.stack.count <= 0) items.splice(items.indexOf(best), 1);
    if (whole) return this.stash(m, took), true;
    const p = this.ctx.players.reduce<ServerPlayer | null>((a, o) => (dist3(o, m) <= PIGLIN.ALERT_R && (!a || dist3(o, m) < dist3(a, m)) ? o : a), null);
    Object.assign(m, { held: took, admireS: PIGLIN.ADMIRE_S, giver: p ? { x: p.x, z: p.z } : null, path: null });
    return true;
  }

  /** Ngắm xong: thỏi vàng (người lợn lớn) → ném ra một món đổi; còn lại cất vào túi. */
  private doneAdmiring(m: Mob): void {
    const s = m.held;
    m.held = null;
    if (s && s.item === BARTER_ITEM && !m.baby) this.ctx.dropFrom(m, rollBarter(this.ctx.rng), m.giver);
    else if (s) this.stash(m, s);
    m.giver = null;
  }

  private stash(m: Mob, s: ItemStack): void {
    const max = itemDef(s.item)?.maxStack ?? 64, same = m.pocket.find((o) => o.item === s.item && !o.ench && !s.ench && o.count < max);
    if (same) {
      const n = Math.min(s.count, max - same.count);
      same.count += n;
      s.count -= n;
    }
    if (s.count <= 0) return;
    if (m.pocket.length < PIGLIN.POCKET) m.pocket.push(s);
    else this.ctx.dropFrom(m, s, null);
  }

  /** Dò quanh mỗi giây: tránh lửa linh hồn / xác sống / bầy lợn rừng lửa đông hơn; chọn con mồi (bộ xương héo, săn lợn rừng lửa). */
  private scan(m: Mob, brute: boolean): void {
    const ctx = this.ctx, near = ctx.near(m, PIGLIN.HUNT_R);
    if (m.prey && (m.prey.dead || dist3(m.prey, m) > m.def.follow * 1.5)) m.prey = null;
    if (!brute) {
      const rep = this.repellent(m), zom = near.find((o) => (o.def.key === "zombified_piglin" || o.def.key === "zoglin") && dist3(o, m) <= PIGLIN.ZOMBIE_R);
      const hogs = near.filter((o) => o.def.key === "hoglin" && dist3(o, m) <= PIGLIN.OUTNUMBER_R);
      const mates = 1 + near.filter((o) => isPiglin(o) && !o.baby && dist3(o, m) <= PIGLIN.OUTNUMBER_R).length;
      const scare = rep ?? zom ?? (hogs.filter((o) => !o.baby).length > mates || m.baby ? hogs[0] : undefined);
      if (scare) return void Object.assign(m, { panicS: PIGLIN.SCAN_S + 0.5, panicFrom: { x: scare.x, z: scare.z }, prey: null });
    }
    if (m.prey || m.target || m.baby || m.admireS > 0) return;
    const ws = near.find((o) => o.def.key === "wither_skeleton" && !o.dead && canSee(ctx.cell, m, o.x, o.eyeY, o.z));
    if (ws) return void (m.prey = ws);
    if (brute || m.huntCdS > 0) return;
    const hog = near.find((o) => o.def.key === "hoglin" && !o.dead && canSee(ctx.cell, m, o.x, o.eyeY, o.z));
    if (!hog) return;
    const cd = PIGLIN.HUNT_CD_S[0] + ctx.rng() * (PIGLIN.HUNT_CD_S[1] - PIGLIN.HUNT_CD_S[0]);
    for (const o of [m, ...near]) if (o.def.key === "piglin" && !o.baby && !o.target) Object.assign(o, { prey: hog, huntCdS: cd }); // cả bầy cùng săn
  }

  /** Lửa / đuốc linh hồn gần nhất trong 8 block (quét hết vùng, cao −2..+3; mỗi giây một lần). */
  private repellent(m: Mob): { x: number; z: number } | null {
    const c = this.ctx.cell, R = PIGLIN.AVOID_R, bx = Math.floor(m.x), by = Math.floor(m.y), bz = Math.floor(m.z);
    let best: { x: number; z: number } | null = null, bd = Infinity;
    for (let y = by - 2; y <= by + 3; y++)
      for (let z = bz - R; z <= bz + R; z++)
        for (let x = bx - R; x <= bx + R; x++) {
          if (!PIGLIN_REPELLENTS.has(c(x, y, z) & 255)) continue;
          const d = (x - bx) ** 2 + (z - bz) ** 2;
          if (d < bd) [bd, best] = [d, { x: x + 0.5, z: z + 0.5 }];
        }
    return best;
  }

  private melee(m: Mob, mv: MobMove, t: ServerPlayer): void {
    const d = hdist(m.x, m.z, t.x, t.z), dy = t.y - m.y;
    if (d < 2.5 && Math.abs(dy) < 1.5) toward(mv, m, t.x, t.z, m.def.run);
    else this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
    if (d <= mobReach(m.def, PLAYER.WIDTH) && dy > -m.height && dy < PLAYER.HEIGHT && m.attackCdS <= 0 && sees(this.ctx, m, t)) {
      this.ctx.meleeHit(m, t);
      m.attackCdS = m.def.attackS;
    }
  }

  /** Người lợn cầm nỏ: giữ khoảng cách như kẻ cướp, lên dây 1.25 giây rồi bắn. */
  private ranged(m: Mob, mv: MobMove, t: ServerPlayer): void {
    const ctx = this.ctx, d = hdist(m.x, m.z, t.x, t.z);
    if (d > PILLAGER.RANGE || !sees(ctx, m, t)) {
      m.aimS = 0;
      return this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
    }
    m.path = null;
    if (d < PILLAGER.MIN_RANGE) toward(mv, m, m.x - (t.x - m.x), m.z - (t.z - m.z), m.def.walk);
    face(m, t.x, t.z);
    m.pitch = Math.atan2(t.y + 1 - m.eyeY, d);
    m.aimS += ctx.dt;
    if (m.aimS >= PILLAGER.CHARGE_S && m.attackCdS <= 0) {
      ctx.shoot(m, t);
      m.attackCdS = PIGLIN.CROSSBOW_CD_S;
      m.aimS = 0;
    }
  }

  /** Đánh sinh vật khác (con mồi / kẻ đã đánh mình): đuổi tới, cắn bằng sát thương của loài. */
  private fightMob(m: Mob, mv: MobMove, o: Mob): void {
    const d = hdist(m.x, m.z, o.x, o.z);
    if (d < 2.5 && Math.abs(o.y - m.y) < 1.5) toward(mv, m, o.x, o.z, m.def.run);
    else this.brain.chase(m, mv, o.x, o.y, o.z, m.def.run);
    if (d <= mobReach(m.def, o.width) && Math.abs(o.y - m.y) < 2 && m.attackCdS <= 0) {
      this.ctx.bite(m, o, m.def.damage);
      m.attackCdS = m.def.attackS;
    }
  }

  // ---------- lợn rừng xác sống ----------
  private zoglin(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    if (m.target && (m.target.dead || m.target.flying || !ctx.players.includes(m.target))) m.target = null;
    if (m.prey?.dead) m.prey = null;
    if ((m.scanS -= ctx.dt) <= 0) {
      m.scanS = ZOGLIN.SCAN_S;
      this.zoglinPick(m);
    }
    const g = m.target ?? m.prey;
    if (!g) return this.brain.wander(m, mv, m.def.walk);
    const d = hdist(m.x, m.z, g.x, g.z), w = m.target ? PLAYER.WIDTH : m.prey!.width;
    if (d < 2.5 && Math.abs(g.y - m.y) < 1.5) toward(mv, m, g.x, g.z, m.def.run);
    else this.brain.chase(m, mv, g.x, g.y, g.z, m.def.run);
    if (d > mobReach(m.def, w) || Math.abs(g.y - m.y) >= 2 || m.attackCdS > 0) return;
    const dmg = randInt(ctx.rng, ZOGLIN.DAMAGE[0], ZOGLIN.DAMAGE[1]) * (m.baby ? 0.5 : 1);
    if (m.target) ctx.toss(m, m.target, dmg, ZOGLIN.TOSS_V);
    else if (m.prey) {
      ctx.bite(m, m.prey, dmg);
      m.prey.body.vy = Math.max(m.prey.body.vy, ZOGLIN.TOSS_V * (1 - (m.prey.def.kbResist ?? 0)));
    }
    m.attackCdS = m.def.attackS;
  }

  /** Mục tiêu gần nhất: người chơi thấy được hoặc sinh vật bất kỳ trừ quái nổ, lợn rừng xác sống, sinh vật nước / bay. */
  private zoglinPick(m: Mob): void {
    const ctx = this.ctx;
    let bd = m.target ? dist3(m.target, m) : m.prey ? dist3(m.prey, m) : m.def.follow, p: ServerPlayer | null = null, o: Mob | null = null;
    for (const q of ctx.players) if (dist3(q, m) < bd && sees(ctx, m, q)) [bd, p, o] = [dist3(q, m), q, null];
    for (const q of ctx.near(m, m.def.follow))
      if (q.def.key !== "creeper" && q.def.key !== "zoglin" && !q.def.aquatic && !q.def.flies && dist3(q, m) < bd) [bd, p, o] = [dist3(q, m), null, q];
    if (p || o) Object.assign(m, { target: p, prey: o });
  }
}
