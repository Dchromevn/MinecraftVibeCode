// Bảng vật phẩm (DESIGN.md 2.3–2.4). Vật phẩm nhận diện bằng khóa chuỗi; block đặt được
// dùng chung khóa với block (stone, torch...). Icon: "cube" = vẽ khối 3D từ texture block,
// "tex" = texture block phẳng (/textures), "icon" = file trong /icons.
import { B, BLOCKS, type BlockId, type ToolKind } from "./blocks.js";
import { ARMOR, BOW_DURABILITY, FIRE, SHEARS, SHIELD, STACK, TOOL_TIERS, type ArmorTier, type ToolTier } from "./constants.js";
import { COLORS } from "./colors.js";
import { ARMOR_FORMULA, FOODS, type FoodDef } from "./survivalConstants.js";
import { FLOWER_BLOCKS, WOODS } from "./woods.js";
import { isSlab, isStairs, isWall } from "./building.js";
import { CROSSBOW } from "./illagerConstants.js";
import { HORSE_ARMOR, SNOWBALL } from "./fortressConstants.js";



export type ArmorPiece = "helmet" | "chestplate" | "leggings" | "boots";
export const ARMOR_PIECES: readonly ArmorPiece[] = ["helmet", "chestplate", "leggings", "boots"];
/** shape = vẽ đúng hình block (bậc, tấm, tường...) từ texture block; tex (nếu có) = dùng ảnh này cho mọi mặt (block có màu). */
export type ItemIcon =
  | { type: "cube"; block: BlockId; tex?: string } | { type: "shape"; block: BlockId; tex?: string }
  | { type: "tex"; name: string } | { type: "icon"; name: string };

export interface ItemDef {
  key: string;
  maxStack: number;
  icon: ItemIcon;
  places?: BlockId; // chuột phải đặt ra block này
  meta?: number; // dữ liệu phụ đi kèm khi đặt (màu của len, thảm, kính màu, giường)
  tool?: { kind: ToolKind; tier: ToolTier; durability: number };
  armor?: { piece: ArmorPiece; tier: ArmorTier; points: number; toughness: number; durability: number };
  food?: FoodDef;
  durability?: number; // vật phẩm có độ bền khác (cung)
  liquid?: BlockId; // xô đang chứa chất lỏng này
  use?: "block" | "throw"; // (7a) chuột phải: dùng lên block đang nhắm (bột xương) / ném đi (trứng)
  releases?: string; // (7c) xô cá: đổ nước ra thì thả loài này
  fireproof?: boolean; // (10d2) đồ netherite, phế tích cổ: không cháy, nổi trên dung nham
}

const ITEMS = new Map<string, ItemDef>();
const add = (d: ItemDef): void => void ITEMS.set(d.key, d);

