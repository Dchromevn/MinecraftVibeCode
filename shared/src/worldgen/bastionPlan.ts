// Tàn tích pháo đài lợn (Giai đoạn 10d2; structure "bastion_remnant" trong client.jar): cùng lưới ô 27 × 27 chunk với pháo đài Vực
// Lửa (structure_set nether_complexes) — ô nào không bốc ra pháo đài (3/5) là tàn tích, trừ khi tâm ở đồng bằng bazan (Minecraft không
// đặt tàn tích ở đó). Dựng như Minecraft JigsawPlacement: mảnh đầu bốc từ nhóm "bastion/starts" (khu nhà ở, chuồng lợn rừng, kho báu,
// cầu) ở y 33, rồi ghép dần theo hàng đợi tới 6 lớp, trong 80 block quanh điểm đầu. "Vùng trống" như Minecraft: mảnh con nối vào khối
// ghép quay vào trong mảnh cha thì phải nằm trọn trong hộp mảnh cha, không chồng các mảnh khác đã đặt trong đó; nối ra ngoài thì dùng
// vùng mà mảnh cha được cấp (mảnh đầu: cả vùng 80 block trừ chính nó) — mỗi mảnh đặt xong bị trừ khỏi vùng của nó.
// Khớp dọc "aligned" phải cùng hướng đỉnh. Mỗi mảnh đổi ô theo bộ biến đổi của nhóm (gạch nứt, vàng → gạch, đá đen mạ vàng...).
import { CHUNK_HEIGHT } from "../chunk.js";
import { FORTRESS } from "../fortressConstants.js";
import { NB } from "../netherBiomeConstants.js";
import { BASTION } from "../piglinConstants.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { structureData, type Jig, type StructTemplate } from "../structures.js";
import { paintPiece, rotDir, rotSize, worldOf, type Piece } from "./structPaint.js";
import { shuffled } from "./villagePlan.js";

export interface Box { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }
export interface Bastion {
  x: number; z: number; // điểm đầu
  pieces: Piece[];
  box: Box; // hộp bao cả tàn tích
  chests: [number, number, number, string][]; // rương: vị trí + bảng đồ
  mobs: [number, number, number, string][]; // sinh vật đặt sẵn: "piglin:1" (kiếm) / "piglin:2" (nỏ), "piglin_brute", "hoglin"
}

const FRONT: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 };
const DX = [0, -1, 0, 1], DZ = [1, 0, -1, 0];
/** Hướng thế giới của khối ghép: 0..3 ngang (Nam, Tây, Bắc, Đông), 4 lên, 5 xuống. */
const dirOf = (s: string, rot: number): number => (s === "up" ? 4 : s === "down" ? 5 : rotDir(FRONT[s] ?? 0, rot));
const front = (j: Jig, rot: number): number => dirOf(j[3].split("_")[0]!, rot);
const top = (j: Jig, rot: number): number => dirOf(j[3].split("_")[1] ?? "up", rot);
const opposite = (d: number): number => (d >= 4 ? 9 - d : (d + 2) & 3);
const hits = (a: Box, b: Box): boolean => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0 && a.z0 <= b.z1 && a.z1 >= b.z0;
const within = (a: Box, b: Box): boolean => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1 && a.z0 >= b.z0 && a.z1 <= b.z1;
/** Vùng trống: hộp giới hạn trừ các hộp đã chiếm. */
interface Space { bound: Box; taken: Box[] }
const fits = (b: Box, s: Space): boolean => within(b, s.bound) && !s.taken.some((t) => hits(t, b));

export function boxOf(p: Piece): Box {
  const [sx, sy, sz] = rotSize(p.t, p.rot);
  return { x0: p.x, y0: p.y, z0: p.z, x1: p.x + sx - 1, y1: p.y + sy - 1, z1: p.z + sz - 1 };
}

function shuffleIdx(n: number, rng: Rng): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Bộ biến đổi ô (luật "rule" của Minecraft) cho mảnh có đáy ở y0: luật đầu tiên khớp (khối vào + xác suất theo vị trí) thì đổi. */
function procOf(name: string | undefined, seed: number, y0: number): Piece["proc"] {
  const rules = name ? structureData()?.procs?.[name] : undefined;
  if (!rules?.length) return undefined;
  return (cell, x, y, z) => {
    for (let i = 0; i < rules.length; i++) {
      const [inC, prob, out, linear] = rules[i]!;
      if (inC !== -1 && (cell & 255) !== inC) continue;
      const chance = linear ? BASTION.LINEAR_MAX * Math.min(1, Math.max(0, (y - y0) / 100)) : prob; // vị trí: 0 → 5% theo độ cao trong mảnh
      if (hashInts(seed, x, y, z, 0xb7 + i) / 4294967296 < chance) return out;
    }
    return cell;
  };
}

