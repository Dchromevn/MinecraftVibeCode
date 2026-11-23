// AI Giai đoạn 8c (theo Minecraft Evoker / Vex): pháp sư tránh người chơi trong 8 block, có mục tiêu thì làm phép — gọi 3 tiểu quỷ
// (ưu tiên, mỗi 17 giây, càng nhiều tiểu quỷ quanh đó càng ít gọi) hoặc nanh (mỗi 5 giây); đứng yên nhìn mục tiêu trong lúc làm
// phép, phép có hiệu lực sau 1 giây. Tiểu quỷ bay xuyên block, chép mục tiêu của pháp sư, thỉnh thoảng lao thẳng vào mục tiêu
// (cách > 2 block) và đánh khi chạm; hết thời gian sống thì mất 1 máu mỗi giây.
import { EVOKER, PLAYER, VEX, mobReach, type MobMove } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import { face, hdist, sees, toward, type Brain, type BrainCtx } from "./brain.js";
import type { Mob } from "./mob.js";

export interface SpellCtx {
  /** Pháp sư tung nanh về phía mục tiêu. */
  fangs(m: Mob, t: ServerPlayer): void;
  /** Pháp sư gọi tiểu quỷ quanh mình. */
  summonVex(m: Mob): void;
  /** Số tiểu quỷ trong r block quanh m. */
  vexCount(m: Mob, r: number): number;
  /** Tiểu quỷ hết thời gian sống: mất 1 máu. */
  decay(m: Mob): void;
}

export class SpellBrains {
  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain) {}

  /** true = đã lo xong tick này. */
  think(m: Mob, mv: MobMove): boolean {
    if (m.def.brain === "evoker") return this.evoker(m, mv);
    if (m.def.brain === "vex") return this.vex(m, mv);
    return false;
  }

  private evoker(m: Mob, mv: MobMove): boolean {
    const ctx = this.ctx, dt = ctx.dt, t = m.target;
    m.fangCdS = Math.max(0, m.fangCdS - dt);
    m.summonCdS = Math.max(0, m.summonCdS - dt);
    if (m.castS > 0) {
      m.castS -= dt;
      m.path = null;
      if (t) face(m, t.x, t.z);
      const total = m.castKind === 1 ? EVOKER.FANGS.CAST_S : EVOKER.SUMMON.CAST_S;
      if (!m.castDone && total - m.castS >= EVOKER.WARMUP_S) {
        m.castDone = true;
        if (m.castKind === 1 && t && !t.dead) ctx.fangs(m, t);
        else if (m.castKind === 2) ctx.summonVex(m);
      }
      if (m.castS <= 0) m.castKind = 0;
      return true;
    }
    if (!t) return false; // không có mục tiêu: đi lang thang như quái thường
    const S = EVOKER.SUMMON;
    if (m.summonCdS <= 0 && ctx.rng() * S.VEX_MAX + 1 > ctx.vexCount(m, S.VEX_R)) {
      m.summonCdS = S.COOLDOWN_S;
      return this.cast(m, 2, S.CAST_S);
    }
    if (m.fangCdS <= 0 && sees(ctx, m, t)) {
      m.fangCdS = EVOKER.FANGS.COOLDOWN_S;
      return this.cast(m, 1, EVOKER.FANGS.CAST_S);
    }
    const d = hdist(m.x, m.z, t.x, t.z);
    if (d < EVOKER.AVOID_R) { // chạy ra xa người chơi (tìm đường)
      const k = (EVOKER.AVOID_R + 2) / Math.max(0.5, d);
      this.brain.chase(m, mv, m.x + (m.x - t.x) * k, m.y, m.z + (m.z - t.z) * k, m.def.run);
    } else {
      m.path = null;
      face(m, t.x, t.z);
    }
    return true;
  }

  private cast(m: Mob, kind: number, s: number): boolean {
    Object.assign(m, { castKind: kind, castS: s, castDone: false, path: null });
    return true;
  }

  private fly(m: Mob, mv: MobMove, x: number, y: number, z: number, speed: number): void {
    const dx = x - m.x, dy = y - m.y, dz = z - m.z, len = Math.hypot(dx, dy, dz);
    if (len < 1e-3) return;
    mv.vx = (dx / len) * speed;
    mv.vz = (dz / len) * speed;
    mv.vy = (dy / len) * speed;
    face(m, x, z);
  }

  private vex(m: Mob, mv: MobMove): boolean {
    const ctx = this.ctx, dt = ctx.dt;
    mv.noclip = true;
    mv.fly = true;
    mv.vy = 0;
    if (m.limitedLife && (m.lifeS -= dt) <= 0) {
      m.lifeS = VEX.DECAY_S;
      ctx.decay(m);
    }
    const owner = m.leader;
    if (owner && !owner.dead && owner.target) m.target = owner.target;
    const t = m.target && !m.target.dead ? m.target : null;
    if (m.charging > 0) {
      m.charging -= dt;
      if (!t) {
        m.charging = 0;
        return true;
      }
      const ty = t.y + PLAYER.EYE_HEIGHT * 0.6, d = Math.hypot(t.x - m.x, ty - m.y, t.z - m.z);
      this.fly(m, mv, t.x, ty, t.z, m.def.run);
      const reach = mobReach(m.def, PLAYER.WIDTH);
      if (hdist(m.x, m.z, t.x, t.z) <= reach && m.y < t.y + PLAYER.HEIGHT && m.y + m.height > t.y && m.attackCdS <= 0) {
        ctx.meleeHit(m, t);
        m.attackCdS = m.def.attackS;
        m.charging = 0;
      } else if (d < 0.3) m.charging = 0;
      return true;
    }
    if (t && Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z) > VEX.CHARGE_MIN && ctx.rng() < VEX.CHARGE_CHANCE) {
      m.charging = 2;
      return true;
    }
    // bay loanh quanh chỗ được gọi ra (hoặc quanh mục tiêu)
    const h = t ? { x: t.x, y: t.y + 1, z: t.z } : (m.home ?? (m.home = { x: m.x, y: m.y, z: m.z }));
    if (!m.patrolTo || hdist(m.x, m.z, m.patrolTo.x, m.patrolTo.z) < 1 || ctx.rng() < dt / 3)
      m.patrolTo = { x: h.x + (ctx.rng() - 0.5) * 2 * VEX.WANDER_R, z: h.z + (ctx.rng() - 0.5) * 2 * VEX.WANDER_R };
    toward(mv, m, m.patrolTo.x, m.patrolTo.z, m.def.walk);
    mv.vy = Math.max(-2, Math.min(2, (h.y + 1 - m.y) * 1.5));
    return true;
  }
}
