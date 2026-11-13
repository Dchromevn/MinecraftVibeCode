// Đồ xây dựng (DESIGN.md 2.13, Giai đoạn 4e): bậc, tấm, tường; nhận diện hàng rào / cửa mọi loài gỗ.
// Hộp hình dạng tính cho hướng chuẩn 0 (Nam, +Z) rồi xoay. Dạng góc của bậc tự tính theo bậc kề (như ray).
import { BLOCKS, type BlockBox } from "./blocks.js";
import { HDX, HDZ, rotXZ } from "./blockMeta.js";

type IdAt = (x: number, y: number, z: number) => number;
type CellAt = (x: number, y: number, z: number) => number;

const render = (id: number): string | undefined => BLOCKS[id]?.render;
export const isStairs = (id: number): boolean => render(id) === "stairs";
export const isSlab = (id: number): boolean => render(id) === "slab";
export const isWall = (id: number): boolean => render(id) === "wall";
export const isFence = (id: number): boolean => render(id) === "fence";
export const isDoor = (id: number): boolean => render(id) === "door";

// ---- dữ liệu phụ ----
export const SLAB_BOTTOM = 0;
export const SLAB_TOP = 1;
export const SLAB_DOUBLE = 2;

export type StairShape = "straight" | "inner_left" | "inner_right" | "outer_left" | "outer_right";
const SHAPES: readonly StairShape[] = ["straight", "inner_left", "inner_right", "outer_left", "outer_right"];
export const stairsMeta = (dir: number, upside: boolean, shape: StairShape = "straight"): number =>
  (dir & 3) | (upside ? 4 : 0) | (SHAPES.indexOf(shape) << 3);
export const stairsDir = (m: number): number => m & 3;
export const stairsUpside = (m: number): boolean => (m & 4) !== 0;
export const stairsShape = (m: number): StairShape => SHAPES[(m >> 3) & 7] ?? "straight";
/** Hướng "bên trái" khi nhìn về phía cao d (ngược chiều kim đồng hồ nhìn từ trên). */
const ccw = (d: number): number => (d + 3) & 3;

// ---- hộp hình dạng ----
function rotBox(b: BlockBox, d: number): BlockBox {
  const [ax, az] = rotXZ(b[0], b[2], d);
  const [bx, bz] = rotXZ(b[3], b[5], d);
  return [Math.min(ax, bx), b[1], Math.min(az, bz), Math.max(ax, bx), b[4], Math.max(az, bz)];
}
const flipY = (b: BlockBox): BlockBox => [b[0], 1 - b[4], b[2], b[3], 1 - b[1], b[5]];

/** Phần trên của bậc cho hướng chuẩn 0 (phía cao = +Z; "trái" = +X). */
const STAIR_TOP: Readonly<Record<StairShape, readonly BlockBox[]>> = {
  straight: [[0, 0.5, 0.5, 1, 1, 1]],
  outer_left: [[0.5, 0.5, 0.5, 1, 1, 1]],
  outer_right: [[0, 0.5, 0.5, 0.5, 1, 1]],
  inner_left: [[0, 0.5, 0.5, 1, 1, 1], [0.5, 0.5, 0, 1, 1, 0.5]],
  inner_right: [[0, 0.5, 0.5, 1, 1, 1], [0, 0.5, 0, 0.5, 1, 0.5]],
};

/** Hộp của bậc (dùng chung cho va chạm, nhắm, vẽ, icon). */
export function stairBoxes(meta: number): BlockBox[] {
  const d = stairsDir(meta), up = stairsUpside(meta);
  const boxes: BlockBox[] = [[0, 0, 0, 1, 0.5, 1], ...STAIR_TOP[stairsShape(meta)].map((b) => rotBox(b, d))];
  return up ? boxes.map(flipY) : boxes;
}

export function slabBox(meta: number): BlockBox {
  const h = meta & 3;
  return h === SLAB_DOUBLE ? [0, 0, 0, 1, 1, 1] : h === SLAB_TOP ? [0, 0.5, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1];
}

