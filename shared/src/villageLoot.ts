// Đồ trong rương làng (Giai đoạn 8a) — theo bảng chests/village/* của Minecraft (client.jar), bỏ món game chưa có (sách, giấy,
// bản đồ, giáp ngựa, thuốc, hạt ca cao...).
import type { LootTable } from "./gameplay.js";

const e = (item: string, weight: number, min = 1, max = min) => ({ item, weight, min, max });
const t = (min: number, max: number, entries: ReturnType<typeof e>[]): LootTable => ({ ROLLS_MIN: min, ROLLS_MAX: max, ENTRIES: entries });

export const VILLAGE_LOOT: Readonly<Record<string, LootTable>> = {
  village_weaponsmith: t(3, 8, [
    e("diamond", 3, 1, 3), e("iron_ingot", 10, 1, 5), e("gold_ingot", 5, 1, 3), e("bread", 15, 1, 3), e("apple", 15, 1, 3),
    e("iron_pickaxe", 5), e("iron_sword", 5), e("iron_chestplate", 5), e("iron_helmet", 5), e("iron_leggings", 5), e("iron_boots", 5),
    e("obsidian", 5, 3, 7), e("sapling", 5, 3, 7),
  ]),
  village_toolsmith: t(3, 8, [
    e("diamond", 1, 1, 3), e("iron_ingot", 5, 1, 5), e("gold_ingot", 1, 1, 3), e("bread", 15, 1, 3), e("iron_pickaxe", 5), e("coal", 1, 1, 3),
    e("stick", 20, 1, 3), e("iron_shovel", 5),
  ]),
  village_armorer: t(1, 5, [e("iron_ingot", 2, 1, 3), e("bread", 4, 1, 4), e("iron_helmet", 1), e("emerald", 1)]),
  village_cartographer: t(1, 5, [e("feather", 1, 1, 5), e("bread", 15, 1, 5), e("stick", 5, 1, 2)]),
  village_mason: t(1, 5, [e("stone", 2, 1, 3), e("bread", 4, 1, 4), e("yellow_dye", 1), e("stone_bricks", 1), e("emerald", 1)]),
  village_shepherd: t(1, 5, [
    e("white_wool", 6, 1, 8), e("black_wool", 3, 1, 3), e("gray_wool", 2, 1, 3), e("brown_wool", 2, 1, 3), e("light_gray_wool", 2, 1, 3),
    e("emerald", 1), e("shears", 1), e("wheat", 6, 1, 6),
  ]),
  village_butcher: t(1, 5, [e("emerald", 1), e("porkchop", 6), e("wheat", 6), e("beef", 6), e("mutton", 6), e("coal", 3)]),
  village_fletcher: t(1, 5, [e("emerald", 1), e("arrow", 2), e("feather", 6), e("egg", 2), e("flint", 6), e("stick", 6)]),
  village_fisher: t(1, 5, [e("emerald", 1), e("cod", 2), e("salmon", 1), e("water_bucket", 1), e("coal", 2)]),
  village_tannery: t(1, 5, [
    e("leather", 1, 1, 3), e("leather_chestplate", 2), e("leather_boots", 2), e("leather_helmet", 2), e("bread", 5, 1, 4),
    e("leather_leggings", 2), e("saddle", 1), e("emerald", 1, 1, 4),
  ]),
  village_temple: t(3, 8, [
    e("gold_ingot", 1, 1, 4), e("iron_ingot", 1, 1, 4), e("emerald", 1, 1, 4), e("rotten_flesh", 7), e("bread", 7),
  ]),
  village_plains_house: t(3, 8, [
    e("dandelion", 2), e("poppy", 1), e("potato", 10, 1, 7), e("bread", 10, 1, 4), e("apple", 10, 1, 5),
    e("feather", 1), e("emerald", 2, 1, 4), e("sapling", 5, 1, 2),
  ]),
  village_taiga_house: t(3, 8, [
    e("iron_nugget", 1, 1, 5), e("tallgrass", 2), e("pumpkin", 2), e("potato", 10, 1, 7), e("pumpkin_seeds", 5, 1, 5),
    e("emerald", 1, 1, 4), e("spruce_sapling", 5, 1, 5), e("spruce_log", 10, 1, 5), e("bread", 10, 1, 4),
  ]),
  village_savanna_house: t(3, 8, [
    e("tallgrass", 5), e("bread", 10, 1, 4), e("seeds", 10, 1, 5), e("emerald", 2, 1, 4), e("acacia_sapling", 10, 1, 2),
    e("saddle", 1), e("torch", 1, 1, 2), e("bucket", 1),
  ]),
  village_snowy_house: t(3, 8, [
    e("ice", 10), e("snow_block", 10, 1, 7), e("beetroot_seeds", 10, 1, 5), e("beetroot_soup", 1), e("furnace", 1),
    e("emerald", 1, 1, 4), e("bread", 10, 1, 4), e("coal", 5, 1, 4),
  ]),
  village_desert_house: t(3, 8, [
    e("tallgrass", 2), e("cactus", 5, 1, 4), e("wheat", 10, 1, 7), e("bread", 10, 1, 4), e("emerald", 2, 1, 3),
  ]),
};
