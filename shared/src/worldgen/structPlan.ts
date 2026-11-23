// Chọn chỗ đặt công trình Giai đoạn 7e (như Minecraft "random_spread"): thế giới chia vùng SPACING × SPACING chunk, mỗi vùng thử
// một chunk ngẫu nhiên (theo seed + tọa độ vùng + SALT), đúng biome thì đặt. Kết quả lưu đệm theo vùng — chunk nào cũng tính ra
// cùng công trình nên vắt qua ranh giới chunk vẫn liền. Lều tuyết, cổng đổ nát, kim tự tháp ở đây; trại bỏ hoang: structCamp.ts.
import { B } from "../blocks.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { STRUCT } from "../structureConstants.js";
import { structureData, template } from "../structures.js";
import { planCamp } from "./structCamp.js";
import { oceanRuin, shipwreck } from "./structOcean.js";
import { desertPyramidTemplate, PYRAMID_FLOOR_Y } from "./desertPyramid.js";
import { mansion, type Box } from "./mansionPlan.js";
import { rotSize, type Piece } from "./structPaint.js";
import { BIOME, isSnowyPlains, type Column, type TerrainSampler } from "./terrainSampler.js";
import { TERRAIN } from "../constants.js";
import type { WoodKind } from "../woods.js";
import { TREE_MIX } from "../floraConstants.js";

export interface Placement {
  kind: "igloo" | "desert_pyramid" | "ruined_portal" | "camp" | "shipwreck" | "ocean_ruin" | "mansion";
  pieces: Piece[];
  trees: { kind: WoodKind; x: number; y: number; z: number }[];
  /** (8c) Hộp chiếm (công trình lớn hơn MARGIN: dinh thự). */
  box?: Box;
}

/** Khóa biome của cột (giống bảng động vật): đồng cỏ khô có keo, núi tuyết tách riêng. */
export function biomeKey(c: Column): string | null {
  switch (c.biome) {
    case BIOME.PLAINS: return c.temp > TREE_MIX.ACACIA_TEMP && c.humid < TREE_MIX.ACACIA_HUMID ? "plains_warm" : "plains";
    case BIOME.FOREST: case BIOME.DARK_FOREST: return "forest"; // (8c) rừng sồi tối dùng chung bảng rừng
    case BIOME.DESERT: return "desert";
    case BIOME.SNOWY: return "snowy";
    case BIOME.MOUNTAINS: return c.height >= TERRAIN.SNOW_LINE_Y ? "mountains_snow" : "mountains";
    case BIOME.SWAMP: return "swamp";
    case BIOME.OCEAN: return "ocean";
    default: return null;
  }
}

type Kind = Placement["kind"];
const MARGIN = 48; // công trình lớn nhất (trại + cây, cổng lớn) không vượt quá ngần này từ điểm gốc

/** Dựng công trình loại kind quanh (x, z), hoặc null nếu chỗ đó không hợp. */
function build(sampler: TerrainSampler, kind: Kind, rng: Rng, x: number, z: number): Placement | null {
  const col = sampler.column(x, z), biome = biomeKey(col);
  if (!biome) return null;
  if (kind === "igloo") return igloo(sampler, rng, x, z, col, biome);
  if (kind === "desert_pyramid") return pyramid(sampler, rng, x, z, col, biome);
  if (kind === "ruined_portal") return portal(sampler, rng, x, z, col, biome);
  if (kind === "shipwreck") return shipwreck(sampler, rng, x, z, col);
  if (kind === "ocean_ruin") return oceanRuin(sampler, rng, x, z, col);
  if (kind === "mansion") { // 8c
    const m = mansion(sampler, rng, x, z, col);
    return m && { kind, pieces: m.pieces, trees: [], box: m.box };
  }
  return planCamp(sampler, rng, x, z, col, biome);
}

