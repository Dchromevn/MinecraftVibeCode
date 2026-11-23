// Làng (Giai đoạn 8a) — dựng như Minecraft: mỗi vùng VILLAGE.SPACING × SPACING chunk thử một chỗ (random_spread); biome hợp thì đặt
// quảng trường rồi ghép dần bằng khối ghép (jigsaw) theo hàng đợi: đường → nhà / đường tiếp → đồ trang trí, dân làng... sâu tối đa
// MAX_DEPTH lớp (lớp cuối chỉ dùng nhóm dự phòng: đoạn kết đường). Mỗi mảnh thử các mẫu theo trọng số (xáo trộn), mẫu nào khớp
// hướng + tên khối ghép, không chồng cột của mảnh khác và trong MAX_DIST block từ tâm thì đặt. Đường bám mặt đất từng cột; nhà đặt
// sao cho khối ghép ở cửa nằm ngay trên mặt đất. Kế hoạch lưu đệm theo vùng (+ mốc nhà tự lưu) → chunk nào cũng ra cùng một làng.
import { B } from "../blocks.js";
import { CHUNK_HEIGHT } from "../chunk.js";
import { TERRAIN } from "../constants.js";
import { TREE_MIX } from "../floraConstants.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { structureData, type Jig, type StructTemplate } from "../structures.js";
import { VILLAGE, type VillageType } from "../villageConstants.js";
import { customStructures, villageCut } from "../villageCustom.js";
import type { WoodKind } from "../woods.js";
import { rotDir, worldOf, type Piece } from "./structPaint.js";
import { villageProc } from "./villagePaint.js";
import { BIOME, isSnowyPlains, type TerrainSampler } from "./terrainSampler.js";

export interface VillageFeat { name: string; x: number; y: number; z: number }
export interface VillagePlan {
  kind: "village" | "outpost"; // (8b) tiền đồn kẻ cướp dùng chung bộ ghép
  type: VillageType;
  x: number; z: number; // tâm
  pieces: Piece[];
  trees: { kind: WoodKind; x: number; y: number; z: number }[];
  feats: VillageFeat[];
  /** Cột mà nhà / đường chiếm (khóa colKey) — cây tự nhiên không mọc ở đây. */
  cols: Set<number>;
}

const FRONT: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 };
const DX = [0, -1, 0, 1], DZ = [1, 0, -1, 0];

/** Loại làng ở cột (x, z), hoặc null. */
export function villageTypeAt(s: TerrainSampler, x: number, z: number): VillageType | null {
  const c = s.column(x, z);
  if (c.height <= c.waterTop || c.lake || c.river) return null;
  switch (c.biome) {
    case BIOME.PLAINS: return c.temp > TREE_MIX.ACACIA_TEMP && c.humid < TREE_MIX.ACACIA_HUMID ? "savanna" : "plains";
    case BIOME.DESERT: return "desert";
    case BIOME.SNOWY: return isSnowyPlains(c) ? "snowy" : "taiga";
    case BIOME.MOUNTAINS: return c.height < TERRAIN.SNOW_LINE_Y ? "taiga" : null;
    default: return null;
  }
}

/** Mặt đất (hoặc mặt nước) cao nhất của cột. */
export const surfaceY = (s: TerrainSampler, x: number, z: number): number => {
  const c = s.column(x, z);
  return Math.max(c.height, c.waterTop);
};

/** Danh sách tên theo trọng số đã xáo (như Minecraft: mỗi mẫu lặp theo trọng số rồi xáo; bỏ trùng giữ thứ tự). */
export function shuffled(pool: readonly [string, number][] | undefined, rng: Rng): string[] {
  const l: string[] = [];
  for (const [n, w] of pool ?? []) for (let i = 0; i < w; i++) l.push(n);
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [l[i], l[j]] = [l[j]!, l[i]!];
  }
  return [...new Set(l)];
}

function shuffleIdx(n: number, rng: Rng): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const front = (j: Jig): string => j[3].split("_")[0]!;

interface Node { p: Piece; depth: number; skip: number }

