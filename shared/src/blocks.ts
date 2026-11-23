// Kiểu dữ liệu và id block (DESIGN.md mục 2.2). Bảng dữ liệu nằm trong blockTable.ts.
import type { ToolTier } from "./constants.js";
import { BLOCKS } from "./blockTable.js";
import { COLORS, withColor } from "./colors.js";
import { B_10D } from "./blockIds10d.js";

/** Ảnh giường mỗi màu: "<màu>_bed_<phần>". */
export const BED_PARTS = ["head_top", "foot_top", "head_side", "foot_side", "head_end", "foot_end"] as const;

/** Id block theo bảng 2.2. */
export const B = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COBBLE: 4,
  SAND: 5,
  LOG: 6,
  LEAVES: 7,
  PLANKS: 8,
  ORE_COAL: 9,
  ORE_IRON: 10,
  ORE_DIAMOND: 11,
  WORKBENCH: 12,
  CHEST: 13,
  BEDROCK: 14,
  TALLGRASS: 15,
  GRAVEL: 16,
  WATER: 17,
  LAVA: 18,
  MOSSY_COBBLE: 19,
  SANDSTONE: 20,
  SNOW_LAYER: 21,
  FENCE: 22,
  RAIL: 23,
  COBWEB: 24,
  TORCH: 25,
  FURNACE: 26,
  GLASS: 27,
  LADDER: 28,
  DOOR: 29,
  FARMLAND: 30,
  WHEAT: 31,
  SAPLING: 32,
  BED: 33,
  DEEPSLATE: 34,
  ORE_GOLD: 35,
  ORE_GOLD_DEEP: 36,
  ORE_EMERALD: 37,
  CARROTS: 38,
  POTATOES: 39,
  BEETROOTS: 40,
  MELON: 41,
  PUMPKIN: 42,
  MELON_STEM: 43,
  PUMPKIN_STEM: 44,
  OBSIDIAN: 45,
  // Giai đoạn 4d: loài cây (thân, lá, ván, cây non), hoa, xương rồng
  SPRUCE_LOG: 46,
  SPRUCE_LEAVES: 47,
  SPRUCE_PLANKS: 48,
  SPRUCE_SAPLING: 49,
  BIRCH_LOG: 50,
  BIRCH_LEAVES: 51,
  BIRCH_PLANKS: 52,
  BIRCH_SAPLING: 53,
  ACACIA_LOG: 54,
  ACACIA_LEAVES: 55,
  ACACIA_PLANKS: 56,
  ACACIA_SAPLING: 57,
  DANDELION: 58,
  POPPY: 59,
  CORNFLOWER: 60,
  LILY_OF_THE_VALLEY: 61,
  CACTUS: 62,
  // Giai đoạn 4e: gạch đá; bậc, tấm (10 vật liệu); tường (5); hàng rào, cửa theo loài gỗ
  STONE_BRICKS: 63,
  STONE_STAIRS: 64,
  COBBLE_STAIRS: 65,
  MOSSY_COBBLE_STAIRS: 66,
  SANDSTONE_STAIRS: 67,
  DEEPSLATE_STAIRS: 68,
  STONE_BRICK_STAIRS: 69,
  OAK_STAIRS: 70,
  SPRUCE_STAIRS: 71,
  BIRCH_STAIRS: 72,
  ACACIA_STAIRS: 73,
  STONE_SLAB: 74,
  COBBLE_SLAB: 75,
  MOSSY_COBBLE_SLAB: 76,
  SANDSTONE_SLAB: 77,
  DEEPSLATE_SLAB: 78,
  STONE_BRICK_SLAB: 79,
  OAK_SLAB: 80,
  SPRUCE_SLAB: 81,
  BIRCH_SLAB: 82,
  ACACIA_SLAB: 83,
  COBBLE_WALL: 84,
  MOSSY_COBBLE_WALL: 85,
  SANDSTONE_WALL: 86,
  DEEPSLATE_WALL: 87,
  STONE_BRICK_WALL: 88,
  SPRUCE_FENCE: 89,
  BIRCH_FENCE: 90,
  ACACIA_FENCE: 91,
  SPRUCE_DOOR: 92,
  BIRCH_DOOR: 93,
  ACACIA_DOOR: 94,
  // Giai đoạn 4f: 16 màu (len, thảm, kính màu, tấm kính), đồ sắt, lửa, nút / cần gạt
  WOOL: 95,
  CARPET: 96,
  STAINED_GLASS: 97,
  GLASS_PANE: 98,
  STAINED_GLASS_PANE: 99,
  IRON_BARS: 100,
  FIRE: 101,
  COAL_BLOCK: 102,
  IRON_BLOCK: 103,
  GOLD_BLOCK: 104,
  DIAMOND_BLOCK: 105,
  EMERALD_BLOCK: 106,
  RAW_IRON_BLOCK: 107,
  RAW_GOLD_BLOCK: 108,
  LANTERN: 109,
  IRON_DOOR: 110,
  STONE_BUTTON: 111,
  OAK_BUTTON: 112,
  LEVER: 113,
  STONE_PRESSURE_PLATE: 114, // tấm áp lực (bổ sung 4f)
  OAK_PRESSURE_PLATE: 115,
  // Giai đoạn 7b
  TNT: 116, // thuốc nổ: châm bằng bật lửa / bị nổ trúng thì cháy ngòi
  INFESTED_STONE: 117, // đá nhiễm: trông như đá, phá thì ra mọt đá (núi)
  SPAWNER: 118, // lồng sinh quái (nhện hang trong hầm mỏ), không lấy được
  VINE: 119, // dây leo (đầm lầy): bám mặt bên khối đặc / lá, leo được; chỉ lấy được bằng kéo
  LILY_PAD: 120, // lá súng: nằm trên mặt nước, đứng lên được
  // Giai đoạn 7e: block của công trình (lều tuyết, cổng đổ nát, kim tự tháp sa mạc, trại bỏ hoang)
  SNOW_BLOCK: 121,
  ICE: 122, // trong mờ
  CHISELED_STONE_BRICKS: 123,
  CRACKED_STONE_BRICKS: 124,
  MOSSY_STONE_BRICKS: 125,
  NETHERRACK: 126,
  MAGMA_BLOCK: 127, // sáng 3
  CRYING_OBSIDIAN: 128, // sáng 10
  CHISELED_SANDSTONE: 129,
  CUT_SANDSTONE: 130,
  ORANGE_TERRACOTTA: 131,
  BLUE_TERRACOTTA: 132,
  DIRT_PATH: 133, // đường đất (khối đầy, texture riêng)
  WHITE_WOOL_STAIRS: 134, // bậc len trắng (lều trại bỏ hoang)
  // Giai đoạn 8a: block của làng (bàn nghề của dân làng chỉ để trang trí + chọn nghề)
  SMOOTH_SANDSTONE: 135, TERRACOTTA: 136, STAINED_TERRACOTTA: 137, GLAZED_TERRACOTTA: 138, HAY_BLOCK: 139, BOOKSHELF: 140,
  COMPOSTER: 141, BARREL: 142, LOOM: 143, SMOKER: 144, BLAST_FURNACE: 145, CARTOGRAPHY_TABLE: 146, FLETCHING_TABLE: 147,
  SMITHING_TABLE: 148, LECTERN: 149, STONECUTTER: 150, GRINDSTONE: 151, CAULDRON: 152, BREWING_STAND: 153,
  // Giai đoạn 8b2: mía, lưu ly, bàn phù phép
  SUGAR_CANE: 154, ORE_LAPIS: 155, ORE_LAPIS_DEEP: 156, LAPIS_BLOCK: 157, ENCHANTING_TABLE: 158,
  ANVIL: 159, CHIPPED_ANVIL: 160, DAMAGED_ANVIL: 161, // 8b3: đe (sứt dần khi dùng)
  // Giai đoạn 8c: bộ gỗ sồi tối (rừng sồi tối, dinh thự rừng)
  DARK_OAK_LOG: 162, DARK_OAK_LEAVES: 163, DARK_OAK_PLANKS: 164, DARK_OAK_SAPLING: 165,
  DARK_OAK_STAIRS: 166, DARK_OAK_SLAB: 167, DARK_OAK_FENCE: 168, DARK_OAK_DOOR: 169,
  // Giai đoạn 10a: Vực Lửa (hoang mạc), cổng
  SOUL_SAND: 170, GLOWSTONE: 171, NETHER_QUARTZ_ORE: 172, NETHER_GOLD_ORE: 173, QUARTZ_BLOCK: 174, NETHER_PORTAL: 175,
  // Giai đoạn 10b: 4 biome Vực Lửa (thung lũng cát linh hồn, rừng đỏ thẫm, rừng cong vênh, đồng bằng bazan) — blockTable10b.ts
  SOUL_SOIL: 176, BASALT: 177, POLISHED_BASALT: 178, SMOOTH_BASALT: 179, BLACKSTONE: 180, POLISHED_BLACKSTONE: 181,
  POLISHED_BLACKSTONE_BRICKS: 182, CRIMSON_NYLIUM: 183, WARPED_NYLIUM: 184, CRIMSON_STEM: 185, WARPED_STEM: 186,
  CRIMSON_PLANKS: 187, WARPED_PLANKS: 188, NETHER_WART_BLOCK: 189, WARPED_WART_BLOCK: 190, SHROOMLIGHT: 191,
  CRIMSON_FUNGUS: 192, WARPED_FUNGUS: 193, CRIMSON_ROOTS: 194, WARPED_ROOTS: 195, NETHER_SPROUTS: 196,
  WEEPING_VINES: 197, TWISTING_VINES: 198, BONE_BLOCK: 199, SOUL_FIRE: 200, NETHER_WART: 201, SOUL_TORCH: 202,
  CRIMSON_STAIRS: 203, WARPED_STAIRS: 204, CRIMSON_SLAB: 205, WARPED_SLAB: 206, CRIMSON_FENCE: 207, WARPED_FENCE: 208,
  CRIMSON_DOOR: 209, WARPED_DOOR: 210,
  NETHER_BRICKS: 211, CRACKED_NETHER_BRICKS: 212, CHISELED_NETHER_BRICKS: 213, RED_NETHER_BRICKS: 214, NETHER_BRICK_FENCE: 215, // 10c: blockTable10c.ts
  NETHER_BRICK_STAIRS: 216, RED_NETHER_BRICK_STAIRS: 217, NETHER_BRICK_SLAB: 218, RED_NETHER_BRICK_SLAB: 219, NETHER_BRICK_WALL: 220,
  RED_NETHER_BRICK_WALL: 221, WITHER_SKELETON_SKULL: 222, ...B_10D, // 10d2: tàn tích pháo đài lợn, netherite — blockIds10d.ts
} as const;
export type BlockId = (typeof B)[keyof typeof B];

