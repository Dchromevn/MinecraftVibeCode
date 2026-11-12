// Hành vi random tick (DESIGN.md "Random tick và trồng trọt"; MECHANICS.md 1, 9): cây trồng lớn /
// bật ra (crops.ts), đất cày ẩm-khô-thành đất, cây non lớn thành cây, lá xa thân gỗ rụng, cỏ lan / chết.
import { B } from "./blocks.js";
import { CROPS, WORLD } from "./constants.js";
import { farmlandWet, leavesPersistent } from "./blockMeta.js";
import { isFullSolid } from "./blockRules.js";
import { growPlant, isFarmPlant, stemDetach } from "./crops.js";
import { randInt, type Rng } from "./rng.js";
import { treeCanopy } from "./worldgen/trees.js";

export interface TickWorld {
  /** id | dữ liệu phụ << 8; âm = chunk chưa tải. */
  getCell(x: number, y: number, z: number): number;
  setCell(x: number, y: number, z: number, id: number, meta: number): void;
  /** Ánh sáng 0..15 tại ô (max trời, block); âm = chưa biết. */
  light(x: number, y: number, z: number): number;
  /** Block bật ra / rụng (tạo vật phẩm rơi như block mất chỗ bám). */
  drop(id: number, meta: number, x: number, y: number, z: number): void;
}

const idOf = (w: TickWorld, x: number, y: number, z: number): number => {
  const c = w.getCell(x, y, z);
  return c < 0 ? -1 : c & 255;
};

/** Cây trồng / thân: tối quá thì bật ra, đủ sáng thì lớn. */
function plant(w: TickWorld, id: number, x: number, y: number, z: number, meta: number, rng: Rng): void {
  const light = w.light(x, y, z);
  if (light < 0) return;
  if (light < CROPS.POP_LIGHT) {
    w.setCell(x, y, z, B.AIR, 0);
    w.drop(id, meta, x, y, z);
    return;
  }
  const fixed = stemDetach(id, meta, x, y, z, (a, b, c) => idOf(w, a, b, c));
  if (fixed !== null) return w.setCell(x, y, z, id, fixed);
  if (light >= CROPS.GROW_LIGHT) growPlant(w, id, meta, x, y, z, rng);
}

function farmland(w: TickWorld, x: number, y: number, z: number, meta: number): void {
  const r = CROPS.FARMLAND_WATER_RADIUS;
  let wet = false;
  for (let dy = 0; dy <= 1 && !wet; dy++)
    for (let dz = -r; dz <= r && !wet; dz++)
      for (let dx = -r; dx <= r && !wet; dx++) if (idOf(w, x + dx, y + dy, z + dz) === B.WATER) wet = true;
  if (wet !== farmlandWet(meta)) return w.setCell(x, y, z, B.FARMLAND, wet ? 1 : 0);
  if (!wet && !isFarmPlant(idOf(w, x, y + 1, z))) w.setCell(x, y, z, B.DIRT, 0);
}

/** Mọc cây tại gốc (x, y, z) nếu đủ chỗ; trả về true nếu mọc. */
export function growTree(w: TickWorld, x: number, y: number, z: number, rng: Rng): boolean {
  const trunk = randInt(rng, WORLD.TREE_TRUNK_MIN, WORLD.TREE_TRUNK_MAX);
  if (y + trunk + 2 >= WORLD.CHUNK_HEIGHT) return false;
  for (let dy = 1; dy <= trunk; dy++) {
    const id = idOf(w, x, y + dy, z);
    if (id !== B.AIR && id !== B.LEAVES && id !== B.TALLGRASS) return false;
  }
  if (idOf(w, x, y - 1, z) === B.GRASS) w.setCell(x, y - 1, z, B.DIRT, 0);
  treeCanopy(x, z, y + trunk - 1, rng, (lx, ly, lz) => {
    const id = idOf(w, lx, ly, lz);
    if (id === B.AIR || id === B.TALLGRASS || id === B.SNOW_LAYER) w.setCell(lx, ly, lz, B.LEAVES, 0);
  });
  for (let dy = 0; dy < trunk; dy++) w.setCell(x, y + dy, z, B.LOG, 0);
  return true;
}

/** Lá còn nối với thân gỗ qua các lá liền nhau trong CROPS.LEAVES_RANGE bước không. */
function leavesConnected(w: TickWorld, x: number, y: number, z: number): boolean {
  const seen = new Set<string>([`${x},${y},${z}`]);
  let frontier: [number, number, number][] = [[x, y, z]];
  for (let step = 0; step < CROPS.LEAVES_RANGE && frontier.length; step++) {
    const next: [number, number, number][] = [];
    for (const [px, py, pz] of frontier)
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = px + dx!, ny = py + dy!, nz = pz + dz!;
        const k = `${nx},${ny},${nz}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const id = idOf(w, nx, ny, nz);
        if (id === B.LOG || id < 0) return true; // chưa tải coi như còn nối
        if (id === B.LEAVES) next.push([nx, ny, nz]);
      }
    frontier = next;
  }
  return false;
}

function grass(w: TickWorld, x: number, y: number, z: number, rng: Rng): void {
  const above = idOf(w, x, y + 1, z);
  if (above < 0) return;
  if (isFullSolid(above)) return w.setCell(x, y, z, B.DIRT, 0);
  if (w.light(x, y + 1, z) < CROPS.GRASS_SPREAD_LIGHT) return;
  for (let t = 0; t < CROPS.GRASS_SPREAD_TRIES; t++) {
    const tx = x + randInt(rng, -1, 1), ty = y + randInt(rng, -3, 1), tz = z + randInt(rng, -1, 1);
    if (idOf(w, tx, ty, tz) !== B.DIRT) continue;
    const up = idOf(w, tx, ty + 1, tz);
    if (up < 0 || isFullSolid(up) || up === B.WATER || up === B.LAVA) continue;
    if (w.light(tx, ty + 1, tz) >= CROPS.GRASS_TARGET_LIGHT) w.setCell(tx, ty, tz, B.GRASS, 0);
  }
}

/** Random tick một ô. */
export function randomTick(w: TickWorld, x: number, y: number, z: number, rng: Rng): void {
  const c = w.getCell(x, y, z);
  if (c <= 0) return;
  const id = c & 255, meta = c >> 8;
  switch (id) {
    case B.WHEAT:
    case B.CARROTS:
    case B.POTATOES:
    case B.BEETROOTS:
    case B.MELON_STEM:
    case B.PUMPKIN_STEM:
      return plant(w, id, x, y, z, meta, rng);
    case B.FARMLAND:
      return farmland(w, x, y, z, meta);
    case B.SAPLING: {
      if (w.light(x, y, z) < CROPS.GROW_LIGHT || rng() >= CROPS.SAPLING_STAGE_CHANCE) return;
      if ((meta & 1) + 1 < CROPS.SAPLING_STAGES) return w.setCell(x, y, z, B.SAPLING, 1);
      growTree(w, x, y, z, rng);
      return;
    }
    case B.LEAVES:
      if (leavesPersistent(meta) || leavesConnected(w, x, y, z)) return;
      w.setCell(x, y, z, B.AIR, 0);
      w.drop(B.LEAVES, meta, x, y, z);
      return;
    case B.GRASS:
      return grass(w, x, y, z, rng);
  }
}
