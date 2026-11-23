// Lò nung (DESIGN.md 2.5): công thức nung và nhiên liệu.
import { COAL_BLOCK_FUEL, FURNACE } from "./constants.js";
import { LOG_ITEMS, PLANK_ITEMS } from "./woods.js";

const BLAZE_ROD_FUEL = 12; // (10c) que quỷ lửa nung được 12 món (Minecraft)

/** Nguyên liệu → thành phẩm (thịt sống → chín thêm ở Giai đoạn 7 khi có thịt). */
export const SMELTING: Readonly<Record<string, string>> = {
  raw_iron: "iron_ingot",
  raw_gold: "gold_ingot",
  sand: "glass",
  cobble: "stone",
  stone_bricks: "cracked_stone_bricks", // 7e
  nether_quartz_ore: "quartz", nether_gold_ore: "gold_ingot", // 10a (quặng lấy bằng Cảm ứng tơ)
  basalt: "smooth_basalt", // 10b
  netherrack: "nether_brick", nether_bricks: "cracked_nether_bricks", // 10c
  ancient_debris: "netherite_scrap", polished_blackstone_bricks: "cracked_polished_blackstone_bricks", // 10d2
  potato: "baked_potato",
  cactus: "green_dye", // Giai đoạn 4d
  // Giai đoạn 7a: thịt sống → chín
  beef: "cooked_beef",
  porkchop: "cooked_porkchop",
  chicken: "cooked_chicken",
  mutton: "cooked_mutton",
  rabbit: "cooked_rabbit", // 7c
  cod: "cooked_cod",
  salmon: "cooked_salmon",
};

/** Thân / ván mọi loài gỗ đốt như thân / ván sồi. */
const WOOD_FUEL = new Map<string, number>([
  ...LOG_ITEMS.map((k) => [k, FURNACE.FUEL.log] as [string, number]),
  ...PLANK_ITEMS.map((k) => [k, FURNACE.FUEL.planks] as [string, number]),
]);

/** Số món nung được với 1 đơn vị nhiên liệu (0 = không đốt được). */
export function fuelValue(item: string): number {
  if (item === "coal_block") return COAL_BLOCK_FUEL;
  if (item === "blaze_rod") return BLAZE_ROD_FUEL; // (10c)
  return (FURNACE.FUEL as Record<string, number>)[item] ?? WOOD_FUEL.get(item) ?? 0;
}

export function smeltResult(item: string): string | null {
  return SMELTING[item] ?? null;
}
