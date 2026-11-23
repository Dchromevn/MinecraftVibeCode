// Chuột phải vào động vật Giai đoạn 7c (MECHANICS.md 8.4): thuần sói bằng xương (1/3 mỗi lần), chủ bấm thì ngồi / đứng,
// cho ăn thịt hồi máu / phối giống, nhuộm vòng cổ, mặc / tháo (kéo) giáp sói; vắt sữa dê bằng xô; xúc cá bằng xô nước.
import { CATS, COLORS, FOODS, MOB_AI, TAME, itemDef, stack, type Rng } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

const FISH_BUCKET = new Set(["cod", "salmon", "pufferfish", "tropical_fish"]);

export class MobTame {
  constructor(
    private readonly mobs: Mobs,
    private readonly items: ServerItems,
    private readonly rng: Rng,
    private readonly online: () => ServerPlayer[],
  ) {}

  /** Đổi 1 món đang cầm thành món khác (xô → xô sữa...), thừa thì vào túi / rơi ra. */
  private swapHeld(p: ServerPlayer, item: string): void {
    const held = p.inv.held;
    if (!held || held.count <= 1) p.inv.main[p.inv.selected] = stack(item);
    else {
      p.inv.takeHeld(1);
      const left = p.inv.add(stack(item));
      if (left) this.items.throwFrom(left, p);
    }
    p.invDirty = true;
  }

  private take(p: ServerPlayer): void {
    p.inv.takeHeld(1);
    p.invDirty = true;
  }

  /** Hạt hiệu ứng cho người quanh m (tim: thuần thành công, khói: chưa được). */
  private fx(m: Mob, kind: "hearts" | "smoke"): void {
    for (const o of this.online())
      if (Math.hypot(o.x - m.x, o.z - m.z) <= MOB_AI.VIEW) o.send({ t: "fx", kind, x: m.x, y: m.y + m.height, z: m.z });
  }

  /** Xử lý chuột phải loài 7c; true = đã xử lý (không chạy phần cho ăn chung). */
  use(p: ServerPlayer, m: Mob): boolean {
    const item = p.inv.held?.item ?? "", k = m.def.key;
    if (k === "wolf") return this.wolf(p, m, item);
    if (k === "cat") return this.cat(p, m, item);
    if (k === "goat" && item === "bucket" && !m.baby) return this.swapHeld(p, "milk_bucket"), true;
    if (FISH_BUCKET.has(k) && item === "water_bucket") {
      this.swapHeld(p, `${k}_bucket`);
      this.mobs.remove(m);
      return true;
    }
    return false;
  }

  /** (8a) Mèo: hoang thì cho cá sống (1/3 mỗi con) để thuần; thuần thì như sói (ngồi, cho ăn, nhuộm vòng cổ). */
  private cat(p: ServerPlayer, m: Mob, item: string): boolean {
    if (m.owner) return this.wolf(p, m, item);
    if (!m.def.food?.includes(item) || m.baby) return false;
    this.take(p);
    if (this.rng() >= CATS.TAME_CHANCE) return this.fx(m, "smoke"), true;
    Object.assign(m, { owner: p.name, sitting: true, panicS: 0, path: null });
    this.fx(m, "hearts");
    return true;
  }

  private wolf(p: ServerPlayer, m: Mob, item: string): boolean {
    if (!m.owner) {
      if (item !== "bone" || m.target || m.baby) return true; // sói hoang không ăn thịt từ tay người, không phối giống
      this.take(p);
      if (this.rng() >= TAME.WOLF_CHANCE) return this.fx(m, "smoke"), true;
      Object.assign(m, { owner: p.name, sitting: true, target: null, prey: null, path: null, maxHealth: TAME.WOLF_HEALTH, health: TAME.WOLF_HEALTH });
      this.fx(m, "hearts");
      return true;
    }
    if (m.owner !== p.name) return true;
    const food = FOODS[item];
    if (food && m.def.food?.includes(item)) {
      if (m.health < m.maxHealth) m.health = Math.min(m.maxHealth, m.health + food.hunger); // hồi theo độ no của món
      else if (!m.baby && m.breedCdS <= 0 && m.loveS <= 0) m.loveS = TAME.LOVE_S;
      else return true;
      this.take(p);
      return true;
    }
    if (item.endsWith("_dye")) {
      const c = COLORS.indexOf(item.slice(0, -4) as (typeof COLORS)[number]);
      if (c >= 0 && c !== m.collar) {
        m.collar = c;
        this.take(p);
      }
      return true;
    }
    if (item === "wolf_armor" && m.armorDur <= 0 && !m.baby) {
      const held = p.inv.held!;
      m.armorDur = Math.max(1, (itemDef("wolf_armor")?.durability ?? TAME.WOLF_ARMOR_DUR) - held.damage);
      this.take(p);
      return true;
    }
    if (item === "shears" && m.armorDur > 0) {
      const max = itemDef("wolf_armor")?.durability ?? TAME.WOLF_ARMOR_DUR;
      this.items.pop({ ...stack("wolf_armor"), damage: Math.max(0, max - m.armorDur) }, Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z));
      m.armorDur = 0;
      p.inv.damageSlot("main", p.inv.selected, 1);
      p.invDirty = true;
      return true;
    }
    m.sitting = !m.sitting; // tay không / món khác: ngồi ↔ đứng
    m.target = null;
    m.prey = null;
    m.path = null;
    return true;
  }
}
