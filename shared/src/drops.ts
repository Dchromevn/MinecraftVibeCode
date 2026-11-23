// Vật phẩm rơi ra khi phá block (cột "Rơi ra" DESIGN.md 2.2): theo tỉ lệ, chỉ khi đủ cấp
// công cụ (block mất chỗ bám thì luôn rơi). Một số block có luật riêng.
import { B, BLOCKS } from "./blocks.js";
import { cropMax } from "./crops.js";
import { CROP_DROPS, LAPIS } from "./tickConstants.js";
import { SNOWBALL } from "./fortressConstants.js";
import { itemDef } from "./items.js";
import { SLAB_DOUBLE, isSlab } from "./building.js";
import { bedColor, withColor } from "./colors.js";
import { shearsTakes } from "./digging.js";
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
  // (8b2) Cảm ứng tơ: rơi ra chính khối (quặng, cỏ, kính, băng, giá sách...) nếu khối đó có vật phẩm
  if (!forced && tool?.ench?.silk_touch && !NO_SILK.has(id) && itemDef(d.key)?.places === id) {
    give(d.key);
    return out;
  }
  if (id === B.ORE_LAPIS || id === B.ORE_LAPIS_DEEP) { // (8b2) 4–9 viên lưu ly
    give("lapis_lazuli", between(LAPIS.DROPS) * fortuneMul(tool, rng));
    return out;
  }
  if (d.colorItem) { // len, thảm, giường: rơi đúng màu
    give(withColor(d.colorItem, id === B.BED ? bedColor(meta) : meta & 15));
    return out;
  }
  if (tool?.kind === "shears" && shearsTakes(id)) { // kéo: lá, mạng nhện, cỏ cao rơi ra chính nó
    give(d.key);
    return out;
  }
  if (isSlab(id) && (meta & 3) === SLAB_DOUBLE) { // tấm đôi rơi ra 2 tấm
    give(d.key, 2);
    return out;
  }
  switch (id) {
    case B.GILDED_BLACKSTONE: // (10d2) 10% (May mắn: cao hơn) 2–5 mảnh vàng, còn lại chính nó
      if (rng() < [0.1, 0.143, 0.25, 1][Math.min(3, tool?.ench?.fortune ?? 0)]!) give("gold_nugget", 2 + Math.floor(rng() * 4));
      else give("gilded_blackstone");
      return out;
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
    case B.SNOW_LAYER: // (10c) đào bằng xẻng: lớp tuyết ra 1 bóng tuyết, khối tuyết ra 4 (tay không: không rơi gì)
    case B.SNOW_BLOCK:
      if (tool?.kind === "shovel") give("snowball", id === B.SNOW_LAYER ? SNOWBALL.PER_LAYER : SNOWBALL.PER_BLOCK);
      return out;
    case B.NETHER_WART: // (10b) chín (tuổi 3): 2–4 (May mắn thêm), chưa chín: 1
      give("nether_wart", (meta & 3) >= 3 ? between([2, 4]) + (tool?.ench?.fortune ? Math.floor(rng() * (tool.ench.fortune + 1)) : 0) : 1);
      return out;
    case B.GLOWSTONE: // (10a) 2–4 bụi, May mắn thêm nhưng tối đa 4
    case B.NETHER_GOLD_ORE: { // 2–6 mảnh vàng, May mắn nhân lên
      const n = id === B.GLOWSTONE ? Math.min(4, between([2, 4]) + (tool?.ench?.fortune ? Math.floor(rng() * (tool.ench.fortune + 1)) : 0))
        : between([2, 6]) * fortuneMul(tool, rng);
      give(id === B.GLOWSTONE ? "glowstone_dust" : "gold_nugget", n);
      return out;
    }
  }
  const mul = FORTUNE_ORES.has(id) ? fortuneMul(tool, rng) : 1; // (8b2) May mắn: quặng than / kim cương / ngọc lục bảo rơi nhiều hơn
  for (const drop of d.drops) if (drop.chance >= 1 || rng() < drop.chance) give(drop.item, mul);
  return out;
}

/** (8b2) May mắn cấp L: số lượng × (max(0, ngẫu nhiên 0..L+1 − 1) + 1). */
function fortuneMul(tool: HeldTool | null, rng: Rng): number {
  const l = tool?.ench?.fortune ?? 0;
  return l > 0 ? Math.max(0, Math.floor(rng() * (l + 2)) - 1) + 1 : 1;
}
const FORTUNE_ORES = new Set<number>([B.ORE_COAL, B.ORE_DIAMOND, B.ORE_EMERALD, B.NETHER_QUARTZ_ORE]); // (10a) thạch anh
const NO_SILK = new Set<number>([B.WHEAT, B.CARROTS, B.POTATOES, B.BEETROOTS, B.MELON_STEM, B.PUMPKIN_STEM, B.BED, B.FIRE, B.SOUL_FIRE, B.NETHER_WART]);

/** Độ bền công cụ mất khi phá một block (MECHANICS.md 4): 0 với block phá ngay, kiếm mất 2. */
export function toolWear(id: number, tool: HeldTool | null): number {
  if (!tool || (BLOCKS[id]?.hardness ?? 0) === 0) return 0;
  return tool.kind === "sword" ? 2 : 1;
}
