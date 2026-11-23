// Pháo đài Vực Lửa (Giai đoạn 10c) — lập kế hoạch theo Minecraft NetherFortressPieces / NetherFortressStructure (đọc từ client.jar):
// chỗ đặt theo lưới ô 27 × 27 chunk (structure_set nether_complexes: 2/5 pháo đài, 3/5 tàn tích pháo đài lợn — để trống tới 10d),
// mảnh đầu là ngã tư cầu ở y 64 quay ngẫu nhiên, rồi nối mảnh con theo trọng số (cầu / lâu đài, giới hạn số lần, không lặp liền
// mảnh không cho lặp), tối đa 30 lớp, xa ≤ 112 block, không chồng lên mảnh khác, đáy > 10; hết chỗ thì đặt đầu cầu cụt; cuối cùng
// dời cả pháo đài vào khoảng y 48–70. Kế hoạch chỉ theo seed + ô lưới nên chunk nào cũng tính ra như nhau (nhớ đệm theo ô).
import { FORTRESS } from "../fortressConstants.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { fortressMarks } from "./fortressPaint.js";

/** Hướng mảnh như Minecraft Direction: 0 Bắc (−Z), 1 Nam (+Z), 2 Tây (−X), 3 Đông (+X). */
export type FDir = 0 | 1 | 2 | 3;
export interface FBox { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }
export type PieceKind =
  | "BridgeStraight" | "BridgeEndFiller" | "BridgeCrossing" | "RoomCrossing" | "StairsRoom" | "MonsterThrone" | "CastleEntrance"
  | "CastleSmallCorridorPiece" | "CastleSmallCorridorCrossingPiece" | "CastleSmallCorridorRightTurnPiece" | "CastleSmallCorridorLeftTurnPiece"
  | "CastleCorridorStairsPiece" | "CastleCorridorTBalconyPiece" | "CastleStalkRoom";
export interface FortPiece { kind: PieceKind; box: FBox; dir: FDir; depth: number; chest: boolean; seed: number }
export interface Fortress {
  x: number; z: number; // điểm đầu (block)
  pieces: FortPiece[];
  box: FBox; // bao cả pháo đài
  chests: [number, number, number][]; // ô rương (thế giới)
  spawners: [number, number, number][]; // ô lồng quỷ lửa
}

/** [lệch x, lệch y, lệch z, rộng, cao, sâu] (BoundingBox.orientBox của createPiece). */
const SIZE: Record<PieceKind, readonly [number, number, number, number, number, number]> = {
  BridgeStraight: [-1, -3, 0, 5, 10, 19], BridgeEndFiller: [-1, -3, 0, 5, 10, 8], BridgeCrossing: [-8, -3, 0, 19, 10, 19],
  RoomCrossing: [-2, 0, 0, 7, 9, 7], StairsRoom: [-2, 0, 0, 7, 11, 7], MonsterThrone: [-2, 0, 0, 7, 8, 9], CastleEntrance: [-5, -3, 0, 13, 14, 13],
  CastleSmallCorridorPiece: [-1, 0, 0, 5, 7, 5], CastleSmallCorridorCrossingPiece: [-1, 0, 0, 5, 7, 5],
  CastleSmallCorridorRightTurnPiece: [-1, 0, 0, 5, 7, 5], CastleSmallCorridorLeftTurnPiece: [-1, 0, 0, 5, 7, 5],
  CastleCorridorStairsPiece: [-1, -7, 0, 5, 14, 10], CastleCorridorTBalconyPiece: [-3, 0, 0, 9, 7, 9], CastleStalkRoom: [-5, -3, 0, 13, 14, 13],
};
interface Weight { kind: PieceKind; w: number; max: number; row: boolean; placed: number }
const BRIDGE: [PieceKind, number, number, boolean?][] = [
  ["BridgeStraight", 30, 0, true], ["BridgeCrossing", 10, 4], ["RoomCrossing", 10, 4], ["StairsRoom", 10, 3], ["MonsterThrone", 5, 2], ["CastleEntrance", 5, 1],
];
const CASTLE: [PieceKind, number, number, boolean?][] = [
  ["CastleSmallCorridorPiece", 25, 0, true], ["CastleSmallCorridorCrossingPiece", 15, 5], ["CastleSmallCorridorRightTurnPiece", 5, 10],
  ["CastleSmallCorridorLeftTurnPiece", 5, 10], ["CastleCorridorStairsPiece", 10, 3, true], ["CastleCorridorTBalconyPiece", 7, 2], ["CastleStalkRoom", 5, 2],
];
const weights = (l: typeof BRIDGE): Weight[] => l.map(([kind, w, max, row]) => ({ kind, w, max, row: !!row, placed: 0 }));