/** Cột (khóa) mà mảnh chiếm: mảnh bám đất chỉ tính ô đặc ở lớp đáy (mặt đường), mảnh cứng tính mọi ô. */
function columns(p: Piece): number[] {
  const out = new Set<number>(), c = p.t.cells, pal = p.t.pal;
  for (let i = 0; i < c.length; i += 4) {
    if (p.terrain && (c[i + 1] !== 0 || pal[c[i + 3]!] === 0)) continue;
    const [x, , z] = worldOf(p, c[i]!, 0, c[i + 2]!);
    out.add(colKey(x, z));
  }
  return [...out];
}
export const colKey = (x: number, z: number): number => (x + 32768) * 65536 + (z + 32768);

/** (8b) Tùy chọn ghép: tiền đồn sâu 7 lớp, mảnh nối dọc (lều, lồng) cũng không được chồng nhau. */
export interface AssembleOpts { kind: VillagePlan["kind"]; depth: number; vertCheck: boolean }
const VILLAGE_OPTS: AssembleOpts = { kind: "village", depth: VILLAGE.MAX_DEPTH, vertCheck: false };

/** Ghép làng (hoặc tiền đồn) từ mảnh đầu. */
export function assemble(s: TerrainSampler, rng: Rng, type: VillageType, start: Piece, cx: number, cz: number, cut: number, opt = VILLAGE_OPTS): VillagePlan {
  const data = structureData()!, customs = customStructures();
  const occ = new Set<number>(columns(start)), solid = new Set<number>(occ);
  const owner = new Map<number, Piece>(); // (8b, tiền đồn) cột → mảnh cứng chiếm nó
  if (opt.vertCheck) for (const k of occ) owner.set(k, start);
  const plan: VillagePlan = { kind: opt.kind, type, x: cx, z: cz, pieces: [start], trees: [], feats: [], cols: occ };
  const housesPool = `village/${type}/houses`;
  const poolOf = (name: string): [string, number][] | undefined => {
    const p = data.pools[name];
    if (name !== housesPool || !cut) return p;
    return [...(p ?? []), ...customs.slice(0, cut).map((_, i): [string, number] => [`custom:${i}`, VILLAGE.CUSTOM_WEIGHT])];
  };
  const templateOf = (name: string): StructTemplate | undefined =>
    name.startsWith("custom:") ? customs[Number(name.slice(7))]?.t : name.startsWith("list:") ? data.templates[name.slice(5).split("|")[0]!] : data.templates[name];
  const queue: Node[] = [{ p: start, depth: 0, skip: -1 }];
  while (queue.length) {
    const { p, depth, skip } = queue.shift()!;
    for (const ji of shuffleIdx(p.t.jig.length, rng)) {
      const j = p.t.jig[ji]!, fr = front(j);
      if (ji === skip || !j[6] || j[6] === "empty") continue;
      const vertical = fr === "up" || fr === "down";
      if (!vertical && FRONT[fr] === undefined) continue;
      const [wx, wy, wz] = worldOf(p, j[0], j[1], j[2]);
      const pjy = p.terrain ? surfaceY(s, wx, wz) + j[1] : wy;
      const pd = vertical ? -1 : rotDir(FRONT[fr]!, p.rot);
      const tx = wx + (vertical ? 0 : DX[pd]!), tz = wz + (vertical ? 0 : DZ[pd]!), ty = pjy + (fr === "up" ? 1 : fr === "down" ? -1 : 0);
      const fb = data.fallback?.[j[6]];
      const names = [...(depth < opt.depth ? shuffled(poolOf(j[6]), rng) : []), ...(fb ? shuffled(poolOf(fb), rng) : [])];
      for (const name of names) {
        if (name === "empty") break;
        if (name.startsWith("tree:") || name.startsWith("feat:")) {
          if (fr === "up") {
            if (name.startsWith("tree:")) plan.trees.push({ kind: name.slice(5) as WoodKind, x: tx, y: ty, z: tz });
            else plan.feats.push({ name: name.slice(5), x: tx, y: ty, z: tz });
          }
          break;
        }
        const t = templateOf(name);
        if (!t) continue;
        const child = fit(t, j, fr, vertical, p, tx, ty, tz);
        if (!child) continue;
        plan.pieces.push(child.p);
        if (name.startsWith("list:")) // (8b) các mẫu phủ thêm cùng chỗ (dây leo phủ tháp canh)
          for (const extra of name.slice(5).split("|").slice(1)) if (data.templates[extra]) plan.pieces.push({ ...child.p, t: data.templates[extra]!, air: false, fill: undefined });
        if (depth + 1 <= opt.depth) queue.push({ p: child.p, depth: depth + 1, skip: child.skip });
        break;
      }
    }
  }
  // cây / đống rơm quá sát nhà thì bỏ (Minecraft: cây không mọc được chỗ đã có nhà)
  const nearHouse = (x: number, z: number, r: number): boolean => {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (solid.has(colKey(x + dx, z + dz))) return true;
    return false;
  };
  plan.trees = plan.trees.filter((t) => !nearHouse(t.x, t.z, 2));
  plan.feats = plan.feats.filter((f) => !nearHouse(f.x, f.z, 1));
  return plan;

  /** Thử đặt mẫu t nối vào khối ghép j của mảnh cha p (ô đích tx, ty, tz). */
  function fit(t: StructTemplate, j: Jig, fr: string, vertical: boolean, p: Piece, tx: number, ty: number, tz: number): { p: Piece; skip: number } | null {
    const want = vertical ? (fr === "up" ? "down" : "up") : "";
    const pd = vertical ? -1 : rotDir(FRONT[fr]!, p.rot);
    for (const rot of shuffleIdx(4, rng))
      for (const ci of shuffleIdx(t.jig.length, rng)) {
        const cj = t.jig[ci]!, cf = front(cj);
        if (cj[4] !== j[5]) continue;
        if (vertical ? cf !== want : FRONT[cf] === undefined || rotDir(FRONT[cf]!, rot) !== ((pd + 2) & 3)) continue;
        const terrain = !!t.terrain, rigid = !terrain && !vertical;
        const c: Piece = {
          t, rot, x: 0, y: 0, z: 0, air: rigid, fill: rigid ? (type === "desert" ? FILL_DESERT : FILL) : undefined, terrain,
          proc: terrain ? undefined : villageProc(t.proc, s.seed),
        };
        const [ox, , oz] = worldOf(c, cj[0], 0, cj[2]);
        c.x = tx - ox;
        c.z = tz - oz;
        const jy = !vertical && (p.terrain || terrain) ? surfaceY(s, tx, tz) + 1 : ty;
        c.y = jy - cj[1];
        if (!terrain && (c.y < 2 || c.y + t.size[1] >= CHUNK_HEIGHT - 1)) continue;
        const sx = rot & 1 ? t.size[2] : t.size[0], sz = rot & 1 ? t.size[0] : t.size[2];
        if (Math.max(Math.abs(c.x - cx), Math.abs(c.x + sx - 1 - cx), Math.abs(c.z - cz), Math.abs(c.z + sz - 1 - cz)) > VILLAGE.MAX_DIST) continue;
        if (!vertical) {
          const cols = columns(c);
          // (8b) tiền đồn: như Minecraft, mảnh con được nằm trong khối của mảnh cha (tháp canh đứng trên nền)
          const inParent = opt.vertCheck ? (k: number): boolean => owner.get(k) === p : (): boolean => false;
          if (cols.some((k) => occ.has(k) && !inParent(k)) || tooWet(c, cols)) continue;
          if (opt.vertCheck && rigid) for (const k of cols) owner.set(k, c);
          for (const k of cols) occ.add(k);
          if (rigid) for (const k of cols) solid.add(k);
        } else if (opt.vertCheck && !terrain && (sx > 1 || sz > 1)) { // (8b) lều / lồng trên nền tiền đồn: không chồng nhau
          const cols = columns(c);
          if (cols.some((k) => solid.has(k))) continue;
          for (const k of cols) solid.add(k), occ.add(k);
        }
        return { p: c, skip: ci };
      }
    return null;
  }

  /** Nhà: không cột nào ở góc / giữa là nước; đường: không quá WET_STREET phần mặt đường trên nước (cầu ván ngắn thì được). */
  function tooWet(c: Piece, cols: number[]): boolean {
    const wet = (k: number): boolean => {
      const col = s.column(Math.floor(k / 65536) - 32768, (k % 65536) - 32768);
      return col.waterTop > col.height;
    };
    if (c.terrain) return cols.filter(wet).length > cols.length * VILLAGE.WET_STREET;
    const sx = c.rot & 1 ? c.t.size[2] : c.t.size[0], sz = c.rot & 1 ? c.t.size[0] : c.t.size[2];
    return [[0, 0], [sx - 1, 0], [0, sz - 1], [sx - 1, sz - 1], [sx >> 1, sz >> 1]].some(([dx, dz]) => wet(colKey(c.x + dx!, c.z + dz!)));
  }
}