// --- block đặt được (khối đầy vẽ 3D, còn lại vẽ phẳng) ---
const CUBES: BlockId[] = [
  B.DIRT, B.STONE, B.COBBLE, B.SAND, B.GRAVEL, B.LOG, B.PLANKS, B.WORKBENCH, B.CHEST, B.MOSSY_COBBLE,
  B.SANDSTONE, B.FURNACE, B.GLASS, B.DEEPSLATE, B.LEAVES, B.MELON, B.PUMPKIN, B.OBSIDIAN,
  // Giai đoạn 4d: thân, ván, lá của thông / bạch dương / keo; xương rồng
  ...WOODS.filter((w) => w.kind !== "oak").flatMap((w) => [w.log, w.planks, w.leaves]), B.CACTUS,
  B.STONE_BRICKS, // Giai đoạn 4e
  B.TNT, // Giai đoạn 7b
  // Giai đoạn 7e
  B.SNOW_BLOCK, B.ICE, B.CHISELED_STONE_BRICKS, B.CRACKED_STONE_BRICKS, B.MOSSY_STONE_BRICKS, B.NETHERRACK, B.MAGMA_BLOCK,
  B.CRYING_OBSIDIAN, B.CHISELED_SANDSTONE, B.CUT_SANDSTONE, B.ORANGE_TERRACOTTA, B.BLUE_TERRACOTTA, B.DIRT_PATH,
  // Giai đoạn 8a
  B.SMOOTH_SANDSTONE, B.TERRACOTTA, B.HAY_BLOCK, B.BOOKSHELF, B.COMPOSTER, B.BARREL, B.LOOM, B.SMOKER, B.BLAST_FURNACE,
  B.CARTOGRAPHY_TABLE, B.FLETCHING_TABLE, B.SMITHING_TABLE, B.LECTERN, B.STONECUTTER, B.GRINDSTONE, B.CAULDRON,
  // 8b2 (quặng / khối cỏ: chỉ có được bằng Cảm ứng tơ)
  B.LAPIS_BLOCK, B.ENCHANTING_TABLE, B.ORE_LAPIS, B.ORE_LAPIS_DEEP, B.ORE_COAL, B.ORE_IRON, B.ORE_GOLD, B.ORE_GOLD_DEEP, B.ORE_DIAMOND,
  B.ORE_EMERALD, B.GRASS, B.ANVIL, B.CHIPPED_ANVIL, B.DAMAGED_ANVIL, // 8b3
  B.SOUL_SAND, B.GLOWSTONE, B.NETHER_QUARTZ_ORE, B.NETHER_GOLD_ORE, B.QUARTZ_BLOCK, B.NETHERRACK, // 10a (quặng: chỉ Cảm ứng tơ)
  // 10b (nylium: chỉ Cảm ứng tơ)
  B.SOUL_SOIL, B.BASALT, B.POLISHED_BASALT, B.SMOOTH_BASALT, B.BLACKSTONE, B.POLISHED_BLACKSTONE, B.POLISHED_BLACKSTONE_BRICKS,
  B.CRIMSON_NYLIUM, B.WARPED_NYLIUM, B.CRIMSON_STEM, B.WARPED_STEM, B.CRIMSON_PLANKS, B.WARPED_PLANKS, B.NETHER_WART_BLOCK,
  B.WARPED_WART_BLOCK, B.SHROOMLIGHT, B.BONE_BLOCK,
  B.NETHER_BRICKS, B.CRACKED_NETHER_BRICKS, B.CHISELED_NETHER_BRICKS, B.RED_NETHER_BRICKS, // 10c
  B.CRACKED_POLISHED_BLACKSTONE_BRICKS, B.CHISELED_POLISHED_BLACKSTONE, B.GILDED_BLACKSTONE, B.ANCIENT_DEBRIS, B.NETHERITE_BLOCK, B.LODESTONE, B.RESPAWN_ANCHOR, // 10d2
];
for (const id of CUBES) add({ key: BLOCKS[id]!.key, maxStack: STACK.DEFAULT, icon: { type: "cube", block: id }, places: id });
for (const id of [B.TORCH, B.RAIL, B.LADDER, B.VINE, ...WOODS.map((w) => w.sapling), ...FLOWER_BLOCKS, B.CRIMSON_FUNGUS, B.WARPED_FUNGUS,
  B.CRIMSON_ROOTS, B.WARPED_ROOTS, B.NETHER_SPROUTS, B.SOUL_TORCH] as BlockId[]) // (10b) nấm, rễ, mầm Vực Lửa, đuốc linh hồn
  add({ key: BLOCKS[id]!.key, maxStack: STACK.DEFAULT, icon: { type: "tex", name: BLOCKS[id]!.tex.side }, places: id });
add({ key: "fence", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "fence" }, places: B.FENCE }); // icon riêng: 2 cột + 2 thanh
add({ key: "door", maxStack: STACK.SINGLE, icon: { type: "icon", name: "door" }, places: B.DOOR });
// Giai đoạn 4e: bậc, tấm, tường (icon vẽ đúng hình); hàng rào, cửa theo loài gỗ
for (const b of BLOCKS) if (isStairs(b.id) || isSlab(b.id) || isWall(b.id)) add({ key: b.key, maxStack: STACK.DEFAULT, icon: { type: "shape", block: b.id }, places: b.id });
for (const [id, single] of [[B.SPRUCE_FENCE, false], [B.BIRCH_FENCE, false], [B.ACACIA_FENCE, false], [B.SPRUCE_DOOR, true], [B.BIRCH_DOOR, true], [B.ACACIA_DOOR, true],
  [B.DARK_OAK_FENCE, false], [B.DARK_OAK_DOOR, true], // (8c) sồi tối
  [B.CRIMSON_FENCE, false], [B.WARPED_FENCE, false], [B.CRIMSON_DOOR, true], [B.WARPED_DOOR, true], // (10b) gỗ nấm
  [B.NETHER_BRICK_FENCE, false]] as const) // (10c)
  add({ key: BLOCKS[id]!.key, maxStack: single ? STACK.SINGLE : STACK.DEFAULT, icon: { type: "icon", name: BLOCKS[id]!.key }, places: id });