/** Dựng tàn tích có điểm đầu (x, BASTION.START_Y, z). */
export function planBastion(seed: number, x: number, z: number, rng: Rng): Bastion | null {
  const data = structureData();
  const startName = shuffled(data?.pools["bastion/starts"], rng)[0], st = startName ? data!.templates[startName] : undefined;
  if (!data || !st) return null;
  const start: Piece = { t: st, rot: randInt(rng, 0, 3), x, y: BASTION.START_Y, z, air: true, proc: procOf(st.proc, seed, BASTION.START_Y) };
  const R = BASTION.MAX_DIST, sb = boxOf(start);
  const global: Space = { bound: { x0: x - R, y0: 1, z0: z - R, x1: x + R, y1: CHUNK_HEIGHT - 2, z1: z + R }, taken: [sb] };
  const pieces: Piece[] = [start], boxes: Box[] = [sb], space: Space[] = [global], inner: (Space | undefined)[] = [];
  const queue: { i: number; depth: number; skip: number }[] = [{ i: 0, depth: 0, skip: -1 }];
  while (queue.length) {
    const { i, depth, skip } = queue.shift()!, p = pieces[i]!, pb = boxes[i]!;
    for (const ji of shuffleIdx(p.t.jig.length, rng)) {
      const j = p.t.jig[ji]!;
      if (ji === skip || !j[6] || j[6] === "empty") continue;
      const [wx, wy, wz] = worldOf(p, j[0], j[1], j[2]), fd = front(j, p.rot);
      const tx = wx + (fd < 4 ? DX[fd]! : 0), ty = wy + (fd === 4 ? 1 : fd === 5 ? -1 : 0), tz = wz + (fd < 4 ? DZ[fd]! : 0);
      const inP = tx >= pb.x0 && tx <= pb.x1 && ty >= pb.y0 && ty <= pb.y1 && tz >= pb.z0 && tz <= pb.z1;
      const fb = data.fallback?.[j[6]];
      const names = [...(depth < BASTION.MAX_DEPTH ? shuffled(data.pools[j[6]], rng) : []), ...(fb ? shuffled(data.pools[fb], rng) : [])];
      for (const name of names) {
        if (name === "empty") break;
        const list = name.startsWith("list:") ? name.slice(5).split("|") : [name], t = data.templates[list[0]!];
        if (!t) continue;
        const sp = inP ? (inner[i] ??= { bound: pb, taken: [] }) : space[i]!;
        const c = fit(t, j, fd, p, tx, ty, tz, sp);
        if (!c) continue;
        const b = boxOf(c.p);
        pieces.push(c.p);
        boxes.push(b);
        space.push(sp);
        sp.taken.push(b);
        queue.push({ i: pieces.length - 1, depth: depth + 1, skip: c.skip });
        for (const extra of list.slice(1)) { // nhiều mẫu chồng cùng chỗ
          const et = data.templates[extra];
          if (et) pieces.push({ ...c.p, t: et, proc: procOf(et.proc, seed, c.p.y) }), boxes.push(b), space.push(sp);
        }
        break;
      }
    }
  }
  const box = boxes.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), z0: Math.min(a.z0, b.z0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), z1: Math.max(a.z1, b.z1) }));
  const chests: Bastion["chests"] = [], mobs: Bastion["mobs"] = [];
  for (const p of pieces) {
    for (const [lx, ly, lz, lt] of p.t.loot) chests.push([...worldOf(p, lx, ly, lz), lt]);
    for (const [lx, ly, lz, k] of p.t.mobs ?? []) mobs.push([...worldOf(p, lx, ly, lz), k]);
  }
  return { x, z, pieces, box, chests, mobs };

  /** Thử đặt mẫu t nối vào khối ghép j (hướng fd) của mảnh p, ô đích (tx, ty, tz), trong vùng trống sp. */
  function fit(t: StructTemplate, j: Jig, fd: number, p: Piece, tx: number, ty: number, tz: number, sp: Space): { p: Piece; skip: number } | null {
    for (const rot of shuffleIdx(4, rng))
      for (const ci of shuffleIdx(t.jig.length, rng)) {
        const cj = t.jig[ci]!;
        if (cj[4] !== j[5] || front(cj, rot) !== opposite(fd)) continue;
        if (fd >= 4 && !j[8] && top(j, p.rot) !== top(cj, rot)) continue; // khớp dọc "aligned": cùng hướng đỉnh
        const c: Piece = { t, rot, x: 0, y: 0, z: 0, air: true };
        const [ox, oy, oz] = worldOf(c, cj[0], cj[1], cj[2]);
        Object.assign(c, { x: tx - ox, y: ty - oy, z: tz - oz });
        if (!fits(boxOf(c), sp)) continue;
        c.proc = procOf(t.proc, seed, c.y);
        return { p: c, skip: ci };
      }
    return null;
  }
}

