// Block của làng (Giai đoạn 8a): đá cát mịn, đất nung (trơn / 16 màu / tráng men), khối rơm, giá sách và các bàn nghề của dân làng
// (khối đầy, texture từ client.jar). Bàn nghề không có chức năng riêng — dân làng sinh gần bàn nào thì theo nghề đó (villagers.ts).
import type { BlockDef, BlockDrop, BlockTextures, ToolKind } from "./blocks.js";

type Def = (id: number, key: string, hardness: number, tool: ToolKind, drops: BlockDrop[], tex: BlockTextures, extra?: Partial<BlockDef>) => BlockDef;
const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });
const tb = (top: string, bottom: string, side: string, front?: string): BlockTextures => ({ top, bottom, side, ...(front ? { front } : {}) });

export function villageBlocks(def: Def, drop: (item: string) => BlockDrop): BlockDef[] {
  const PICK: Partial<BlockDef> = { toolRequired: true };
  const self = (id: number, key: string, hardness: number, tool: ToolKind, tex: BlockTextures, extra: Partial<BlockDef> = {}): BlockDef =>
    def(id, key, hardness, tool, [drop(key)], tex, extra);
  return [
    self(135, "smooth_sandstone", 2, "pickaxe", same("sandstone_top"), PICK),
    self(136, "terracotta", 1.25, "pickaxe", same("terracotta"), PICK),
    def(137, "stained_terracotta", 1.25, "pickaxe", [], same("white_terracotta"), { ...PICK, meta: "color", colorTex: same("{c}_terracotta"), colorItem: "{c}_terracotta" }),
    def(138, "glazed_terracotta", 1.4, "pickaxe", [], same("white_glazed_terracotta"), {
      ...PICK, meta: "color", colorTex: same("{c}_glazed_terracotta"), colorItem: "{c}_glazed_terracotta",
    }),
    self(139, "hay_block", 0.5, "none", tb("hay_block_top", "hay_block_top", "hay_block_side")),
    def(140, "bookshelf", 1.5, "axe", [drop("book"), drop("book"), drop("book")], tb("planks", "planks", "bookshelf")), // (8b2) phá ra 3 sách
    self(141, "composter", 0.6, "axe", tb("composter_top", "composter_bottom", "composter_side")),
    self(142, "barrel", 2.5, "axe", tb("barrel_top", "barrel_bottom", "barrel_side")),
    self(143, "loom", 2.5, "axe", tb("loom_top", "loom_bottom", "loom_side", "loom_front"), { meta: "facing" }),
    self(144, "smoker", 3.5, "pickaxe", tb("smoker_top", "smoker_bottom", "smoker_side", "smoker_front"), { ...PICK, meta: "facing" }),
    self(145, "blast_furnace", 3.5, "pickaxe", tb("blast_furnace_top", "blast_furnace_top", "blast_furnace_side", "blast_furnace_front"), { ...PICK, meta: "facing" }),
    self(146, "cartography_table", 2.5, "axe", tb("cartography_table_top", "planks", "cartography_table_side3")),
    self(147, "fletching_table", 2.5, "axe", tb("fletching_table_top", "planks", "fletching_table_side", "fletching_table_front"), { meta: "facing" }),
    self(148, "smithing_table", 2.5, "axe", tb("smithing_table_top", "smithing_table_bottom", "smithing_table_side", "smithing_table_front"), { meta: "facing" }),
    self(149, "lectern", 2.5, "axe", tb("lectern_top", "planks", "lectern_sides", "lectern_front"), { meta: "facing" }),
    self(150, "stonecutter", 3.5, "pickaxe", tb("stonecutter_top", "stonecutter_bottom", "stonecutter_side"), { // cao 9/16 như Minecraft
      ...PICK, transparent: true, opaque: false, lightOpacity: 0, box: [0, 0, 0, 1, 9 / 16, 1], render: "farmland",
    }),
    self(151, "grindstone", 2, "pickaxe", tb("grindstone_round", "grindstone_round", "grindstone_side"), PICK),
    self(152, "cauldron", 2, "pickaxe", tb("cauldron_top", "cauldron_bottom", "cauldron_side"), PICK),
    self(153, "brewing_stand", 0.5, "pickaxe", same("brewing_stand"), { transparent: true, solid: false, opaque: false, lightOpacity: 0, render: "cross", lightEmit: 1 }),
    // 8b2: mía (bên cạnh nước, cao tới 3), quặng lưu ly (cuốc đá trở lên: 4–9 viên), bàn phù phép (cao 12/16, sáng 7)
    def(154, "sugar_cane", 0, "none", [drop("sugar_cane")], same("sugar_cane"), { transparent: true, solid: false, opaque: false, lightOpacity: 0, render: "cross", meta: "cactus" }),
    def(155, "ore_lapis", 3, "pickaxe", [], same("ore_lapis"), { ...PICK, minTier: "stone" }),
    def(156, "ore_lapis_deep", 4.5, "pickaxe", [], same("ore_lapis_deep"), { ...PICK, minTier: "stone" }),
    self(157, "lapis_block", 3, "pickaxe", same("lapis_block"), { ...PICK, minTier: "stone" }),
    self(158, "enchanting_table", 5, "pickaxe", tb("enchanting_table_top", "enchanting_table_bottom", "enchanting_table_side"), {
      ...PICK, transparent: true, opaque: false, lightOpacity: 0, lightEmit: 7, box: [0, 0, 0, 1, 12 / 16, 1], render: "farmland",
    }),
    // 8b3: đe (rơi như cát), sứt dần sau khi dùng; vẽ đúng hình đe (anvilBoxes) — không phải khối đầy: mặt trên đe chỉ rộng 10/16
    ...(["anvil", "chipped_anvil", "damaged_anvil"] as const).map((k, i) =>
      def(159 + i, k, 5, "pickaxe", [drop(k)], tb(`${k}_top`, "anvil", "anvil"), {
        ...PICK, falls: true, meta: "facing", transparent: true, opaque: false, lightOpacity: 0, render: "anvil",
      })),
  ];
}
