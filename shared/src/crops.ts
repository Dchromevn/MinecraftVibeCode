// Cây trồng trên đất cày (DESIGN.md "Random tick và trồng trọt"; MECHANICS.md 9): lúa, cà rốt,
// khoai tây, củ cải đường lớn theo giai đoạn; thân dưa / bí lớn tới tuổi 7 rồi mọc quả ra ô bên cạnh.
import { B } from "./blocks.js";
import { HDX, HDZ, farmlandWet } from "./blockMeta.js";
import { CROPS } from "./tickConstants.js";
import type { Rng } from "./rng.js";

/** Cây dạng # : giai đoạn cuối (chín). */
const CROP_MAX = new Map<number, number>([[B.WHEAT, 7], [B.CARROTS, 7], [B.POTATOES, 7], [B.BEETROOTS, 3]]);
/** Thân → quả. */
const STEM_FRUIT = new Map<number, number>([[B.MELON_STEM, B.MELON], [B.PUMPKIN_STEM, B.PUMPKIN]]);

export const STEM_RIPE = 7; // tuổi lớn hết của thân
const ATTACHED = 8; // dữ liệu phụ 8..11 = đã ra quả, quả ở hướng (giá trị − 8)

export const cropMax = (id: number): number => CROP_MAX.get(id) ?? -1;
export const isCrop = (id: number): boolean => CROP_MAX.has(id);
export const isStem = (id: number): boolean => STEM_FRUIT.has(id);
export const stemFruit = (id: number): number => STEM_FRUIT.get(id) ?? -1;
/** Cây cần đất cày bên dưới (đất cày có cây thì không khô thành đất). */
export const isFarmPlant = (id: number): boolean => isCrop(id) || isStem(id);
/** Hướng quả của thân đã ra quả, hoặc null. */
export const stemAttachedDir = (meta: number): number | null => (meta >= ATTACHED ? (meta - ATTACHED) & 3 : null);

export interface PlantWorld {
  getCell(x: number, y: number, z: number): number;
  setCell(x: number, y: number, z: number, id: number, meta: number): void;
}

const idOf = (w: PlantWorld, x: number, y: number, z: number): number => {
  const c = w.getCell(x, y, z);
  return c < 0 ? -1 : c & 255;
};

/** Xác suất lớn thêm một nấc (công thức điểm của lúa, MECHANICS.md 9). */
function growChance(w: PlantWorld, id: number, x: number, y: number, z: number): number {
  const fl = (dx: number, dz: number): number => {
    const c = w.getCell(x + dx, y - 1, z + dz);
    if (c < 0 || (c & 255) !== B.FARMLAND) return 0;
    return farmlandWet(c >> 8) ? 1 : 0.5; // 1 = ẩm, 0.5 = khô
  };
  const under = fl(0, 0);
  let points = CROPS.BASE_POINTS + (under === 1 ? CROPS.FARMLAND_WET : under ? CROPS.FARMLAND_DRY : 0);
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const f = fl(dx, dz);
      points += f === 1 ? CROPS.NEIGHBOR_WET : f ? CROPS.NEIGHBOR_DRY : 0;
    }
  const same = (dx: number, dz: number): boolean => idOf(w, x + dx, y, z + dz) === id;
  const diag = same(1, 1) || same(1, -1) || same(-1, 1) || same(-1, -1);
  const rows = (same(1, 0) || same(-1, 0)) && (same(0, 1) || same(0, -1));
  if (diag || rows) points /= 2;
  return 1 / (Math.floor(CROPS.POINTS_DIVIDEND / points) + 1);
}

/** Ô có thể mọc quả: trống, bên dưới là đất / cỏ / đất cày. */
function fruitSpot(w: PlantWorld, x: number, y: number, z: number): boolean {
  const below = idOf(w, x, y - 1, z);
  return idOf(w, x, y, z) === B.AIR && (below === B.DIRT || below === B.GRASS || below === B.FARMLAND);
}

/**
 * Random tick của cây trồng / thân (đã kiểm ánh sáng đủ lớn). Thân ở tuổi 7 thử mọc quả ra một
 * ô ngang ngẫu nhiên; mọc được thì thân chuyển sang "đã ra quả" hướng về quả.
 */
export function growPlant(w: PlantWorld, id: number, meta: number, x: number, y: number, z: number, rng: Rng): void {
  if (isCrop(id)) {
    const stage = meta & 7;
    if (stage < cropMax(id) && rng() < growChance(w, id, x, y, z)) w.setCell(x, y, z, id, stage + 1);
    return;
  }
  if (stemAttachedDir(meta) !== null || rng() >= growChance(w, id, x, y, z)) return;
  if (meta < STEM_RIPE) return w.setCell(x, y, z, id, meta + 1);
  const d = Math.floor(rng() * 4);
  const fx = x + HDX[d]!, fz = z + HDZ[d]!;
  if (!fruitSpot(w, fx, y, fz)) return;
  w.setCell(fx, y, fz, stemFruit(id), 0);
  w.setCell(x, y, z, id, ATTACHED + d);
}

/**
 * Thân đã ra quả nhưng quả không còn (bị phá, bị thay): trả về dữ liệu phụ mới (tuổi 7),
 * hoặc null nếu không cần đổi.
 */
export function stemDetach(id: number, meta: number, x: number, y: number, z: number, idAt: (x: number, y: number, z: number) => number): number | null {
  const d = isStem(id) ? stemAttachedDir(meta) : null;
  if (d === null) return null;
  return idAt(x + HDX[d]!, y, z + HDZ[d]!) === stemFruit(id) ? null : STEM_RIPE;
}
