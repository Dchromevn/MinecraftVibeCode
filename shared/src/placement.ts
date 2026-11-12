// Dữ liệu phụ khi đặt block (theo mặt được bấm và hướng nhìn), ray tự nối với ray kề,
// và các block 2 ô (cửa, giường). Giai đoạn 3a dùng cho công cụ đặt block debug;
// Giai đoạn 3b thêm kiểm tra chỗ bám, Giai đoạn 5 server dùng lại.
import { B } from "./blocks.js";
import {
  HDX, HDZ, bedDir, bedHead, bedMeta, cellId, cellMeta, chestHalf, chestMeta, dirFromYaw, dirOf, doorMeta, doorUpper,
  facingDir, opposite, railMetaFromNeighbors, torchMeta,
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
    case B.LEAVES:
      return one(1); // lá người chơi đặt: không bao giờ rụng
    default:
      return one(0);
  }
}

/** Nửa kia của rương đôi (nửa A có nửa kia ở hướng mặt trước + 1), hoặc null. */
export function chestPartner(cell: number, x: number, y: number, z: number): { x: number; y: number; z: number } | null {
  const m = cellMeta(cell), half = chestHalf(m);
  if (cellId(cell) !== B.CHEST || half === 0) return null;
  const d = half === 1 ? (facingDir(m) + 1) & 3 : (facingDir(m) + 3) & 3;
  return { x: x + HDX[d]!, y, z: z + HDZ[d]! };
}

/**
 * Rương vừa đặt ở c: nếu cạnh bên (vuông góc mặt trước) có rương đơn cùng hướng thì ghép
 * thành rương đôi. Trả về các ô cần ghi lại (cả rương mới lẫn rương cũ), hoặc [] nếu không ghép.
 */
export function mergeChest(c: PlacedCell, getCell: (x: number, y: number, z: number) => number): PlacedCell[] {
  const f = facingDir(c.meta);
  for (const [d, mine, other] of [[(f + 1) & 3, 1, 2], [(f + 3) & 3, 2, 1]] as const) {
    const nx = c.x + HDX[d]!, nz = c.z + HDZ[d]!;
    const n = getCell(nx, c.y, nz);
    if (n < 0 || cellId(n) !== B.CHEST || chestHalf(cellMeta(n)) !== 0 || facingDir(cellMeta(n)) !== f) continue;
    return [{ ...c, meta: chestMeta(f, mine) }, { x: nx, y: c.y, z: nz, id: B.CHEST, meta: chestMeta(f, other) }];
  }
  return [];
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
