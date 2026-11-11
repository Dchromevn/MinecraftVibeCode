// Kiểu dữ liệu và id block (DESIGN.md mục 2.2). Bảng dữ liệu nằm trong blockTable.ts.
import type { ToolTier } from "./constants.js";
import { BLOCKS } from "./blockTable.js";

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
  MOSSY_COBBLE: 17,
  WATER: 18,
  LAVA: 19,
  FENCE: 20,
  RAIL_Z: 21, // đường ray chạy dọc trục Z
  RAIL_X: 22, // đường ray chạy dọc trục X
  COBWEB: 23,
  TORCH: 24,
} as const;
export type BlockId = (typeof B)[keyof typeof B];

export type ToolKind = "pickaxe" | "axe" | "shovel" | "none";

/**
 * Cách vẽ: cube = khối đầy đủ; cross = hai mặt chéo chữ X; post = cột hàng rào;
 * torch = que đuốc; rail = mặt phẳng sát sàn.
 */
export type RenderKind = "none" | "cube" | "cross" | "post" | "torch" | "rail";

export interface BlockTextures {
  top: string;
  bottom: string;
  side: string;
  front?: string; // mặt +Z nếu khác mặt bên
}

export interface BlockDrop {
  item: string;
  chance: number; // 0..1
}

/** Hộp va chạm trong block, đơn vị block: [minX, minY, minZ, maxX, maxY, maxZ]. */
export type BlockBox = readonly [number, number, number, number, number, number];

export interface BlockDef {
  id: BlockId;
  key: string; // tên kỹ thuật, dùng cho item tương ứng
  hardness: number; // giây đào tay không; Infinity = không phá được
  tool: ToolKind; // công cụ đúng loại để được hệ số tốc độ
  toolRequired: boolean; // đào tay vẫn phá nhưng không rơi gì
  minTier: ToolTier | null; // cấp cuốc tối thiểu để rơi đồ (quặng)
  drop: BlockDrop | null;
  transparent: boolean; // mặt kề block này vẫn được vẽ
  solid: boolean; // có va chạm
  box: BlockBox | null; // hộp va chạm nếu không phải cả khối (null = cả khối hoặc không va chạm)
  opaque: boolean; // che khuất hoàn toàn (AO, ẩn hang, cản sáng)
  liquid: boolean;
  moveFactor: number; // hệ số tốc độ khi đi trong block (mạng nhện)
  lightEmit: number; // 0..15
  lightOpacity: number; // ánh sáng mất thêm khi đi qua block (15 = chặn hẳn)
  render: RenderKind;
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

export { BLOCKS };
export const BLOCK_COUNT = BLOCKS.length;
