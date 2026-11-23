// Block Giai đoạn 10d2 (độ cứng / công cụ theo Minecraft Java): gạch đá đen mài nứt, đá đen mài khắc, đá đen mạ vàng; bậc / tấm / tường
// đá đen, đá đen mài, gạch đá đen mài; xích; phế tích cổ (cuốc kim cương); khối netherite; đá nam châm; mỏ neo hồi sinh (dữ liệu phụ =
// số lần nạp 0–4: sáng 0 / 3 / 7 / 11 / 15, ảnh mặt bên theo số lần nạp). Không import B (vòng import): id ghi số, khớp B_10D.
import type { BlockDef, BlockDrop, BlockId, BlockTextures, ToolKind } from "./blocks.js";

type Def = (id: number, key: string, hardness: number, tool: ToolKind, drops: BlockDrop[], tex: BlockTextures, extra?: Partial<BlockDef>) => BlockDef;
type Shaped = (id: number, key: string, src: number, extra: Partial<BlockDef>) => BlockDef;
const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });

export function bastionBlocks(def: Def, shaped: Shaped, drop: (item: string) => BlockDrop): BlockDef[] {
  const PICK: Partial<BlockDef> = { toolRequired: true }, DIAMOND: Partial<BlockDef> = { toolRequired: true, minTier: "diamond" };
  const plain = (id: number, k: string, h: number, tex: BlockTextures, extra: Partial<BlockDef> = PICK): BlockDef => def(id, k, h, "pickaxe", [drop(k)], tex, extra);
  const out: BlockDef[] = [
    plain(223, "cracked_polished_blackstone_bricks", 1.5, same("cracked_polished_blackstone_bricks")),
    plain(224, "chiseled_polished_blackstone", 1.5, same("chiseled_polished_blackstone")),
    plain(225, "gilded_blackstone", 1.5, same("gilded_blackstone")), // rơi: drops.ts (10% mảnh vàng 2–5)
  ];
  for (const [i, m, src] of [[0, "blackstone", 180], [1, "polished_blackstone", 181], [2, "polished_blackstone_brick", 182]] as const) {
    out[3 + i] = shaped(226 + i, `${m}_stairs`, src, { render: "stairs", meta: "stairs" });
    out[6 + i] = shaped(229 + i, `${m}_slab`, src, { render: "slab", meta: "slab" });
    out[9 + i] = shaped(232 + i, `${m}_wall`, src, { render: "wall", meta: "none" });
  }
  out.push(
    def(235, "chain", 5, "pickaxe", [drop("chain")], same("iron_chain"), { toolRequired: true, transparent: true, solid: false, opaque: false, lightOpacity: 0, render: "cross" }),
    plain(236, "ancient_debris", 30, { top: "ancient_debris_top", bottom: "ancient_debris_top", side: "ancient_debris_side" }, DIAMOND),
    plain(237, "netherite_block", 50, same("netherite_block"), DIAMOND),
    plain(238, "lodestone", 3.5, { top: "lodestone_top", bottom: "lodestone_top", side: "lodestone_side" }),
    plain(239, "respawn_anchor", 50, { top: "respawn_anchor_top_off", bottom: "respawn_anchor_bottom", side: "respawn_anchor_side0" }, { ...DIAMOND, meta: "charge" }),
  );
  return out.map((b) => ({ ...b, id: b.id as BlockId }));
}
