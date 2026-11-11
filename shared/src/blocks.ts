// Bảng block theo DESIGN.md mục 2.2. Tên hiển thị tiếng Việt nằm ở client/strings.
import type { ToolTier } from "./constants.js";

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
} as const;
export type BlockId = (typeof B)[keyof typeof B];
export const BLOCK_COUNT = 16;

export type ToolKind = "pickaxe" | "axe" | "shovel" | "none";
export type RenderKind = "none" | "cube" | "cross";

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
  opaque: boolean; // chắn sáng / tính AO
  render: RenderKind;
  tex: BlockTextures;
}

function cube(
  id: BlockId,
  key: string,
  hardness: number,
  tool: ToolKind,
  drop: BlockDrop | null,
  tex: BlockTextures,
  extra: Partial<BlockDef> = {},
): BlockDef {
  return {
    id,
    key,
    hardness,
    tool,
    toolRequired: false,
    minTier: null,
    drop,
    transparent: false,
    solid: true,
    opaque: true,
    render: "cube",
    tex,
    ...extra,
  };
}

const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });

export const BLOCKS: readonly BlockDef[] = [
  {
    id: B.AIR,
    key: "air",
    hardness: 0,
    tool: "none",
    toolRequired: false,
    minTier: null,
    drop: null,
    transparent: true,
    solid: false,
    opaque: false,
    render: "none",
    tex: same(""),
  },
  cube(B.GRASS, "grass", 0.9, "shovel", { item: "dirt", chance: 1 }, {
    top: "grass_top",
    bottom: "dirt",
    side: "grass_side",
  }),
  cube(B.DIRT, "dirt", 0.75, "shovel", { item: "dirt", chance: 1 }, same("dirt")),
  cube(B.STONE, "stone", 7.5, "pickaxe", { item: "cobble", chance: 1 }, same("stone"), {
    toolRequired: true,
  }),
  cube(B.COBBLE, "cobble", 10, "pickaxe", { item: "cobble", chance: 1 }, same("cobble"), {
    toolRequired: true,
  }),
  cube(B.SAND, "sand", 0.75, "shovel", { item: "sand", chance: 1 }, same("sand")),
  cube(B.LOG, "log", 3, "axe", { item: "log", chance: 1 }, {
    top: "log_top",
    bottom: "log_top",
    side: "log_side",
  }),
  cube(B.LEAVES, "leaves", 0.3, "none", { item: "apple", chance: 0.05 }, same("leaves"), {
    transparent: true,
    opaque: false,
  }),
  cube(B.PLANKS, "planks", 3, "axe", { item: "planks", chance: 1 }, same("planks")),
  cube(B.ORE_COAL, "ore_coal", 15, "pickaxe", { item: "coal", chance: 1 }, same("ore_coal"), {
    toolRequired: true,
    minTier: "wood",
  }),
  cube(B.ORE_IRON, "ore_iron", 15, "pickaxe", { item: "iron_ingot", chance: 1 }, same("ore_iron"), {
    toolRequired: true,
    minTier: "stone",
  }),
  cube(B.ORE_DIAMOND, "ore_diamond", 15, "pickaxe", { item: "diamond", chance: 1 }, same("ore_diamond"), {
    toolRequired: true,
    minTier: "iron",
  }),
  cube(B.WORKBENCH, "workbench", 3.75, "axe", { item: "workbench", chance: 1 }, {
    top: "workbench_top",
    bottom: "planks",
    side: "workbench_side",
    front: "workbench_front",
  }),
  cube(B.CHEST, "chest", 3.75, "axe", { item: "chest", chance: 1 }, {
    top: "chest_top",
    bottom: "chest_top",
    side: "chest_side",
    front: "chest_front",
  }),
  cube(B.BEDROCK, "bedrock", Infinity, "none", null, same("bedrock")),
  {
    id: B.TALLGRASS,
    key: "tallgrass",
    hardness: 0,
    tool: "none",
    toolRequired: false,
    minTier: null,
    drop: { item: "seeds", chance: 0.1 },
    transparent: true,
    solid: false,
    opaque: false,
    render: "cross",
    tex: same("tallgrass"),
  },
];

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
