// Bảng dữ liệu block. Thứ tự phải khớp id trong B (blocks.ts).
import { LIGHT, MOVE } from "./constants.js";
import type { BlockDef, BlockDrop, BlockId, BlockTextures, ToolKind } from "./blocks.js";

const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });
const drop = (item: string, chance = 1): BlockDrop => ({ item, chance });

const BASE: Omit<BlockDef, "id" | "key" | "hardness" | "tool" | "drop" | "tex"> = {
  toolRequired: false,
  minTier: null,
  transparent: false,
  solid: true,
  box: null,
  opaque: true,
  liquid: false,
  moveFactor: 1,
  lightEmit: 0,
  lightOpacity: 15,
  render: "cube",
};

function def(
  id: number,
  key: string,
  hardness: number,
  tool: ToolKind,
  dropped: BlockDrop | null,
  tex: BlockTextures,
  extra: Partial<BlockDef> = {},
): BlockDef {
  return { ...BASE, id: id as BlockId, key, hardness, tool, drop: dropped, tex, ...extra };
}

/** Không va chạm, không che khuất, ánh sáng đi qua. */
const OPEN: Partial<BlockDef> = { transparent: true, solid: false, opaque: false, lightOpacity: 0 };
const PICK_ONLY: Partial<BlockDef> = { toolRequired: true };

export const BLOCKS: readonly BlockDef[] = [
  def(0, "air", 0, "none", null, same(""), { ...OPEN, render: "none" }),
  def(1, "grass", 0.9, "shovel", drop("dirt"), { top: "grass_top", bottom: "dirt", side: "grass_side" }),
  def(2, "dirt", 0.75, "shovel", drop("dirt"), same("dirt")),
  def(3, "stone", 7.5, "pickaxe", drop("cobble"), same("stone"), PICK_ONLY),
  def(4, "cobble", 10, "pickaxe", drop("cobble"), same("cobble"), PICK_ONLY),
  def(5, "sand", 0.75, "shovel", drop("sand"), same("sand")),
  def(6, "log", 3, "axe", drop("log"), { top: "log_top", bottom: "log_top", side: "log_side" }),
  def(7, "leaves", 0.3, "none", drop("apple", 0.05), same("leaves"), {
    transparent: true,
    opaque: false,
    lightOpacity: 1,
  }),
  def(8, "planks", 3, "axe", drop("planks"), same("planks")),
  def(9, "ore_coal", 15, "pickaxe", drop("coal"), same("ore_coal"), { ...PICK_ONLY, minTier: "wood" }),
  def(10, "ore_iron", 15, "pickaxe", drop("iron_ingot"), same("ore_iron"), { ...PICK_ONLY, minTier: "stone" }),
  def(11, "ore_diamond", 15, "pickaxe", drop("diamond"), same("ore_diamond"), { ...PICK_ONLY, minTier: "iron" }),
  def(12, "workbench", 3.75, "axe", drop("workbench"), {
    top: "workbench_top",
    bottom: "planks",
    side: "workbench_side",
    front: "workbench_front",
  }),
  def(13, "chest", 3.75, "axe", drop("chest"), {
    top: "chest_top",
    bottom: "chest_top",
    side: "chest_side",
    front: "chest_front",
  }),
  def(14, "bedrock", Infinity, "none", null, same("bedrock")),
  def(15, "tallgrass", 0, "none", drop("seeds", 0.1), same("tallgrass"), { ...OPEN, render: "cross" }),
  // --- Giai đoạn 1b ---
  def(16, "gravel", 0.9, "shovel", drop("gravel"), same("gravel")),
  def(17, "mossy_cobble", 10, "pickaxe", drop("mossy_cobble"), same("mossy_cobble"), PICK_ONLY),
  def(18, "water", Infinity, "none", null, same("water"), {
    ...OPEN,
    liquid: true,
    lightOpacity: 2,
  }),
  def(19, "lava", Infinity, "none", null, same("lava"), {
    solid: false,
    liquid: true,
    lightEmit: LIGHT.LAVA,
  }),
  def(20, "fence", 3, "axe", drop("fence"), same("fence"), {
    ...OPEN,
    solid: true,
    box: [0.375, 0, 0.375, 0.625, 1, 0.625],
    render: "post",
  }),
  def(21, "rail", 0.7, "pickaxe", drop("rail"), same("rail"), { ...OPEN, render: "rail" }),
  def(22, "rail_x", 0.7, "pickaxe", drop("rail"), same("rail"), { ...OPEN, render: "rail" }),
  def(23, "cobweb", 4, "none", null, same("cobweb"), {
    ...OPEN,
    lightOpacity: 1,
    moveFactor: MOVE.COBWEB_FACTOR,
    render: "cross",
  }),
  def(24, "torch", 0, "none", drop("torch"), same("torch"), {
    ...OPEN,
    lightEmit: LIGHT.TORCH,
    render: "torch",
  }),
];
