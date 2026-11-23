// AI Giai đoạn 8b: kẻ cướp tuần tra (đội trưởng đi về một điểm xa, lính theo đội trưởng; thấy người chơi thì AI bắn cung chung), tiểu
// linh (bay; cầm món người đưa thì bay đi nhặt món giống thế quanh 32 block rồi mang về thả cạnh người đưa; không cầm gì thì bay
// loanh quanh chỗ sinh).
import { ALLAY, PATROL, type MobMove } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import { hdist, toward, type Brain, type BrainCtx } from "./brain.js";
import type { Mob } from "./mob.js";

export interface IllagerCtx {
  /** Đồ rơi cùng loại với món tiểu linh cầm, gần nhất trong 32 block. */
  allayFind(m: Mob): { x: number; y: number; z: number } | null;
  /** Nhặt đồ rơi đó vào túi tiểu linh (nếu đủ gần). */
  allayTake(m: Mob): void;
  /** Thả túi đồ cạnh người chơi. */
  allayDeliver(m: Mob, p: ServerPlayer): void;
}

export class IllagerBrains {
  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain) {}

  /** Bay tới (x, y, z). */
  private fly(m: Mob, mv: MobMove, x: number, y: number, z: number, speed: number): void {
    toward(mv, m, x, z, speed);
    mv.vy = Math.max(-3, Math.min(3, (y - m.y) * 2));
  }

  allay(m: Mob, mv: MobMove): void {
    const ctx = this.ctx, owner = m.held ? ctx.ownerOf(m) : null;
    const full = (m.bag?.count ?? 0) >= ALLAY.MAX_CARRY, item = !full && m.held ? ctx.allayFind(m) : null;
    if (item) {
      if (Math.hypot(item.x - m.x, item.y - m.y, item.z - m.z) < ALLAY.PICK_R) ctx.allayTake(m);
      else this.fly(m, mv, item.x, item.y + 0.3, item.z, m.def.run);
      return;
    }
    if (owner && Math.hypot(owner.x - m.x, owner.z - m.z) < ALLAY.OWNER_R) {
      const d = Math.hypot(owner.x - m.x, owner.y + 1 - m.y, owner.z - m.z);
      if (m.bag && d < ALLAY.DELIVER_R) return ctx.allayDeliver(m, owner);
      if (d > (m.bag ? 1.5 : 4)) this.fly(m, mv, owner.x, owner.y + 1.5, owner.z, m.def.run);
      return;
    }
    // bay loanh quanh chỗ sinh / chỗ hiện tại
    const h = m.home ?? (m.home = { x: m.x, y: m.y, z: m.z });
    if (!m.patrolTo || hdist(m.x, m.z, m.patrolTo.x, m.patrolTo.z) < 1 || ctx.rng() < ctx.dt / 6)
      m.patrolTo = { x: h.x + (ctx.rng() - 0.5) * 8, z: h.z + (ctx.rng() - 0.5) * 8 };
    this.fly(m, mv, m.patrolTo.x, h.y + 1 + ctx.rng() * 0.2, m.patrolTo.z, m.def.walk * 0.5);
  }

  /** Kẻ cướp không có mục tiêu: đi tuần. true = đang tuần tra. */
  patrol(m: Mob, mv: MobMove): boolean {
    if (m.def.key !== "pillager") return false;
    const l = m.leader;
    if (l && !l.dead) {
      if (hdist(m.x, m.z, l.x, l.z) > PATROL.FOLLOW_R) toward(mv, m, l.x, l.z, m.def.walk * 1.1);
      return true;
    }
    m.leader = null;
    const to = m.patrolTo;
    if (!to) return false;
    if (hdist(m.x, m.z, to.x, to.z) < 4) {
      const a = this.ctx.rng() * Math.PI * 2;
      m.patrolTo = { x: m.x + Math.cos(a) * PATROL.WANDER, z: m.z + Math.sin(a) * PATROL.WANDER };
    }
    toward(mv, m, m.patrolTo!.x, m.patrolTo!.z, m.def.walk);
    return true;
  }
}
