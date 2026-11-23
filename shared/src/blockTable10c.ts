// Block Giai đoạn 10c (pháo đài Vực Lửa; độ cứng / công cụ theo Minecraft Java): gạch Vực Lửa (thường, nứt, khắc hoa, đỏ), hàng rào
// gạch Vực Lửa, bậc / tấm / tường gạch Vực Lửa (thường, đỏ), sọ bộ xương héo (đặt trên sàn, quay 4 hướng — để triệu hồi Quỷ héo ở 10e).
// Không import B (blocks.ts nạp bảng này — vòng import): id ghi số, khớp B.*.
import type { BlockDef, BlockDrop, BlockId, BlockTextures, ToolKind } from "./blocks.js";

type Def = (id: number, key: string, hardness: number, tool: ToolKind, drops: BlockDrop[], tex: BlockTextures, extra?: Partial<BlockDef>) => BlockDef;
type Shaped = (id: number, key: string, src: number, extra: Partial<BlockDef>) => BlockDef;
const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });
const FENCE = 22;

export function fortressBlocks(table: readonly BlockDef[], def: Def, drop: (item: string) => BlockDrop): BlockDef[] {
  const PICK: Partial<BlockDef> = { toolRequired: true };
  const brick = (id: number, k: string): BlockDef => def(id, k, 2, "pickaxe", [drop(k)], same(k), PICK);
  return [
    brick(211, "nether_bricks"),
    brick(212, "cracked_nether_bricks"),
    brick(213, "chiseled_nether_bricks"),
    brick(214, "red_nether_bricks"),
    // hàng rào gạch: như hàng rào gỗ nhưng đào bằng cuốc (tay không thì không rơi)
    { ...table[FENCE]!, id: 215 as BlockId, key: "nether_brick_fence", hardness: 2, tool: "pickaxe", toolRequired: true,
      drops: [drop("nether_brick_fence")], tex: same("nether_bricks") },
  ];
}

/** Bậc, tấm, tường gạch Vực Lửa (thường, đỏ) + sọ bộ xương héo (gọi sau khi 211–215 đã vào bảng). */
export function fortressShapes(def: Def, shaped: Shaped, drop: (item: string) => BlockDrop): BlockDef[] {
  const out: BlockDef[] = [];
  for (const [id, m, src] of [[216, "nether_brick", 211], [217, "red_nether_brick", 214]] as const)
    out.push(shaped(id, `${m}_stairs`, src, { render: "stairs", meta: "stairs" }));
  for (const [id, m, src] of [[218, "nether_brick", 211], [219, "red_nether_brick", 214]] as const)
    out.push(shaped(id, `${m}_slab`, src, { render: "slab", meta: "slab" }));
  for (const [id, m, src] of [[220, "nether_brick", 211], [221, "red_nether_brick", 214]] as const)
    out.push(shaped(id, `${m}_wall`, src, { render: "wall", meta: "none" }));
  // sọ: hộp 8 × 8 × 8 giữa ô, mặt trước theo hướng (dữ liệu phụ "facing"), ảnh cắt từ skin bộ xương héo
  out.push(def(222, "wither_skeleton_skull", 1, "none", [drop("wither_skeleton_skull")],
    { top: "wither_skull_top", bottom: "wither_skull_bottom", side: "wither_skull_side", front: "wither_skull_front" }, {
      transparent: true, opaque: false, lightOpacity: 0, box: [4 / 16, 0, 4 / 16, 12 / 16, 8 / 16, 12 / 16], render: "skull", meta: "facing",
    }));
  return out;
}
