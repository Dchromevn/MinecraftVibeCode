// Đổi đồ với dân làng (Giai đoạn 8a; PLAN mục 2.11): mỗi nghề 2–4 giao dịch cố định, tiền tệ là ngọc lục bảo — theo bảng giao
// dịch cấp 1–2 của Minecraft, chỉ dùng món game đang có. Mỗi giao dịch dùng được MAX lần rồi hết hàng, dân làng bổ sung hàng sau
// RESTOCK_S giây. Thương nhân lang thang: 5 món thường + 1 món hiếm chọn ngẫu nhiên lúc xuất hiện, không bổ sung.
import { COLORS } from "./colors.js";
import type { Inventory } from "./inventory.js";
import type { Profession } from "./villageConstants.js";

/** [món, số lượng]. */
export type TradeItem = [string, number];
export interface Trade { buy: TradeItem; buy2?: TradeItem; sell: TradeItem; max: number; ench?: Record<string, number> } // (8b3) ench: phù phép của món bán

const E = "emerald";
const t = (buy: TradeItem, sell: TradeItem, max = 16, buy2?: TradeItem): Trade => ({ buy, sell, max, ...(buy2 ? { buy2 } : {}) });

export const TRADES: Readonly<Record<Profession, readonly Trade[]>> = {
  none: [], nitwit: [],
  farmer: [t(["wheat", 20], [E, 1]), t(["potato", 26], [E, 1]), t(["carrot", 22], [E, 1]), t([E, 1], ["bread", 6])],
  fisherman: [t(["string", 20], [E, 1]), t(["coal", 10], [E, 1]), t(["cod", 6], ["cooked_cod", 6], 16, [E, 1]), t(["cod", 15], [E, 1])],
  shepherd: [t(["white_wool", 18], [E, 1]), t(["black_wool", 18], [E, 1]), t([E, 2], ["shears", 1], 12), t([E, 3], ["white_bed", 1], 12)],
  fletcher: [t(["stick", 32], [E, 1]), t([E, 1], ["arrow", 16]), t(["gravel", 10], ["flint", 10], 12, [E, 1]), t([E, 2], ["bow", 1], 12)],
  librarian: [t(["ink_sac", 5], [E, 1]), t([E, 9], ["bookshelf", 1], 12), t([E, 1], ["glass", 4]), t([E, 1], ["lantern", 1])],
  cartographer: [t(["glass_pane", 11], [E, 1]), t([E, 2], ["lantern", 1], 12), t([E, 1], ["torch", 8])],
  cleric: [t(["rotten_flesh", 32], [E, 1]), t(["gold_ingot", 3], [E, 1], 12), t([E, 5], ["ender_pearl", 1], 12)],
  armorer: [t(["coal", 15], [E, 1]), t([E, 5], ["iron_helmet", 1], 3), t([E, 9], ["iron_chestplate", 1], 3), t(["iron_ingot", 4], [E, 1], 12)],
  weaponsmith: [t(["coal", 15], [E, 1]), t([E, 3], ["iron_axe", 1], 3), t([E, 7], ["iron_sword", 1], 3), t(["flint", 24], [E, 1], 12)],
  toolsmith: [t(["coal", 15], [E, 1]), t([E, 1], ["stone_pickaxe", 1], 3), t([E, 1], ["stone_axe", 1], 3), t(["iron_ingot", 4], [E, 1], 12)],
  butcher: [t(["chicken", 14], [E, 1]), t(["porkchop", 7], [E, 1]), t([E, 1], ["cooked_porkchop", 5]), t([E, 1], ["cooked_chicken", 8])],
  leatherworker: [t(["leather", 6], [E, 1]), t([E, 3], ["leather_leggings", 1], 12), t([E, 7], ["leather_chestplate", 1], 12), t([E, 6], ["saddle", 1], 12)],
  mason: [t(["stone", 20], [E, 1]), t([E, 1], ["chiseled_stone_bricks", 4]), t([E, 1], ["terracotta", 4]), t([E, 1], ["smooth_sandstone", 4])],
};

/** Hàng thường của thương nhân lang thang (mỗi lần xuất hiện chọn TRADER.COMMON món + TRADER.RARE món hiếm). */
export const WANDER_TRADES: readonly Trade[] = [
  ...["sapling", "spruce_sapling", "birch_sapling", "acacia_sapling", "dandelion", "poppy", "cornflower", "lily_of_the_valley", "cactus", "pumpkin",
    "lily_pad", "vine", "melon_seeds", "pumpkin_seeds", "beetroot_seeds"].map((k) => t([E, 1], [k, 1], 8)),
  ...COLORS.map((c) => t([E, 1], [`${c}_dye`, 3], 12)),
  t([E, 1], ["sand", 8], 8), t([E, 1], ["gunpowder", 1], 8), t([E, 3], ["ice", 1], 6), t([E, 1], ["glow_ink_sac", 1], 5),
];
export const WANDER_RARE: readonly Trade[] = [
  t([E, 4], ["slime_ball", 1], 5), t([E, 3], ["lead", 1], 4), t([E, 6], ["saddle", 1], 2), t([E, 5], ["golden_apple", 1], 2), t([E, 3], ["snow_block", 2], 4),
];

/** Đủ đồ trả cho giao dịch không. */
export function canAfford(inv: Inventory, tr: Trade): boolean {
  const need = new Map<string, number>([[tr.buy[0], tr.buy[1]]]);
  if (tr.buy2) need.set(tr.buy2[0], (need.get(tr.buy2[0]) ?? 0) + tr.buy2[1]);
  for (const [k, n] of need) if (inv.count(k) < n) return false;
  return true;
}

/** Một giao dịch gửi cho client: [mua, mua2 | null, bán, đã dùng, tối đa]. */
export type TradeView = [TradeItem, TradeItem | null, TradeItem, number, number, Record<string, number> | null];
