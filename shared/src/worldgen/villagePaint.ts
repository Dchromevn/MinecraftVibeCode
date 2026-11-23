// Vẽ làng vào chunk (Giai đoạn 8a): đường bám mặt đất từng cột (qua nước thì lát ván), bộ biến đổi ô của Minecraft (rêu đá cuội,
// ruộng trồng xen cà rốt / khoai tây..., đường lẫn cỏ), cây và đống trang trí (rơm, dưa, bí ngô, tuyết, băng, xương rồng, hoa).
// Mọi phép ngẫu nhiên lấy theo seed + vị trí ô nên chunk nào vẽ cũng ra cùng kết quả.
import { B } from "../blocks.js";
import { BLOCKS } from "../blockTable.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { hashInts, mulberry32 } from "../rng.js";
import { VILLAGE } from "../villageConstants.js";
import { wood } from "../woods.js";
import { rotateCell, worldOf, type Piece } from "./structPaint.js";
import type { TerrainSampler } from "./terrainSampler.js";
import { planTree, trunkLength } from "./treeShapes.js";
import type { VillageFeat, VillagePlan } from "./villagePlan.js";

type Rule = [from: number, chance: number, to: number];
/** Ruộng: lúa → loại cây khác (theo thứ tự, mỗi luật tung riêng). */
const FARM: Record<string, Rule[]> = {
  farm_plains: [[B.WHEAT, 0.3, B.CARROTS], [B.WHEAT, 0.2, B.POTATOES], [B.WHEAT, 0.1, B.BEETROOTS]],
  farm_taiga: [[B.WHEAT, 0.3, B.PUMPKIN_STEM], [B.WHEAT, 0.2, B.POTATOES]],
  farm_desert: [[B.WHEAT, 0.2, B.BEETROOTS], [B.WHEAT, 0.1, B.MELON_STEM]],
  farm_savanna: [[B.WHEAT, 0.1, B.MELON_STEM]],
  farm_snowy: [[B.WHEAT, 0.1, B.CARROTS], [B.WHEAT, 0.8, B.POTATOES]],
};
/** Đường qua nước: ván theo loại làng. */
const BRIDGE: Record<string, number> = { street_plains: B.PLANKS, street_savanna: B.ACACIA_PLANKS, street_snowy_or_taiga: B.SPRUCE_PLANKS };

const rnd = (seed: number, x: number, y: number, z: number, salt: number): number => mulberry32(hashInts(seed, x, y, z, salt))();

/** Bộ biến đổi ô cho mảnh cứng (nhà, quảng trường). */
export function villageProc(name: string | undefined, seed: number): Piece["proc"] {
  if (!name) return undefined;
  const moss = VILLAGE.MOSSY[name], farm = FARM[name];
  if (moss) return (cell, x, y, z) => ((cell & 255) === B.COBBLE && rnd(seed, x, y, z, 8801) < moss ? B.MOSSY_COBBLE : cell);
  if (farm)
    return (cell, x, y, z) => {
      if ((cell & 255) !== B.WHEAT) return cell;
      for (let i = 0; i < farm.length; i++) if (rnd(seed, x, y, z, 8810 + i) < farm[i]![1]) return farm[i]![2] | (cell & ~255);
      return cell;
    };
  return undefined;
}

const plant = (id: number): boolean => id === B.TALLGRASS || id === B.SNOW_LAYER || BLOCKS[id]?.render === "cross";

/** Vẽ phần của mảnh bám mặt đất (đường) nằm trong chunk: ô (x, y, z) của mẫu → (x', mặt đất + y, z'). */
export function paintTerrainPiece(s: TerrainSampler, p: Piece, data: Uint8Array, meta: Uint8Array, cx: number, cz: number): void {
  const X0 = cx * 16, Z0 = cz * 16, c = p.t.cells, pal = p.t.pal, bridge = BRIDGE[p.t.proc ?? ""] ?? B.PLANKS;
  const street = !!p.t.proc?.startsWith("street_");
  for (let i = 0; i < c.length; i += 4) {
    let cell = pal[c[i + 3]!]!;
    if (cell === 0) continue;
    const [wx, , wz] = worldOf(p, c[i]!, 0, c[i + 2]!);
    const lx = wx - X0, lz = wz - Z0;
    if (lx < 0 || lz < 0 || lx > 15 || lz > 15) continue;
    const col = s.column(wx, wz), id = cell & 255;
    let wy = col.height + c[i + 1]!;
    if (col.waterTop > col.height) { // nước: đường thành cầu ván, cỏ / đất bỏ
      if (id !== B.DIRT_PATH) continue;
      cell = bridge;
      wy = col.waterTop;
    } else if (street && id === B.DIRT_PATH && rnd(s.seed, wx, wy, wz, 8820) < VILLAGE.STREET_GRASS) cell = B.GRASS;
    if (wy < 1 || wy >= CHUNK_HEIGHT - 1) continue;
    cell = rotateCell(cell, p.rot);
    const k = blockIndex(lx, wy, lz);
    data[k] = cell & 255;
    meta[k] = cell >> 8;
    const up = blockIndex(lx, wy + 1, lz); // cỏ / hoa / tuyết mỏng trên mặt đường
    if (c[i + 1] === 0 && plant(data[up]!)) data[up] = meta[up] = 0;
  }
}

