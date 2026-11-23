// Đe và đá mài phía server (Giai đoạn 8b3): mở 2 ô riêng từng người (đóng thì trả đồ về túi); lấy kết quả: tính lại bằng hàm dùng
// chung (anvil.ts), kiểm cấp kinh nghiệm, tiêu đồ, thêm kết quả vào túi. Đe: 12% mỗi lần dùng thì sứt một mức (đe → sứt → hỏng
// nặng → vỡ). Đá mài: rơi kinh nghiệm cạnh đá mài.
import { ANVIL, ANVIL_RULES, B, GRIND_RULES, SMITH_RULES, anvilResult, grindResult, smithResult, spendLevels, xpLevel, type ItemStack } from "../../shared/src/index.js";
import type { Containers, ContainerSession } from "./containers.js";
import type { ServerPlayer } from "./player.js";
import type { ServerItems } from "./serverItems.js";
import type { ServerWorld } from "./serverWorld.js";

const NEXT_ANVIL: Record<number, number> = { [B.ANVIL]: B.CHIPPED_ANVIL, [B.CHIPPED_ANVIL]: B.DAMAGED_ANVIL, [B.DAMAGED_ANVIL]: 0 };

export class Workstations {
  constructor(private readonly w: ServerWorld, private readonly containers: Containers, private readonly items: ServerItems) {}

  /** Mở đe / đá mài / (10d2) bàn rèn ở (x, y, z). */
  open(p: ServerPlayer, kind: "anvil" | "grindstone" | "smithing", x: number, y: number, z: number): void {
    this.containers.close(p);
    const slots: ContainerSession["slots"] = kind === "smithing" ? [null, null, null] : [null, null];
    const s: ContainerSession = {
      key: `${kind}:${p.id}`, kind, slots, positions: [{ x, y, z }], viewers: new Set([p]),
      finish: () => {
        for (const it of slots) if (it) this.give(p, it);
        p.stationAt = null;
      },
    };
    this.containers.adopt(p, s, kind === "anvil" ? ANVIL_RULES : kind === "smithing" ? SMITH_RULES : GRIND_RULES);
    p.stationAt = { x, y, z };
    p.send({ t: "open", kind, size: slots.length });
  }

  private give(p: ServerPlayer, s: ItemStack): void {
    const left = p.inv.add(s);
    if (left) this.items.throwFrom(left, p);
  }

  /** Lấy kết quả của đe (tên mới name). */
  anvilTake(p: ServerPlayer, name: string): void {
    const at = p.stationAt, sl = p.inv.ext;
    if (!at || p.container?.kind !== "anvil") return;
    const r = anvilResult(sl[0] ?? null, sl[1] ?? null, typeof name === "string" ? name : "");
    const free = p.admin && p.flying;
    if (!r.out || (!free && (r.tooExpensive || xpLevel(p.state.xp).level < r.cost))) return;
    sl[0] = null;
    const right = sl[1];
    if (right && r.use) {
      right.count -= r.use;
      if (right.count <= 0) sl[1] = null;
    }
    this.give(p, r.out);
    if (!free) {
      p.state.xp = spendLevels(p.state.xp, r.cost);
      p.stateDirty = true;
    }
    p.invDirty = true;
    const id = this.w.getCell(at.x, at.y, at.z) & 255;
    if (NEXT_ANVIL[id] !== undefined && Math.random() < ANVIL.DAMAGE_CHANCE) { // đe sứt / vỡ
      const meta = this.w.getCell(at.x, at.y, at.z) >> 8, next = NEXT_ANVIL[id]!;
      this.w.setCell(at.x, at.y, at.z, next, next ? meta : 0);
      if (!next) this.containers.closeAt(at.x, at.y, at.z);
    }
  }

  /** (10d2) Lấy kết quả của bàn rèn: tiêu 1 khuôn, đồ kim cương, 1 thỏi netherite. */
  smithTake(p: ServerPlayer): void {
    const sl = p.inv.ext;
    if (!p.stationAt || p.container?.kind !== "smithing") return;
    const out = smithResult(sl[0] ?? null, sl[1] ?? null, sl[2] ?? null);
    if (!out) return;
    for (const i of [0, 1, 2]) {
      const s = sl[i];
      if (s && --s.count <= 0) sl[i] = null;
    }
    this.give(p, out);
    p.invDirty = true;
  }

  /** Lấy kết quả của đá mài. */
  grindTake(p: ServerPlayer): void {
    const at = p.stationAt, sl = p.inv.ext;
    if (!at || p.container?.kind !== "grindstone") return;
    const r = grindResult(sl[0] ?? null, sl[1] ?? null);
    if (!r.out) return;
    for (const i of [0, 1]) {
      const s = sl[i];
      if (s && --s.count <= 0) sl[i] = null;
    }
    this.give(p, r.out);
    if (r.xp > 0) this.items.xp(r.xp, at.x + 0.5, at.y + 1, at.z + 0.5);
    p.invDirty = true;
  }
}
