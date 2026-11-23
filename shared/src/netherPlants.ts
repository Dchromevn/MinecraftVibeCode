// Cây cỏ Vực Lửa (Giai đoạn 10b; Minecraft Java): mụn cóc Vực Lửa lớn chậm (mỗi random tick 1/10 lên một tuổi, tối đa 3, không cần
// ánh sáng, không bón được); nylium bị khối đặc che thì thành đá lửa ngục; lửa linh hồn không còn cát / đất linh hồn thì tắt. Bột
// xương: nấm trên đúng loại nylium 40% thành nấm khổng lồ; lên nylium mọc cỏ Vực Lửa quanh đó; lên dây leo thì dài thêm 1–3.
import { B } from "./blocks.js";
import { isFullSolid } from "./blockRules.js";
import { NETHER_FEATURES } from "./netherBiomeConstants.js";
import type { TickWorld } from "./randomTick.js";
import { randInt, type Rng } from "./rng.js";
import { fungusCells, fungusKindOf, fungusReplaces, fungusSoil, fungusStem } from "./worldgen/hugeFungus.js";

const NETHER_WART_MAX = 3;
const WART_GROW_CHANCE = 0.1;
const NYLIUM_PATCH = { R: 3, TRIES: 24 };
const VINE_GROW = [1, 3] as const;

const idOf = (w: TickWorld, x: number, y: number, z: number): number => {
  const c = w.getCell(x, y, z);
  return c < 0 ? -1 : c & 255;
};

/** Random tick block Vực Lửa; false nếu không phải loại này. */
export function netherRandomTick(w: TickWorld, id: number, meta: number, x: number, y: number, z: number, rng: Rng): boolean {
  switch (id) {
    case B.NETHER_WART:
      if ((meta & 3) < NETHER_WART_MAX && rng() < WART_GROW_CHANCE) w.setCell(x, y, z, id, (meta & 3) + 1);
      return true;
    case B.CRIMSON_NYLIUM: case B.WARPED_NYLIUM:
      if (isFullSolid(Math.max(0, idOf(w, x, y + 1, z)))) w.setCell(x, y, z, B.NETHERRACK, 0);
      return true;
    case B.SOUL_FIRE: {
      const below = idOf(w, x, y - 1, z);
      if (below >= 0 && below !== B.SOUL_SAND && below !== B.SOUL_SOIL) w.setCell(x, y, z, B.AIR, 0);
      return true;
    }
    default:
      return false;
  }
}

/** Cây nhỏ mọc trên nylium loại soil (bốc thăm theo trọng số của rừng đỏ thẫm / cong vênh). */
export function nyliumPlant(soil: number, rng: Rng): number {
  const F = NETHER_FEATURES;
  if (soil === B.WARPED_NYLIUM && rng() < F.VEGETATION.SPROUTS) return B.NETHER_SPROUTS;
  const table = soil === B.CRIMSON_NYLIUM ? F.CRIMSON_PLANTS : F.WARPED_PLANTS;
  let r = rng() * Object.values(table).reduce((s, v) => s + v, 0);
  for (const [k, v] of Object.entries(table)) if ((r -= v) < 0) return PLANT_IDS[k]!;
  return B.CRIMSON_ROOTS;
}
const PLANT_IDS: Readonly<Record<string, number>> = {
  crimson_roots: B.CRIMSON_ROOTS, warped_roots: B.WARPED_ROOTS, crimson_fungus: B.CRIMSON_FUNGUS, warped_fungus: B.WARPED_FUNGUS,
};

/** Bột xương lên ô (x, y, z) Vực Lửa; null nếu không phải loại này, true / false = có tác dụng hay không. */
export function netherBoneMeal(w: TickWorld, x: number, y: number, z: number, rng: Rng): boolean | null {
  const id = idOf(w, x, y, z);
  const kind = fungusKindOf(id);
  if (kind) {
    if (idOf(w, x, y - 1, z) !== fungusSoil(kind)) return false;
    if (rng() < NETHER_FEATURES.FUNGUS.BONE_MEAL_CHANCE) growFungus(w, x, y, z, kind, rng);
    return true;
  }
  if (id === B.CRIMSON_NYLIUM || id === B.WARPED_NYLIUM) {
    if (idOf(w, x, y + 1, z) !== B.AIR) return false;
    for (let t = 0; t < NYLIUM_PATCH.TRIES; t++) {
      const px = x + randInt(rng, -NYLIUM_PATCH.R, NYLIUM_PATCH.R), pz = z + randInt(rng, -NYLIUM_PATCH.R, NYLIUM_PATCH.R);
      for (let py = y + 1; py >= y - 1; py--) {
        const soil = idOf(w, px, py, pz);
        if ((soil === B.CRIMSON_NYLIUM || soil === B.WARPED_NYLIUM) && idOf(w, px, py + 1, pz) === B.AIR) {
          w.setCell(px, py + 1, pz, nyliumPlant(soil, rng), 0);
          break;
        }
      }
    }
    return true;
  }
  if (id === B.WEEPING_VINES || id === B.TWISTING_VINES) { // dài thêm từ ngọn
    const dy = id === B.WEEPING_VINES ? -1 : 1;
    let ty = y;
    while (idOf(w, x, ty + dy, z) === id) ty += dy;
    let grew = false;
    for (let k = 0, n = randInt(rng, VINE_GROW[0], VINE_GROW[1]); k < n; k++) {
      ty += dy;
      if (ty < 1 || ty > 126 || idOf(w, x, ty, z) !== B.AIR) break;
      w.setCell(x, ty, z, id, 0);
      grew = true;
    }
    return grew;
  }
  return null;
}

/** Nấm non thành nấm khổng lồ (thân 1 × 1, giới hạn theo trần); chỉ đặt vào ô trống / cây nhỏ. */
function growFungus(w: TickWorld, x: number, y: number, z: number, kind: "crimson" | "warped", rng: Rng): void {
  let h = fungusStem(rng);
  let room = 0;
  while (room < h + 1 && y + room + 1 < 127 && fungusReplaces(Math.max(0, idOf(w, x, y + room + 1, z)))) room++;
  h = Math.min(h, room);
  if (h < NETHER_FEATURES.FUNGUS.STEM[0]) return;
  w.setCell(x, y, z, B.AIR, 0);
  for (const [dx, dy, dz, b] of fungusCells(kind, h, false, rng)) {
    const c = idOf(w, x + dx, y + dy, z + dz);
    if (c >= 0 && fungusReplaces(c) && y + dy > 0 && y + dy < 127) w.setCell(x + dx, y + dy, z + dz, b, 0);
  }
}
