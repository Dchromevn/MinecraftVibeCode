// Bảng dữ liệu block. Thứ tự phải khớp id trong B (blocks.ts).
// Đủ id 0–45 theo bảng 2.2, 46–62 (4d), 63–94 (4e), 95–115 (4f) theo mục 2.13 và 116–118 (7b).
import { FIRE, LANTERN_LIGHT, LEAF_DROPS, LIGHT, MOVE } from "./constants.js";
import type { BlockDef, BlockDrop, BlockId, BlockTextures, ToolKind } from "./blocks.js";
import { villageBlocks } from "./blockTable8a.js";
import { darkOakShapes } from "./blockTable8c.js";
import { netherBlocks } from "./blockTable10.js";
import { netherBiomeBlocks, netherWoodShapes } from "./blockTable10b.js";
import { fortressBlocks, fortressShapes } from "./blockTable10c.js";
import { bastionBlocks } from "./blockTable10d.js";

const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t }), drop = (item: string, chance = 1): BlockDrop => ({ item, chance });
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
  def(7, "leaves", 0.2, "none", [drop("apple", LEAF_DROPS.APPLE), drop("sapling", LEAF_DROPS.SAPLING), drop("stick", LEAF_DROPS.STICK)], same("leaves"), {
    transparent: true,
    opaque: false,
    lightOpacity: 1,
    meta: "leaves",
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
  }, { meta: "chest" }),
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
    lightOpacity: 0, // khối thấp lấy ánh sáng của chính ô: không chặn sáng, nếu không sẽ bị vẽ đen
    box: [0, 0, 0, 1, 15 / 16, 1],
    render: "farmland",
    meta: "farmland",
  }),
  def(31, "wheat", 0, "none", [drop("wheat"), drop("seeds")], same("wheat_7"), { ...OPEN, render: "crop", meta: "crop" }),
  def(32, "sapling", 0, "none", [drop("sapling")], same("sapling"), { ...OPEN, render: "cross", meta: "sapling" }),
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
  // cây trồng: số lượng rơi theo giai đoạn xử lý trong drops.ts
  def(38, "carrots", 0, "none", [drop("carrot")], same("carrots_3"), { ...OPEN, render: "crop", meta: "crop" }),
  def(39, "potatoes", 0, "none", [drop("potato")], same("potatoes_3"), { ...OPEN, render: "crop", meta: "crop" }),
  def(40, "beetroots", 0, "none", [drop("beetroot_seeds")], same("beetroots_3"), { ...OPEN, render: "crop", meta: "crop" }),
  def(41, "melon", 1, "axe", [drop("melon_slice")], { top: "melon_top", bottom: "melon_top", side: "melon_side" }),
  def(42, "pumpkin", 1, "axe", [drop("pumpkin")], { top: "pumpkin_top", bottom: "pumpkin_top", side: "pumpkin_side" }),
  def(43, "melon_stem", 0, "none", [drop("melon_seeds")], same("melon_stem"), { ...OPEN, render: "stem", meta: "stem" }),
  def(44, "pumpkin_stem", 0, "none", [drop("pumpkin_seeds")], same("pumpkin_stem"), { ...OPEN, render: "stem", meta: "stem" }),
  // nước chảy vào nguồn dung nham (Giai đoạn 4c)
  def(45, "obsidian", 50, "pickaxe", [drop("obsidian")], same("obsidian"), { ...PICK_ONLY, minTier: "diamond" }),
  // Giai đoạn 4d: thông, bạch dương, keo (thân, lá, ván, cây non) — mỗi loài 4 id liền nhau
  ...woodDefs(46, "spruce"),
  ...woodDefs(50, "birch"),
  ...woodDefs(54, "acacia"),
  ...(["dandelion", "poppy", "cornflower", "lily_of_the_valley"] as const).map((k, i) =>
    def(58 + i, k, 0, "none", [drop(k)], same(k), { ...OPEN, render: "cross" })),
  def(62, "cactus", 0.4, "none", [drop("cactus")], { top: "cactus_top", bottom: "cactus_bottom", side: "cactus_side" }, {
    transparent: true,
    opaque: false,
    lightOpacity: 0,
    box: [1 / 16, 0, 1 / 16, 15 / 16, 15 / 16, 15 / 16], // hẹp hơn 1 block: chạm vào là bị đâm
    render: "cactus",
    meta: "cactus",
  }),
];