add({ key: "seeds", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "seeds" }, places: B.WHEAT });
for (const [k, id] of [["beetroot_seeds", B.BEETROOTS], ["melon_seeds", B.MELON_STEM], ["pumpkin_seeds", B.PUMPKIN_STEM]] as const)
  add({ key: k, maxStack: STACK.DEFAULT, icon: { type: "icon", name: k }, places: id });
/** Thức ăn trồng được: chuột phải lên đất cày thì trồng, chỗ khác thì ăn. */
const PLANTED: Readonly<Record<string, BlockId>> = { carrot: B.CARROTS, potato: B.POTATOES };

// --- nguyên liệu ---
for (const k of [
  "stick", "coal", "raw_iron", "iron_ingot", "raw_gold", "gold_ingot", "diamond", "emerald", "flint", "string",
  "feather", "leather", "wheat", "arrow", "bowl", "iron_nugget", "bone", // xương: 7a
  "gunpowder", "slime_ball", "phantom_membrane", // 7b
  "rabbit_hide", "rabbit_foot", "ink_sac", "glow_ink_sac", "armadillo_scute", // 7c
  "paper", "book", "lapis_lazuli", // 8b2
  "glowstone_dust", "quartz", "gold_nugget", // 10a
  "ghast_tear", "magma_cream", // 10b
  "nether_brick", "blaze_rod", "blaze_powder", // 10c
  ...COLORS.map((c) => `${c}_dye`), // thuốc nhuộm 16 màu (Giai đoạn 4d / 4f)
]) add({ key: k, maxStack: STACK.DEFAULT, icon: { type: "icon", name: k } });
// (10c) cầu lửa nhỏ (châm lửa như bật lửa, mỗi lần mất 1), bóng tuyết (ném), giáp ngựa, sọ bộ xương héo (đặt trên sàn)
add({ key: "fire_charge", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "fire_charge" } });
add({ key: "snowball", maxStack: SNOWBALL.STACK, icon: { type: "icon", name: "snowball" }, use: "throw" });
add({ key: "snow_layer", maxStack: STACK.DEFAULT, icon: { type: "tex", name: "snow" }, places: B.SNOW_LAYER }); // lớp tuyết (chế từ khối tuyết)
for (const k of Object.keys(HORSE_ARMOR)) add({ key: k, maxStack: STACK.SINGLE, icon: { type: "icon", name: k } });
add({ key: "wither_skeleton_skull", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "wither_skeleton_skull" }, places: B.WITHER_SKELETON_SKULL });
// (10d1) chai thủy tinh, mũi tên quang phổ (Phát sáng), thuốc kháng lửa ném (thuốc uống / chai nước: FOODS)
for (const k of ["glass_bottle", "spectral_arrow"]) add({ key: k, maxStack: STACK.DEFAULT, icon: { type: "icon", name: k } });
// (10d2) netherite, khuôn nâng cấp (bàn rèn), la bàn (đá nam châm: thêm trường lode), xích
for (const k of ["netherite_scrap", "netherite_ingot", "netherite_upgrade_smithing_template"]) add({ key: k, maxStack: STACK.DEFAULT, icon: { type: "icon", name: k } });
add({ key: "compass", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "compass_16" } });
add({ key: "lodestone_compass", maxStack: STACK.SINGLE, icon: { type: "icon", name: "compass_16" } });
add({ key: "chain", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "chain" }, places: B.CHAIN });
add({ key: "fire_resistance_splash_potion", maxStack: STACK.SINGLE, icon: { type: "icon", name: "fire_resistance_splash_potion" }, use: "throw" });

