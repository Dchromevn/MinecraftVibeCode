// Dữ liệu phụ khi đặt block (theo mặt được bấm và hướng nhìn), ray tự nối với ray kề,
// và các block 2 ô (cửa, giường). Giai đoạn 3a dùng cho công cụ đặt block debug;
// Giai đoạn 3b thêm kiểm tra chỗ bám, Giai đoạn 5 server dùng lại.
import { B } from "./blocks.js";
import { isLeaves } from "./woods.js";
import { SLAB_BOTTOM, SLAB_DOUBLE, SLAB_TOP, isDoor, isSlab, isStairs, stairsMeta } from "./building.js";
import { isSwitch, switchMeta } from "./decor.js";
import { BED_COLOR_SHIFT, RED } from "./colors.js";
import { BLOCKS } from "./blocks.js";
import { isReplaceable } from "./blockRules.js";
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

/** Ô đang nhắm: tọa độ, pháp tuyến mặt bấm, fy = độ cao điểm chạm trong ô (0..1, để chọn nửa trên / dưới). */
export interface PlaceHit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  fy?: number;
}

/**
 * Các ô cần ghi khi đặt block id lên ô đang nhắm (client đoán trước và server dùng chung): đặt thay ô
 * thay được (cỏ cao...), ghép tấm cùng loại thành tấm đôi, còn lại đặt vào ô kề theo pháp tuyến.
 */
export function planPlace(
  id: number, t: PlaceHit, yaw: number, getCell: (x: number, y: number, z: number) => number, itemMeta?: number,
): PlacedCell[] | null {
  const tc = getCell(t.x, t.y, t.z);
  if (tc < 0) return null;
  if (isSlab(id) && (tc & 255) === id) {
    // bấm vào mặt trong của tấm cùng loại: thành tấm đôi tại chỗ
    const h = tc >> 8;
    if ((h === SLAB_BOTTOM && t.ny === 1) || (h === SLAB_TOP && t.ny === -1)) return [{ x: t.x, y: t.y, z: t.z, id, meta: SLAB_DOUBLE }];
  }
  const into = isReplaceable(tc & 255);
  const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
  if (isSlab(id)) {
    const cur = getCell(x, y, z);
    if ((cur & 255) === id && cur >> 8 !== SLAB_DOUBLE) return [{ x, y, z, id, meta: SLAB_DOUBLE }];
  }
  return placementCells(id, x, y, z, t.nx, t.ny, t.nz, yaw, t.fy ?? 0, itemMeta);
}

/** Đặt vào nửa trên: bấm mặt dưới, hoặc mặt bên ở nửa trên của ô. */
const upperHalf = (ny: number, fy: number): boolean => ny === -1 || (ny === 0 && fy > 0.5);

/**
 * Các ô cần ghi khi đặt block id vào ô (x, y, z) qua mặt có pháp tuyến (nx, ny, nz)
 * (từ block bị bấm hướng ra ô mới), người chơi nhìn theo yaw. null = không đặt được.
 */
export function placementCells(
  id: number, x: number, y: number, z: number, nx: number, ny: number, nz: number, yaw: number, fy = 0, itemMeta?: number,
): PlacedCell[] | null {
  const look = dirFromYaw(yaw);
  const one = (meta: number): PlacedCell[] => [{ x, y, z, id, meta }];
  // bậc: phía cao quay theo hướng nhìn (đi lên khi bước tới); dạng góc tính lại khi đặt (placeCells)
  if (isStairs(id)) return one(stairsMeta(look, upperHalf(ny, fy)));
  if (isSlab(id)) return one(upperHalf(ny, fy) ? SLAB_TOP : SLAB_BOTTOM);
  if (BLOCKS[id]?.meta === "color") return one((itemMeta ?? 0) & 15); // len, thảm, kính màu: màu theo vật phẩm
  if (isSwitch(id)) { // nút / cần gạt: gắn vào mặt được bấm
    const wall = dirOf(-nx, -nz);
    return one(switchMeta(ny > 0 ? 0 : ny < 0 ? 1 : 2 + (wall ?? 0), false));
  }
  if (id === B.LANTERN) return one(ny < 0 ? 1 : 0); // bấm mặt dưới trần: treo
  if (isDoor(id)) // tấm cửa nằm ở cạnh xa người chơi; hai nửa cùng hướng
    return [{ x, y, z, id, meta: doorMeta(look, false, false) }, { x, y: y + 1, z, id, meta: doorMeta(look, false, true) }];
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
    case B.BED: {
      // chân ở ô được bấm, đầu kéo dài theo hướng nhìn; màu ở bit 3–6 (mặc định đỏ)
      const color = ((itemMeta ?? RED) & 15) << BED_COLOR_SHIFT;
      return [
        { x, y, z, id, meta: bedMeta(look, false) | color },
        { x: x + HDX[look]!, y, z: z + HDZ[look]!, id, meta: bedMeta(look, true) | color },
      ];
    }
    case B.FURNACE:
    case B.CHEST:
      return one(opposite(look)); // mặt trước quay về phía người chơi
    case B.WHEAT:
      return one(0); // gieo hạt: giai đoạn 0
    default:
      return one(isLeaves(id) ? 1 : 0); // lá người chơi đặt (mọi loài): không bao giờ rụng
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

/**
 * Cửa vừa đặt (nửa dưới ở x, y, z): nếu sát bên phải / trái (nhìn theo hướng cửa) có cửa cùng hướng thì
 * ghép thành cửa đôi — cánh bên trái bản lề trái, cánh bên phải bản lề phải (cả cửa cũ cũng được chỉnh).
 */
export function pairDoors(
  x: number, y: number, z: number, getCell: (x: number, y: number, z: number) => number,
  setCell: (x: number, y: number, z: number, id: number, meta: number) => void,
): void {
  const c = getCell(x, y, z);
  if (c < 0 || !isDoor(c & 255) || doorUpper(c >> 8)) return;
  const f = (c >> 8) & 3;
  const setHinge = (px: number, pz: number, left: boolean): void => {
    for (const py of [y, y + 1]) {
      const n = getCell(px, py, pz);
      if (n >= 0 && isDoor(n & 255)) setCell(px, py, pz, n & 255, left ? (n >> 8) | 16 : (n >> 8) & ~16);
    }
  };
  for (const [side, meLeft] of [[(f + 1) & 3, true], [(f + 3) & 3, false]] as const) {
    const nx = x + HDX[side]!, nz = z + HDZ[side]!;
    const n = getCell(nx, y, nz);
    if (n < 0 || !isDoor(n & 255) || doorUpper(n >> 8) || ((n >> 8) & 3) !== f) continue;
    setHinge(x, z, meLeft); // cửa mới ở bên trái của cửa kia thì bản lề trái
    setHinge(nx, nz, !meLeft);
    return;
  }
}

/** Ô còn lại của block 2 ô (cửa, giường), hoặc null. */
export function linkedCell(cell: number, x: number, y: number, z: number): { x: number; y: number; z: number } | null {
  const id = cellId(cell), m = cellMeta(cell);
  if (isDoor(id)) return { x, y: doorUpper(m) ? y - 1 : y + 1, z };
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