// ---- cổng đổ nát: như Minecraft, mỗi vùng SPACING × SPACING chunk thử một chỗ ----
const cache = new Map<string, Placement | null>();
function portalOf(sampler: TerrainSampler, rx: number, rz: number): Placement | null {
  const key = `${sampler.seed},${rx},${rz}`;
  if (cache.has(key)) return cache.get(key)!;
  const c = STRUCT.RUINED_PORTAL, rng = mulberry32(hashInts(sampler.seed, rx, rz, c.SALT));
  const cx = rx * c.SPACING + randInt(rng, 0, c.SPACING - c.SEPARATION - 1), cz = rz * c.SPACING + randInt(rng, 0, c.SPACING - c.SEPARATION - 1);
  const p = build(sampler, "ruined_portal", rng, cx * 16 + 8, cz * 16 + 8);
  if (cache.size > 4096) cache.clear();
  cache.set(key, p);
  return p;
}

// ---- kim tự tháp, lều tuyết, trại bỏ hoang, tàu đắm, tàn tích: cả thế giới chỉ 1–2 cái mỗi loại (người dùng chọn 2026-11-15) ----
// Rải UNIQUE.TRIES điểm theo seed trong bán kính MAX_R quanh gốc, xét từ gần ra xa; lấy chỗ hợp lệ gần nhất, cái thứ hai cách
// cái đầu ≥ MIN_GAP. Kết quả lưu đệm theo seed (client và server tính ra như nhau).
const UNIQUE_KINDS: Kind[] = ["desert_pyramid", "igloo", "camp", "shipwreck", "ocean_ruin", "mansion"];
const SALTS: Record<string, number> = {
  desert_pyramid: STRUCT.DESERT_PYRAMID.SALT, igloo: STRUCT.IGLOO.SALT, camp: STRUCT.CAMP.SALT,
  shipwreck: STRUCT.SHIPWRECK.SALT, ocean_ruin: STRUCT.OCEAN_RUIN.SALT, mansion: STRUCT.MANSION.SALT,
};
const unique = new Map<string, Placement[]>();
export function uniquePlacements(sampler: TerrainSampler, kind: Kind): Placement[] {
  const key = `${sampler.seed},${kind}`;
  let out = unique.get(key);
  if (out) return out;
  out = [];
  const U = STRUCT.UNIQUE, rng = mulberry32(hashInts(sampler.seed, SALTS[kind]!, 99)), want = randInt(rng, U.COUNT_MIN, U.COUNT_MAX);
  const pts: [number, number][] = [];
  for (let i = 0; i < U.TRIES; i++) {
    const a = rng() * Math.PI * 2, r = U.MIN_R + Math.sqrt(rng()) * (U.MAX_R - U.MIN_R);
    pts.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)]);
  }
  pts.sort((p, q) => Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1]));
  const centers: [number, number][] = [];
  for (const [x, z] of pts) {
    if (out.length >= want) break;
    if (centers.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < U.MIN_GAP)) continue;
    const p = build(sampler, kind, mulberry32(hashInts(sampler.seed, x, z, SALTS[kind]!)), x, z);
    if (!p) continue;
    out.push(p);
    centers.push([x, z]);
  }
  unique.set(key, out);
  return out;
}

/** Mọi công trình có phần nằm trong [x0..x1] × [z0..z1]. */
export function structuresIn(sampler: TerrainSampler, x0: number, z0: number, x1: number, z1: number): Placement[] {
  const out: Placement[] = [];
  const data = structureData();
  for (const kind of UNIQUE_KINDS) {
    if (kind !== "desert_pyramid" && !data) continue; // chưa nhập mẫu từ client.jar
    for (const p of uniquePlacements(sampler, kind)) {
      const a = p.pieces[0]!, b = p.box;
      if (b ? b.x0 <= x1 && b.x1 >= x0 && b.z0 <= z1 && b.z1 >= z0
        : a.x <= x1 + MARGIN && a.x >= x0 - MARGIN && a.z <= z1 + MARGIN && a.z >= z0 - MARGIN) out.push(p);
    }
  }
  if (!data) return out;
  const span = STRUCT.RUINED_PORTAL.SPACING * 16;
  for (let rx = Math.floor((x0 - MARGIN) / span); rx <= Math.floor((x1 + MARGIN) / span); rx++)
    for (let rz = Math.floor((z0 - MARGIN) / span); rz <= Math.floor((z1 + MARGIN) / span); rz++) {
      const p = portalOf(sampler, rx, rz);
      if (p) out.push(p);
    }
  return out;
}

const landOk = (c: Column): boolean => c.height > c.waterTop && !c.lake && !c.river;