/** Tìm tàn tích theo lưới ô của nether_complexes (chung chuỗi số ngẫu nhiên với FortressLocator.at). */
export class BastionLocator {
  private readonly cache = new Map<string, Bastion | null>();
  constructor(private readonly seed: number, private readonly biomeAt: (x: number, z: number) => number) {}

  /** Tàn tích của ô lưới (rx, rz), hoặc null (ô là pháo đài / đồng bằng bazan / chưa có mẫu từ client.jar). */
  at(rx: number, rz: number): Bastion | null {
    const key = `${rx},${rz}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const F = FORTRESS, rng = mulberry32(hashInts(this.seed, rx, rz, F.SALT));
    const cx = rx * F.SPACING + randInt(rng, 0, F.SPACING - F.SEPARATION - 1), cz = rz * F.SPACING + randInt(rng, 0, F.SPACING - F.SEPARATION - 1);
    const fortress = randInt(rng, 0, F.WEIGHT_FORTRESS + F.WEIGHT_BASTION - 1) < F.WEIGHT_FORTRESS;
    const b = fortress || this.biomeAt(cx * 16 + 8, cz * 16 + 8) === NB.BASALT ? null
      : planBastion(this.seed, cx * 16, cz * 16, mulberry32(hashInts(this.seed, rx, rz, BASTION.SALT)));
    if (this.cache.size > 256) this.cache.clear();
    this.cache.set(key, b);
    return b;
  }

  /** Mọi tàn tích có hộp chạm vùng [x0..x1] × [z0..z1]. */
  near(x0: number, z0: number, x1: number, z1: number): Bastion[] {
    const S = FORTRESS.SPACING * 16, R = BASTION.REACH, out: Bastion[] = [];
    for (let rx = Math.floor((x0 - R) / S); rx <= Math.floor((x1 + R) / S); rx++)
      for (let rz = Math.floor((z0 - R) / S); rz <= Math.floor((z1 + R) / S); rz++) {
        const b = this.at(rx, rz);
        if (b && b.box.x1 >= x0 && b.box.x0 <= x1 && b.box.z1 >= z0 && b.box.z0 <= z1) out.push(b);
      }
    return out;
  }

  /** Bảng đồ của rương tàn tích ở đúng ô này, hoặc null. */
  chestAt(x: number, y: number, z: number): string | null {
    for (const b of this.near(x, z, x, z)) for (const c of b.chests) if (c[0] === x && c[1] === y && c[2] === z) return c[3];
    return null;
  }

  /** Tàn tích gần (x, z) nhất (dò các ô lưới theo vòng): điểm đầu; null nếu không thấy. */
  nearest(x: number, z: number): { x: number; y: number; z: number } | null {
    const S = FORTRESS.SPACING * 16, rx0 = Math.floor(x / S), rz0 = Math.floor(z / S);
    let best: { x: number; y: number; z: number } | null = null, bd = Infinity;
    for (let r = 0; r <= FORTRESS.LOCATE_RADIUS; r++) {
      if (best && (r - 1) * S > bd) break;
      for (let rx = rx0 - r; rx <= rx0 + r; rx++)
        for (let rz = rz0 - r; rz <= rz0 + r; rz++) {
          if (Math.max(Math.abs(rx - rx0), Math.abs(rz - rz0)) !== r) continue;
          const b = this.at(rx, rz), d = b ? Math.hypot(b.x - x, b.z - z) : Infinity;
          if (b && d < bd) [bd, best] = [d, { x: b.x, y: BASTION.START_Y, z: b.z }];
        }
    }
    return best;
  }
}

/** Vẽ các tàn tích chạm chunk (cx, cz) (theo thứ tự đặt mảnh: mảnh sau đè mảnh trước). */
export function paintBastions(data: Uint8Array, meta: Uint8Array, cx: number, cz: number, list: readonly Bastion[]): void {
  const X0 = cx * 16, Z0 = cz * 16;
  for (const b of list) for (const p of b.pieces) {
    const pb = boxOf(p);
    if (pb.x1 >= X0 && pb.x0 <= X0 + 15 && pb.z1 >= Z0 && pb.z0 <= Z0 + 15) paintPiece(p, data, meta, cx, cz);
  }
}
