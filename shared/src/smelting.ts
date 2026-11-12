// Lò nung (DESIGN.md 2.5): công thức nung và nhiên liệu.
import { FURNACE } from "./constants.js";
import { LOG_ITEMS, PLANK_ITEMS } from "./woods.js";

/** Nguyên liệu → thành phẩm (thịt sống → chín thêm ở Giai đoạn 7 khi có thịt). */
export const SMELTING: Readonly<Record<string, string>> = {
  raw_iron: "iron_ingot",
  raw_gold: "gold_ingot",
  sand: "glass",
  cobble: "stone",
  potato: "baked_potato",
  cactus: "green_dye", // Giai đoạn 4d
};

/** Thân / ván mọi loài gỗ đốt như thân / ván sồi. */
const WOOD_FUEL = new Map<string, number>([
  ...LOG_ITEMS.map((k) => [k, FURNACE.FUEL.log] as [string, number]),
  ...PLANK_ITEMS.map((k) => [k, FURNACE.FUEL.planks] as [string, number]),
]);

/** Số món nung được với 1 đơn vị nhiên liệu (0 = không đốt được). */
export function fuelValue(item: string): number {
  return (FURNACE.FUEL as Record<string, number>)[item] ?? WOOD_FUEL.get(item) ?? 0;
}

export function smeltResult(item: string): string | null {
  return SMELTING[item] ?? null;
}