/** (8c) Cột (x, z) nằm trong (hoặc cách ≤ r block) hộp một dinh thự — cây tự nhiên không mọc. */
export function nearMansion(sampler: TerrainSampler, x: number, z: number, r: number): boolean {
  if (!structureData()) return false;
  return uniquePlacements(sampler, "mansion").some(({ box: b }) => !!b && x >= b.x0 - r && x <= b.x1 + r && z >= b.z0 - r && z <= b.z1 + r);
}

// ---- lều tuyết: phòng trên tuyết; 50% có hầm thang (4–11 đoạn) xuống phòng thí nghiệm có rương ----
function igloo(s: TerrainSampler, rng: Rng, x: number, z: number, col: Column, biome: string): Placement | null {
  const top = template("igloo/top"), mid = template("igloo/middle"), bot = template("igloo/bottom");
  // chỉ ở đồng bằng tuyết (người dùng yêu cầu 2026-11-15), đất phẳng quanh chỗ đặt
  if (!top || !mid || !bot || biome !== "snowy" || !landOk(col)) return null;
  const around = [[-5, -5], [5, -5], [-5, 5], [5, 5], [0, 0]].map(([dx, dz]) => s.column(x + dx!, z + dz!));
  if (around.some((c) => !isSnowyPlains(c) || !landOk(c))) return null;
  const hs = around.map((c) => c.height);
  if (Math.max(...hs) - Math.min(...hs) > STRUCT.IGLOO.MAX_SLOPE) return null;
  const I = STRUCT.IGLOO, rot = randInt(rng, 0, 3), y = col.height;
  // điểm xoay chung: góc mẫu trên; mảnh khác lệch (Minecraft IglooPieces): thang (2, −3, 4), phòng dưới (0, −3, −2)
  const piece = (t: typeof top, dx: number, dy: number, dz: number, air: boolean, fill?: number): Piece => {
    const [ox, oz] = rotOffset(top, rot, dx, dz, t);
    return { t, rot, x: x + ox, y: y + dy, z: z + oz, air, fill };
  };
  const pieces: Piece[] = [];
  const basement = rng() < I.BASEMENT_CHANCE;
  const n = Math.min(randInt(rng, I.LADDER_MIN, I.LADDER_MAX), Math.floor((y - I.MIN_Y - 6) / 3));
  if (basement && n >= 1) {
    for (let j = 0; j < n - 1; j++) pieces.push(piece(mid, 2, -3 - 3 * j, 4, true));
    pieces.push(piece(bot, 0, -3 - 3 * n, -2, true));
  }
  // không có hầm: cửa sập (đã đổi thành tấm gỗ) thành khối tuyết
  const over = new Map<string, number>();
  if (!(basement && n >= 1)) for (let i = 0; i < top.cells.length; i += 4) if ((top.pal[top.cells[i + 3]!]! & 255) === B.OAK_SLAB) over.set(`${top.cells[i]},${top.cells[i + 1]},${top.cells[i + 2]}`, B.SNOW_BLOCK);
  pieces.push({ ...piece(top, 0, 0, 0, true, B.SNOW_BLOCK), over });
  return { kind: "igloo", pieces, trees: [] };
}

/** Lệch (dx, dz) của mảnh t so với gốc mẫu ref, sau khi xoay cả cụm quanh gốc mẫu ref. */
function rotOffset(ref: { size: [number, number, number] }, rot: number, dx: number, dz: number, t: { size: [number, number, number] }): [number, number] {
  // xoay hộp của mảnh [dx..dx+sx-1] × [dz..dz+sz-1] trong hệ của mẫu ref, lấy góc nhỏ nhất
  const sx = ref.size[0], sz = ref.size[2], ex = dx + t.size[0] - 1, ez = dz + t.size[2] - 1;
  const r = (px: number, pz: number): [number, number] =>
    rot === 1 ? [sz - 1 - pz, px] : rot === 2 ? [sx - 1 - px, sz - 1 - pz] : rot === 3 ? [pz, sx - 1 - px] : [px, pz];
  const a = r(dx, dz), b = r(ex, ez);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
}