export type ToolKind = "pickaxe" | "axe" | "shovel" | "sword" | "hoe" | "shears" | "none";

/**
 * Cách vẽ: cube = khối đầy đủ; cross = hai mặt chéo chữ X; liquid = chất lỏng
 * (mặt trên thấp hơn); layer = lớp mỏng sát sàn; fence = cột + thanh nối;
 * rail = tấm sát sàn tự chọn thẳng/cong; torch = que nhỏ; ladder = tấm sát tường;
 * door = tấm mỏng; crop = dạng #; bed = cao 9/16; farmland = thấp hơn 1/16;
 * stem = thân dưa / bí (cao theo tuổi, đã ra quả thì cong về phía quả);
 * cactus = khối thu vào 1/16 ở bốn mặt bên; stairs = bậc (nửa dưới + phần trên theo hướng / góc);
 * slab = tấm nửa dưới / nửa trên / đôi; wall = tường (cột + tay nối, như hàng rào); carpet = thảm 1/16;
 * pane = tấm kính / song sắt (cột mỏng + tay nối); fire = lửa; lantern = lồng đèn (sàn / treo);
 * button, lever = nút, cần gạt (sàn / trần / tường); plate = tấm áp lực (mỏng sát sàn).
 */
export type RenderKind =
  | "none" | "cube" | "cross" | "liquid" | "layer" | "fence" | "rail"
  | "torch" | "ladder" | "door" | "crop" | "bed" | "farmland" | "stem" | "cactus" | "stairs" | "slab" | "wall"
  | "carpet" | "pane" | "fire" | "lantern" | "button" | "lever" | "plate" | "anvil"
  | "skull" // (10c) sọ: hộp 8 × 8 × 8 trên sàn, mặt trước theo hướng
  | "portal"; // (10a) tấm cổng Vực Lửa: dày 4/16, dữ liệu phụ 0 = nằm dọc trục X, 1 = dọc trục Z

