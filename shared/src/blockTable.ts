// Bảng dữ liệu block. Thứ tự phải khớp id trong B (blocks.ts).
// Đủ id 0–37 theo bảng 2.2 (hành vi đặc biệt làm ở Giai đoạn 3, 4, 7).
import { LIGHT, MOVE } from "./constants.js";
import type { BlockDef, BlockDrop, BlockId, BlockTextures, ToolKind } from "./blocks.js";

const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });
const drop = (item: string, chance = 1): BlockDrop => ({ item, chance });

const BASE: Omit<BlockDef, "id" | "key" | "hardness" | "tool" | "drops" | "tex"> = {
  toolRequired: false,
  minTier: null,
  transparent: false,
  solid: true,
  box: null,
  opaque: true,
  liquid: false,
  falls: false,
  moveFactor: 1,
  lightEmit: 0,
  lightOpacity: 15,
  render: "cube",
  meta: "none",
};

function def(
  id: number,
  key: string,
  hardness: number,
  tool: ToolKind,
  drops: BlockDrop[],
  tex: BlockTextures,
  extra: Partial<BlockDef> = {},
): BlockDef {
  return { ...BASE, id: id as BlockId, key, hardness, tool, drops, tex, ...extra };
}

/** Không va chạm, không che khuất, ánh sáng đi qua. */
const OPEN: Partial<BlockDef> = { transparent: true, solid: false, opaque: false, lightOpacity: 0 };
const PICK_ONLY: Partial<BlockDef> = { toolRequired: true };

