// Đặt mẫu công trình vào chunk (Giai đoạn 7e): xoay mẫu 0–3 lần 90° theo chiều kim đồng hồ (nhìn từ trên; hướng của block
// xoay theo), chỉ vẽ phần nằm trong chunk đang sinh — chunk nào cũng tính ra cùng kết quả nên công trình vắt qua ranh giới
// vẫn liền. Có thể lấp móng (đất trũng dưới công trình) và đổi từng ô (cổng đổ nát: rêu, nứt, vàng mất...).
import { B } from "../blocks.js";
import { BLOCKS } from "../blockTable.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { STRUCT } from "../structureConstants.js";
import type { StructTemplate } from "../structures.js";

export interface Piece {
  t: StructTemplate;
  rot: number; // số lần xoay 90° theo chiều kim đồng hồ
  x: number; y: number; z: number; // góc nhỏ nhất (thế giới) sau khi xoay
  air: boolean; // vẽ cả ô không khí của mẫu (đục địa hình bên trong) hay bỏ qua
  fill?: number; // lấp móng dưới lớp đáy bằng ô này
  /** Đổi ô theo vị trí thế giới (null = bỏ ô). */
  proc?: (cell: number, x: number, y: number, z: number) => number | null;
  /** Thay ô theo vị trí trong mẫu "x,y,z" (chưa xoay). */
  over?: ReadonlyMap<string, number>;
  /** (8a) Mảnh bám mặt đất (đường làng): vẽ bằng villagePaint, mỗi cột theo độ cao mặt đất. */
  terrain?: boolean;
  /** (8c) Lật mẫu trước khi xoay (như Minecraft Mirror): 1 lật trục Z (LEFT_RIGHT), 2 lật trục X (FRONT_BACK). */
  mir?: number;
  /** (8c) Lấp móng sâu tối đa (mặc định STRUCT.FOUNDATION_MAX). */
  fillMax?: number;
}

/** Kích thước sau khi xoay. */
export const rotSize = (t: StructTemplate, rot: number): [number, number, number] =>
  rot & 1 ? [t.size[2], t.size[1], t.size[0]] : [t.size[0], t.size[1], t.size[2]];

/** Vị trí (x, z) trong mẫu → vị trí sau khi xoay (vẫn tính từ góc nhỏ nhất). */
export function rotXZ(t: StructTemplate, rot: number, x: number, z: number): [number, number] {
  const sx = t.size[0], sz = t.size[2];
  switch (rot & 3) {
    case 1: return [sz - 1 - z, x];
    case 2: return [sx - 1 - x, sz - 1 - z];
    case 3: return [z, sx - 1 - x];
    default: return [x, z];
  }
}

/** Hướng ngang (0 Nam, 1 Tây, 2 Bắc, 3 Đông) xoay theo chiều kim đồng hồ rot lần. */
export const rotDir = (d: number, rot: number): number => (d + rot) & 3;

/** Xoay dữ liệu phụ của ô theo kiểu block (hướng mặt trước, bậc, giường, thang, đuốc, cửa, nút). */
export function rotateCell(cell: number, rot: number): number {
  if (!(rot & 3)) return cell;
  const id = cell & 255, m = cell >> 8, kind = BLOCKS[id]?.meta;
  let nm = m;
  switch (kind) {
    case "facing": case "chest": case "stairs": case "bed": case "ladder": case "door":
      nm = (m & ~3) | rotDir(m & 3, rot);
      break;
    case "torch":
      if (m >= 1 && m <= 4) nm = rotDir(m - 1, rot) + 1;
      break;
    case "switch":
      if ((m & 7) >= 2) nm = (m & ~7) | (rotDir((m & 7) - 2, rot) + 2);
      break;
    default: break;
  }
  return id | (nm << 8);
}

