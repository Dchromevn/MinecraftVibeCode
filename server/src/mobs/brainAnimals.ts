// AI động vật Giai đoạn 7c (MECHANICS.md 8.4): sói (hoang: đi đàn, săn cừu / thỏ / cáo / bộ xương, bị đánh thì cả đàn đánh lại;
// thuần: đi theo chủ, dịch chuyển về cạnh chủ khi bị bỏ xa, ngồi, đánh thứ chủ đánh / thứ đánh chủ), cáo (ngủ ban ngày, đêm săn gà /
// thỏ, né người, ngậm đồ nhặt được), dê (thỉnh thoảng húc), gấu trắng (bảo vệ gấu con), lạc đà không bướu (bị đánh thì nhổ nước
// bọt), tatu (cuộn tròn khi sợ, tự rụng vảy), dơi (bay loạn), cá / mực (bơi loanh quanh, né người; cá nóc phồng lên), cá heo
// (theo người bơi, cho bơi nhanh, phải ngoi lên thở).
import { ANIMALS, PLAYER, TAME, type MobMove, type Rng } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import { face, hdist, sees, toward, type Brain, type BrainCtx } from "./brain.js";
import { WaterBrains } from "./brainWater.js";
import type { Mob } from "./mob.js";

export interface AnimalCtx {
  rng: Rng;
  dt: number;
  players: ServerPlayer[];
  /** Sinh vật quanh m trong bán kính r. */
  near(m: Mob, r: number): Mob[];
  /** m cắn sinh vật khác. */
  bite(m: Mob, target: Mob, dmg: number): void;
  /** Chủ của sói (đang online), hoặc null. */
  ownerOf(m: Mob): ServerPlayer | null;
  /** Lạc đà không bướu nhổ nước bọt vào người chơi; dê húc người chơi (đẩy mạnh). */
  spit(m: Mob, p: ServerPlayer): void;
  ram(m: Mob, p: ServerPlayer): void;
  effect(p: ServerPlayer, fx: "poison" | "grace", s: number): void;
  isWater(x: number, y: number, z: number): boolean;
  isDay(): boolean;
  /** Cáo nhặt vật phẩm rơi gần (trả về món đã nhặt). */
  pickItem(m: Mob): void;
  layScute(m: Mob): void;
}

const WOLF_PREY = new Set(["sheep", "rabbit", "fox", "skeleton"]);
const FOX_PREY = new Set(["chicken", "rabbit"]);