const TABLE: BlockDef[] = [
  def(0, "air", 0, "none", [], same(""), { ...OPEN, render: "none" }),
  def(1, "grass", 0.6, "shovel", [drop("dirt")], { top: "grass_top", bottom: "dirt", side: "grass_side" }),
  def(2, "dirt", 0.5, "shovel", [drop("dirt")], same("dirt")),
  def(3, "stone", 1.5, "pickaxe", [drop("cobble")], same("stone"), PICK_ONLY),
  def(4, "cobble", 2, "pickaxe", [drop("cobble")], same("cobble"), PICK_ONLY),
  def(5, "sand", 0.5, "shovel", [drop("sand")], same("sand"), { falls: true }),
  def(6, "log", 2, "axe", [drop("log")], { top: "log_top", bottom: "log_top", side: "log_side" }),
  def(7, "leaves", 0.2, "none", [drop("apple", 0.05), drop("sapling", 0.05), drop("stick", 0.02)], same("leaves"), {
    transparent: true,
    opaque: false,
    lightOpacity: 1,
  }),
  def(8, "planks", 2, "axe", [drop("planks")], same("planks")),
  def(9, "ore_coal", 3, "pickaxe", [drop("coal")], same("ore_coal"), { ...PICK_ONLY, minTier: "wood" }),
  def(10, "ore_iron", 3, "pickaxe", [drop("raw_iron")], same("ore_iron"), { ...PICK_ONLY, minTier: "stone" }),
  def(11, "ore_diamond", 3, "pickaxe", [drop("diamond")], same("ore_diamond"), { ...PICK_ONLY, minTier: "iron" }),
  def(12, "workbench", 2.5, "axe", [drop("workbench")], {
    top: "workbench_top",
    bottom: "planks",
    side: "workbench_side",
    front: "workbench_front",
  }),
  def(13, "chest", 2.5, "axe", [drop("chest")], {
    top: "chest_top",
    bottom: "chest_top",
    side: "chest_side",
    front: "chest_front",
  }, { meta: "facing" }),
  def(14, "bedrock", Infinity, "none", [], same("bedrock")),
  def(15, "tallgrass", 0, "none", [drop("seeds", 0.1)], same("tallgrass"), { ...OPEN, render: "cross" }),
  // sỏi: 10% rơi đá lửa thay cho sỏi (Giai đoạn 4 xử lý)
  def(16, "gravel", 0.6, "shovel", [drop("gravel", 0.9), drop("flint", 0.1)], same("gravel"), { falls: true }),
  def(17, "water", Infinity, "none", [], same("water"), { ...OPEN, liquid: true, lightOpacity: 1, render: "liquid", meta: "liquid" }),
  def(18, "lava", Infinity, "none", [], same("lava"), {
    ...OPEN,
    liquid: true,
    lightEmit: LIGHT.LAVA,
    lightOpacity: 15,
    render: "liquid",
    meta: "liquid",
  }),
  def(19, "mossy_cobble", 2, "pickaxe", [drop("mossy_cobble")], same("mossy_cobble"), PICK_ONLY),
  def(20, "sandstone", 0.8, "pickaxe", [drop("sandstone")], same("sandstone"), PICK_ONLY),
  def(21, "snow_layer", 0.1, "shovel", [], { top: "snow", bottom: "snow", side: "snow" }, {
    ...OPEN,
    box: [0, 0, 0, 1, 2 / 16, 1],
    render: "layer",
  }),
  def(22, "fence", 2, "axe", [drop("fence")], same("fence"), {
    ...OPEN,
    solid: true,
    box: [0.375, 0, 0.375, 0.625, 1.5, 0.625], // cao 1.5 để không nhảy qua được
    render: "fence",
  }),
  def(23, "rail", 0.7, "pickaxe", [drop("rail")], same("rail"), { ...OPEN, render: "rail", meta: "rail" }),
  def(24, "cobweb", 4, "sword", [drop("string")], same("cobweb"), {
    ...OPEN,
    toolRequired: true, // tay không: không rơi gì, đào chậm (MECHANICS mục 4)
    lightOpacity: 1,
    moveFactor: MOVE.COBWEB_FACTOR,
    render: "cross",
  }),
  def(25, "torch", 0, "none", [drop("torch")], same("torch"), { ...OPEN, lightEmit: LIGHT.TORCH, render: "torch", meta: "torch" }),
  def(26, "furnace", 3.5, "pickaxe", [drop("furnace")], {
    top: "furnace_top",
    bottom: "furnace_top",
    side: "furnace_side",
    front: "furnace_front",
  }, { ...PICK_ONLY, meta: "facing" }),
  def(27, "glass", 0.3, "none", [], same("glass"), { transparent: true, opaque: false, lightOpacity: 0 }),
  def(28, "ladder", 0.4, "axe", [drop("ladder")], same("ladder"), { ...OPEN, render: "ladder", meta: "ladder" }),
  def(29, "door", 3, "axe", [drop("door")], { top: "door_upper", bottom: "door_lower", side: "door_lower" }, {
    ...OPEN,
    solid: true,
    render: "door",
    meta: "door",
  }),
  def(30, "farmland", 0.6, "shovel", [drop("dirt")], { top: "farmland", bottom: "dirt", side: "dirt" }, {
    transparent: true,
    opaque: false,
    box: [0, 0, 0, 1, 15 / 16, 1],
    render: "farmland",
  }),
  def(31, "wheat", 0, "none", [drop("wheat"), drop("seeds")], same("wheat_7"), { ...OPEN, render: "crop", meta: "crop" }),
  def(32, "sapling", 0, "none", [drop("sapling")], same("sapling"), { ...OPEN, render: "cross" }),
  def(33, "bed", 0.2, "none", [drop("bed")], {
    top: "bed_head_top",
    bottom: "planks",
    side: "bed_head_side",
    front: "bed_foot_top", // dùng làm mặt trên nửa chân giường
  }, { transparent: true, opaque: false, lightOpacity: 0, box: [0, 0, 0, 1, 9 / 16, 1], render: "bed", meta: "bed" }),
  def(34, "deepslate", 3, "pickaxe", [drop("deepslate")], {
    top: "deepslate_top",
    bottom: "deepslate_top",
    side: "deepslate",
  }, PICK_ONLY),
  def(35, "ore_gold", 3, "pickaxe", [drop("raw_gold")], same("ore_gold"), { ...PICK_ONLY, minTier: "iron" }),
  def(36, "ore_gold_deep", 4.5, "pickaxe", [drop("raw_gold")], same("ore_gold_deep"), { ...PICK_ONLY, minTier: "iron" }),
  def(37, "ore_emerald", 3, "pickaxe", [drop("emerald")], same("ore_emerald"), { ...PICK_ONLY, minTier: "iron" }),
];

TABLE.forEach((b, i) => {
  if (b.id !== i) throw new Error(`blockTable: id ${b.id} ở vị trí ${i}`);
});

export const BLOCKS: readonly BlockDef[] = TABLE;