/** (8c) Lật dữ liệu phụ của ô theo trục (1: Nam ↔ Bắc, 2: Tây ↔ Đông); bậc đổi góc trái ↔ phải, cửa đổi bản lề. */
export function mirrorCell(cell: number, mir: number): number {
  if (!mir) return cell;
  const id = cell & 255, m = cell >> 8, kind = BLOCKS[id]?.meta;
  const flip = (d: number): number => (mir === 1 ? (d === 0 ? 2 : d === 2 ? 0 : d) : d === 1 ? 3 : d === 3 ? 1 : d);
  let nm = m;
  switch (kind) {
    case "facing": case "chest": case "bed": case "ladder":
      nm = (m & ~3) | flip(m & 3);
      break;
    case "door":
      nm = ((m & ~3) | flip(m & 3)) ^ 16;
      break;
    case "stairs": {
      const shape = (m >> 3) & 7, sw = shape === 1 ? 2 : shape === 2 ? 1 : shape === 3 ? 4 : shape === 4 ? 3 : shape;
      nm = (m & 4) | flip(m & 3) | (sw << 3);
      break;
    }
    case "torch":
      if (m >= 1 && m <= 4) nm = flip(m - 1) + 1;
      break;
    case "switch":
      if ((m & 7) >= 2) nm = (m & ~7) | (flip((m & 7) - 2) + 2);
      break;
    default: break;
  }
  return id | (nm << 8);
}

/** (8c) Vị trí trong mẫu sau khi lật (vẫn trong hộp mẫu). */
const mirXZ = (p: Piece, x: number, z: number): [number, number] =>
  p.mir === 1 ? [x, p.t.size[2] - 1 - z] : p.mir === 2 ? [p.t.size[0] - 1 - x, z] : [x, z];

/** Vị trí thế giới của ô (x, y, z) trong mẫu. */
export function worldOf(p: Piece, x: number, y: number, z: number): [number, number, number] {
  [x, z] = mirXZ(p, x, z);
  const [rx, rz] = rotXZ(p.t, p.rot, x, z);
  return [p.x + rx, p.y + y, p.z + rz];
}

/** Hình chữ nhật (thế giới) mà mảnh chiếm. */
export function pieceBox(p: Piece): { x0: number; z0: number; x1: number; z1: number } {
  const [sx, , sz] = rotSize(p.t, p.rot);
  return { x0: p.x, z0: p.z, x1: p.x + sx - 1, z1: p.z + sz - 1 };
}

const fillable = (id: number): boolean => id === B.AIR || !BLOCKS[id]!.solid || BLOCKS[id]!.meta === "leaves" || id === B.WATER;

/** Vẽ phần của mảnh nằm trong chunk (cx, cz). */
export function paintPiece(p: Piece, data: Uint8Array, meta: Uint8Array, cx: number, cz: number): void {
  const X0 = cx * 16, Z0 = cz * 16, b = pieceBox(p);
  if (b.x1 < X0 || b.x0 > X0 + 15 || b.z1 < Z0 || b.z0 > Z0 + 15) return;
  const c = p.t.cells, pal = p.t.pal;
  for (let i = 0; i < c.length; i += 4) {
    const x = c[i]!, y = c[i + 1]!, z = c[i + 2]!;
    let cell = p.over?.get(`${x},${y},${z}`) ?? pal[c[i + 3]!]!;
    if (cell === 0 && !p.air) continue;
    const [wx, wy, wz] = worldOf(p, x, y, z);
    const lx = wx - X0, lz = wz - Z0;
    if (lx < 0 || lz < 0 || lx > 15 || lz > 15 || wy < 1 || wy >= CHUNK_HEIGHT) continue;
    if (p.proc) {
      const r = p.proc(cell, wx, wy, wz);
      if (r === null) continue;
      cell = r;
    }
    cell = rotateCell(mirrorCell(cell, p.mir ?? 0), p.rot);
    const k = blockIndex(lx, wy, lz);
    data[k] = cell & 255;
    meta[k] = cell >> 8;
    // lấp móng: ô đáy đặc mà dưới là khoảng trống / nước / cây cỏ → lấp xuống tối đa FOUNDATION_MAX block
    if (y === 0 && p.fill !== undefined && cell !== 0)
      for (let d = 1, yy = wy - 1; d <= (p.fillMax ?? STRUCT.FOUNDATION_MAX) && yy >= 1; d++, yy--) {
        const j = blockIndex(lx, yy, lz);
        if (!fillable(data[j]!)) break;
        data[j] = p.fill & 255;
        meta[j] = p.fill >> 8;
      }
  }
}
