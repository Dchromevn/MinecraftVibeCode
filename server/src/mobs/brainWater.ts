// AI dơi và sinh vật nước Giai đoạn 7c (tách từ brainAnimals.ts): dơi bay loạn trong hang; cá / mực bơi loanh quanh, né người,
// cá nóc phồng lên và gây độc khi chạm; cá heo theo người đang bơi (cho bơi nhanh), phải ngoi lên thở, bị đánh thì cả đàn đánh lại.
import type { MobMove } from "../../../shared/src/index.js";
import type { AnimalBrains } from "./brainAnimals.js";
import { hdist, toward, type Brain, type BrainCtx } from "./brain.js";
import type { Mob } from "./mob.js";

export const DOLPHIN_AIR_S = 240;

export class WaterBrains {
  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain, private readonly animals: AnimalBrains) {
    void this.brain;
  }

  bat(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    m.idleS -= ctx.dt;
    if (!m.pathGoal || m.idleS <= 0 || Math.hypot(m.pathGoal.x + 0.5 - m.x, m.pathGoal.y - m.y, m.pathGoal.z + 0.5 - m.z) < 1) {
      m.pathGoal = { x: Math.floor(m.x + ctx.rng() * 12 - 6), y: Math.floor(m.y + ctx.rng() * 6 - 3), z: Math.floor(m.z + ctx.rng() * 12 - 6) };
      m.idleS = 1 + ctx.rng() * 2;
    }
    const g = m.pathGoal;
    toward(mv, m, g.x + 0.5, g.z + 0.5, m.def.walk);
    mv.vy = Math.max(-2, Math.min(2, (g.y + 0.5 - m.y) * 2));
    if (m.body.collidedH) m.idleS = 0;
  }

  /** Bơi loanh quanh trong nước (chọn điểm nước ngẫu nhiên gần đó); né người chơi; lên cạn thì giãy. */
  private swimAround(m: Mob, mv: MobMove, speed: number): void {
    const ctx = this.ctx;
    if (!m.body.inWater) {
      if (m.body.onGround && ctx.rng() < ctx.dt * 2) {
        mv.jump = true;
        const a = ctx.rng() * Math.PI * 2;
        mv.vx = Math.cos(a) * 2;
        mv.vz = Math.sin(a) * 2;
      }
      return;
    }
    m.idleS -= ctx.dt;
    const g = m.pathGoal;
    if (!g || m.idleS <= 0 || Math.hypot(g.x + 0.5 - m.x, g.z + 0.5 - m.z) < 0.8 || m.body.collidedH) {
      for (let t = 0; t < 6; t++) {
        const x = Math.floor(m.x + ctx.rng() * 12 - 6), y = Math.floor(m.y + ctx.rng() * 4 - 2), z = Math.floor(m.z + ctx.rng() * 12 - 6);
        if (ctx.isWater(x, y, z)) {
          m.pathGoal = { x, y, z };
          break;
        }
      }
      m.idleS = 2 + ctx.rng() * 3;
    }
    const goal = m.pathGoal;
    if (!goal) return;
    toward(mv, m, goal.x + 0.5, goal.z + 0.5, speed);
    mv.vy = Math.max(-2, Math.min(2, (goal.y + 0.3 - m.y) * 2));
  }

  fish(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    const p = ctx.players.find((q) => Math.hypot(q.x - m.x, q.y + 0.9 - m.y, q.z - m.z) < (m.def.key === "pufferfish" ? 2.5 : 4));
    if (m.def.key === "pufferfish") {
      // phồng dần khi người chơi lại gần; chạm vào lúc phồng thì trúng độc
      m.angryS = p ? 2 : Math.max(0, m.angryS - ctx.dt);
      if (ctx.rng() < ctx.dt * 2) m.puff = m.angryS > 0 ? Math.min(2, m.puff + 1) : Math.max(0, m.puff - 1);
      if (p && m.puff > 0 && m.attackCdS <= 0 && Math.hypot(p.x - m.x, p.y + 0.5 - m.y, p.z - m.z) < 1 + m.puff * 0.3) {
        ctx.effect(p, "poison", 3 * m.puff);
        m.attackCdS = 1;
      }
      return this.swimAround(m, mv, m.def.walk);
    }
    if (p && m.body.inWater) {
      toward(mv, m, m.x - (p.x - m.x), m.z - (p.z - m.z), m.def.run); // né người
      return;
    }
    this.swimAround(m, mv, m.def.walk);
  }

  dolphin(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    this.animals.dropTarget(m);
    if (m.airS < 30 && m.body.inWater) {
      mv.vy = 3; // ngoi lên thở
      toward(mv, m, m.x - Math.sin(m.yaw), m.z - Math.cos(m.yaw), m.def.walk);
      return;
    }
    if (m.target) {
      return this.animals.attackPlayer(m, mv, m.target, m.def.damage);
    }
    // bơi theo người đang bơi gần đó, cho họ bơi nhanh
    const p = ctx.players.find((q) => q.state.inWater && Math.hypot(q.x - m.x, q.y - m.y, q.z - m.z) < 10);
    if (p && m.body.inWater) {
      if (Math.hypot(p.x - m.x, p.y - m.y, p.z - m.z) < 9 && ctx.rng() < ctx.dt) ctx.effect(p, "grace", 5);
      if (hdist(m.x, m.z, p.x, p.z) > 3) toward(mv, m, p.x, p.z, m.def.run);
      mv.vy = Math.max(-3, Math.min(3, (p.y + 0.5 - m.y) * 2));
      return;
    }
    this.swimAround(m, mv, m.def.walk);
  }
}
