// Block Giai đoạn 10a (Vực Lửa — hoang mạc, cổng). Không import B (blocks.ts nạp bảng này — vòng import): id ghi số, khớp B.*.
// Cát linh hồn thấp 14/16 (lún, đi chậm — physics.ts); đá phát sáng sáng 15, rơi 2–4 bụi; quặng vàng Vực Lửa rơi 2–6 mảnh vàng;
// khối cổng: không va chạm, không đào được, sáng 11, bán trong suốt.
import type { BlockDef, BlockDrop, BlockTextures, ToolKind } from "./blocks.js";

type Def = (id: number, key: string, hardness: number, tool: ToolKind, drops: BlockDrop[], tex: BlockTextures, extra?: Partial<BlockDef>) => BlockDef;
const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });

export function netherBlocks(def: Def, drop: (item: string, chance?: number) => BlockDrop): BlockDef[] {
  const PICK: Partial<BlockDef> = { toolRequired: true };
  return [
    def(170, "soul_sand", 0.5, "shovel", [drop("soul_sand")], same("soul_sand"), {
      transparent: true, opaque: false, lightOpacity: 15, box: [0, 0, 0, 1, 14 / 16, 1], render: "farmland",
    }),
    def(171, "glowstone", 0.3, "none", [drop("glowstone_dust"), drop("glowstone_dust"), drop("glowstone_dust", 0.5), drop("glowstone_dust", 0.5)],
      same("glowstone"), { lightEmit: 15 }),
    def(172, "nether_quartz_ore", 3, "pickaxe", [drop("quartz")], same("nether_quartz_ore"), PICK),
    def(173, "nether_gold_ore", 3, "pickaxe", [1, 1, 0.5, 0.5, 0.5, 0.5].map((c) => drop("gold_nugget", c)), same("nether_gold_ore"), PICK),
    def(174, "quartz_block", 0.8, "pickaxe", [drop("quartz_block")], { top: "quartz_block_top", bottom: "quartz_block_bottom", side: "quartz_block_side" }, PICK),
    def(175, "nether_portal", Infinity, "none", [], same("nether_portal"), {
      transparent: true, solid: false, opaque: false, lightOpacity: 0, lightEmit: 11, render: "portal", meta: "axis", translucent: true,
    }),
  ];
}
