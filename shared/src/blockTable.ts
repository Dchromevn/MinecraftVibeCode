// Bảng dữ liệu block. Thứ tự phải khớp id trong B (blocks.ts).
// Giai đoạn 2a có id 0–17, 20, 21, 32, 34; các id còn lại "dành chỗ" cho 2b.
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
const reserved = (id: number): BlockDef => def(id, `reserved_${id}`, 0, "none", [], same(""), { ...OPEN, render: "none" });

const TABLE: BlockDef[] = [
  def(0, "air", 0, "none", [], same(""), { ...OPEN, render: "none" }),
  def(1, "grass", 0.9, "shovel", [drop("dirt")], { top: "grass_top", bottom: "dirt", side: "grass_side" }),
  def(2, "dirt", 0.75, "shovel", [drop("dirt")], same("dirt")),
  def(3, "stone", 7.5, "pickaxe", [drop("cobble")], same("stone"), PICK_ONLY),
  def(4, "cobble", 10, "pickaxe", [drop("cobble")], same("cobble"), PICK_ONLY),
  def(5, "sand", 0.75, "shovel", [drop("sand")], same("sand"), { falls: true }),
  def(6, "log", 3, "axe", [drop("log")], { top: "log_top", bottom: "log_top", side: "log_side" }),
  def(7, "leaves", 0.3, "none", [drop("apple", 0.05), drop("sapling", 0.05)], same("leaves"), {
    transparent: true,
    opaque: false,
    lightOpacity: 1,
  }),
  def(8, "planks", 3, "axe", [drop("planks")], same("planks")),
  def(9, "ore_coal", 15, "pickaxe", [drop("coal")], same("ore_coal"), { ...PICK_ONLY, minTier: "wood" }),
  def(10, "ore_iron", 15, "pickaxe", [drop("raw_iron")], same("ore_iron"), { ...PICK_ONLY, minTier: "stone" }),
  def(11, "ore_diamond", 15, "pickaxe", [drop("diamond")], same("ore_diamond"), { ...PICK_ONLY, minTier: "iron" }),
  def(12, "workbench", 3.75, "axe", [drop("workbench")], {
    top: "workbench_top",
    bottom: "planks",
    side: "workbench_side",
    front: "workbench_front",
  }),
  def(13, "chest", 3.75, "axe", [drop("chest")], {
    top: "chest_top",
    bottom: "chest_top",
    side: "chest_side",
    front: "chest_front",
  }),
  def(14, "bedrock", Infinity, "none", [], same("bedrock")),
  def(15, "tallgrass", 0, "none", [drop("seeds", 0.1)], same("tallgrass"), { ...OPEN, render: "cross" }),
  // sỏi: 10% rơi đá lửa thay cho sỏi (Giai đoạn 4 xử lý)
  def(16, "gravel", 0.9, "shovel", [drop("gravel", 0.9), drop("flint", 0.1)], same("gravel"), { falls: true }),
  def(17, "water", Infinity, "none", [], same("water"), { ...OPEN, liquid: true, lightOpacity: 2, render: "liquid" }),
  reserved(18), // dung nham (2b)
  reserved(19), // đá cuội rêu (2b)
  def(20, "sandstone", 4, "pickaxe", [drop("sandstone")], same("sandstone"), PICK_ONLY),
  def(21, "snow_layer", 0.5, "shovel", [], { top: "snow", bottom: "snow", side: "snow" }, {
    ...OPEN,
    box: [0, 0, 0, 1, 2 / 16, 1],
    render: "layer",
  }),
  reserved(22), // hàng rào (2b)
  reserved(23), // đường ray (2b)
  reserved(24), // mạng nhện (2b)
  reserved(25), // đuốc (2b)
  reserved(26), // lò nung (2b)
  reserved(27), // kính (2b)
  reserved(28), // thang (2b)
  reserved(29), // cửa gỗ (2b)
  reserved(30), // đất cày (2b)
  reserved(31), // lúa mì (2b)
  def(32, "sapling", 0, "none", [drop("sapling")], same("sapling"), { ...OPEN, render: "cross" }),
  reserved(33), // giường (2b)
  def(34, "deepslate", 12, "pickaxe", [drop("deepslate")], {
    top: "deepslate_top",
    bottom: "deepslate_top",
    side: "deepslate",
  }, PICK_ONLY),
];

TABLE.forEach((b, i) => {
  if (b.id !== i) throw new Error(`blockTable: id ${b.id} ở vị trí ${i}`);
});

export const BLOCKS: readonly BlockDef[] = TABLE;
