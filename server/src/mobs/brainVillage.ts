// AI sinh vật làng (Giai đoạn 8a; MECHANICS.md 8.3–8.4): dân làng (ban ngày đi lang thang quanh làng, đêm về nhà, chạy khi xác
// sống tới gần, đứng yên quay về người đang đổi đồ), người sắt (tuần tra giữa làng, đánh quái thù địch trừ quái nổ — 7–21 sát thương
// và hất lên; giận người đánh mình / đánh dân làng), mèo (hoang: né người, đi theo người cầm cá; thuần: theo chủ, ngồi), thương
// nhân lang thang; xác sống (cả dân làng xác sống) không thấy người chơi thì đi săn dân làng.
import { CATS, GOLEM, VILLAGERS, ZOMBIE_VILLAGER, TAME, type MobMove } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import { face, hdist, toward, type Brain, type BrainCtx } from "./brain.js";
import type { AnimalBrains } from "./brainAnimals.js";
import type { Mob } from "./mob.js";
import { isZombie } from "./villagers.js";

export interface VillageCtx {
  /** Người sắt đánh người chơi: sát thương riêng + hất lên. */
  strike(m: Mob, p: ServerPlayer, dmg: number): void;
  /** Người đang mở bảng đổi đồ với sinh vật này. */
  trader(m: Mob): ServerPlayer | null;
}

const PREY_SCAN_S = 0.5;

export class VillageBrains {
  constructor(private readonly ctx: BrainCtx, private readonly brain: Brain, private readonly animals: AnimalBrains) {}

  /** Loài làng; false = AI chung. */
  think(m: Mob, mv: MobMove): boolean {
    switch (m.def.brain) {
      case "villager": case "trader": return this.villager(m, mv), true;
      case "golem": return this.golem(m, mv), true;
      case "cat": return this.cat(m, mv), true;
      default: return false;
    }
  }

  /** Bị đánh: người sắt đánh lại; true = đã xử lý (không chạy trốn). */
  onHurt(m: Mob, by: ServerPlayer | null): boolean {
    if (m.def.key !== "iron_golem") return false;
    if (by) {
      m.target = by;
      m.angryS = GOLEM.ANGRY_S;
    }
    return true;
  }

  private goHome(m: Mob, mv: MobMove, r: number, speed: number): boolean {
    const h = m.home;
    if (!h || hdist(m.x, m.z, h.x, h.z) <= r) return false;
    this.brain.chase(m, mv, h.x, h.y, h.z, speed);
    return true;
  }

  private villager(m: Mob, mv: MobMove): void {
    const ctx = this.ctx, p = ctx.trader(m);
    if (p) { // đang đổi đồ: đứng nhìn người chơi
      m.path = null;
      return face(m, p.x, p.z);
    }
    const z = ctx.near(m, VILLAGERS.FLEE_R).find((o) => isZombie(o) && !o.dead);
    if (z) {
      m.panicS = Math.max(m.panicS, 1);
      m.panicFrom = { x: z.x, z: z.z };
    }
    if (m.panicS > 0) return this.brain.animalBase(m, mv);
    if (m.def.key === "villager" && !ctx.isDay() && m.home) { // đêm: về nhà (chỗ sinh trong nhà), đứng yên
      if (!this.goHome(m, mv, 1.2, m.def.walk)) m.path = null;
      return;
    }
    if (this.goHome(m, mv, m.def.key === "villager" ? VILLAGERS.HOME_R : 20, m.def.walk)) return;
    this.brain.wander(m, mv, m.def.walk);
  }

