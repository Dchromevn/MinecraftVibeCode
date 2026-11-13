// Đồ trang trí / cơ cấu (DESIGN.md 2.13, Giai đoạn 4f): tấm kính, song sắt, lồng đèn, nút, cần gạt và cửa
// sắt mở theo nút / cần gạt ở gần (không có dây dẫn). Hộp hình dạng dùng chung cho va chạm, nhắm, vẽ.
import { B, BLOCKS, type BlockBox } from "./blocks.js";
import { HDX, HDZ, doorUpper, rotXZ } from "./blockMeta.js";
import { SWITCHES } from "./constants.js";
import { isWall } from "./building.js";

type IdAt = (x: number, y: number, z: number) => number;
type CellAt = (x: number, y: number, z: number) => number;
type SetCell = (x: number, y: number, z: number, id: number, meta: number) => void;

const render = (id: number): string | undefined => BLOCKS[id]?.render;
export const isPane = (id: number): boolean => render(id) === "pane";
export const isSwitch = (id: number): boolean => render(id) === "button" || render(id) === "lever";
export const isButton = (id: number): boolean => render(id) === "button";

function rotBox(b: BlockBox, d: number): BlockBox {
  const [ax, az] = rotXZ(b[0], b[2], d);
  const [bx, bz] = rotXZ(b[3], b[5], d);
  return [Math.min(ax, bx), b[1], Math.min(az, bz), Math.max(ax, bx), b[4], Math.max(az, bz)];
}
const px = (n: number): number => n / 16;

// ---- tấm kính, song sắt: cột mỏng giữa + tay nối tới tấm / song sắt / tường / khối đặc kề ----
export const paneJoins = (id: number): boolean => isPane(id) || isWall(id) || (BLOCKS[id]?.opaque ?? false);

export function paneBoxes(x: number, y: number, z: number, idAt: IdAt): BlockBox[] {
  const out: BlockBox[] = [[px(7), 0, px(7), px(9), 1, px(9)]];
  for (let d = 0; d < 4; d++) if (paneJoins(idAt(x + HDX[d]!, y, z + HDZ[d]!))) out.push(rotBox([px(7), 0, px(9), px(9), 1, 1], d));
  return out;
}

// ---- lồng đèn: thân 6x7x6 + nắp 4x2x4; treo thì nhấc lên 1/16 ----
export const lanternHanging = (m: number): boolean => (m & 1) !== 0;
export function lanternBoxes(meta: number): BlockBox[] {
  const o = lanternHanging(meta) ? px(1) : 0;
  return [[px(5), o, px(5), px(11), o + px(7), px(11)], [px(6), o + px(7), px(6), px(10), o + px(9), px(10)]];
}

// ---- nút, cần gạt: bit 0–2 chỗ gắn (0 sàn, 1 trần, 2..5 tường hướng giá trị − 2), bit 3 đang bật ----
export const switchMeta = (face: number, on: boolean): number => (face & 7) | (on ? 8 : 0);
export const switchFace = (m: number): number => m & 7;
export const switchOn = (m: number): boolean => (m & 8) !== 0;
/** Ô block mà nút / cần gạt gắn vào. */
export function switchAnchor(m: number, x: number, y: number, z: number): [number, number, number] {
  const f = switchFace(m);
  if (f === 0) return [x, y - 1, z];
  if (f === 1) return [x, y + 1, z];
  return [x + HDX[(f - 2) & 3]!, y, z + HDZ[(f - 2) & 3]!];
}
/** Hộp vẽ cho trường hợp gắn sàn → theo chỗ gắn thật (trần: lật dọc; tường: dựng đứng áp vào tường). */
function placeOnFace(b: BlockBox, face: number): BlockBox {
  if (face === 0) return b;
  if (face === 1) return [b[0], 1 - b[4], b[2], b[3], 1 - b[1], b[5]];
  // tường ở hướng 0 (+Z): chiều cao trên sàn → khoảng cách từ tường; z sàn → độ cao
  return rotBox([b[0], b[2], 1 - b[4], b[3], b[5], 1 - b[1]], (face - 2) & 3);
}
export function buttonBoxes(meta: number): BlockBox[] {
  return [placeOnFace([px(5), 0, px(6), px(11), px(switchOn(meta) ? 1 : 2), px(10)], switchFace(meta))];
}
/** Cần gạt: đế (đá cuội) và tay gạt (nghiêng về một phía theo trạng thái bật / tắt). */
export function leverBoxes(meta: number): { base: BlockBox; handle: BlockBox } {
  const f = switchFace(meta), on = switchOn(meta);
  return {
    base: placeOnFace([px(5), 0, px(4), px(11), px(3), px(12)], f),
    handle: placeOnFace(on ? [px(7), px(3), px(8), px(9), px(10), px(11)] : [px(7), px(3), px(5), px(9), px(10), px(8)], f),
  };
}

// ---- cửa sắt theo nút / cần gạt ----
function powered(cellAt: CellAt, x: number, y: number, z: number): boolean {
  const r = SWITCHES.POWER_RANGE;
  for (let dy = -r; dy <= r; dy++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > r) continue;
        const c = cellAt(x + dx, y + dy, z + dz);
        if (c > 0 && isSwitch(c & 255) && switchOn(c >> 8)) return true;
      }
  return false;
}

/** Cập nhật mọi cửa sắt quanh (x, y, z): mở khi có nút / cần gạt đang bật đủ gần một trong hai nửa. */
export function refreshIronDoors(cellAt: CellAt, setCell: SetCell, x: number, y: number, z: number): void {
  const r = SWITCHES.POWER_RANGE + 1;
  for (let dy = -r; dy <= r; dy++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        const lx = x + dx, ly = y + dy, lz = z + dz;
        const c = cellAt(lx, ly, lz);
        if (c <= 0 || (c & 255) !== B.IRON_DOOR || doorUpper(c >> 8)) continue;
        const up = cellAt(lx, ly + 1, lz);
        if ((up & 255) !== B.IRON_DOOR) continue;
        const open = powered(cellAt, lx, ly, lz) || powered(cellAt, lx, ly + 1, lz);
        const m = c >> 8;
        if (((m & 4) !== 0) === open) continue;
        // chỉ đổi bit "đang mở", giữ hướng / bản lề của từng nửa
        setCell(lx, ly, lz, B.IRON_DOOR, open ? m | 4 : m & ~4);
        setCell(lx, ly + 1, lz, B.IRON_DOOR, open ? (up >> 8) | 4 : (up >> 8) & ~4);
      }
}