/** Thân, lá, ván, cây non của một loài gỗ (thông số như bản sồi). Táo chỉ rơi từ lá sồi. */
function woodDefs(id: number, w: string): BlockDef[] {
  return [
    def(id, `${w}_log`, 2, "axe", [drop(`${w}_log`)], { top: `${w}_log_top`, bottom: `${w}_log_top`, side: `${w}_log` }),
    def(id + 1, `${w}_leaves`, 0.2, "none", [drop(`${w}_sapling`, LEAF_DROPS.SAPLING), drop("stick", LEAF_DROPS.STICK)], same(`${w}_leaves`), {
      transparent: true,
      opaque: false,
      lightOpacity: 1,
      meta: "leaves",
    }),
    def(id + 2, `${w}_planks`, 2, "axe", [drop(`${w}_planks`)], same(`${w}_planks`)),
    def(id + 3, `${w}_sapling`, 0, "none", [drop(`${w}_sapling`)], same(`${w}_sapling`), { ...OPEN, render: "cross", meta: "sapling" }),
  ];
}

// Giai đoạn 4e (mục 2.13): gạch đá; bậc, tấm theo 10 vật liệu; tường theo 5; hàng rào, cửa theo loài gỗ.
// Bậc / tấm / tường lấy độ cứng, công cụ, texture của vật liệu gốc; không chặn sáng (vẽ bằng ánh sáng của
// chính ô, như đất cày) và không che khuất khối bên cạnh.
TABLE.push(def(63, "stone_bricks", 1.5, "pickaxe", [drop("stone_bricks")], same("stone_bricks"), PICK_ONLY));
/** [tên vật liệu, id block gốc] — thứ tự khớp B.*_STAIRS / B.*_SLAB. */
export const SHAPE_MATERIALS: readonly (readonly [string, number])[] = [
  ["stone", 3], ["cobble", 4], ["mossy_cobble", 19], ["sandstone", 20], ["deepslate", 34], ["stone_brick", 63],
  ["oak", 8], ["spruce", 48], ["birch", 52], ["acacia", 56],
];
/** Vật liệu có tường — thứ tự khớp B.*_WALL. */
export const WALL_MATERIALS: readonly string[] = ["cobble", "mossy_cobble", "sandstone", "deepslate", "stone_brick"];
const SHAPED: Partial<BlockDef> = { transparent: true, opaque: false, lightOpacity: 0 };
function shapedDef(id: number, key: string, src: number, extra: Partial<BlockDef>): BlockDef {
  const b = TABLE[src]!;
  return { ...b, ...SHAPED, id: id as BlockId, key, drops: [drop(key)], box: null, falls: false, ...extra };
}
for (const [m, src] of SHAPE_MATERIALS) TABLE.push(shapedDef(TABLE.length, `${m}_stairs`, src, { render: "stairs", meta: "stairs" }));
for (const [m, src] of SHAPE_MATERIALS) TABLE.push(shapedDef(TABLE.length, `${m}_slab`, src, { render: "slab", meta: "slab" }));
for (const m of WALL_MATERIALS)
  TABLE.push(shapedDef(TABLE.length, `${m}_wall`, SHAPE_MATERIALS.find((x) => x[0] === m)![1], { render: "wall", meta: "none" }));
for (const w of ["spruce", "birch", "acacia"])
  TABLE.push({ ...TABLE[22]!, id: TABLE.length as BlockId, key: `${w}_fence`, drops: [drop(`${w}_fence`)], tex: same(`${w}_planks`) });
for (const w of ["spruce", "birch", "acacia"])
  TABLE.push({
    ...TABLE[29]!, id: TABLE.length as BlockId, key: `${w}_door`, drops: [drop(`${w}_door`)],
    tex: { top: `${w}_door_upper`, bottom: `${w}_door_lower`, side: `${w}_door_lower` },
  });

