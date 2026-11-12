// Vật phẩm rơi ra khi phá block (cột "Rơi ra" DESIGN.md 2.2): theo tỉ lệ, chỉ khi đủ cấp
// công cụ (block mất chỗ bám thì luôn rơi). Một số block có luật riêng.
import { B, BLOCKS } from "./blocks.js";
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
  switch (id) {
    case B.GRAVEL: // 10% đá lửa thay cho sỏi
      give(rng() < 0.1 ? "flint" : "gravel");
      return out;
    case B.WHEAT: // chín: lúa + 1–3 hạt; chưa chín: 1 hạt
      if ((meta & 7) === 7) {
        give("wheat");
        give("seeds", 1 + Math.floor(rng() * 3));
      } else give("seeds");
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