function orientBox(x: number, y: number, z: number, k: PieceKind, d: FDir): FBox {
  const [ox, oy, oz, w, h, dd] = SIZE[k];
  if (d === 1) return { x0: x + ox, y0: y + oy, z0: z + oz, x1: x + w - 1 + ox, y1: y + h - 1 + oy, z1: z + dd - 1 + oz };
  if (d === 2) return { x0: x - dd + 1 + oz, y0: y + oy, z0: z + ox, x1: x + oz, y1: y + h - 1 + oy, z1: z + w - 1 + ox };
  if (d === 3) return { x0: x + oz, y0: y + oy, z0: z + ox, x1: x + dd - 1 + oz, y1: y + h - 1 + oy, z1: z + w - 1 + ox };
  return { x0: x + ox, y0: y + oy, z0: z - dd + 1 + oz, x1: x + w - 1 + ox, y1: y + h - 1 + oy, z1: z + oz };
}
const overlap = (a: FBox, b: FBox): boolean => a.x1 >= b.x0 && a.x0 <= b.x1 && a.y1 >= b.y0 && a.y0 <= b.y1 && a.z1 >= b.z0 && a.z0 <= b.z1;

/** Dựng kế hoạch một pháo đài có điểm đầu (x, z) — rng theo seed + ô lưới. */
function plan(x: number, z: number, rng: Rng): Fortress {
  const pieces: FortPiece[] = [], pending: FortPiece[] = [];
  const avail = { bridge: weights(BRIDGE), castle: weights(CASTLE) };
  let previous: Weight | null = null;
  const sd = randInt(rng, 0, 3) as FDir;
  const start: FortPiece = { kind: "BridgeCrossing", dir: sd, depth: 0, chest: false, seed: 0, // makeBoundingBox 19 × 10 × 19 (vuông: mọi hướng như nhau)
    box: { x0: x, y0: FORTRESS.START_Y, z0: z, x1: x + 18, y1: FORTRESS.START_Y + 9, z1: z + 18 } };
  pieces.push(start);

  const create = (k: PieceKind, px: number, py: number, pz: number, d: FDir, depth: number): FortPiece | null => {
    const box = orientBox(px, py, pz, k, d);
    if (box.y0 <= FORTRESS.MIN_Y || pieces.some((p) => overlap(p.box, box))) return null;
    const chest = (k === "CastleSmallCorridorRightTurnPiece" || k === "CastleSmallCorridorLeftTurnPiece") && randInt(rng, 0, 2) === 0;
    return { kind: k, box, dir: d, depth, chest, seed: k === "BridgeEndFiller" ? (rng() * 4294967296) >>> 0 : 0 };
  };
  const endFiller = (px: number, py: number, pz: number, d: FDir, depth: number): FortPiece | null => create("BridgeEndFiller", px, py, pz, d, depth);
  const pick = (list: Weight[], px: number, py: number, pz: number, d: FDir, depth: number): FortPiece | null => {
    let total = 0, any = false;
    for (const w of list) {
      if (w.max > 0 && w.placed < w.max) any = true;
      total += w.w;
    }
    for (let tries = 0; any && total > 0 && depth <= FORTRESS.MAX_DEPTH && tries < 5; tries++) {
      let r = randInt(rng, 0, total - 1);
      for (const w of list) {
        if ((r -= w.w) >= 0) continue;
        if ((w.max > 0 && w.placed >= w.max) || (w === previous && !w.row)) break;
        const p = create(w.kind, px, py, pz, d, depth);
        if (p) {
          w.placed++;
          previous = w;
          if (w.max > 0 && w.placed >= w.max) list.splice(list.indexOf(w), 1);
          return p;
        }
      }
    }
    return endFiller(px, py, pz, d, depth);
  };
  const add = (px: number, py: number, pz: number, d: FDir, depth: number, castle: boolean): void => {
    if (Math.abs(px - start.box.x0) > FORTRESS.MAX_DIST || Math.abs(pz - start.box.z0) > FORTRESS.MAX_DIST) return; // Minecraft: đầu cầu cụt không được thêm
    const p = pick(castle ? avail.castle : avail.bridge, px, py, pz, d, depth + 1);
    if (p) {
      pieces.push(p);
      pending.push(p);
    }
  };
  const fwd = (p: FortPiece, a: number, b: number, c: boolean): void => {
    const B = p.box;
    if (p.dir === 0) add(B.x0 + a, B.y0 + b, B.z0 - 1, 0, p.depth, c);
    else if (p.dir === 1) add(B.x0 + a, B.y0 + b, B.z1 + 1, 1, p.depth, c);
    else if (p.dir === 2) add(B.x0 - 1, B.y0 + b, B.z0 + a, 2, p.depth, c);
    else add(B.x1 + 1, B.y0 + b, B.z0 + a, 3, p.depth, c);
  };
  const left = (p: FortPiece, b: number, a: number, c: boolean): void => {
    const B = p.box;
    if (p.dir <= 1) add(B.x0 - 1, B.y0 + b, B.z0 + a, 2, p.depth, c);
    else add(B.x0 + a, B.y0 + b, B.z0 - 1, 0, p.depth, c);
  };
  const right = (p: FortPiece, b: number, a: number, c: boolean): void => {
    const B = p.box;
    if (p.dir <= 1) add(B.x1 + 1, B.y0 + b, B.z0 + a, 3, p.depth, c);
    else add(B.x0 + a, B.y0 + b, B.z1 + 1, 1, p.depth, c);
  };
  const children = (p: FortPiece): void => {
    switch (p.kind) {
      case "BridgeStraight": return fwd(p, 1, 3, false);
      case "BridgeCrossing": fwd(p, 8, 3, false); left(p, 3, 8, false); return right(p, 3, 8, false);
      case "RoomCrossing": fwd(p, 2, 0, false); left(p, 0, 2, false); return right(p, 0, 2, false);
      case "StairsRoom": return right(p, 6, 2, false);
      case "CastleEntrance": return fwd(p, 5, 3, true);
      case "CastleSmallCorridorPiece": case "CastleCorridorStairsPiece": return fwd(p, 1, 0, true);
      case "CastleSmallCorridorCrossingPiece": fwd(p, 1, 0, true); left(p, 0, 1, true); return right(p, 0, 1, true);
      case "CastleSmallCorridorRightTurnPiece": return right(p, 0, 1, true);
      case "CastleSmallCorridorLeftTurnPiece": return left(p, 0, 1, true);
      case "CastleCorridorTBalconyPiece": {
        const i = p.dir === 2 || p.dir === 0 ? 5 : 1;
        left(p, 0, i, randInt(rng, 0, 7) > 0);
        return right(p, 0, i, randInt(rng, 0, 7) > 0);
      }
      case "CastleStalkRoom": fwd(p, 5, 3, true); return fwd(p, 5, 11, true);
      default: return;
    }
  };
  children(start);
  while (pending.length) children(pending.splice(randInt(rng, 0, pending.length - 1), 1)[0]!);
  // dời cả pháo đài vào khoảng y 48–70
  const box = { ...start.box };
  for (const p of pieces) {
    box.x0 = Math.min(box.x0, p.box.x0); box.y0 = Math.min(box.y0, p.box.y0); box.z0 = Math.min(box.z0, p.box.z0);
    box.x1 = Math.max(box.x1, p.box.x1); box.y1 = Math.max(box.y1, p.box.y1); box.z1 = Math.max(box.z1, p.box.z1);
  }
  const [lo, hi] = FORTRESS.Y_RANGE, room = hi - lo + 1 - (box.y1 - box.y0 + 1);
  const dy = (room > 1 ? lo + randInt(rng, 0, room - 1) : lo) - box.y0;
  for (const p of pieces) Object.assign(p.box, { y0: p.box.y0 + dy, y1: p.box.y1 + dy });
  Object.assign(box, { y0: box.y0 + dy, y1: box.y1 + dy });
  const marks = fortressMarks(pieces);
  return { x, z, pieces, box, chests: marks.chests, spawners: marks.spawners };
}