/**
 * Dữ liệu phụ: 1 byte mỗi block, song song với id (DESIGN.md 2.2). Block có kiểu
 * "none" luôn có dữ liệu phụ 0. Hướng ngang: 0 Nam (+Z), 1 Tây (−X), 2 Bắc (−Z), 3 Đông (+X).
 * - torch:  0 = cắm trên sàn; 1..4 = gắn tường ở hướng (giá trị − 1), nghiêng ra ngoài
 * - ladder: 0..3 = hướng bức tường mà thang bám vào
 * - door:   bit 0–1 hướng (tấm cửa sát cạnh đó khi đóng), bit 2 đang mở, bit 3 nửa trên, bit 4 bản lề trái
 *           (mở thì tấm cửa xoay về cạnh bên trái thay vì bên phải, nhìn theo hướng cửa) — cửa đôi
 * - crop:   0..7 = giai đoạn lớn (lúa mì, cà rốt, khoai tây); củ cải đường 0..3
 * - stem:   0..7 = tuổi; 8..11 = đã ra quả, quả ở hướng (giá trị − 8)
 * - liquid: bit 0–2 mức 0..7 (0 = nguồn), bit 3 đang rơi (nước, dung nham)
 * - facing: bit 0–1 hướng mặt trước; bit 2 đang cháy (lò nung)
 * - chest:  bit 0–1 hướng mặt trước; bit 2–3: 0 rương đơn, 1 nửa A, 2 nửa B của rương đôi
 * - farmland: bit 0 = ẩm
 * - sapling: bit 0 = giai đoạn ẩn (0–1)
 * - leaves: bit 0 = do người chơi đặt (không rụng)
 * - rail:   bit 0–1 góc xoay, bit 2–3 dạng (0 thẳng, 1 cong, 2 ngã ba, 3 ngã tư)
 * - bed:    bit 0–1 hướng từ chân tới đầu, bit 2 = ô đầu giường, bit 3–6 màu (0..15, Giai đoạn 4f)
 * - cactus: 0..15 = tuổi (đủ tuổi thì mọc thêm một khúc)
 * - stairs: bit 0–1 hướng phía cao, bit 2 lật ngược, bit 3–5 dạng (0 thẳng, 1 góc trong trái, 2 góc trong
 *           phải, 3 góc ngoài trái, 4 góc ngoài phải; "trái" = hướng quay ngược chiều kim đồng hồ từ phía cao)
 * - slab:   0 nửa dưới, 1 nửa trên, 2 tấm đôi
 * - color:  0..15 màu (len, thảm, kính màu, tấm kính màu) theo thứ tự COLORS
 * - lantern: bit 0 = treo dưới trần
 * - switch: bit 0–2 chỗ gắn (0 sàn, 1 trần, 2..5 tường ở hướng giá trị − 2), bit 3 đang bật (nút, cần gạt;
 *           tấm áp lực luôn gắn sàn, bit 3 = đang bị đè)
 * Hàm giải mã / mã hóa nằm trong blockMeta.ts.
 */
