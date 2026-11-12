// Kiểu dữ liệu và id block (DESIGN.md mục 2.2). Bảng dữ liệu nằm trong blockTable.ts.
import type { ToolTier } from "./constants.js";
import { BLOCKS } from "./blockTable.js";

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
} as const;
export type BlockId = (typeof B)[keyof typeof B];

export type ToolKind = "pickaxe" | "axe" | "shovel" | "sword" | "hoe" | "none";

/**
 * Cách vẽ: cube = khối đầy đủ; cross = hai mặt chéo chữ X; liquid = chất lỏng
 * (mặt trên thấp hơn); layer = lớp mỏng sát sàn; fence = cột + thanh nối;
 * rail = tấm sát sàn tự chọn thẳng/cong; torch = que nhỏ; ladder = tấm sát tường;
 * door = tấm mỏng; crop = dạng #; bed = cao 9/16; farmland = thấp hơn 1/16;
 * stem = thân dưa / bí (cao theo tuổi, đã ra quả thì cong về phía quả).
 */
export type RenderKind =
  | "none" | "cube" | "cross" | "liquid" | "layer" | "fence" | "rail"
  | "torch" | "ladder" | "door" | "crop" | "bed" | "farmland" | "stem";

/**
 * Dữ liệu phụ: 1 byte mỗi block, song song với id (DESIGN.md 2.2). Block có kiểu
 * "none" luôn có dữ liệu phụ 0. Hướng ngang: 0 Nam (+Z), 1 Tây (−X), 2 Bắc (−Z), 3 Đông (+X).
 * - torch:  0 = cắm trên sàn; 1..4 = gắn tường ở hướng (giá trị − 1), nghiêng ra ngoài
 * - ladder: 0..3 = hướng bức tường mà thang bám vào
 * - door:   bit 0–1 hướng (tấm cửa sát cạnh đó khi đóng), bit 2 đang mở, bit 3 nửa trên
 * - crop:   0..7 = giai đoạn lớn (lúa mì, cà rốt, khoai tây); củ cải đường 0..3
 * - stem:   0..7 = tuổi; 8..11 = đã ra quả, quả ở hướng (giá trị − 8)
 * - liquid: bit 0–2 mức 0..7 (0 = nguồn), bit 3 đang rơi (nước, dung nham)
 * - facing: bit 0–1 hướng mặt trước; bit 2 đang cháy (lò nung)
 * - chest:  bit 0–1 hướng mặt trước; bit 2–3: 0 rương đơn, 1 nửa A, 2 nửa B của rương đôi
 * - farmland: bit 0 = ẩm
 * - sapling: bit 0 = giai đoạn ẩn (0–1)
 * - leaves: bit 0 = do người chơi đặt (không rụng)
 * - rail:   bit 0–1 góc xoay, bit 2–3 dạng (0 thẳng, 1 cong, 2 ngã ba, 3 ngã tư)
 * - bed:    bit 0–1 hướng từ chân tới đầu, bit 2 = ô đầu giường
 * Hàm giải mã / mã hóa nằm trong blockMeta.ts.
 */
export type MetaKind =
  | "none" | "torch" | "ladder" | "door" | "crop" | "liquid" | "facing" | "rail" | "bed"
  | "chest" | "farmland" | "sapling" | "leaves" | "stem";

/** Các bit được dùng của từng kiểu (bit khác luôn 0). */
export const META_MASK: Readonly<Record<MetaKind, number>> = {
  none: 0, torch: 7, ladder: 3, door: 15, crop: 7, liquid: 15, facing: 7, rail: 15, bed: 7,
  chest: 15, farmland: 1, sapling: 1, leaves: 1, stem: 15,
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
  falls: boolean; // rơi xuống khi bên dưới trống (cát, sỏi) — Giai đoạn 3
  moveFactor: number; // hệ số tốc độ khi đi trong block
  lightEmit: number; // 0..15
  lightOpacity: number; // ánh sáng mất thêm khi đi qua block (15 = chặn hẳn)
  render: RenderKind;
  meta: MetaKind; // ý nghĩa byte dữ liệu phụ
  tex: BlockTextures;
}

export function blockDef(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[0]!;
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
  }
  return [...names];
}

/** Có vẽ được / nhắm vào được không (dùng cho raycast debug). */
export function isTargetable(id: number): boolean {
  const d = blockDef(id);
  return d.render !== "none" && !d.liquid;
}

export { BLOCKS };
export const BLOCK_COUNT = BLOCKS.length;
