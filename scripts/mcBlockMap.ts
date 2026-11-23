// Đổi block của mẫu công trình Minecraft (tên + thuộc tính) sang ô của game (id | dữ liệu phụ << 8) — Giai đoạn 7e.
// Block game chưa có thì thay bằng block gần giống (ghi lại để báo). null = bỏ qua ô này (giữ nguyên địa hình: khoảng trống
// của mẫu, khối ghép jigsaw, khối cấu trúc).
import { B, COLORS } from "../shared/src/index.js";

type Props = Record<string, string>;
const DIR: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 };
const opp = (d: number): number => (d + 2) & 3;
const cell = (id: number, meta = 0): number => id | (meta << 8);
const colorOf = (name: string): number => Math.max(0, COLORS.findIndex((c) => name.startsWith(c + "_")));

/** Tên block đã phải thay (để công cụ nhập in ra). */
export const substituted = new Map<string, number>();
const sub = (name: string, c: number): number => {
  substituted.set(name, (substituted.get(name) ?? 0) + 1);
  return c;
};

const WOOD: Record<string, string> = { oak: "OAK", spruce: "SPRUCE", birch: "BIRCH", acacia: "ACACIA", dark_oak: "DARK_OAK" }; // (8c) sồi tối
const woodOf = (name: string): string | null => Object.keys(WOOD).find((w) => name.startsWith(w + "_") || name.startsWith("stripped_" + w + "_")) ?? null;
const STAIRS_SHAPE: Record<string, number> = { straight: 0, inner_left: 1, inner_right: 2, outer_left: 3, outer_right: 4 };
const stairsMeta = (p: Props): number => (DIR[p.facing ?? "south"] ?? 0) | (p.half === "top" ? 4 : 0) | ((STAIRS_SHAPE[p.shape ?? "straight"] ?? 0) << 3);
const slabMeta = (p: Props): number => (p.type === "top" ? 1 : p.type === "double" ? 2 : 0);
const id = (key: string): number => (B as Record<string, number>)[key]!;
/** (10d2) Bậc / tấm / tường họ đá đen: tên gốc → tiền tố khóa B. */
const BLACKSTONE_SHAPES: Record<string, string> = { blackstone: "BLACKSTONE", polished_blackstone: "POLISHED_BLACKSTONE", polished_blackstone_brick: "POLISHED_BLACKSTONE_BRICK" };