/** Pháo đài theo seed Vực Lửa: tìm theo ô lưới (nhớ đệm), ô chứa điểm, gần nhất. */
export class FortressLocator {
  private readonly cache = new Map<string, Fortress | null>();
  constructor(private readonly seed: number) {}

  /** Pháo đài của ô lưới (rx, rz), hoặc null (ô dành cho tàn tích pháo đài lợn). */
  at(rx: number, rz: number): Fortress | null {
    const key = `${rx},${rz}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const F = FORTRESS, rng = mulberry32(hashInts(this.seed, rx, rz, F.SALT));
    const cx = rx * F.SPACING + randInt(rng, 0, F.SPACING - F.SEPARATION - 1), cz = rz * F.SPACING + randInt(rng, 0, F.SPACING - F.SEPARATION - 1);
    const f = randInt(rng, 0, F.WEIGHT_FORTRESS + F.WEIGHT_BASTION - 1) < F.WEIGHT_FORTRESS ? plan(cx * 16 + 2, cz * 16 + 2, rng) : null;
    if (this.cache.size > 256) this.cache.clear();
    this.cache.set(key, f);
    return f;
  }

  /** Mọi pháo đài có thể chạm vùng [x0..x1] × [z0..z1]. */
  near(x0: number, z0: number, x1: number, z1: number): Fortress[] {
    const S = FORTRESS.SPACING * 16, R = FORTRESS.REACH, out: Fortress[] = [];
    for (let rx = Math.floor((x0 - R) / S); rx <= Math.floor((x1 + R) / S); rx++)
      for (let rz = Math.floor((z0 - R) / S); rz <= Math.floor((z1 + R) / S); rz++) {
        const f = this.at(rx, rz);
        if (f && f.box.x1 >= x0 && f.box.x0 <= x1 && f.box.z1 >= z0 && f.box.z0 <= z1) out.push(f);
      }
    return out;
  }

  /** Mảnh pháo đài chứa ô (x, y, z) — vùng sinh quái riêng của pháo đài. */
  pieceAt(x: number, y: number, z: number): FortPiece | null {
    for (const f of this.near(x, z, x, z))
      for (const p of f.pieces) if (x >= p.box.x0 && x <= p.box.x1 && y >= p.box.y0 && y <= p.box.y1 && z >= p.box.z0 && z <= p.box.z1) return p;
    return null;
  }

  /** Rương pháo đài ở đúng ô này không (rương có đồ theo bảng nether_bridge). */
  chestAt(x: number, y: number, z: number): boolean {
    return this.near(x, z, x, z).some((f) => f.chests.some((c) => c[0] === x && c[1] === y && c[2] === z));
  }

  /** Pháo đài gần (x, z) nhất (dò các ô lưới theo vòng), trả về điểm đầu + độ cao giữa; null nếu không thấy. */
  nearest(x: number, z: number): { x: number; y: number; z: number } | null {
    const S = FORTRESS.SPACING * 16, rx0 = Math.floor(x / S), rz0 = Math.floor(z / S);
    let best: { x: number; y: number; z: number } | null = null, bd = Infinity;
    for (let r = 0; r <= FORTRESS.LOCATE_RADIUS; r++) {
      if (best && (r - 1) * S > bd) break; // ô xa hơn chắc chắn không gần hơn
      for (let rx = rx0 - r; rx <= rx0 + r; rx++)
        for (let rz = rz0 - r; rz <= rz0 + r; rz++) {
          if (Math.max(Math.abs(rx - rx0), Math.abs(rz - rz0)) !== r) continue;
          const f = this.at(rx, rz);
          if (!f) continue;
          const s = f.pieces[0]!.box, cx = (s.x0 + s.x1) >> 1, cz = (s.z0 + s.z1) >> 1, d = Math.hypot(cx - x, cz - z);
          if (d < bd) [bd, best] = [d, { x: cx, y: s.y0 + 5, z: cz }];
        }
    }
    return best;
  }
}