export type MetaKind =
  | "none" | "torch" | "ladder" | "door" | "crop" | "liquid" | "facing" | "rail" | "bed"
  | "chest" | "farmland" | "sapling" | "leaves" | "stem" | "cactus" | "stairs" | "slab" | "color" | "lantern" | "switch"
  | "spawner" // (7b) loài quái của lồng: chỉ số trong SPAWNER_MOBS
  | "axis" | "charge"; // (10a) khối cổng: 0 tấm dọc trục X, 1 dọc trục Z; (10d2) mỏ neo hồi sinh: số lần nạp 0–4

/** Các bit được dùng của từng kiểu (bit khác luôn 0). */
export const META_MASK: Readonly<Record<MetaKind, number>> = {
  none: 0, torch: 7, ladder: 3, door: 31, crop: 7, liquid: 15, facing: 7, rail: 15, bed: 127,
  chest: 15, farmland: 1, sapling: 1, leaves: 1, stem: 15, cactus: 15, stairs: 63, slab: 3, color: 15, lantern: 1, switch: 15, spawner: 7, axis: 1, charge: 7,
};

export interface BlockTextures {
  top: string;
  bottom: string;
  side: string;
  front?: string; // mặt +Z nếu khác mặt bên
}

export interface BlockDrop {
  item: string;
  chance: number; // 0..1, mỗi mục tung xác suất riêng (Giai đoạn 4 dùng)
}