const FILL = B.DIRT, FILL_DESERT = B.SANDSTONE; // lấp móng nhà trên dốc

// ---- chọn chỗ theo vùng ----
const cache = new Map<string, VillagePlan | null>();

/** Làng của vùng (rx, rz), hoặc null. */
export function villageAt(s: TerrainSampler, rx: number, rz: number): VillagePlan | null {
  const data = structureData();
  if (!data?.pools["village/plains/town_centers"]) return null;
  const cut = villageCut(rx, rz), key = `${s.seed},${rx},${rz},${cut}`;
  if (cache.has(key)) return cache.get(key)!;
  const V = VILLAGE, rng = mulberry32(hashInts(s.seed, rx, rz, V.SALT));
  const ccx = rx * V.SPACING + randInt(rng, 0, V.SPACING - V.SEPARATION - 1), ccz = rz * V.SPACING + randInt(rng, 0, V.SPACING - V.SEPARATION - 1);
  const x = ccx * 16 + 8, z = ccz * 16 + 8;
  let plan: VillagePlan | null = null;
  const type = villageTypeAt(s, x, z);
  if (type && flatEnough(s, x, z)) {
    for (const name of shuffled(data.pools[`village/${type}/town_centers`], rng)) {
      const t = data.templates[name];
      if (!t) continue;
      const rot = randInt(rng, 0, 3), sx = rot & 1 ? t.size[2] : t.size[0], sz = rot & 1 ? t.size[0] : t.size[2];
      const start: Piece = {
        t, rot, x: x - (sx >> 1), y: surfaceY(s, x, z), z: z - (sz >> 1), air: true, fill: type === "desert" ? FILL_DESERT : FILL, proc: villageProc(t.proc, s.seed),
      };
      plan = assemble(s, rng, type, start, x, z, cut);
      if (plan.pieces.filter((p) => !p.terrain && p.t.size[1] > 4).length < VILLAGE.MIN_HOUSES + 1) plan = null; // đường bị nước / dốc chặn hết: bỏ
      break;
    }
  }
  if (cache.size > 256) cache.clear();
  cache.set(key, plan);
  return plan;
}

