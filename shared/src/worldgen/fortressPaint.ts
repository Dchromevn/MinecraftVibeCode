// Dựng pháo đài Vực Lửa vào chunk (Giai đoạn 10c): phát lại lệnh dựng từng mảnh (fortressPiecesGen.ts, đọc từ client.jar) theo
// hướng mảnh như Minecraft StructurePiece (getWorldX / getWorldZ; khối có hướng: lật Bắc ↔ Nam rồi xoay 90° theo hướng mảnh), chỉ
// ghi ô thuộc chunk (mảnh vắt qua nhiều chunk vẫn liền). Thứ tự mảnh như lúc lập kế hoạch. Hàng rào tự nối theo khối bên cạnh.
import { B, type BlockId } from "../blocks.js";
import { chestMeta } from "../blockMeta.js";
import { blockIndex } from "../chunk.js";
import { SPAWNER_MOBS } from "../mobTypes.js";
import { mulberry32, type Rng } from "../rng.js";
import { FORTRESS_OPS } from "./fortressPiecesGen.js";
import type { FDir, Fortress, FortPiece } from "./fortressPlan.js";

/** Hướng Minecraft → hướng ngang của game (0 Nam, 1 Tây, 2 Bắc, 3 Đông). */
const DIR: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 };
const MIRROR: Record<string, string> = { north: "south", south: "north", west: "west", east: "east" };
const CW: Record<string, string> = { north: "east", east: "south", south: "west", west: "north" };
const BLAZE_CAGE = Math.max(0, SPAWNER_MOBS.indexOf("blaze"));

/** Ô (x, y, z) trong mảnh → ô thế giới (Minecraft StructurePiece.getWorldX / Y / Z theo hướng). */
export function fortWorld(p: FortPiece, x: number, y: number, z: number): [number, number, number] {
  const b = p.box, wy = b.y0 + y;
  if (p.dir === 0) return [b.x0 + x, wy, b.z1 - z];
  if (p.dir === 1) return [b.x0 + x, wy, b.z0 + z];
  if (p.dir === 2) return [b.x1 - z, wy, b.z0 + x];
  return [b.x0 + z, wy, b.z0 + x];
}

/** Hướng khối (tên Minecraft trong mảnh) → hướng thế giới của game: Nam lật Bắc ↔ Nam; Tây lật rồi xoay; Đông xoay. */
function turn(name: string, d: FDir): number {
  let n = d === 1 || d === 2 ? MIRROR[name]! : name;
  if (d === 2 || d === 3) n = CW[n]!;
  return DIR[n]!;
}

/** Tên khối trong lệnh → [id, dữ liệu phụ] theo hướng mảnh. */
function stateOf(s: string, d: FDir): [BlockId, number] {
  if (s.startsWith("nether_brick_stairs:")) return [B.NETHER_BRICK_STAIRS, turn(s.slice(20), d)];
  switch (s) {
    case "air": return [B.AIR, 0];
    case "nether_bricks": return [B.NETHER_BRICKS, 0];
    case "nether_brick_fence": return [B.NETHER_BRICK_FENCE, 0];
    case "soul_sand": return [B.SOUL_SAND, 0];
    case "nether_wart": return [B.NETHER_WART, 0];
    case "lava": return [B.LAVA, 0];
    default: throw new Error(`pháo đài: khối lạ ${s}`);
  }
}

/** Giá trị trong lệnh: số, hoặc "r<n>" = số ngẫu nhiên 0..n−1 (đầu cầu cụt, theo seed của mảnh). */
const val = (v: string | number, rng: Rng): number => (typeof v === "number" ? v : Math.floor(rng() * Number(v.slice(1))));

/** Rương (mảnh rẽ cần rương) và lồng quỷ lửa của các mảnh — ô thế giới. */
export function fortressMarks(pieces: readonly FortPiece[]): { chests: [number, number, number][]; spawners: [number, number, number][] } {
  const chests: [number, number, number][] = [], spawners: [number, number, number][] = [];
  for (const p of pieces)
    for (const op of FORTRESS_OPS[p.kind] ?? []) {
      if (op[0] === "C" && p.chest) chests.push(fortWorld(p, op[1] as number, op[2] as number, op[3] as number));
      if (op[0] === "P") spawners.push(fortWorld(p, op[1] as number, op[2] as number, op[3] as number));
    }
  return { chests, spawners };
}