export class AnimalBrains {
  private readonly water: WaterBrains;

  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain) {
    this.water = new WaterBrains(ctx, brain, this);
  }

  /** Xử lý loài 7c; false = dùng AI động vật chung. */
  think(m: Mob, mv: MobMove): boolean {
    switch (m.def.brain) {
      case "wolf": return this.wolf(m, mv), true;
      case "fox": return this.fox(m, mv), true;
      case "goat": return this.goat(m, mv);
      case "bear": return this.bear(m, mv);
      case "llama": return this.llama(m, mv);
      case "armadillo": return this.armadillo(m, mv);
      case "bat": return this.water.bat(m, mv), true;
      case "fish": return this.water.fish(m, mv), true;
      case "dolphin": return this.water.dolphin(m, mv), true;
      default: return false;
    }
  }

  /** Bị đánh: loài biết đánh lại thì nhắm kẻ đánh (true), không thì để AI chung cho chạy trốn (false). */
  onHurt(m: Mob, by: ServerPlayer | null): boolean {
    const k = m.def.key;
    if (k === "wolf") {
      if (m.owner && by && by.name === m.owner) return true; // chủ đánh: không đánh lại
      m.sitting = false;
      if (by) for (const o of [m, ...this.ctx.near(m, 16)]) if (o.def.key === "wolf" && !o.owner) (o.target = by), (o.angryS = 30);
      if (m.owner && by) (m.target = by), (m.angryS = 30);
      return true;
    }
    if (k === "polar_bear" || k === "llama" || k === "dolphin") {
      // gấu con bị đánh: gấu lớn quanh đó lao vào
      if (k === "polar_bear" && m.baby && by) for (const o of this.ctx.near(m, 16)) if (o.def.key === "polar_bear" && !o.baby) (o.target = by), (o.angryS = 30);
      if (by) {
        m.target = by;
        m.angryS = k === "llama" ? 10 : 30;
        if (k === "dolphin") for (const o of this.ctx.near(m, 12)) if (o.def.key === "dolphin") o.target = by;
      }
      return true;
    }
    if (k === "armadillo") m.rolledS = 4;
    if (k === "fox") m.sleepingFox = false;
    return false;
  }

  /** Sói thuần của chủ (trong 16 block, không ngồi) đánh kẻ thù: thứ chủ đánh hoặc thứ đánh chủ (không đánh quái nổ / sói của chủ). */
  rally(owner: ServerPlayer, foe: Mob | ServerPlayer, mobs: readonly Mob[]): void {
    if (foe === owner) return;
    for (const w of mobs) {
      if (w.def.key !== "wolf" || w.owner !== owner.name || w.sitting || w.dead || Math.hypot(w.x - owner.x, w.z - owner.z) > TAME.RALLY_RANGE) continue;
      if ("def" in foe) {
        if (foe === w || foe.def.key === "creeper" || (foe.def.key === "wolf" && foe.owner === owner.name)) continue;
        w.prey = foe;
      } else (w.target = foe), (w.angryS = 30);
    }
  }

  /** Đuổi theo và cắn sinh vật khác (con mồi / kẻ thù của chủ). */
  hunt(m: Mob, mv: MobMove, t: Mob, dmg: number): void {
    if (hdist(m.x, m.z, t.x, t.z) < 2.5 && Math.abs(t.y - m.y) < 1.5) toward(mv, m, t.x, t.z, m.def.run);
    else this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
    if (hdist(m.x, m.z, t.x, t.z) <= (m.width + t.width) / 2 + 0.6 && Math.abs(t.y - m.y) < 1.5 && m.attackCdS <= 0) {
      this.ctx.bite(m, t, dmg);
      m.attackCdS = m.def.attackS;
    }
  }

  /** Đuổi và cắn người chơi. */
  attackPlayer(m: Mob, mv: MobMove, p: ServerPlayer, dmg: number): void {
    if (hdist(m.x, m.z, p.x, p.z) < 2.5 && Math.abs(p.y - m.y) < 1.5) toward(mv, m, p.x, p.z, m.def.run);
    else this.brain.chase(m, mv, p.x, p.y, p.z, m.def.run);
    if (hdist(m.x, m.z, p.x, p.z) <= m.width / 2 + PLAYER.WIDTH / 2 + 0.8 && p.y - m.y < 1.5 && m.y - p.y < PLAYER.HEIGHT && m.attackCdS <= 0) {
      this.ctx.meleeHit(m, p);
      m.attackCdS = m.def.attackS;
    }
  }

  dropTarget(m: Mob): void {
    if (m.target && (m.target.dead || m.target.flying || !this.ctx.players.includes(m.target) || m.angryS <= 0)) m.target = null;
    if (m.prey && (m.prey.dead || Math.hypot(m.prey.x - m.x, m.prey.z - m.z) > 24)) m.prey = null;
  }

  private wolf(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    this.dropTarget(m);
    if (m.owner) {
      m.loveS = Math.max(0, m.loveS - ctx.dt);
      m.breedCdS = Math.max(0, m.breedCdS - ctx.dt);
      if (m.sitting) return; // ngồi yên
      if (m.prey) return this.hunt(m, mv, m.prey, m.def.damage);
      if (m.target) return this.attackPlayer(m, mv, m.target, m.def.damage);
      const mate = m.loveS > 0 ? ctx.partner(m) : null; // đã cho ăn thịt khi đủ máu: đi tìm sói thuần khác cũng đang muốn phối giống
      if (mate) return hdist(m.x, m.z, mate.x, mate.z) < 1.5 ? ctx.breed(m, mate) : toward(mv, m, mate.x, mate.z, m.def.walk * 1.2);
      const o = ctx.ownerOf(m);
      if (!o) return this.brain.wander(m, mv, m.def.walk);
      const d = Math.hypot(o.x - m.x, o.y - m.y, o.z - m.z);
      if (d > TAME.FOLLOW_TELEPORT && !o.flying) {
        if (ctx.teleport(m, { x: o.x, y: o.y, z: o.z }, TAME.TELEPORT_R)) return;
      }
      if (d > TAME.FOLLOW_STOP) return this.brain.chase(m, mv, o.x, o.y, o.z, m.def.run);
      m.path = null;
      return;
    }
    if (m.target) return this.attackPlayer(m, mv, m.target, m.def.damage);
    if (m.prey) return this.hunt(m, mv, m.prey, m.def.damage);
    if (ctx.rng() < ctx.dt / 40) m.prey = ctx.near(m, 16).find((o) => WOLF_PREY.has(o.def.key) && !o.dead) ?? null;
    this.brain.animalBase(m, mv);
  }

  private fox(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    this.dropTarget(m);
    if (!m.held) ctx.pickItem(m);
    // người lại gần mà không ngồi (rón rén): cáo tỉnh dậy, chạy đi
    const scare = ctx.players.find((p) => !p.sneaking && Math.hypot(p.x - m.x, p.z - m.z) < (m.sleepingFox ? 3 : 8));
    if (scare) {
      m.sleepingFox = false;
      m.panicS = Math.max(m.panicS, 2);
      m.panicFrom = { x: scare.x, z: scare.z };
      return this.brain.animalBase(m, mv);
    }
    if (ctx.isDay() && m.body.onGround && !m.prey && m.panicS <= 0) {
      m.sleepingFox = true; // ban ngày ngủ
      m.path = null;
      return;
    }
    m.sleepingFox = false;
    if (m.prey) return this.hunt(m, mv, m.prey, m.def.damage);
    if (ctx.rng() < ctx.dt / 20) m.prey = ctx.near(m, 16).find((o) => FOX_PREY.has(o.def.key) && !o.dead) ?? null;
    this.brain.animalBase(m, mv);
  }

  private goat(m: Mob, mv: MobMove): boolean {
    const ctx = this.ctx;
    m.ramS -= ctx.dt;
    if (m.ramming > 0 && m.target) {
      m.ramming -= ctx.dt;
      const t = m.target;
      toward(mv, m, t.x, t.z, m.def.run);
      if (Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z) < 1.3) {
        ctx.ram(m, t);
        m.ramming = 0;
        m.target = null;
      }
      return true;
    }
    if (m.ramS <= 0 && !m.baby) {
      m.ramS = 30 + ctx.rng() * 270;
      const t = ctx.players.find((p) => {
        const d = Math.hypot(p.x - m.x, p.z - m.z);
        return d >= 4 && d <= 16 && Math.abs(p.y - m.y) < 2 && sees(ctx, m, p);
      });
      if (t) {
        m.target = t;
        m.ramming = 3;
        face(m, t.x, t.z);
        return true;
      }
    }
    return false;
  }

  private bear(m: Mob, mv: MobMove): boolean {
    const ctx = this.ctx;
    this.dropTarget(m);
    if (!m.baby && !m.target) {
      // có gấu con gần mà người chơi lại gần: tấn công
      const cub = ctx.near(m, 16).some((o) => o.def.key === "polar_bear" && o.baby);
      const p = cub ? ctx.players.find((q) => Math.hypot(q.x - m.x, q.z - m.z) < 6) : undefined;
      if (p) {
        m.target = p;
        m.angryS = 20;
      }
    }
    if (m.target && !m.baby) {
      this.attackPlayer(m, mv, m.target, m.def.damage);
      return true;
    }
    return false;
  }

  private llama(m: Mob, mv: MobMove): boolean {
    const ctx = this.ctx;
    this.dropTarget(m);
    const t = m.target;
    if (!t) return false;
    face(m, t.x, t.z);
    if (Math.hypot(t.x - m.x, t.z - m.z) > 10 || !sees(ctx, m, t)) {
      this.brain.chase(m, mv, t.x, t.y, t.z, m.def.walk);
      return true;
    }
    m.path = null;
    if (m.attackCdS <= 0) {
      ctx.spit(m, t);
      m.attackCdS = m.def.attackS;
    }
    return true;
  }

  private armadillo(m: Mob, mv: MobMove): boolean {
    const ctx = this.ctx;
    m.scuteS -= ctx.dt;
    if (m.scuteS <= 0 && !m.baby) {
      ctx.layScute(m);
      m.scuteS = ANIMALS.EGG_MIN_S + ctx.rng() * (ANIMALS.EGG_MAX_S - ANIMALS.EGG_MIN_S);
    }
    if (ctx.players.some((p) => (p.sprinting || p.flying) && Math.hypot(p.x - m.x, p.z - m.z) < 7)) m.rolledS = Math.max(m.rolledS, 3);
    m.rolledS = Math.max(0, m.rolledS - ctx.dt);
    if (m.rolledS > 0) {
      m.path = null;
      return true; // cuộn tròn: đứng yên
    }
    void mv;
    return false;
  }
}
