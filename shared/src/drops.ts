// Vật phẩm rơi ra khi phá block (cột "Rơi ra" DESIGN.md 2.2): theo tỉ lệ, chỉ khi đủ cấp
// công cụ (block mất chỗ bám thì luôn rơi). Một số block có luật riêng.
import { B, BLOCKS } from "./blocks.js";
import { cropMax } from "./crops.js";
import { CROP_DROPS } from "./tickConstants.js";
import { canHarvest, type HeldTool } from "./digging.js";
import type { ItemStack } from "./inventory.js";
import type { Rng } from "./rng.js";

/**
 * forced = block rơi vì mất chỗ bám / bị đè (không cần công cụ). meta: dữ liệu phụ (lúa).
 */
export function blockDrops(id: number, meta: number, tool: HeldTool | null, rng: Rng, forced = false): ItemStack[] {
  const d = BLOCKS[id];
  if (!d) return [];
  if (!forced && !canHarvest(id, tool)) return [];
  const out: ItemStack[] = [];
  const give = (item: string, count = 1): void => void out.push({ item, count, damage: 0 });
  const between = (r: readonly [number, number]): number => r[0] + Math.floor(rng() * (r[1] - r[0] + 1));
  const ripe = (meta & 7) >= cropMax(id);
  switch (id) {
    case B.GRAVEL: // 10% đá lửa thay cho sỏi
      give(rng() < 0.1 ? "flint" : "gravel");
      return out;
    case B.WHEAT: // chín: lúa + 1–3 hạt; chưa chín: 1 hạt
      if (ripe) {
        give("wheat");
        give("seeds", between(CROP_DROPS.SEEDS));
      } else give("seeds");
      return out;
    case B.CARROTS: // chín: 2–5 củ; chưa chín: 1 củ
    case B.POTATOES:
      give(id === B.CARROTS ? "carrot" : "potato", ripe ? between(CROP_DROPS.ROOTS) : 1);
      return out;
    case B.BEETROOTS: // chín: 1 củ cải + 1–4 hạt; chưa chín: 1 hạt
      if (ripe) {
        give("beetroot");
        give("beetroot_seeds", between(CROP_DROPS.BEETROOT_SEEDS));
      } else give("beetroot_seeds");
      return out;
    case B.MELON:
      give("melon_slice", between(CROP_DROPS.MELON_SLICES));
      return out;
  }
  for (const drop of d.drops) if (drop.chance >= 1 || rng() < drop.chance) give(drop.item);
  return out;
}

/** Độ bền công cụ mất khi phá một block (MECHANICS.md 4): 0 với block phá ngay, kiếm mất 2. */
export function toolWear(id: number, tool: HeldTool | null): number {
  if (!tool || (BLOCKS[id]?.hardness ?? 0) === 0) return 0;
  return tool.kind === "sword" ? 2 : 1;
}
