// Rương tàn tích pháo đài lợn (Giai đoạn 10d2) — theo loot_table/chests/bastion_*.json trong client.jar (Minecraft Wiki cho số lượng).
// Bỏ / thay món game chưa có: giáo, mẫu trang trí giáp, hoa văn cờ, đĩa nhạc → ô trống; táo vàng phù phép → táo vàng; cà rốt vàng → ô
// trống; đồ kim cương chưa phù phép ngẫu nhiên. Khuôn nâng cấp netherite: kho báu luôn có, các loại khác 10%.
import type { LootTable } from "./gameplay.js";

const e = (item: string, weight: number, min = 1, max = min) => ({ item, weight, min, max });
const TEMPLATE_10: LootTable = { ROLLS_MIN: 1, ROLLS_MAX: 1, ENTRIES: [e("", 9), e("netherite_upgrade_smithing_template", 1)] };
const GOLD_GEAR = ["sword", "chestplate", "helmet", "leggings", "boots", "axe"].map((k) => e(`gold_${k}`, 1));

export const BASTION_LOOT: Readonly<Record<string, LootTable>> = {
  bastion_treasure: {
    ROLLS_MIN: 3, ROLLS_MAX: 3,
    ENTRIES: [
      e("netherite_ingot", 15), e("ancient_debris", 10), e("netherite_scrap", 8), e("ancient_debris", 4, 2), e("diamond_sword", 12),
      e("diamond_chestplate", 11), e("diamond_helmet", 11), e("diamond_leggings", 11), e("diamond_boots", 11), e("", 12), e("diamond", 5, 2, 6), e("golden_apple", 2),
    ],
    MORE: [
      { ROLLS_MIN: 3, ROLLS_MAX: 4, ENTRIES: [e("spectral_arrow", 1, 12, 25), e("gold_block", 1, 2, 5), e("iron_block", 1, 2, 5), e("gold_ingot", 1, 3, 9),
        e("iron_ingot", 1, 3, 9), e("crying_obsidian", 1, 3, 5), e("quartz", 1, 8, 23), e("gilded_blackstone", 1, 5, 15), e("magma_cream", 1, 3, 8)] },
      { ROLLS_MIN: 1, ROLLS_MAX: 1, ENTRIES: [e("netherite_upgrade_smithing_template", 1)] },
    ],
  },
  bastion_other: {
    ROLLS_MIN: 1, ROLLS_MAX: 1,
    ENTRIES: [e("diamond_pickaxe", 6), e("diamond_shovel", 6), e("crossbow", 6), e("ancient_debris", 12), e("netherite_scrap", 4), e("spectral_arrow", 10, 10, 22),
      e("", 26), e("golden_apple", 9), e("enchanted_book", 10)],
    MORE: [
      { ROLLS_MIN: 2, ROLLS_MAX: 2, ENTRIES: [e("iron_sword", 2), e("iron_block", 2), e("gold_block", 2), e("crossbow", 1), e("gold_ingot", 2, 1, 6),
        e("iron_ingot", 2, 1, 6), e("crying_obsidian", 2, 1, 5), ...GOLD_GEAR, e("gold_boots", 1)] },
      { ROLLS_MIN: 3, ROLLS_MAX: 4, ENTRIES: [e("gilded_blackstone", 2, 1, 5), e("chain", 1, 2, 10), e("magma_cream", 2, 2, 6), e("bone_block", 1, 3, 6),
        e("iron_nugget", 1, 2, 8), e("obsidian", 1, 4, 6), e("gold_nugget", 1, 2, 8), e("string", 1, 4, 6), e("arrow", 2, 5, 17), e("cooked_porkchop", 1)] },
      TEMPLATE_10,
    ],
  },
  bastion_bridge: {
    ROLLS_MIN: 1, ROLLS_MAX: 1,
    ENTRIES: [e("lodestone", 1)],
    MORE: [
      { ROLLS_MIN: 1, ROLLS_MAX: 2, ENTRIES: [e("crossbow", 1), e("spectral_arrow", 1, 10, 28), e("gilded_blackstone", 1, 8, 12), e("crying_obsidian", 1, 3, 8),
        e("gold_block", 1), e("gold_ingot", 1, 4, 9), e("iron_ingot", 1, 4, 9), ...GOLD_GEAR] },
      { ROLLS_MIN: 2, ROLLS_MAX: 4, ENTRIES: [e("string", 1, 1, 6), e("leather", 1, 1, 3), e("arrow", 1, 5, 17), e("iron_nugget", 1, 2, 6), e("gold_nugget", 1, 2, 6)] },
      TEMPLATE_10,
    ],
  },
  bastion_hoglin_stable: {
    ROLLS_MIN: 1, ROLLS_MAX: 1,
    ENTRIES: [e("diamond_shovel", 15), e("diamond_pickaxe", 12), e("netherite_scrap", 8), e("ancient_debris", 12), e("ancient_debris", 5, 2), e("saddle", 12),
      e("gold_block", 16, 2, 4), e("", 10), e("golden_apple", 10)],
    MORE: [
      { ROLLS_MIN: 3, ROLLS_MAX: 4, ENTRIES: [e("gold_axe", 1), e("crying_obsidian", 1, 1, 5), e("glowstone", 1, 3, 6), e("gilded_blackstone", 1, 2, 5),
        e("soul_sand", 1, 2, 7), e("crimson_nylium", 1, 2, 7), e("gold_nugget", 1, 2, 8), e("leather", 1, 1, 3), e("arrow", 1, 5, 17), e("string", 1, 3, 8),
        e("porkchop", 1, 2, 5), e("cooked_porkchop", 1, 2, 5), e("crimson_fungus", 1, 2, 7), e("crimson_roots", 1, 2, 7)] },
      TEMPLATE_10,
    ],
  },
};