const SIMPLE: Record<string, number> = {
  air: 0, cave_air: 0, void_air: 0, stone: B.STONE, cobblestone: B.COBBLE, mossy_cobblestone: B.MOSSY_COBBLE,
  stone_bricks: B.STONE_BRICKS, mossy_stone_bricks: B.MOSSY_STONE_BRICKS, cracked_stone_bricks: B.CRACKED_STONE_BRICKS,
  chiseled_stone_bricks: B.CHISELED_STONE_BRICKS, sandstone: B.SANDSTONE, cut_sandstone: B.CUT_SANDSTONE,
  chiseled_sandstone: B.CHISELED_SANDSTONE, sand: B.SAND, gravel: B.GRAVEL, dirt: B.DIRT, grass_block: B.GRASS,
  dirt_path: B.DIRT_PATH, snow_block: B.SNOW_BLOCK, ice: B.ICE, netherrack: B.NETHERRACK, magma_block: B.MAGMA_BLOCK,
  crying_obsidian: B.CRYING_OBSIDIAN, obsidian: B.OBSIDIAN, gold_block: B.GOLD_BLOCK, iron_bars: B.IRON_BARS, cobweb: B.COBWEB,
  crafting_table: B.WORKBENCH, orange_terracotta: B.ORANGE_TERRACOTTA, blue_terracotta: B.BLUE_TERRACOTTA, cactus: B.CACTUS,
  lily_pad: B.LILY_PAD, pumpkin: B.PUMPKIN, carved_pumpkin: B.PUMPKIN, jack_o_lantern: B.PUMPKIN, melon: B.MELON, iron_ore: B.ORE_IRON, coal_ore: B.ORE_COAL, gold_ore: B.ORE_GOLD,
  water: B.WATER, lava: B.LAVA, tnt: B.TNT, glass: B.GLASS, dandelion: B.DANDELION, poppy: B.POPPY, cornflower: B.CORNFLOWER,
  lily_of_the_valley: B.LILY_OF_THE_VALLEY, short_grass: B.TALLGRASS, grass: B.TALLGRASS, fern: B.TALLGRASS,
  // 8a: làng
  smooth_sandstone: B.SMOOTH_SANDSTONE, terracotta: B.TERRACOTTA, hay_block: B.HAY_BLOCK, bookshelf: B.BOOKSHELF, composter: B.COMPOSTER,
  cartography_table: B.CARTOGRAPHY_TABLE, stonecutter: B.STONECUTTER, grindstone: B.GRINDSTONE, cauldron: B.CAULDRON,
  water_cauldron: B.CAULDRON, lava_cauldron: B.CAULDRON, brewing_stand: B.BREWING_STAND, glass_pane: B.GLASS_PANE,
  oak_sapling: B.SAPLING, spruce_sapling: B.SPRUCE_SAPLING, birch_sapling: B.BIRCH_SAPLING, acacia_sapling: B.ACACIA_SAPLING,
  // 8c: dinh thự rừng
  dark_oak_sapling: B.DARK_OAK_SAPLING, rail: B.RAIL, diamond_block: B.DIAMOND_BLOCK, lapis_block: B.LAPIS_BLOCK,
  spawner: B.SPAWNER | (3 << 8), // lồng sinh quái duy nhất trong mẫu (dinh thự) là lồng nhện: SPAWNER_MOBS[3]; (10d2) tàn tích: import-structures đọc loài
  // 10d2: tàn tích pháo đài lợn
  blackstone: B.BLACKSTONE, polished_blackstone: B.POLISHED_BLACKSTONE, polished_blackstone_bricks: B.POLISHED_BLACKSTONE_BRICKS,
  cracked_polished_blackstone_bricks: B.CRACKED_POLISHED_BLACKSTONE_BRICKS, chiseled_polished_blackstone: B.CHISELED_POLISHED_BLACKSTONE,
  gilded_blackstone: B.GILDED_BLACKSTONE, basalt: B.BASALT, polished_basalt: B.POLISHED_BASALT, soul_sand: B.SOUL_SAND, soul_soil: B.SOUL_SOIL,
  glowstone: B.GLOWSTONE, quartz_block: B.QUARTZ_BLOCK, chain: B.CHAIN, iron_chain: B.CHAIN, fire: B.FIRE, ancient_debris: B.ANCIENT_DEBRIS,
  lodestone: B.LODESTONE, netherite_block: B.NETHERITE_BLOCK, respawn_anchor: B.RESPAWN_ANCHOR,
};
/** (8a) Block có hướng mặt trước (facing) của làng. */
const FACING: Record<string, number> = {
  loom: B.LOOM, smoker: B.SMOKER, blast_furnace: B.BLAST_FURNACE, fletching_table: B.FLETCHING_TABLE, smithing_table: B.SMITHING_TABLE,
  lectern: B.LECTERN,
};
/** Thay gần giống: tên → ô. */
const NEAR: Record<string, number> = {
  smooth_stone: B.STONE, polished_andesite: B.STONE, andesite: B.STONE, diorite: B.STONE, granite: B.STONE,
  infested_stone_bricks: B.STONE_BRICKS, infested_mossy_stone_bricks: B.MOSSY_STONE_BRICKS,
  infested_chiseled_stone_bricks: B.CHISELED_STONE_BRICKS, infested_cracked_stone_bricks: B.CRACKED_STONE_BRICKS,
  red_sandstone: B.SANDSTONE, red_sand: B.SAND, suspicious_sand: B.SAND, suspicious_gravel: B.GRAVEL, clay: B.DIRT,
  coarse_dirt: B.DIRT, rooted_dirt: B.DIRT, podzol: B.DIRT, mycelium: B.GRASS, pale_moss_block: B.GRASS, moss_block: B.GRASS,
  powder_snow: B.SNOW_BLOCK, packed_ice: B.ICE, blue_ice: B.ICE,
  seagrass: B.WATER, tall_seagrass: B.WATER, kelp: B.WATER, kelp_plant: B.WATER, sea_pickle: B.WATER,
  prismarine: B.MOSSY_STONE_BRICKS, polished_granite: B.ORANGE_TERRACOTTA, polished_diorite: B.STONE, // 7f tàn tích
  bricks: B.ORANGE_TERRACOTTA, infested_cobblestone: B.COBBLE, smooth_quartz: B.QUARTZ_BLOCK, // 8c; 10d2
  campfire: cell(B.SPRUCE_SLAB, 0), // chưa có lửa trại: tấm gỗ thông
  bush: B.TALLGRASS, firefly_bush: B.TALLGRASS, tall_dry_grass: B.TALLGRASS, short_dry_grass: B.TALLGRASS, dead_bush: B.TALLGRASS,
  sweet_berry_bush: B.TALLGRASS, red_tulip: B.POPPY, orange_tulip: B.POPPY, pink_tulip: B.POPPY, white_tulip: B.LILY_OF_THE_VALLEY,
  oxeye_daisy: B.LILY_OF_THE_VALLEY, azure_bluet: B.LILY_OF_THE_VALLEY, blue_orchid: B.CORNFLOWER, allium: B.CORNFLOWER,
};
/** Không có gì tương đương: để trống. */
const DROP = new Set([
  "structure_void", "structure_block", "jigsaw", "potted_cactus", "oak_wall_sign", "bell", "spruce_wall_sign", "brown_wall_banner",
  "potted_dead_bush", "potted_dandelion", "potted_spruce_sapling", "potted_poppy", "jungle_button", "stone_button", "oak_button",
  "oak_sign", "flower_pot", "red_mushroom", "brown_mushroom", "cocoa", "sugar_cane", "pink_petals", "wildflowers", "leaf_litter",
  "pale_hanging_moss", "pale_moss_carpet", "moss_carpet", "closed_eyeblossom", "open_eyeblossom", "cactus_flower", "resin_block",
  "creaking_heart", "oxidized_copper_golem_statue", "red_mushroom_block", "brown_mushroom_block", "mushroom_stem",
]);
const DOUBLE_PLANTS: Record<string, number> = { rose_bush: B.POPPY, peony: B.POPPY, lilac: B.CORNFLOWER, tall_grass: B.TALLGRASS, large_fern: B.TALLGRASS };

