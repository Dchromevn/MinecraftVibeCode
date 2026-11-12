// Luật ô chứa khi mở rương / lò nung (Giai đoạn 4b): dùng cho Inventory.extRules.
import { CONTAINERS } from "./constants.js";
import type { ExtRules, ItemStack, Slot } from "./inventory.js";
import { fuelValue, smeltResult } from "./smelting.js";

/** Rương đơn (27 ô) hoặc rương đôi (54 ô): ô nào cũng nhận, Shift chuyển vào theo thứ tự. */
export function chestRules(size: number): ExtRules {
  const all = Array.from({ length: size }, (_, i) => i);
  return { accepts: () => true, quickTargets: () => all };
}

/** Lò nung: 0 nguyên liệu, 1 nhiên liệu (chỉ đồ đốt được), 2 thành phẩm (chỉ lấy ra). */
export const FURNACE_RULES: ExtRules = {
  accepts: (i: number, s: ItemStack) => (i === 0 ? true : i === 1 ? fuelValue(s.item) > 0 : false),
  quickTargets: (s: ItemStack) => (smeltResult(s.item) ? [0] : fuelValue(s.item) > 0 ? [1] : []),
};

/** Ghép ô của hai nửa rương đôi thành một mảng 54 ô (nửa A ở trên); ghi ngược lại khi đóng. */
export function joinChest(a: Slot[], b: Slot[]): Slot[] {
  return [...a, ...b];
}

export function splitChest(all: Slot[], a: Slot[], b: Slot[]): void {
  for (let i = 0; i < CONTAINERS.CHEST_SLOTS; i++) {
    a[i] = all[i] ?? null;
    b[i] = all[CONTAINERS.CHEST_SLOTS + i] ?? null;
  }
}
