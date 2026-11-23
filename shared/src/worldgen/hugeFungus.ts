// Nấm khổng lồ Vực Lửa (Giai đoạn 10b; theo Minecraft HugeFungusFeature): thân cao 4–13 (1/12 gấp đôi), 6% thân 3 × 3 (chỉ khi sinh
// thế giới); mũ cao min(ngẫu nhiên 0..thân/3 + 5, thân) quanh đỉnh: vành bán kính 2 (tầng trên cùng 1, mũ cao > 8 thì 4 tầng dưới bán
// kính 3), góc vành thưa, trong mũ thỉnh thoảng có khối mụn / đèn nấm; nấm đỏ thẫm rủ dây leo dưới vành. Danh sách ô chỉ phụ thuộc
// rng (không đọc thế giới) để hai chunk cùng tính ra một cây; chỗ đặt (chỉ vào ô trống) do bên gọi quyết định.
import { B, type BlockId } from "../blocks.js";
import { NETHER_FEATURES } from "../netherBiomeConstants.js";
import { randInt, type Rng } from "../rng.js";

export type FungusKind = "crimson" | "warped";
/** Một ô của cây: lệch so với gốc (ô trên nylium), id block, ghi đè lên cây nhỏ hay chỉ vào ô trống. */
export type FungusCell = [number, number, number, BlockId];

/** Chiều cao thân (chưa giới hạn trần). */
export function fungusStem(rng: Rng): number {
  const F = NETHER_FEATURES.FUNGUS;
  let h = randInt(rng, F.STEM[0], F.STEM[1]);
  if (rng() < F.DOUBLE_CHANCE) h *= 2;
  return h;
}

/**
 * Các ô của nấm khổng lồ thân cao h (đã giới hạn theo trần). thick: thân 3 × 3 (góc thân có 10% thiếu).
 * Thứ tự: thân trước (đè được cây nhỏ), rồi mũ, dây leo.
 */
export function fungusCells(kind: FungusKind, h: number, thick: boolean, rng: Rng): FungusCell[] {
  const F = NETHER_FEATURES.FUNGUS, out: FungusCell[] = [];
  const stem = kind === "crimson" ? B.CRIMSON_STEM : B.WARPED_STEM, wart = kind === "crimson" ? B.NETHER_WART_BLOCK : B.WARPED_WART_BLOCK;
  const hatH = Math.min(randInt(rng, 0, Math.floor(h / 3)) + 5, h), bottom = h - hatH;
  const sr = thick ? 1 : 0;
  for (let y = 0; y < h; y++)
    for (let dx = -sr; dx <= sr; dx++)
      for (let dz = -sr; dz <= sr; dz++) {
        const corner = dx !== 0 && dz !== 0;
        if (corner && rng() < 0.1) continue;
        out.push([dx, y, dz, stem]);
      }
  for (let y = bottom; y <= h; y++) {
    let r = y < h - randInt(rng, 0, 2) ? 2 : 1;
    if (hatH > 8 && y < bottom + 4) r = 3;
    if (thick) r++;
    const top = y === h;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        const ex = Math.abs(dx) === r, ez = Math.abs(dz) === r, corner = ex && ez, edge = ex || ez;
        const roll = rng(), roll2 = rng();
        if (top) {
          if (!corner || roll < 0.1) out.push([dx, y, dz, roll2 < F.SHROOM * 0.5 ? B.SHROOMLIGHT : wart]);
        } else if (edge && !corner) {
          out.push([dx, y, dz, wart]);
          if (kind === "crimson" && y === bottom && roll < F.VINE) // dây leo rủ dưới vành
            for (let k = 1, n = randInt(rng, 1, 3); k <= n; k++) out.push([dx, y - k, dz, B.WEEPING_VINES]);
        } else if (corner) {
          if (roll < 0.1) out.push([dx, y, dz, wart]);
        } else if (Math.abs(dx) > sr || Math.abs(dz) > sr) {
          if (roll < F.WART_INNER) out.push([dx, y, dz, wart]);
          else if (roll2 < F.SHROOM) out.push([dx, y, dz, B.SHROOMLIGHT]);
        }
      }
  }
  return out;
}

/** Nylium hợp với loài nấm (bột xương chỉ có tác dụng trên đúng loại). */
export const fungusSoil = (kind: FungusKind): BlockId => (kind === "crimson" ? B.CRIMSON_NYLIUM : B.WARPED_NYLIUM);
export const fungusKindOf = (id: number): FungusKind | null => (id === B.CRIMSON_FUNGUS ? "crimson" : id === B.WARPED_FUNGUS ? "warped" : null);
/** Ô được nấm mọc đè lên: trống, cây nhỏ Vực Lửa, chính cây nấm non. */
export const fungusReplaces = (id: number): boolean =>
  id === B.AIR || id === B.CRIMSON_ROOTS || id === B.WARPED_ROOTS || id === B.NETHER_SPROUTS || id === B.CRIMSON_FUNGUS ||
  id === B.WARPED_FUNGUS || id === B.WEEPING_VINES || id === B.TWISTING_VINES;