// Giai đoạn 4f (mục 2.13): 16 màu, đồ sắt, lửa, nút / cần gạt. Màu ở dữ liệu phụ (colorTex / colorItem).
const SEE: Partial<BlockDef> = { transparent: true, opaque: false, lightOpacity: 0 };
const colored = (pattern: string): BlockTextures => same(pattern);
TABLE.push(
  def(95, "wool", 0.8, "none", [], same("white_wool"), { meta: "color", colorTex: colored("{c}_wool"), colorItem: "{c}_wool" }),
  def(96, "carpet", 0.1, "none", [], same("white_wool"), {
    ...SEE, box: [0, 0, 0, 1, 1 / 16, 1], render: "carpet", meta: "color", colorTex: colored("{c}_wool"), colorItem: "{c}_carpet",
  }),
  def(97, "stained_glass", 0.3, "none", [], same("white_stained_glass"), {
    ...SEE, translucent: true, meta: "color", colorTex: colored("{c}_stained_glass"),
  }),
  def(98, "glass_pane", 0.3, "none", [], { top: "glass_pane_top", bottom: "glass_pane_top", side: "glass" }, { ...SEE, render: "pane" }),
  def(99, "stained_glass_pane", 0.3, "none", [], { top: "white_stained_glass_pane_top", bottom: "white_stained_glass_pane_top", side: "white_stained_glass" }, {
    ...SEE, render: "pane", translucent: true, meta: "color",
    colorTex: { top: "{c}_stained_glass_pane_top", bottom: "{c}_stained_glass_pane_top", side: "{c}_stained_glass" },
  }),
  def(100, "iron_bars", 5, "pickaxe", [drop("iron_bars")], same("iron_bars"), { ...PICK_ONLY, ...SEE, render: "pane" }),
  def(101, "fire", 0, "none", [], same("fire"), { ...OPEN, lightEmit: FIRE.LIGHT, render: "fire" }),
  ...([["coal_block", "wood"], ["iron_block", "stone"], ["gold_block", "iron"], ["diamond_block", "iron"], ["emerald_block", "iron"],
    ["raw_iron_block", "stone"], ["raw_gold_block", "iron"]] as const).map(([k, tier], i) =>
    def(102 + i, k, k === "gold_block" ? 3 : 5, "pickaxe", [drop(k)], same(k), { ...PICK_ONLY, minTier: tier })),
  def(109, "lantern", 3.5, "pickaxe", [drop("lantern")], same("lantern"), {
    ...PICK_ONLY, ...SEE, lightEmit: LANTERN_LIGHT, box: [5 / 16, 0, 5 / 16, 11 / 16, 9 / 16, 11 / 16], render: "lantern", meta: "lantern",
  }),
  { ...TABLE[29]!, id: 110 as BlockId, key: "iron_door", hardness: 5, tool: "pickaxe", toolRequired: true, drops: [drop("iron_door")],
    tex: { top: "iron_door_upper", bottom: "iron_door_lower", side: "iron_door_lower" } },
  def(111, "stone_button", 0.5, "pickaxe", [drop("stone_button")], same("stone"), { ...OPEN, render: "button", meta: "switch" }),
  def(112, "oak_button", 0.5, "axe", [drop("oak_button")], same("planks"), { ...OPEN, render: "button", meta: "switch" }),
  def(113, "lever", 0.5, "none", [drop("lever")], { top: "cobble", bottom: "cobble", side: "cobble", front: "lever" }, {
    ...OPEN, render: "lever", meta: "switch",
  }),
  def(114, "stone_pressure_plate", 0.5, "pickaxe", [drop("stone_pressure_plate")], same("stone"), { ...OPEN, render: "plate", meta: "switch" }),
  def(115, "oak_pressure_plate", 0.5, "axe", [drop("oak_pressure_plate")], same("planks"), { ...OPEN, render: "plate", meta: "switch" }),
);

// Giai đoạn 7b: TNT, đá nhiễm (độ cứng bằng nửa đá, không rơi gì — ra mọt đá), lồng sinh quái
TABLE.push(
  def(116, "tnt", 0, "none", [drop("tnt")], { top: "tnt_top", bottom: "tnt_bottom", side: "tnt_side" }),
  def(117, "infested_stone", 0.75, "pickaxe", [], same("stone")),
  def(118, "spawner", 5, "pickaxe", [], same("spawner"), { ...PICK_ONLY, transparent: true, opaque: false, lightOpacity: 0, meta: "spawner" }),
  // 7b: đầm lầy
  def(119, "vine", 0.2, "none", [], same("vine"), { ...OPEN, render: "ladder", meta: "ladder" }),
  def(120, "lily_pad", 0, "none", [drop("lily_pad")], same("lily_pad"), { ...SEE, box: [0, 0, 0, 1, 1.5 / 16, 1], render: "carpet" }),
);