/** Cây và đống trang trí của làng phần nằm trong chunk (chỉ ghi vào ô trống / cây cỏ). */
export function paintVillageDecor(s: TerrainSampler, v: VillagePlan, data: Uint8Array, meta: Uint8Array, cx: number, cz: number): void {
  const X0 = cx * 16, Z0 = cz * 16;
  const put = (x: number, y: number, z: number, cell: number, force = false): void => {
    if (x < X0 || z < Z0 || x >= X0 + 16 || z >= Z0 + 16 || y < 1 || y >= CHUNK_HEIGHT) return;
    const k = blockIndex(x - X0, y, z - Z0);
    if (!force && data[k] !== B.AIR && !plant(data[k]!)) return;
    data[k] = cell & 255;
    meta[k] = cell >> 8;
  };
  for (const t of v.trees) {
    if (t.x < X0 - 4 || t.x > X0 + 19 || t.z < Z0 - 4 || t.z > Z0 + 19) continue;
    const rng = mulberry32(hashInts(s.seed, t.x, t.y, t.z, 7702));
    const plan = planTree(t.kind, t.x, t.y, t.z, trunkLength(t.kind, rng()), rng), w = wood(t.kind);
    for (const [x, y, z] of plan.logs) put(x, y, z, w.log);
    for (const [x, y, z] of plan.leaves) put(x, y, z, w.leaves);
  }
  for (const f of v.feats) if (f.x >= X0 - 4 && f.x <= X0 + 19 && f.z >= Z0 - 4 && f.z <= Z0 + 19) feature(s, f, put);
}

/** Đống / bụi trang trí của làng (feature trong client.jar → bản đơn giản). */
function feature(s: TerrainSampler, f: VillageFeat, put: (x: number, y: number, z: number, cell: number) => void): void {
  const rng = mulberry32(hashInts(s.seed, f.x, f.y, f.z, 8830));
  const ground = (x: number, z: number): number => s.column(x, z).height + 1;
  const pile = (block: number): void => { // đống 2–3 block bán kính, cao 1–2 ở giữa
    const r = 1 + Math.floor(rng() * 2);
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > r + 0.3 || rng() < 0.25) continue;
        const h = d < 1 && rng() < 0.6 ? 2 : 1, x = f.x + dx, z = f.z + dz, y = ground(x, z);
        for (let i = 0; i < h; i++) put(x, y + i, z, block);
      }
  };
  const scatter = (blocks: readonly number[], n: number, r: number): void => {
    for (let i = 0; i < n; i++) {
      const x = f.x + Math.round((rng() * 2 - 1) * r), z = f.z + Math.round((rng() * 2 - 1) * r);
      put(x, ground(x, z), z, blocks[Math.floor(rng() * blocks.length)]!);
    }
  };
  switch (f.name) {
    case "pile_hay": return pile(B.HAY_BLOCK);
    case "pile_melon": return pile(B.MELON);
    case "pile_pumpkin": return pile(B.PUMPKIN);
    case "pile_snow": return pile(B.SNOW_BLOCK);
    case "pile_ice": return pile(B.ICE);
    case "flower_plain": return scatter([B.DANDELION, B.POPPY, B.CORNFLOWER, B.LILY_OF_THE_VALLEY], 8, 3);
    case "patch_taiga_grass": case "patch_berry_bush": return scatter([B.TALLGRASS], 10, 3);
    case "patch_cactus": {
      const n = 1 + Math.floor(rng() * 3), y = ground(f.x, f.z);
      for (let i = 0; i < n; i++) put(f.x, y + i, f.z, B.CACTUS);
      return;
    }
    default: return;
  }
}