// --- Giai đoạn 4f: 16 màu (màu = dữ liệu phụ khi đặt) ---
COLORS.forEach((c, i) => {
  add({ key: `${c}_wool`, maxStack: STACK.DEFAULT, icon: { type: "cube", block: B.WOOL, tex: `${c}_wool` }, places: B.WOOL, meta: i });
  add({ key: `${c}_carpet`, maxStack: STACK.DEFAULT, icon: { type: "shape", block: B.CARPET, tex: `${c}_wool` }, places: B.CARPET, meta: i });
  add({ key: `${c}_stained_glass`, maxStack: STACK.DEFAULT, icon: { type: "cube", block: B.STAINED_GLASS, tex: `${c}_stained_glass` }, places: B.STAINED_GLASS, meta: i });
  add({ key: `${c}_stained_glass_pane`, maxStack: STACK.DEFAULT, icon: { type: "tex", name: `${c}_stained_glass` }, places: B.STAINED_GLASS_PANE, meta: i });
  add({ key: `${c}_bed`, maxStack: STACK.SINGLE, icon: { type: "icon", name: `${c}_bed` }, places: B.BED, meta: i });
  for (const [k, id] of [["terracotta", B.STAINED_TERRACOTTA], ["glazed_terracotta", B.GLAZED_TERRACOTTA]] as const) // 8a
    add({ key: `${c}_${k}`, maxStack: STACK.DEFAULT, icon: { type: "cube", block: id, tex: `${c}_${k}` }, places: id, meta: i });
});
// (10b) dây leo Vực Lửa (đặt dưới / trên khối), mụn cóc Vực Lửa (trồng trên cát linh hồn), cần câu nấm (điều khiển kẻ lội dung nham)
for (const [k, id] of [["weeping_vines", B.WEEPING_VINES], ["twisting_vines", B.TWISTING_VINES]] as const)
  add({ key: k, maxStack: STACK.DEFAULT, icon: { type: "tex", name: k }, places: id });
add({ key: "nether_wart", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "nether_wart" }, places: B.NETHER_WART });
add({ key: "warped_fungus_on_a_stick", maxStack: STACK.SINGLE, icon: { type: "icon", name: "warped_fungus_on_a_stick" }, durability: 100, use: "throw" });
add({ key: "sugar_cane", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "sugar_cane" }, places: B.SUGAR_CANE }); // 8b2
add({ key: "enchanted_book", maxStack: STACK.SINGLE, icon: { type: "icon", name: "enchanted_book" } });
add({ key: "xp_orb", maxStack: 1 << 20, icon: { type: "icon", name: "xp_orb" } }); // quả cầu kinh nghiệm (vật phẩm rơi đặc biệt)
add({ key: "brewing_stand", maxStack: STACK.DEFAULT, icon: { type: "tex", name: "brewing_stand" }, places: B.BREWING_STAND }); // 8a
// --- Giai đoạn 4f: đồ sắt, lửa, nút / cần gạt ---
for (const id of [B.COAL_BLOCK, B.IRON_BLOCK, B.GOLD_BLOCK, B.DIAMOND_BLOCK, B.EMERALD_BLOCK, B.RAW_IRON_BLOCK, B.RAW_GOLD_BLOCK] as BlockId[])
  add({ key: BLOCKS[id]!.key, maxStack: STACK.DEFAULT, icon: { type: "cube", block: id }, places: id });
for (const [id, tex] of [[B.GLASS_PANE, "glass"], [B.IRON_BARS, "iron_bars"], [B.LEVER, "lever"], [B.COBWEB, "cobweb"], [B.TALLGRASS, "tallgrass"]] as const)
  add({ key: BLOCKS[id]!.key, maxStack: STACK.DEFAULT, icon: { type: "tex", name: tex }, places: id });
for (const id of [B.STONE_BUTTON, B.OAK_BUTTON, B.STONE_PRESSURE_PLATE, B.OAK_PRESSURE_PLATE] as BlockId[]) add({ key: BLOCKS[id]!.key, maxStack: STACK.DEFAULT, icon: { type: "shape", block: id }, places: id });
add({ key: "lantern", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "lantern" }, places: B.LANTERN });
add({ key: "iron_door", maxStack: STACK.SINGLE, icon: { type: "icon", name: "iron_door" }, places: B.IRON_DOOR });
add({ key: "shears", maxStack: STACK.SINGLE, icon: { type: "icon", name: "shears" }, tool: { kind: "shears", tier: "iron", durability: SHEARS.DURABILITY } });
add({ key: "flint_and_steel", maxStack: STACK.SINGLE, icon: { type: "icon", name: "flint_and_steel" }, durability: FIRE.FLINT_AND_STEEL_DURABILITY });
// xô (Giai đoạn 4c): rỗng chồng 16; có nước / dung nham không chồng; liquid = chất lỏng đang chứa
add({ key: "bucket", maxStack: STACK.BUCKET, icon: { type: "icon", name: "bucket" } });
add({ key: "water_bucket", maxStack: STACK.SINGLE, icon: { type: "icon", name: "water_bucket" }, liquid: B.WATER });
add({ key: "lava_bucket", maxStack: STACK.SINGLE, icon: { type: "icon", name: "lava_bucket" }, liquid: B.LAVA });
add({ key: "wolf_armor", maxStack: STACK.SINGLE, icon: { type: "icon", name: "wolf_armor" }, durability: 64 }); // 7c: giáp sói
add({ key: "saddle", maxStack: STACK.SINGLE, icon: { type: "icon", name: "saddle" } }); // 7d: yên (cưỡi điều khiển được)
add({ key: "lead", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "lead" } }); // 7d: dây dắt
for (const f of ["cod", "salmon", "pufferfish", "tropical_fish"]) // 7c: xô cá (múc cá bằng xô nước; đổ ra thì thả cá)
  add({ key: `${f}_bucket`, maxStack: STACK.SINGLE, icon: { type: "icon", name: `${f}_bucket` }, liquid: B.WATER, releases: f });