/** Quanh tâm không quá dốc (xét các điểm trên cạn), phần lớn là đất liền (sông / hồ nhỏ thì đường bắc cầu ván). */
export function flatEnough(s: TerrainSampler, x: number, z: number): boolean {
  const R = VILLAGE.SLOPE_R, hs: number[] = [];
  for (const [dx, dz] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R], [R, R], [-R, -R], [R, -R], [-R, R]]) {
    const c = s.column(x + dx!, z + dz!);
    if (c.height > c.waterTop) hs.push(c.height);
  }
  return hs.length >= VILLAGE.MIN_DRY && Math.max(...hs) - Math.min(...hs) <= VILLAGE.MAX_SLOPE;
}

/** Mọi làng có phần nằm trong [x0..x1] × [z0..z1]. */
export function villagesIn(s: TerrainSampler, x0: number, z0: number, x1: number, z1: number): VillagePlan[] {
  const span = VILLAGE.SPACING * 16, m = VILLAGE.MAX_DIST + 24, out: VillagePlan[] = [];
  for (let rx = Math.floor((x0 - m) / span); rx <= Math.floor((x1 + m) / span); rx++)
    for (let rz = Math.floor((z0 - m) / span); rz <= Math.floor((z1 + m) / span); rz++) {
      const v = villageAt(s, rx, rz);
      if (v && v.x + m >= x0 && v.x - m <= x1 && v.z + m >= z0 && v.z - m <= z1) out.push(v);
    }
  return out;
}