/** Hộp va chạm trong block, đơn vị block: [minX, minY, minZ, maxX, maxY, maxZ]. */
export type BlockBox = readonly [number, number, number, number, number, number];

export interface BlockDef {
  id: BlockId;
  key: string; // tên kỹ thuật, dùng cho item tương ứng
  hardness: number; // độ cứng (MECHANICS.md mục 4); 0 = phá ngay; Infinity = không phá được
  tool: ToolKind; // công cụ đúng loại để được hệ số tốc độ
  toolRequired: boolean; // đào tay vẫn phá nhưng không rơi gì
  minTier: ToolTier | null; // cấp cuốc tối thiểu để rơi đồ (quặng)
  drops: readonly BlockDrop[];
  transparent: boolean; // mặt kề block này vẫn được vẽ
  solid: boolean; // có va chạm
  box: BlockBox | null; // hộp va chạm nếu không phải cả khối (null = cả khối hoặc không va chạm)
  opaque: boolean; // che khuất hoàn toàn (AO, cản sáng)
  liquid: boolean;
  /** Block có màu (Giai đoạn 4f): texture từng mặt theo mẫu, {c} = tên màu (dữ liệu phụ, hoặc bit 3–6 của giường). */
  colorTex?: BlockTextures;
  /** Vật phẩm rơi ra theo màu, {c} = tên màu (thay cho drops). */
  colorItem?: string;
  /** Vẽ bán trong suốt có pha trộn (kính màu) thay vì cắt alpha. */
  translucent?: boolean;
  falls: boolean; // rơi xuống khi bên dưới trống (cát, sỏi) — Giai đoạn 3
  moveFactor: number; // hệ số tốc độ khi đi trong block
  lightEmit: number; // 0..15
  lightOpacity: number; // ánh sáng mất thêm khi đi qua block (15 = chặn hẳn)
  render: RenderKind;
  meta: MetaKind; // ý nghĩa byte dữ liệu phụ
  tex: BlockTextures;
}

/** Tên mọi texture block mà client cần nạp vào atlas. */
export function allBlockTextureNames(): string[] {
  const names = new Set<string>();
  for (const b of BLOCKS) {
    if (b.render === "none") continue;
    names.add(b.tex.top);
    names.add(b.tex.bottom);
    names.add(b.tex.side);
    if (b.tex.front) names.add(b.tex.front);
    if (b.colorTex)
      for (let c = 0; c < COLORS.length; c++)
        for (const t of [b.colorTex.top, b.colorTex.bottom, b.colorTex.side]) names.add(withColor(t, c));
  }
  // giường 16 màu (Giai đoạn 4f): 6 ảnh mỗi màu
  for (let c = 0; c < COLORS.length; c++) for (const p of BED_PARTS) names.add(`${COLORS[c]}_bed_${p}`);
  return [...names];
}


export { BLOCKS };
