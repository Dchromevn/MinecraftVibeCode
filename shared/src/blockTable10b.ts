// Block Giai đoạn 10b (4 biome Vực Lửa; độ cứng / công cụ theo Minecraft Java). Không import B (blocks.ts nạp bảng này — vòng
// import): id ghi số, khớp B.*. Thân / ván nấm không cháy (không làm nhiên liệu). Nylium đào thường ra đá lửa ngục (Cảm ứng tơ: nylium);
// mầm Vực Lửa chỉ lấy được bằng kéo; dây leo rủ / xoắn rơi 33% (kéo: luôn); mụn cóc Vực Lửa trồng trên cát linh hồn (tuổi 0–3).
import type { BlockDef, BlockDrop, BlockId, BlockTextures, ToolKind } from "./blocks.js";

type Def = (id: number, key: string, hardness: number, tool: ToolKind, drops: BlockDrop[], tex: BlockTextures, extra?: Partial<BlockDef>) => BlockDef;
type Shaped = (id: number, key: string, src: number, extra: Partial<BlockDef>) => BlockDef;
const same = (t: string): BlockTextures => ({ top: t, bottom: t, side: t });
const pillar = (top: string, side: string): BlockTextures => ({ top, bottom: top, side });
const FENCE = 22, DOOR = 29, TORCH = 25, FIRE = 101;

export function netherBiomeBlocks(table: readonly BlockDef[], def: Def, drop: (item: string, chance?: number) => BlockDrop): BlockDef[] {
  const PICK: Partial<BlockDef> = { toolRequired: true };
  const OPEN: Partial<BlockDef> = { transparent: true, solid: false, opaque: false, lightOpacity: 0, render: "cross" };
  const self = (k: string): BlockDrop[] => [drop(k)];
  const plain = (id: number, k: string, h: number, tool: ToolKind, tex: BlockTextures, extra: Partial<BlockDef> = {}): BlockDef =>
    def(id, k, h, tool, self(k), tex, extra);
  const out: BlockDef[] = [
    plain(176, "soul_soil", 0.5, "shovel", same("soul_soil")),
    plain(177, "basalt", 1.25, "pickaxe", pillar("basalt_top", "basalt_side"), PICK),
    plain(178, "polished_basalt", 1.25, "pickaxe", pillar("polished_basalt_top", "polished_basalt_side"), PICK),
    plain(179, "smooth_basalt", 1.25, "pickaxe", same("smooth_basalt"), PICK),
    plain(180, "blackstone", 1.5, "pickaxe", pillar("blackstone_top", "blackstone"), PICK),
    plain(181, "polished_blackstone", 2, "pickaxe", same("polished_blackstone"), PICK),
    plain(182, "polished_blackstone_bricks", 1.5, "pickaxe", same("polished_blackstone_bricks"), PICK),
    def(183, "crimson_nylium", 0.4, "pickaxe", [drop("netherrack")], { top: "crimson_nylium", bottom: "netherrack", side: "crimson_nylium_side" }, PICK),
    def(184, "warped_nylium", 0.4, "pickaxe", [drop("netherrack")], { top: "warped_nylium", bottom: "netherrack", side: "warped_nylium_side" }, PICK),
    plain(185, "crimson_stem", 2, "axe", pillar("crimson_stem_top", "crimson_stem")),
    plain(186, "warped_stem", 2, "axe", pillar("warped_stem_top", "warped_stem")),
    plain(187, "crimson_planks", 2, "axe", same("crimson_planks")),
    plain(188, "warped_planks", 2, "axe", same("warped_planks")),
    plain(189, "nether_wart_block", 1, "hoe", same("nether_wart_block")),
    plain(190, "warped_wart_block", 1, "hoe", same("warped_wart_block")),
    plain(191, "shroomlight", 1, "hoe", same("shroomlight"), { lightEmit: 15 }),
    plain(192, "crimson_fungus", 0, "none", same("crimson_fungus"), OPEN),
    plain(193, "warped_fungus", 0, "none", same("warped_fungus"), OPEN),
    plain(194, "crimson_roots", 0, "none", same("crimson_roots"), OPEN),
    plain(195, "warped_roots", 0, "none", same("warped_roots"), OPEN),
    def(196, "nether_sprouts", 0, "none", [], same("nether_sprouts"), OPEN),
    def(197, "weeping_vines", 0, "none", [drop("weeping_vines", 0.33)], same("weeping_vines_plant"), OPEN),
    def(198, "twisting_vines", 0, "none", [drop("twisting_vines", 0.33)], same("twisting_vines_plant"), OPEN),
    plain(199, "bone_block", 2, "pickaxe", pillar("bone_block_top", "bone_block_side"), PICK),
    { ...table[FIRE]!, id: 200 as BlockId, key: "soul_fire", lightEmit: 10, tex: same("soul_fire") },
    def(201, "nether_wart", 0, "none", [drop("nether_wart")], same("nether_wart_stage2"), { ...OPEN, render: "crop", meta: "crop" }),
    { ...table[TORCH]!, id: 202 as BlockId, key: "soul_torch", lightEmit: 10, drops: [drop("soul_torch")], tex: same("soul_torch") },
  ];
  return out;
}

/** Bậc, tấm, hàng rào, cửa gỗ nấm (gọi sau khi ván 187–188 đã vào bảng). */
export function netherWoodShapes(table: readonly BlockDef[], shaped: Shaped, drop: (item: string) => BlockDrop): BlockDef[] {
  const out: BlockDef[] = [];
  for (const [id, w, planks] of [[203, "crimson", 187], [204, "warped", 188]] as const)
    out.push(shaped(id, `${w}_stairs`, planks, { render: "stairs", meta: "stairs" }));
  for (const [id, w, planks] of [[205, "crimson", 187], [206, "warped", 188]] as const)
    out.push(shaped(id, `${w}_slab`, planks, { render: "slab", meta: "slab" }));
  for (const [id, w] of [[207, "crimson"], [208, "warped"]] as const)
    out.push({ ...table[FENCE]!, id: id as BlockId, key: `${w}_fence`, drops: [drop(`${w}_fence`)], tex: same(`${w}_planks`) });
  for (const [id, w] of [[209, "crimson"], [210, "warped"]] as const)
    out.push({ ...table[DOOR]!, id: id as BlockId, key: `${w}_door`, drops: [drop(`${w}_door`)],
      tex: { top: `${w}_door_upper`, bottom: `${w}_door_lower`, side: `${w}_door_lower` } });
  return out;
}
