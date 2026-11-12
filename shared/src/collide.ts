// Va chạm AABB với block, theo từng trục (Y rồi X rồi Z): không xuyên kể cả khi rơi
// nhanh (mỗi trục cắt quãng đi theo mọi hộp trên đường), tự bước lên bậc thấp, và
// giữ không rơi khỏi mép khi ngồi. Hộp: [x0, y0, z0, x1, y1, z1] tọa độ thế giới.
import { cellId } from "./blockMeta.js";
import { collisionBoxes } from "./blockShapes.js";

/** Đọc ô: id | dữ liệu phụ << 8; số âm = chunk chưa tải (coi như khối đặc). */
export type CellReader = (x: number, y: number, z: number) => number;

const EPS = 1e-7;

/** Gom các hộp va chạm chạm tới vùng [x0..x1] (thêm 1 ô phía dưới cho rào cao 1.5). */
function gather(cell: CellReader, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): number[] {
  const out: number[] = [];
  const idAt = (x: number, y: number, z: number): number => {
    const c = cell(x, y, z);
    return c < 0 ? 0 : cellId(c);
  };
  for (let y = Math.floor(y0) - 1; y <= Math.floor(y1); y++)
    for (let z = Math.floor(z0); z <= Math.floor(z1); z++)
      for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
        const c = y < 0 ? 0 : cell(x, y, z);
        if (y < 0 || c < 0) {
          out.push(x, y, z, x + 1, y + 1, z + 1); // dưới đáy thế giới / chưa tải: đặc
          continue;
        }
        for (const b of collisionBoxes(c, x, y, z, idAt))
          out.push(x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]);
      }
  return out;
}

/** Cắt quãng d theo trục axis (0 x, 1 y, 2 z) để hộp không lọt vào hộp nào. */
function clip(boxes: number[], a: number[], axis: number, d: number): number {
  if (d === 0) return 0;
  const p = (axis + 1) % 3, q = (axis + 2) % 3;
  for (let i = 0; i < boxes.length; i += 6) {
    if (a[p]! >= boxes[i + p + 3]! - EPS || a[p + 3]! <= boxes[i + p]! + EPS) continue;
    if (a[q]! >= boxes[i + q + 3]! - EPS || a[q + 3]! <= boxes[i + q]! + EPS) continue;
    if (d > 0 && a[axis + 3]! <= boxes[i + axis]! + EPS) d = Math.min(d, boxes[i + axis]! - a[axis + 3]!);
    else if (d < 0 && a[axis]! >= boxes[i + axis + 3]! - EPS) d = Math.max(d, boxes[i + axis + 3]! - a[axis]!);
  }
  return d;
}

function shift(a: number[], axis: number, d: number): void {
  a[axis] = a[axis]! + d;
  a[axis + 3] = a[axis + 3]! + d;
}

/** Hộp a dịch (dx, dy, dz) có chồng lên hộp nào không. */
function overlaps(boxes: number[], a: number[], dx: number, dy: number, dz: number): boolean {
  for (let i = 0; i < boxes.length; i += 6) {
    if (a[0]! + dx >= boxes[i + 3]! - EPS || a[3]! + dx <= boxes[i]! + EPS) continue;
    if (a[1]! + dy >= boxes[i + 4]! - EPS || a[4]! + dy <= boxes[i + 1]! + EPS) continue;
    if (a[2]! + dz >= boxes[i + 5]! - EPS || a[5]! + dz <= boxes[i + 2]! + EPS) continue;
    return true;
  }
  return false;
}

export interface MoveOptions {
  step: number; // bước lên tối đa (0 = không)
  edgeDrop: number; // > 0: đang ngồi trên đất, không đi khỏi mép cao từ mức này
}

export interface MoveResult {
  dx: number; // quãng thực đi được
  dy: number;
  dz: number;
  hitX: boolean;
  hitZ: boolean;
  landed: boolean; // chạm đất khi đi xuống
  hitCeiling: boolean;
}

/** Di chuyển hộp a (bị sửa trực tiếp) với quãng mong muốn (dx, dy, dz). */
export function moveBox(cell: CellReader, a: number[], dx: number, dy: number, dz: number, opt: MoveOptions): MoveResult {
  const m = opt.step + 1;
  const boxes = gather(
    cell,
    Math.min(a[0]!, a[0]! + dx) - m, Math.min(a[1]!, a[1]! + dy) - m, Math.min(a[2]!, a[2]! + dz) - m,
    Math.max(a[3]!, a[3]! + dx) + m, Math.max(a[4]!, a[4]! + dy) + m, Math.max(a[5]!, a[5]! + dz) + m,
  );

  if (opt.edgeDrop > 0 && dy <= 0) {
    // thu nhỏ bước ngang tới khi bên dưới vẫn còn chỗ đứng (trong tầm edgeDrop)
    const inc = 0.05, down = -opt.edgeDrop;
    const stepTo0 = (v: number): number => (Math.abs(v) < inc ? 0 : v - Math.sign(v) * inc);
    while (dx !== 0 && !overlaps(boxes, a, dx, down, 0)) dx = stepTo0(dx);
    while (dz !== 0 && !overlaps(boxes, a, 0, down, dz)) dz = stepTo0(dz);
    while (dx !== 0 && dz !== 0 && !overlaps(boxes, a, dx, down, dz)) {
      dx = stepTo0(dx);
      dz = stepTo0(dz);
    }
  }

  const start = a.slice();
  const ry = clip(boxes, a, 1, dy);
  shift(a, 1, ry);
  const rx = clip(boxes, a, 0, dx);
  shift(a, 0, rx);
  const rz = clip(boxes, a, 2, dz);
  shift(a, 2, rz);
  const res: MoveResult = {
    dx: rx, dy: ry, dz: rz,
    hitX: rx !== dx, hitZ: rz !== dz,
    landed: dy < 0 && ry !== dy, hitCeiling: dy > 0 && ry !== dy,
  };

  // bước lên bậc: thử nâng lên, đi ngang, rồi hạ xuống; nhận nếu đi ngang được xa hơn
  const onFloor = dy <= 0 && (res.landed || overlaps(boxes, start, 0, -0.01, 0));
  if (opt.step > 0 && onFloor && (res.hitX || res.hitZ)) {
    const b = start.slice();
    const up = clip(boxes, b, 1, opt.step);
    shift(b, 1, up);
    const sx = clip(boxes, b, 0, dx);
    shift(b, 0, sx);
    const sz = clip(boxes, b, 2, dz);
    shift(b, 2, sz);
    const want = Math.min(dy, 0) - up;
    const down = clip(boxes, b, 1, want);
    shift(b, 1, down);
    if (sx * sx + sz * sz > rx * rx + rz * rz + 1e-9) {
      for (let i = 0; i < 6; i++) a[i] = b[i]!;
      return { dx: sx, dy: up + down, dz: sz, hitX: sx !== dx, hitZ: sz !== dz, landed: down !== want, hitCeiling: false };
    }
  }
  return res;
}

/** Hộp a có đang chồng lên block đặc nào không (dùng khi chọn chỗ hồi sinh). */
export function boxBlocked(cell: CellReader, a: number[]): boolean {
  const boxes = gather(cell, a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, a[5]!);
  return overlaps(boxes, a, 0, 0, 0);
}