add({ key: "lily_pad", maxStack: STACK.DEFAULT, icon: { type: "tex", name: "lily_pad" } }); // 7b (chưa đặt lên nước được)
add({ key: "bone_meal", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "bone_meal" }, use: "block" }); // 7a: bón cây
add({ key: "egg", maxStack: STACK.EGG, icon: { type: "icon", name: "egg" }, use: "throw" }); // 7a: ném, 1/8 nở gà con
add({ key: "ender_pearl", maxStack: STACK.EGG, icon: { type: "icon", name: "ender_pearl" }, use: "throw" }); // 7b: ném để dịch chuyển
add({ key: "bow", maxStack: STACK.SINGLE, icon: { type: "icon", name: "bow" }, durability: BOW_DURABILITY });
add({ key: "totem_of_undying", maxStack: STACK.SINGLE, icon: { type: "icon", name: "totem_of_undying" } }); // 8c: vật tổ bất tử
for (const k of ["crossbow", "crossbow_loaded"]) add({ key: k, maxStack: STACK.SINGLE, icon: { type: "icon", name: k }, durability: CROSSBOW.DURABILITY }); // 8b: nỏ
/** Khiên (6a): cầm tay trái (hoặc phải), giữ chuột phải để đỡ đòn. */
export const SHIELD_KEY = "shield";
add({ key: SHIELD_KEY, maxStack: STACK.SINGLE, icon: { type: "icon", name: "shield" }, durability: SHIELD.DURABILITY });

// --- thức ăn ---
for (const [k, f] of Object.entries(FOODS))
  add({ key: k, maxStack: f.single ? STACK.SINGLE : STACK.DEFAULT, icon: { type: "icon", name: k }, food: f, places: PLANTED[k] });

// --- công cụ: 5 loại x 5 cấp ---
export const TOOL_KINDS = ["pickaxe", "axe", "shovel", "sword", "hoe"] as const;
export const TOOL_TIER_LIST = Object.keys(TOOL_TIERS) as ToolTier[];
for (const tier of TOOL_TIER_LIST)
  for (const kind of TOOL_KINDS)
    add({
      key: `${tier}_${kind}`, maxStack: STACK.SINGLE, icon: { type: "icon", name: `${tier}_${kind}` },
      tool: { kind, tier, durability: TOOL_TIERS[tier].durability },
    });

// --- giáp: 4 cấp x 4 món ---
export const ARMOR_TIER_LIST = Object.keys(ARMOR) as ArmorTier[];
for (const tier of ARMOR_TIER_LIST)
  for (const piece of ARMOR_PIECES)
    add({
      key: `${tier}_${piece}`, maxStack: STACK.SINGLE, icon: { type: "icon", name: `${tier}_${piece}` },
      armor: {
        piece, tier, points: ARMOR[tier][piece], toughness: ARMOR_FORMULA.TOUGHNESS[tier] ?? 0,
        durability: ARMOR[tier].durability,
      },
    });

// (10d2) đồ netherite, phế tích cổ: không cháy trong lửa / dung nham
for (const d of ITEMS.values()) if (d.key.startsWith("netherite_") || d.key === "ancient_debris") d.fireproof = true;

export function itemDef(key: string): ItemDef | undefined {
  return ITEMS.get(key);
}

export function allItems(): ItemDef[] {
  return [...ITEMS.values()];
}

/** Độ bền tối đa (công cụ, giáp, cung); 0 = không có độ bền. */
export function maxDurability(key: string): number {
  const d = ITEMS.get(key);
  return d?.tool?.durability ?? d?.armor?.durability ?? d?.durability ?? 0;
}
