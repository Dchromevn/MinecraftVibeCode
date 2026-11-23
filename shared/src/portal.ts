// Cổng Vực Lửa (Giai đoạn 10a; như Minecraft PortalShape): khung đá vỏ chai hình chữ nhật đứng (không cần 4 góc), lòng rộng 2..21 ×
// cao 3..21, nằm dọc trục X hoặc Z; lòng trống (không khí / lửa) thì châm bằng bật lửa thành khối cổng.
import { B } from "./blocks.js";
import { PORTAL } from "./netherConstants.js";

type Get = (x: number, y: number, z: number) => number; // cell (id | meta << 8); âm = chưa tải
const idOf = (c: number): number => (c < 0 ? -1 : c & 255);
const open = (id: number): boolean => id === B.AIR || id === B.FIRE || id === B.NETHER_PORTAL;

export interface PortalShape { axis: 0 | 1; cells: [number, number, number][] }

/** Lòng cổng chứa ô (x, y, z), hoặc null nếu không nằm trong khung đá vỏ chai hợp lệ. Thử trục X trước rồi Z. */
export function findPortal(get: Get, x: number, y: number, z: number): PortalShape | null {
  const id = (a: number, b: number, c: number): number => idOf(get(a, b, c));
  if (!open(id(x, y, z))) return null;
  for (const axis of [0, 1] as const) {
    const dx = axis === 0 ? 1 : 0, dz = 1 - dx;
    let by = y;
    while (by > y - PORTAL.MAX_H && open(id(x, by - 1, z))) by--;
    if (id(x, by - 1, z) !== B.OBSIDIAN) continue;
    let lx = x, lz = z;
    for (let n = 0; n < PORTAL.MAX_W && open(id(lx - dx, by, lz - dz)) && id(lx - dx, by - 1, lz - dz) === B.OBSIDIAN; n++) [lx, lz] = [lx - dx, lz - dz];
    if (id(lx - dx, by, lz - dz) !== B.OBSIDIAN) continue;
    let w = 0;
    while (w <= PORTAL.MAX_W && open(id(lx + dx * w, by, lz + dz * w)) && id(lx + dx * w, by - 1, lz + dz * w) === B.OBSIDIAN) w++;
    if (w < PORTAL.MIN_W || w > PORTAL.MAX_W || id(lx + dx * w, by, lz + dz * w) !== B.OBSIDIAN) continue;
    let h = 0;
    for (; h <= PORTAL.MAX_H; h++) {
      const yy = by + h;
      let rowOpen = true;
      for (let i = 0; i < w && rowOpen; i++) rowOpen = open(id(lx + dx * i, yy, lz + dz * i));
      if (!rowOpen) break;
      if (id(lx - dx, yy, lz - dz) !== B.OBSIDIAN || id(lx + dx * w, yy, lz + dz * w) !== B.OBSIDIAN) {
        h = -1;
        break;
      }
    }
    if (h < PORTAL.MIN_H || h > PORTAL.MAX_H) continue;
    let top = true;
    for (let i = 0; i < w && top; i++) top = id(lx + dx * i, by + h, lz + dz * i) === B.OBSIDIAN;
    if (!top || y >= by + h) continue;
    const cells: [number, number, number][] = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cells.push([lx + dx * i, by + j, lz + dz * i]);
    return { axis, cells };
  }
  return null;
}

/** Hộp người chơi (x, y, z chân; rộng w, cao h) có chạm khối cổng không. */
export function inPortal(get: Get, x: number, y: number, z: number, w: number, h: number): boolean {
  for (let yy = Math.floor(y); yy <= Math.floor(y + h - 1e-6); yy++)
    for (let xx = Math.floor(x - w / 2); xx <= Math.floor(x + w / 2 - 1e-6); xx++)
      for (let zz = Math.floor(z - w / 2); zz <= Math.floor(z + w / 2 - 1e-6); zz++) if (idOf(get(xx, yy, zz)) === B.NETHER_PORTAL) return true;
  return false;
}