  private golem(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    this.animals.dropTarget(m);
    if (m.target) {
      const t = m.target;
      if (hdist(m.x, m.z, t.x, t.z) < 2.5) toward(mv, m, t.x, t.z, m.def.run);
      else this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
      if (hdist(m.x, m.z, t.x, t.z) <= m.width / 2 + 1.2 && Math.abs(t.y - m.y) < 2.5 && m.attackCdS <= 0) {
        ctx.strike(m, t, this.damage());
        m.attackCdS = m.def.attackS;
      }
      return;
    }
    if (!m.prey && ctx.rng() < ctx.dt / PREY_SCAN_S)
      m.prey = ctx.near(m, GOLEM.TARGET_R).find((o) => o.def.hostile && o.def.key !== "creeper" && !o.dead) ?? null;
    const t = m.prey;
    if (t) {
      if (hdist(m.x, m.z, t.x, t.z) < 2.5) toward(mv, m, t.x, t.z, m.def.run);
      else this.brain.chase(m, mv, t.x, t.y, t.z, m.def.run);
      if (hdist(m.x, m.z, t.x, t.z) <= (m.width + t.width) / 2 + 0.8 && Math.abs(t.y - m.y) < 2.5 && m.attackCdS <= 0) {
        ctx.bite(m, t, this.damage());
        t.body.vy = GOLEM.TOSS_V; // hất lên
        m.attackCdS = m.def.attackS;
      }
      return;
    }
    if (this.goHome(m, mv, GOLEM.HOME_R, m.def.walk)) return;
    this.brain.wander(m, mv, m.def.walk);
  }

  private damage(): number {
    const [a, b] = GOLEM.DAMAGE;
    return a + Math.floor(this.ctx.rng() * (b - a + 1));
  }

  private cat(m: Mob, mv: MobMove): void {
    const ctx = this.ctx;
    this.animals.dropTarget(m);
    if (m.owner) {
      m.loveS = Math.max(0, m.loveS - ctx.dt);
      m.breedCdS = Math.max(0, m.breedCdS - ctx.dt);
      if (m.sitting) return;
      const mate = m.loveS > 0 ? ctx.partner(m) : null;
      if (mate) return hdist(m.x, m.z, mate.x, mate.z) < 1.5 ? ctx.breed(m, mate) : toward(mv, m, mate.x, mate.z, m.def.walk * 1.2);
      const o = ctx.ownerOf(m);
      if (!o) return this.brain.wander(m, mv, m.def.walk);
      const d = Math.hypot(o.x - m.x, o.y - m.y, o.z - m.z);
      if (d > CATS.TELEPORT_R && !o.flying && ctx.teleport(m, { x: o.x, y: o.y, z: o.z }, TAME.TELEPORT_R)) return;
      if (d > CATS.FOLLOW_R) return this.brain.chase(m, mv, o.x, o.y, o.z, m.def.run);
      return this.brain.wander(m, mv, m.def.walk * 0.6);
    }
    // mèo hoang: người lại gần mà không cầm cá rón rén → chạy
    const scare = ctx.players.find((p) => Math.hypot(p.x - m.x, p.z - m.z) < CATS.FLEE_R && !(p.sneaking && m.def.food?.includes(p.inv.held?.item ?? "")));
    if (scare && m.panicS <= 0) {
      m.panicS = 2;
      m.panicFrom = { x: scare.x, z: scare.z };
    }
    this.brain.animalBase(m, mv);
  }

  /** Xác sống không có người chơi để đuổi: săn dân làng / thương nhân gần đó. true = đang săn. */
  zombieHunt(m: Mob, mv: MobMove): boolean {
    const ctx = this.ctx;
    if (m.prey && (m.prey.dead || hdist(m.x, m.z, m.prey.x, m.prey.z) > ZOMBIE_VILLAGER.HUNT_R * 1.3)) m.prey = null;
    if (!m.prey && ctx.rng() < ctx.dt / PREY_SCAN_S)
      m.prey = ctx.near(m, ZOMBIE_VILLAGER.HUNT_R).find((o) => (o.def.key === "villager" || o.def.key === "wandering_trader") && !o.dead) ?? null;
    if (!m.prey) return false;
    this.animals.hunt(m, mv, m.prey, m.def.damage);
    return true;
  }
}
