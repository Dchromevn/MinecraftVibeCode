// Bàn rèn (Giai đoạn 10d2, Minecraft 1.20+): ô 0 khuôn nâng cấp netherite, ô 1 đồ kim cương (công cụ / giáp), ô 2 thỏi netherite →
// đồ netherite cùng loại, giữ phù phép, tên, độ bền đã dùng, số lần qua đe. Mỗi lần rèn tiêu 1 khuôn + 1 thỏi. Client xem trước, server tính lại.
import type { ExtRules, ItemStack } from "./inventory.js";
import { itemDef } from "./items.js";

export const SMITH_TEMPLATE = "netherite_upgrade_smithing_template";
const upgradable = (item: string): boolean => item.startsWith("diamond_") && !!itemDef(`netherite_${item.slice(8)}`) && !!(itemDef(item)?.tool || itemDef(item)?.armor);

/** Kết quả rèn (null = không rèn được). */
export function smithResult(tpl: ItemStack | null, base: ItemStack | null, add: ItemStack | null): ItemStack | null {
  if (tpl?.item !== SMITH_TEMPLATE || !base || !upgradable(base.item) || add?.item !== "netherite_ingot") return null;
  return { ...base, item: `netherite_${base.item.slice(8)}`, count: 1, ...(base.ench ? { ench: { ...base.ench } } : {}) };
}

/** Ô bàn rèn: 0 khuôn, 1 đồ kim cương, 2 thỏi netherite. */
export const SMITH_RULES: ExtRules = {
  accepts: (i: number, s: ItemStack) => (i === 0 ? s.item === SMITH_TEMPLATE : i === 1 ? upgradable(s.item) : i === 2 && s.item === "netherite_ingot"),
  quickTargets: (s: ItemStack) => (s.item === SMITH_TEMPLATE ? [0] : upgradable(s.item) ? [1] : s.item === "netherite_ingot" ? [2] : []),
};