// Giai đoạn 7e: block của công trình
const top = (t: string, side: string): BlockTextures => ({ top: t, bottom: t, side });
TABLE.push(
  def(121, "snow_block", 0.2, "shovel", [drop("snow_block")], same("snow")),
  def(122, "ice", 0.5, "pickaxe", [], same("ice"), { ...SEE, translucent: true, lightOpacity: 2 }),
  def(123, "chiseled_stone_bricks", 1.5, "pickaxe", [drop("chiseled_stone_bricks")], same("chiseled_stone_bricks"), PICK_ONLY),
  def(124, "cracked_stone_bricks", 1.5, "pickaxe", [drop("cracked_stone_bricks")], same("cracked_stone_bricks"), PICK_ONLY),
  def(125, "mossy_stone_bricks", 1.5, "pickaxe", [drop("mossy_stone_bricks")], same("mossy_stone_bricks"), PICK_ONLY),
  def(126, "netherrack", 0.4, "pickaxe", [drop("netherrack")], same("netherrack"), PICK_ONLY),
  def(127, "magma_block", 0.5, "pickaxe", [drop("magma_block")], same("magma"), { ...PICK_ONLY, lightEmit: 3 }),
  def(128, "crying_obsidian", 50, "pickaxe", [drop("crying_obsidian")], same("crying_obsidian"), { ...PICK_ONLY, minTier: "diamond", lightEmit: 10 }),
  def(129, "chiseled_sandstone", 0.8, "pickaxe", [drop("chiseled_sandstone")], top("sandstone_top", "chiseled_sandstone"), PICK_ONLY),
  def(130, "cut_sandstone", 0.8, "pickaxe", [drop("cut_sandstone")], top("sandstone_top", "cut_sandstone"), PICK_ONLY),
  def(131, "orange_terracotta", 1.25, "pickaxe", [drop("orange_terracotta")], same("orange_terracotta"), PICK_ONLY),
  def(132, "blue_terracotta", 1.25, "pickaxe", [drop("blue_terracotta")], same("blue_terracotta"), PICK_ONLY),
  // (8a) cao 15/16 như Minecraft (ảnh cạnh có hàng trên cùng trong suốt — khối đầy sẽ hở kẽ); vẽ như đất cày
  def(133, "dirt_path", 0.65, "shovel", [drop("dirt")], { top: "dirt_path_top", bottom: "dirt", side: "dirt_path_side" }, {
    transparent: true, opaque: false, lightOpacity: 0, box: [0, 0, 0, 1, 15 / 16, 1], render: "farmland",
  }),
  { ...shapedDef(134, "white_wool_stairs", 95, { render: "stairs", meta: "stairs" }), colorTex: undefined, colorItem: undefined },
);

// Giai đoạn 8a: block của làng (blockTable8a.ts)
TABLE.push(...villageBlocks(def, drop));
// Giai đoạn 8c: bộ gỗ sồi tối — thân, lá, ván, cây non (như các loài khác) rồi bậc, tấm, hàng rào, cửa (blockTable8c.ts)
TABLE.push(...woodDefs(162, "dark_oak")); TABLE.push(...darkOakShapes(TABLE, shapedDef, drop));
TABLE.push(...netherBlocks(def, drop)); // Giai đoạn 10a: Vực Lửa
TABLE.push(...netherBiomeBlocks(TABLE, def, drop)); TABLE.push(...netherWoodShapes(TABLE, shapedDef, drop)); // 10b: 4 biome Vực Lửa
TABLE.push(...fortressBlocks(TABLE, def, drop)); TABLE.push(...fortressShapes(def, shapedDef, drop)); // 10c: pháo đài (bậc / tấm / tường cần gạch đã vào bảng)
TABLE.push(...bastionBlocks(def, shapedDef, drop)); // 10d2: đá đen, xích, phế tích cổ, netherite, đá nam châm, mỏ neo hồi sinh
// giường 16 màu: rơi ra giường đúng màu (bit 3–6 dữ liệu phụ)
TABLE[33] = { ...TABLE[33]!, drops: [], colorItem: "{c}_bed" };

TABLE.forEach((b, i) => {
  if (b.id !== i) throw new Error(`blockTable: id ${b.id} ở vị trí ${i}`);
});

export const BLOCKS: readonly BlockDef[] = TABLE;
