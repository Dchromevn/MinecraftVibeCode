// Đồ trong rương công trình Giai đoạn 7e — theo bảng của Minecraft (loot_table trong client.jar, Minecraft Wiki), bỏ món game chưa
// có (sách phù phép, giáp ngựa, mẫu trang trí, đồ đồng, bản đồ...). Nhiều nhóm: bảng chính + MORE (mỗi nhóm bốc riêng).
// item "" = lượt bốc trúng ô trống.
import type { LootTable } from "./gameplay.js";
import { VILLAGE_LOOT } from "./villageLoot.js";
import { BASTION_LOOT } from "./bastionLoot.js";

const e = (item: string, weight: number, min = 1, max = min) => ({ item, weight, min, max });
const GOLD_GEAR = ["sword", "axe", "hoe", "shovel", "pickaxe", "helmet", "chestplate", "leggings", "boots"].map((k) => e(`gold_${k}`, 15));

export const STRUCTURE_LOOT: Readonly<Record<string, LootTable>> = {
  ...BASTION_LOOT, // (10d2) tàn tích pháo đài lợn
  // (10c) pháo đài Vực Lửa (chests/nether_bridge.json; bỏ giáp ngựa đồng, mẫu trang trí — game chưa có)
  nether_bridge: {
    ROLLS_MIN: 2, ROLLS_MAX: 4,
    ENTRIES: [
      e("diamond", 5, 1, 3), e("iron_ingot", 5, 1, 5), e("gold_ingot", 15, 1, 3), e("gold_sword", 5), e("gold_chestplate", 5), e("flint_and_steel", 5),
      e("nether_wart", 5, 3, 7), e("saddle", 10), e("golden_horse_armor", 8), e("iron_horse_armor", 5), e("diamond_horse_armor", 3), e("obsidian", 2, 2, 4),
    ],
  },
  igloo: {
    ROLLS_MIN: 2, ROLLS_MAX: 8,
    ENTRIES: [e("apple", 15, 1, 3), e("coal", 15, 1, 4), e("iron_nugget", 10, 1, 3), e("stone_axe", 2), e("rotten_flesh", 10), e("emerald", 1), e("wheat", 10, 2, 3)],
    MORE: [{ ROLLS_MIN: 1, ROLLS_MAX: 1, ENTRIES: [e("golden_apple", 1)] }], // luôn có 1 táo vàng
  },
  desert_pyramid: {
    ROLLS_MIN: 2, ROLLS_MAX: 4,
    ENTRIES: [
      e("diamond", 5, 1, 3), e("iron_ingot", 15, 1, 5), e("gold_ingot", 15, 2, 7), e("emerald", 15, 1, 3), e("bone", 25, 4, 6),
      e("spider_eye", 25, 1, 3), e("rotten_flesh", 25, 3, 7), e("leather", 20, 1, 5), e("golden_apple", 22), e("", 15), e("enchanted_book", 20), // 8b3
    ],
    MORE: [{ ROLLS_MIN: 4, ROLLS_MAX: 4, ENTRIES: ["bone", "gunpowder", "rotten_flesh", "string", "sand"].map((k) => e(k, 10, 1, 8)) }],
  },
  ruined_portal: {
    ROLLS_MIN: 4, ROLLS_MAX: 8,
    ENTRIES: [
      e("obsidian", 40, 1, 2), e("flint", 40, 1, 4), e("iron_nugget", 40, 9, 18), e("flint_and_steel", 40), e("golden_apple", 15),
      ...GOLD_GEAR, e("gold_ingot", 5, 2, 8), e("gold_block", 1),
    ],
  },
  camp_common: {
    ROLLS_MIN: 4, ROLLS_MAX: 6,
    ENTRIES: ["arrow", "bone", "cobweb", "gunpowder", "flint_and_steel", "leather", "rabbit_hide", "string"].map((k) => e(k, 1, 1, k === "flint_and_steel" ? 1 : 3)),
    MORE: [{ ROLLS_MIN: 2, ROLLS_MAX: 2, ENTRIES: ["bow", "bucket", "shears"].map((k) => e(k, 1)) }],
  },
  camp_secret: {
    ROLLS_MIN: 2, ROLLS_MAX: 2, ENTRIES: [e("diamond", 1)],
    MORE: [
      { ROLLS_MIN: 4, ROLLS_MAX: 6, ENTRIES: [e("gold_ingot", 1, 1, 3), e("iron_ingot", 1, 1, 3)] },
      { ROLLS_MIN: 0, ROLLS_MAX: 1, ENTRIES: ["iron_axe", "iron_boots", "iron_leggings"].map((k) => e(k, 1)) },
    ],
  },
  // 7f: tàu đắm (bỏ bản đồ kho báu — người dùng bỏ kho báu chôn), tàn tích đại dương
  shipwreck_supply: {
    ROLLS_MIN: 3, ROLLS_MAX: 10,
    ENTRIES: [
      e("potato", 7, 2, 6), e("carrot", 7, 4, 8), e("wheat", 7, 8, 21), e("coal", 6, 2, 8), e("rotten_flesh", 5, 5, 24), e("pumpkin", 2, 1, 3),
      e("gunpowder", 3, 1, 5), e("tnt", 1, 1, 2), ...["helmet", "chestplate", "leggings", "boots"].map((k) => e(`leather_${k}`, 3)),
    ],
  },
  shipwreck_map: { ROLLS_MIN: 3, ROLLS_MAX: 3, ENTRIES: [e("feather", 10, 1, 5), e("string", 5, 1, 3), e("coal", 5, 1, 4), e("emerald", 1)] },
  shipwreck_treasure: {
    ROLLS_MIN: 3, ROLLS_MAX: 6, ENTRIES: [e("iron_ingot", 90, 1, 5), e("gold_ingot", 10, 1, 5), e("emerald", 40, 1, 5), e("diamond", 5), e("enchanted_book", 5)],
    MORE: [{ ROLLS_MIN: 2, ROLLS_MAX: 5, ENTRIES: [e("iron_nugget", 50, 1, 10)] }],
  },
  ruin_small: {
    ROLLS_MIN: 2, ROLLS_MAX: 8, ENTRIES: [e("coal", 10, 1, 4), e("stone_axe", 2), e("rotten_flesh", 5), e("emerald", 1), e("wheat", 10, 2, 3)],
    MORE: [{ ROLLS_MIN: 1, ROLLS_MAX: 1, ENTRIES: [e("leather_chestplate", 1), e("gold_helmet", 1)] }],
  },
  ruin_big: {
    ROLLS_MIN: 2, ROLLS_MAX: 8, ENTRIES: [e("coal", 10, 1, 4), e("gold_ingot", 2, 1, 3), e("emerald", 1), e("wheat", 10, 2, 3)],
    MORE: [{ ROLLS_MIN: 1, ROLLS_MAX: 1, ENTRIES: [e("golden_apple", 1), e("leather_chestplate", 1), e("gold_helmet", 1), e("enchanted_book", 1)] }],
  },
  camp_barrel: {
    ROLLS_MIN: 4, ROLLS_MAX: 8,
    ENTRIES: ["arrow", "bone", "bowl", "bread", "coal", "cobweb", "leather", "rabbit_hide", "string", "wheat"].map((k) => e(k, 1, 1, 3)),
    MORE: [{ ROLLS_MIN: 1, ROLLS_MAX: 1, ENTRIES: [e("wood_axe", 1)] }],
  },
  ...VILLAGE_LOOT, // 8a
  pillager_outpost: { // 8b: rương đỉnh tháp canh (bỏ chai kinh nghiệm, sách, móc bẫy, tù và dê)
    ROLLS_MIN: 0, ROLLS_MAX: 1, ENTRIES: [e("crossbow", 1), e("enchanted_book", 1)],
    MORE: [
      { ROLLS_MIN: 2, ROLLS_MAX: 3, ENTRIES: [e("wheat", 7, 3, 5), e("potato", 5, 2, 5), e("carrot", 5, 3, 5)] },
      { ROLLS_MIN: 1, ROLLS_MAX: 3, ENTRIES: [e("log", 1, 2, 3)] },
      { ROLLS_MIN: 2, ROLLS_MAX: 3, ENTRIES: [e("string", 4, 1, 6), e("arrow", 4, 2, 7), e("iron_ingot", 3, 1, 3), e("emerald", 1, 1, 2)] },
    ],
  },
  woodland_mansion: { // 8c: rương dinh thự (bỏ táo vàng phù phép, đĩa nhạc, áo xích, đá đỏ, nhựa cây, mẫu trang trí — game chưa có)
    ROLLS_MIN: 1, ROLLS_MAX: 3,
    ENTRIES: [e("lead", 20), e("golden_apple", 15), e("diamond_hoe", 15), e("diamond_chestplate", 5), e("enchanted_book", 10)],
    MORE: [
      { ROLLS_MIN: 1, ROLLS_MAX: 4, ENTRIES: [e("iron_ingot", 10, 1, 4), e("gold_ingot", 5, 1, 4), e("bread", 20), e("wheat", 20, 1, 4), e("bucket", 10),
        e("coal", 15, 1, 4), e("melon_seeds", 10, 2, 4), e("pumpkin_seeds", 10, 2, 4), e("beetroot_seeds", 10, 2, 4)] },
      { ROLLS_MIN: 3, ROLLS_MAX: 3, ENTRIES: ["bone", "gunpowder", "rotten_flesh", "string"].map((k) => e(k, 10, 1, 8)) },
    ],
  },
};