// ---- kim tự tháp sa mạc ----
function pyramid(s: TerrainSampler, rng: Rng, x: number, z: number, col: Column, biome: string): Placement | null {
  if (biome !== "desert" || !landOk(col)) return null;
  const t = desertPyramidTemplate(), rot = randInt(rng, 0, 3), [sx, , sz] = rotSize(t, rot);
  const x0 = x - (sx >> 1), z0 = z - (sz >> 1);
  const hs = [[0, 0], [sx - 1, 0], [0, sz - 1], [sx - 1, sz - 1], [sx >> 1, sz >> 1]].map(([dx, dz]) => s.column(x0 + dx!, z0 + dz!));
  if (hs.some((c) => !landOk(c))) return null;
  const floor = Math.min(...hs.map((c) => c.height)) - randInt(rng, STRUCT.DESERT_PYRAMID.SINK_MIN, STRUCT.DESERT_PYRAMID.SINK_MAX) + 1;
  if (floor - PYRAMID_FLOOR_Y < 2 || floor + 16 > 126) return null;
  return { kind: "desert_pyramid", pieces: [{ t, rot, x: x0, y: floor - PYRAMID_FLOOR_Y, z: z0, air: true, fill: B.SANDSTONE }], trees: [] };
}

// ---- cổng đổ nát: 5% cổng lớn; trên mặt đất / dưới đất / nửa chôn (sa mạc) / đáy biển; rêu, nứt, vàng mất, đá vỏ chai khóc ----
function portal(s: TerrainSampler, rng: Rng, x: number, z: number, col: Column, biome: string): Placement | null {
  const P = STRUCT.RUINED_PORTAL, data = structureData()!;
  const names = Object.keys(data.templates).filter((n) => n.startsWith("ruined_portal/"));
  const giant = names.filter((n) => n.includes("giant")), small = names.filter((n) => !n.includes("giant"));
  const pick = rng() < P.GIANT_CHANCE && giant.length ? giant : small;
  if (!pick.length) return null;
  const t = data.templates[pick[randInt(rng, 0, pick.length - 1)]!]!, rot = randInt(rng, 0, 3), [sx, sy, sz] = rotSize(t, rot);
  const group = biome === "desert" ? "desert" : biome === "swamp" ? "swamp" : biome.startsWith("mountains") ? "mountain" : biome === "ocean" ? "ocean" : "standard";
  const cold = biome === "snowy" || biome === "mountains_snow", mossy = P.MOSSY[group] ?? 0.2;
  const x0 = x - (sx >> 1), z0 = z - (sz >> 1), h = Math.min(...[[0, 0], [sx - 1, 0], [0, sz - 1], [sx - 1, sz - 1]].map(([dx, dz]) => s.column(x0 + dx!, z0 + dz!).height));
  let y: number;
  if (group === "ocean") y = h - 1;
  else if (group === "desert") y = h - sy + randInt(rng, P.BURY_MIN, P.BURY_MAX);
  else if ((group === "standard" || group === "mountain") && rng() < 0.5) {
    const lo = group === "mountain" ? Math.min(70, h - sy) : P.UNDERGROUND_MIN_Y;
    if (h - sy < lo) y = h;
    else y = randInt(rng, lo, h - sy);
  } else y = h;
  y = Math.max(2, Math.min(y, 126 - sy));
  const seed = s.seed, ocean = group === "ocean";
  const proc = (cell: number, wx: number, wy: number, wz: number): number | null => {
    const r = mulberry32(hashInts(seed, wx, wy, wz, 7701))(), id = cell & 255;
    if (id === B.GOLD_BLOCK) return r < P.GOLD_GONE ? null : cell;
    if (id === B.OBSIDIAN) return r < P.CRYING ? B.CRYING_OBSIDIAN : cell;
    if (id === B.NETHERRACK) return !cold && r < P.NETHERRACK_MAGMA ? B.MAGMA_BLOCK : cell;
    if (id === B.LAVA) return cold ? B.NETHERRACK : ocean || r < P.LAVA_MAGMA ? B.MAGMA_BLOCK : cell;
    if (id === B.STONE_BRICKS) return r < 0.5 * (1 - mossy) ? B.CRACKED_STONE_BRICKS : r < 0.5 ? B.MOSSY_STONE_BRICKS : cell;
    return cell;
  };
  return { kind: "ruined_portal", pieces: [{ t, rot, x: x0, y, z: z0, air: false, proc }], trees: [] };
}
