// Lưu một vùng block trong game thành mẫu công trình (Giai đoạn 8a, lệnh /structure save <tên> x1 y1 z1 x2 y2 z2): mọi ô kể cả
// không khí (đặt vào làng thì đục chỗ). Thêm một khối ghép "building_entrance" ở mép trước để nối vào đường làng: mép có cửa gần
// mép nhất (khối ghép ngang chân cửa — chân cửa nằm ngay trên mặt đất, sàn thay lớp cỏ), không có cửa thì mép gần người chơi nhất.
import { B } from "./blocks.js";
import type { CellReader } from "./collide.js";
import type { Jig, StructTemplate } from "./structures.js";

export const STRUCTURE_SAVE = { MAX_XZ: 48, MAX_Y: 32, MIN_XZ: 3, NAME_RE: /^[a-z0-9_-]{1,24}$/ } as const;
const DOORS = new Set<number>([B.DOOR, B.SPRUCE_DOOR, B.BIRCH_DOOR, B.ACACIA_DOOR, B.DARK_OAK_DOOR, B.IRON_DOOR]);

/** Vùng → mẫu, hoặc chuỗi lỗi ("size" quá to / nhỏ, "unloaded" chưa tải). (px, py, pz): vị trí người chơi. */
export function captureStructure(cell: CellReader, a: [number, number, number], b: [number, number, number], px: number, py: number, pz: number): StructTemplate | "size" | "unloaded" {
  const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), z0 = Math.min(a[2], b[2]);
  const sx = Math.abs(a[0] - b[0]) + 1, sy = Math.abs(a[1] - b[1]) + 1, sz = Math.abs(a[2] - b[2]) + 1;
  const S = STRUCTURE_SAVE;
  if (sx > S.MAX_XZ || sz > S.MAX_XZ || sy > S.MAX_Y || sx < S.MIN_XZ || sz < S.MIN_XZ || y0 < 1) return "size";
  const pal: number[] = [], idx = new Map<number, number>(), cells: number[] = [];
  const doors: [number, number, number][] = [];
  for (let y = 0; y < sy; y++)
    for (let z = 0; z < sz; z++)
      for (let x = 0; x < sx; x++) {
        const c = cell(x0 + x, y0 + y, z0 + z);
        if (c < 0) return "unloaded";
        let i = idx.get(c);
        if (i === undefined) idx.set(c, (i = pal.push(c) - 1));
        cells.push(x, y, z, i);
        if (DOORS.has(c & 255) && !((c >> 8) & 8)) doors.push([x, y, z]); // nửa dưới cửa
      }
  // mép: 0 bắc (z = 0), 1 nam (z = sz - 1), 2 tây (x = 0), 3 đông (x = sx - 1) — khoảng cách tới mép
  const edgeDist = (x: number, z: number): number[] => [z, sz - 1 - z, x, sx - 1 - x];
  let side: number, jx: number, jy: number, jz: number;
  if (doors.length) {
    const best = doors.map((d) => ({ d, e: edgeDist(d[0], d[2]) })).sort((p, q) => Math.min(...p.e) - Math.min(...q.e))[0]!;
    side = best.e.indexOf(Math.min(...best.e));
    [jx, jy, jz] = best.d;
  } else {
    const rx = px - x0, rz = pz - z0;
    const out = [-rz, rz - (sz - 1), -rx, rx - (sx - 1)]; // người đứng ngoài mép nào nhất
    side = out.indexOf(Math.max(...out));
    jx = sx >> 1;
    jz = sz >> 1;
    jy = Math.max(0, Math.min(sy - 1, Math.floor(py) - y0));
  }
  if (side === 0) jz = 0;
  else if (side === 1) jz = sz - 1;
  else if (side === 2) jx = 0;
  else jx = sx - 1;
  const front = ["north", "south", "west", "east"][side]!;
  const at = cells[((jy * sz + jz) * sx + jx) * 4 + 3]!;
  const jig: Jig = [jx, jy, jz, `${front}_up`, "building_entrance", "building_entrance", "", pal[at]!];
  return { size: [sx, sy, sz], pal, cells, loot: [], jig: [jig] };
}
