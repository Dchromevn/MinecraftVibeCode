// Dữ liệu phụ khi đặt block (theo mặt được bấm và hướng nhìn), ray tự nối với ray kề,
// và các block 2 ô (cửa, giường). Giai đoạn 3a dùng cho công cụ đặt block debug;
// Giai đoạn 3b thêm kiểm tra chỗ bám, Giai đoạn 5 server dùng lại.
import { B } from "./blocks.js";
import {
  HDX, HDZ, bedDir, bedHead, bedMeta, cellId, cellMeta, dirFromYaw, dirOf, doorMeta, doorUpper, opposite,
  railMetaFromNeighbors, torchMeta,
} from "./blockMeta.js";

export interface PlacedCell {
  x: number;
  y: number;
  z: number;
  id: number;
  meta: number;
}

/**
 * Các ô cần ghi khi đặt block id vào ô (x, y, z) qua mặt có pháp tuyến (nx, ny, nz)
 * (từ block bị bấm hướng ra ô mới), người chơi nhìn theo yaw. null = không đặt được.
 */
export function placementCells(
  id: number, x: number, y: number, z: number, nx: number, ny: number, nz: number, yaw: number,
): PlacedCell[] | null {
  const look = dirFromYaw(yaw);
  const one = (meta: number): PlacedCell[] => [{ x, y, z, id, meta }];
  switch (id) {
    case B.TORCH: {
      if (ny < 0) return null; // không cắm dưới trần
      if (ny > 0) return one(torchMeta(null));
      return one(torchMeta(dirOf(-nx, -nz))); // tường nằm ngược pháp tuyến
    }
    case B.LADDER: {
      const wall = dirOf(-nx, -nz);
      return wall === null ? null : one(wall);
    }
    case B.DOOR:
      // tấm cửa nằm ở cạnh xa người chơi; hai nửa cùng hướng
      return [{ x, y, z, id, meta: doorMeta(look, false, false) }, { x, y: y + 1, z, id, meta: doorMeta(look, false, true) }];
    case B.BED:
      // chân ở ô được bấm, đầu kéo dài theo hướng nhìn
      return [
        { x, y, z, id, meta: bedMeta(look, false) },
        { x: x + HDX[look]!, y, z: z + HDZ[look]!, id, meta: bedMeta(look, true) },
      ];
    case B.FURNACE:
    case B.CHEST:
      return one(opposite(look)); // mặt trước quay về phía người chơi
    case B.WHEAT:
      return one(0); // gieo hạt: giai đoạn 0
    default:
      return one(0);
  }
}

/** Ô còn lại của block 2 ô (cửa, giường), hoặc null. */
export function linkedCell(cell: number, x: number, y: number, z: number): { x: number; y: number; z: number } | null {
  const id = cellId(cell), m = cellMeta(cell);
  if (id === B.DOOR) return { x, y: doorUpper(m) ? y - 1 : y + 1, z };
  if (id === B.BED) {
    const d = bedHead(m) ? opposite(bedDir(m)) : bedDir(m);
    return { x: x + HDX[d]!, y, z: z + HDZ[d]! };
  }
  return null;
}

/**
 * Tính lại dữ liệu phụ cho ray tại (x, y, z) và 4 ray kề sau khi đặt/phá.
 * getId đọc id; setMeta ghi dữ liệu phụ (chỉ gọi cho ô là ray).
 */
export function updateRailsAround(
  x: number, y: number, z: number,
  getId: (x: number, y: number, z: number) => number,
  setMeta: (x: number, y: number, z: number, meta: number) => void,
): void {
  const fix = (px: number, pz: number): void => {
    if (getId(px, y, pz) !== B.RAIL) return;
    setMeta(px, y, pz, railMetaFromNeighbors((dx, dz) => getId(px + dx, y, pz + dz) === B.RAIL));
  };
  fix(x, z);
  for (let d = 0; d < 4; d++) fix(x + HDX[d]!, z + HDZ[d]!);
}