/** Tường nối với tường và khối đặc kề. */
export function wallJoins(id: number): boolean {
  return isWall(id) || (BLOCKS[id]?.opaque ?? false);
}

/**
 * Hộp tường: cột giữa (rộng 8/16) + tay nối rộng 6/16 tới mỗi hướng có tường / khối đặc. Tay cao armH,
 * cột cao postH; tường thẳng (chỉ hai hướng đối nhau) và trên đầu trống thì không có cột riêng.
 */
export function wallBoxes(x: number, y: number, z: number, idAt: IdAt, postH: number, armH: number): BlockBox[] {
  const conn = [0, 1, 2, 3].map((d) => wallJoins(idAt(x + HDX[d]!, y, z + HDZ[d]!)));
  const straight = (conn[0] && conn[2] && !conn[1] && !conn[3]) || (conn[1] && conn[3] && !conn[0] && !conn[2]);
  const out: BlockBox[] = [];
  if (!straight || isWall(idAt(x, y + 1, z))) out.push([4 / 16, 0, 4 / 16, 12 / 16, postH, 12 / 16]);
  for (let d = 0; d < 4; d++) if (conn[d]) out.push(rotBox([5 / 16, 0, 0.5, 11 / 16, armH, 1], d));
  return out;
}

// ---- dạng góc của bậc (theo bậc trước / sau, cùng nửa) ----
function stairAt(cellAt: CellAt, x: number, y: number, z: number): { dir: number; up: boolean } | null {
  const c = cellAt(x, y, z);
  if (c < 0 || !isStairs(c & 255)) return null;
  return { dir: stairsDir(c >> 8), up: stairsUpside(c >> 8) };
}

/** Bậc ở hướng side của (x, y, z) có "khóa" hình dạng không (cùng hướng, cùng nửa thì có). */
function locks(cellAt: CellAt, x: number, y: number, z: number, side: number, dir: number, up: boolean): boolean {
  const n = stairAt(cellAt, x + HDX[side]!, y, z + HDZ[side]!);
  return !!n && n.dir === dir && n.up === up;
}

/** Dạng của bậc hướng dir tại (x, y, z): góc ngoài theo bậc phía cao, góc trong theo bậc phía thấp. */
export function stairShapeAt(cellAt: CellAt, x: number, y: number, z: number, dir: number, up: boolean): StairShape {
  const back = stairAt(cellAt, x + HDX[dir]!, y, z + HDZ[dir]!);
  if (back && back.up === up && (back.dir & 1) !== (dir & 1) && !locks(cellAt, x, y, z, (back.dir + 2) & 3, dir, up))
    return back.dir === ccw(dir) ? "outer_left" : "outer_right";
  const fd = (dir + 2) & 3;
  const front = stairAt(cellAt, x + HDX[fd]!, y, z + HDZ[fd]!);
  if (front && front.up === up && (front.dir & 1) !== (dir & 1) && !locks(cellAt, x, y, z, front.dir, dir, up))
    return front.dir === ccw(dir) ? "inner_left" : "inner_right";
  return "straight";
}

/** Tính lại dạng các bậc ở (x, y, z) và 4 ô kề; setCell chỉ được gọi khi dạng đổi. */
export function updateStairsAround(x: number, y: number, z: number, cellAt: CellAt, setCell: (x: number, y: number, z: number, id: number, meta: number) => void): void {
  for (let d = -1; d < 4; d++) {
    const px = d < 0 ? x : x + HDX[d]!, pz = d < 0 ? z : z + HDZ[d]!;
    const c = cellAt(px, y, pz);
    if (c < 0 || !isStairs(c & 255)) continue;
    const m = c >> 8, dir = stairsDir(m), up = stairsUpside(m);
    const next = stairsMeta(dir, up, stairShapeAt(cellAt, px, y, pz, dir, up));
    if (next !== m) setCell(px, y, pz, c & 255, next);
  }
}