/** Dựng các pháo đài chạm chunk (cx, cz) vào data / meta. */
export function paintFortresses(data: Uint8Array, meta: Uint8Array, cx: number, cz: number, forts: readonly Fortress[]): void {
  const X0 = cx * 16, Z0 = cz * 16;
  const inChunk = (x: number, z: number): boolean => x >= X0 && x < X0 + 16 && z >= Z0 && z < Z0 + 16;
  const set = (x: number, y: number, z: number, [id, m]: [number, number]): void => {
    if (y < 1 || y > 126 || !inChunk(x, z)) return;
    const i = blockIndex(x - X0, y, z - Z0);
    data[i] = id;
    meta[i] = m;
  };
  for (const f of forts)
    for (const p of f.pieces) {
      const b = p.box;
      if (b.x1 < X0 || b.x0 > X0 + 15 || b.z1 < Z0 || b.z0 > Z0 + 15) continue;
      const rng = mulberry32(p.seed);
      for (const op of FORTRESS_OPS[p.kind] ?? []) {
        const v = op.slice(1, op[0] === "B" ? 7 : 4).map((x) => val(x, rng));
        if (op[0] === "B") box(p, v, stateOf(op[7] as string, p.dir), stateOf(op[8] as string, p.dir), op[9] === 1, X0, Z0, data, set);
        else if (op[0] === "S") set(...fortWorld(p, v[0]!, v[1]!, v[2]!), stateOf(op[4] as string, p.dir));
        else if (op[0] === "D") {
          const [x, y0, z] = fortWorld(p, v[0]!, v[1]!, v[2]!), st = stateOf(op[4] as string, p.dir);
          if (!inChunk(x, z)) continue;
          for (let y = y0; y > 1; y--) { // kéo cột xuống qua ô trống / chất lỏng tới nền (fillColumnDown)
            const id = data[blockIndex(x - X0, y, z - Z0)]!;
            if (id !== B.AIR && id !== B.LAVA && id !== B.WATER) break;
            set(x, y, z, st);
          }
        } else if (op[0] === "C" && p.chest) {
          const [x, y, z] = fortWorld(p, v[0]!, v[1]!, v[2]!);
          // rương quay ra lòng hành lang (rương sát tường bên trái / phải của mảnh rẽ)
          const out = v[0]! < 2 ? (p.dir <= 1 ? 3 : 0) : (p.dir <= 1 ? 1 : 2);
          if (inChunk(x, z) && data[blockIndex(x - X0, y, z - Z0)] === B.AIR) set(x, y, z, [B.CHEST, chestMeta(out, 0)]);
        } else if (op[0] === "P") set(...fortWorld(p, v[0]!, v[1]!, v[2]!), [B.SPAWNER, BLAZE_CAGE]);
      }
    }
}

/** generateBox: hộp [x0..x1] × [y0..y1] × [z0..z1] trong mảnh; viền / trong; skip = chỉ thay ô không trống. */
function box(
  p: FortPiece, v: number[], edge: [number, number], inner: [number, number], skip: boolean, X0: number, Z0: number, data: Uint8Array,
  set: (x: number, y: number, z: number, s: [number, number]) => void,
): void {
  const [a, b0, c, d, e, f] = v as [number, number, number, number, number, number];
  for (let x = a; x <= d; x++)
    for (let z = c; z <= f; z++) {
      const [wx, , wz] = fortWorld(p, x, 0, z);
      if (wx < X0 || wx > X0 + 15 || wz < Z0 || wz > Z0 + 15) continue;
      for (let y = b0; y <= e; y++) {
        const wy = p.box.y0 + y;
        if (wy < 1 || wy > 126) continue;
        if (skip && data[blockIndex(wx - X0, wy, wz - Z0)] === B.AIR) continue;
        const onEdge = y === b0 || y === e || x === a || x === d || z === c || z === f;
        set(wx, wy, wz, onEdge ? edge : inner);
      }
    }
}