/** Ô của game cho block Minecraft (null = bỏ qua). */
export function mapBlock(name: string, p: Props): number | null {
  if (DROP.has(name)) return name === "jigsaw" || name === "structure_void" || name === "structure_block" ? null : sub(name, 0);
  if (name in SIMPLE) return SIMPLE[name]!;
  if (name.endsWith("_banner") || name.startsWith("potted_") || name === "redstone_wire") return sub(name, 0); // (8b) chưa có cờ, (8c) chậu hoa, dây đỏ: bỏ
  if (name === "attached_melon_stem" || name === "attached_pumpkin_stem") // (8c) thân đã ra quả, quả ở hướng facing
    return cell(name === "attached_melon_stem" ? B.MELON_STEM : B.PUMPKIN_STEM, 8 + (DIR[p.facing ?? "south"] ?? 0));
  if (name === "lever") { // (8c) cần gạt: sàn / trần / tường (bám vào khối phía sau mặt hướng facing)
    const at = p.face === "floor" ? 0 : p.face === "ceiling" ? 1 : 2 + opp(DIR[p.facing ?? "north"] ?? 2);
    return cell(B.LEVER, at | (p.powered === "true" ? 8 : 0));
  }
  if (name.endsWith("anvil")) return cell(name === "damaged_anvil" ? B.DAMAGED_ANVIL : name === "chipped_anvil" ? B.CHIPPED_ANVIL : B.ANVIL, DIR[p.facing ?? "south"] ?? 0);
  if (name in NEAR) return sub(name, NEAR[name]!);
  if (name in DOUBLE_PLANTS) return p.half === "upper" ? 0 : sub(name, DOUBLE_PLANTS[name]!);
  if (name === "snow") return cell(B.SNOW_LAYER);
  if (name === "nether_wart") return cell(B.NETHER_WART, Math.min(3, Number(p.age ?? 0))); // (10d2)
  if (name.endsWith("_carpet")) return cell(B.CARPET, colorOf(name));
  if (name in FACING) return cell(FACING[name]!, DIR[p.facing ?? "south"] ?? 0);
  if (name.endsWith("_glazed_terracotta")) return cell(B.GLAZED_TERRACOTTA, colorOf(name));
  if (name.endsWith("_terracotta")) return cell(B.STAINED_TERRACOTTA, colorOf(name));
  if (name.endsWith("_stained_glass_pane")) return cell(B.STAINED_GLASS_PANE, colorOf(name));
  if (name.endsWith("_stained_glass")) return cell(B.STAINED_GLASS, colorOf(name));
  if (name.endsWith("_pressure_plate")) return cell(name.startsWith("stone") ? B.STONE_PRESSURE_PLATE : B.OAK_PRESSURE_PLATE);
  if (name === "melon_stem" || name === "pumpkin_stem") return cell(name === "melon_stem" ? B.MELON_STEM : B.PUMPKIN_STEM, Math.min(7, Number(p.age ?? 0)));
  if (name.endsWith("_wool")) return cell(B.WOOL, colorOf(name));
  if (name === "white_wool_stairs" || (name.endsWith("_wool_stairs"))) return cell(B.WHITE_WOOL_STAIRS, stairsMeta(p));
  if (name.endsWith("_bed")) {
    const color = name === "straw_bed" ? 4 : colorOf(name);
    if (name === "straw_bed") sub(name, 0);
    return cell(B.BED, (DIR[p.facing ?? "south"] ?? 0) | (p.part === "head" ? 4 : 0) | (color << 3));
  }
  if (name === "chest" || name === "trapped_chest" || name === "barrel" || name.endsWith("copper_chest")) {
    if (name !== "chest") sub(name, 0);
    return cell(B.CHEST, DIR[p.facing ?? "south"] ?? 0); // thùng / rương đồng: rương thường (rương đơn)
  }
  if (name === "furnace") return cell(B.FURNACE, DIR[p.facing ?? "south"] ?? 0);
  if (name === "ladder") return cell(B.LADDER, opp(DIR[p.facing ?? "north"] ?? 2));
  if (name === "vine") {
    const side = ["south", "west", "north", "east"].find((s) => p[s] === "true");
    return side ? cell(B.VINE, DIR[side]!) : 0;
  }
  if (name === "torch" || name === "redstone_torch" || name === "soul_torch") return cell(B.TORCH, 0);
  if (name.endsWith("wall_torch")) return cell(B.TORCH, opp(DIR[p.facing ?? "north"] ?? 2) + 1);
  if (name.endsWith("lantern")) return cell(B.LANTERN, p.hanging === "true" ? 1 : 0);
  if (name.endsWith("_door")) { // (7f) cửa tàu đắm: tấm cửa sát cạnh ngược hướng mặt, nửa trên, mở, bản lề trái
    const w = woodOf(name), door = name === "iron_door" ? B.IRON_DOOR : w && w !== "oak" ? id(`${WOOD[w]}_DOOR`) : B.DOOR;
    if (!w && name !== "iron_door") sub(name, 0);
    return cell(door, opp(DIR[p.facing ?? "north"] ?? 2) | (p.open === "true" ? 4 : 0) | (p.half === "upper" ? 8 : 0) | (p.hinge === "left" ? 16 : 0));
  }
  // chưa có cửa sập: đóng → tấm gỗ; mở (dựng sát tường làm cửa chớp) → bỏ
  if (name.endsWith("_trapdoor")) return p.open === "true" ? sub(name, 0) : sub(name, cell(B.OAK_SLAB, p.half === "top" ? 1 : 0));
  if (name.endsWith("_fence_gate")) { // chưa có cổng rào: hàng rào cùng loại gỗ
    const w = woodOf(name);
    return w && w !== "oak" ? sub(name, cell(id(`${WOOD[w]}_FENCE`))) : sub(name, cell(B.FENCE));
  }
  if (name.endsWith("_stairs")) {
    const base = name.slice(0, -"_stairs".length), w = woodOf(name);
    const key = w ? `${WOOD[w]}_STAIRS` : base === "stone_brick" || base === "mossy_stone_brick" ? "STONE_BRICK_STAIRS"
      : base === "sandstone" || base === "red_sandstone" ? "SANDSTONE_STAIRS" : base === "stone" ? "STONE_STAIRS"
      : base === "mossy_cobblestone" ? "MOSSY_COBBLE_STAIRS" : base === "cobblestone" ? "COBBLE_STAIRS"
      : base === "smooth_sandstone" ? "SANDSTONE_STAIRS" : ["diorite", "granite", "andesite", "polished_andesite"].includes(base) ? "STONE_STAIRS"
      : BLACKSTONE_SHAPES[base] ? `${BLACKSTONE_SHAPES[base]}_STAIRS` : null; // (10d2)
    return key ? cell(id(key), stairsMeta(p)) : sub(name, cell(B.OAK_STAIRS, stairsMeta(p)));
  }
  if (name.endsWith("_slab")) {
    const base = name.slice(0, -"_slab".length), w = woodOf(name);
    const key = w ? `${WOOD[w]}_SLAB` : base === "stone_brick" || base === "mossy_stone_brick" ? "STONE_BRICK_SLAB"
      : base === "sandstone" || base === "cut_sandstone" ? "SANDSTONE_SLAB" : base === "stone" || base === "smooth_stone" ? "STONE_SLAB"
      : base === "cobblestone" ? "COBBLE_SLAB" : base === "mossy_cobblestone" ? "MOSSY_COBBLE_SLAB"
      : base === "smooth_sandstone" ? "SANDSTONE_SLAB" : ["diorite", "granite", "andesite", "polished_andesite"].includes(base) ? "STONE_SLAB"
      : BLACKSTONE_SHAPES[base] ? `${BLACKSTONE_SHAPES[base]}_SLAB` : null; // (10d2)
    return key ? cell(id(key), slabMeta(p)) : sub(name, cell(B.OAK_SLAB, slabMeta(p)));
  }
  if (name.endsWith("_wall")) {
    const key = name === "cobblestone_wall" ? "COBBLE_WALL" : name === "mossy_cobblestone_wall" ? "MOSSY_COBBLE_WALL"
      : name === "sandstone_wall" ? "SANDSTONE_WALL" : BLACKSTONE_SHAPES[name.slice(0, -5)] ? `${BLACKSTONE_SHAPES[name.slice(0, -5)]}_WALL`
      : name.includes("stone_brick") ? "STONE_BRICK_WALL" : null;
    return key ? cell(id(key)) : sub(name, cell(B.COBBLE_WALL));
  }
  const w = woodOf(name);
  if (name.endsWith("_fence")) return w && w !== "oak" ? cell(id(`${WOOD[w]}_FENCE`)) : name === "oak_fence" ? cell(B.FENCE) : sub(name, cell(B.FENCE));
  if (name.endsWith("_log") || name.endsWith("_wood")) return w ? cell(w === "oak" ? B.LOG : id(`${WOOD[w]}_LOG`)) : sub(name, cell(B.LOG));
  if (name.endsWith("_leaves")) return w && w !== "oak" ? cell(id(`${WOOD[w]}_LEAVES`), 1) : name === "oak_leaves" ? cell(B.LEAVES, 1) : sub(name, cell(B.LEAVES, 1));
  if (name.endsWith("_planks")) return w ? cell(w === "oak" ? B.PLANKS : id(`${WOOD[w]}_PLANKS`)) : sub(name, cell(B.PLANKS));
  if (name === "wheat" || name === "carrots" || name === "potatoes")
    return cell(name === "wheat" ? B.WHEAT : name === "carrots" ? B.CARROTS : B.POTATOES, Math.min(7, Number(p.age ?? 7)));
  if (name === "farmland") return cell(B.FARMLAND, 1);
  return sub(name, B.STONE); // chưa biết: đá
}
