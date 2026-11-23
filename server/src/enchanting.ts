// Bàn phù phép phía server (Giai đoạn 8b2; Minecraft Wiki): đếm giá sách quanh bàn (vòng cách 2 ô, cao 0–1, ô giữa phải trống,
// tối đa 15), mở giao diện 2 ô (món + lưu ly) riêng từng người — đóng thì trả đồ về túi; chọn lựa chọn i: cần đủ cấp, tốn i + 1
// lưu ly và i + 1 cấp; sách thành sách phù phép. Ba lựa chọn tính từ hạt giống của người chơi (đổi sau mỗi lần phù phép).
import { B, ENCHANT_RULES, enchantOffers, spendLevels, stack, xpLevel } from "../../shared/src/index.js";
import type { Containers, ContainerSession } from "./containers.js";
import type { ServerPlayer } from "./player.js";
import type { ServerItems } from "./serverItems.js";
import type { ServerWorld } from "./serverWorld.js";

/** Số giá sách quanh bàn ở (x, y, z). */
export function countShelves(w: ServerWorld, x: number, y: number, z: number): number {
  let n = 0;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
      for (const dy of [0, 1]) {
        if ((w.getCell(x + dx, y + dy, z + dz) & 255) !== B.BOOKSHELF) continue;
        const mx = x + Math.trunc(dx / 2), mz = z + Math.trunc(dz / 2); // ô giữa bàn và giá sách phải trống
        if (w.getCell(mx, y + dy, mz) === 0 && w.getCell(mx, y, mz) === 0) n++;
      }
    }
  return Math.min(15, n);
}

export class Enchanting {
  constructor(private readonly w: ServerWorld, private readonly containers: Containers, private readonly items: ServerItems) {}

  /** Mở bàn phù phép ở (x, y, z) cho p. */
  open(p: ServerPlayer, x: number, y: number, z: number): void {
    this.containers.close(p);
    const slots: ContainerSession["slots"] = [null, null];
    const s: ContainerSession = {
      key: `ench:${p.id}`, kind: "enchant", slots, positions: [{ x, y, z }], viewers: new Set([p]),
      finish: () => { // đóng: trả món + lưu ly về túi (đầy thì rơi ra)
        for (const it of slots) if (it) {
          const left = p.inv.add(it);
          if (left) this.items.throwFrom(left, p);
        }
        p.enchantAt = null;
      },
    };
    this.containers.adopt(p, s, ENCHANT_RULES);
    p.enchantAt = { x, y, z };
    p.send({ t: "open", kind: "enchant", size: 2 });
    this.info(p);
  }

  private info(p: ServerPlayer): void {
    const at = p.enchantAt;
    if (at) p.send({ t: "enchantInfo", seed: p.xpSeed, shelves: countShelves(this.w, at.x, at.y, at.z) });
  }

  /** Người chơi chọn lựa chọn i (0–2). */
  enchant(p: ServerPlayer, i: number): void {
    const at = p.enchantAt, slots = p.inv.ext, item = slots[0], lapis = slots[1];
    if (!at || p.container?.kind !== "enchant" || !item || i < 0 || i > 2) return;
    const offer = enchantOffers(p.xpSeed, item.item, countShelves(this.w, at.x, at.y, at.z))[i];
    const free = p.admin && p.flying; // quản trị viên đang bay (thử nghiệm): không tốn
    if (!offer || !Object.keys(offer.ench).length) return;
    if (!free && (xpLevel(p.state.xp).level < offer.level || (lapis?.count ?? 0) < i + 1)) return;
    if (item.item === "book") {
      slots[0] = { ...stack("enchanted_book"), ench: offer.ench };
      if (item.count > 1) {
        const left = p.inv.add(stack("book", item.count - 1));
        if (left) this.items.throwFrom(left, p);
      }
    } else slots[0] = { ...item, ench: offer.ench };
    if (!free) {
      lapis!.count -= i + 1;
      if (lapis!.count <= 0) slots[1] = null;
      p.state.xp = spendLevels(p.state.xp, i + 1);
      p.stateDirty = true;
    }
    p.xpSeed = Math.floor(Math.random() * 2 ** 31);
    p.invDirty = true;
    this.info(p);
  }
}
