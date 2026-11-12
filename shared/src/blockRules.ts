// Quy tắc chỗ bám, đặt và phá block (DESIGN.md 2.2 "Chỗ bám của block"). Thuần túy:
// đọc/ghi qua BlockAccess để client (Giai đoạn 3b) và server (Giai đoạn 5) dùng chung.
import { B, BLOCKS } from "./blocks.js";
import { HDX, HDZ, cellId, cellMeta, doorUpper, torchWall } from "./blockMeta.js";
import { collisionBoxes } from "./blockShapes.js";
import { chestPartner, linkedCell, updateRailsAround, type PlacedCell } from "./placement.js";
import { chestMeta, facingDir } from "./blockMeta.js";
import { isFarmPlant, stemDetach } from "./crops.js";
import { isFlower, isSapling } from "./woods.js";

export interface BlockAccess {
  /** id | dữ liệu phụ << 8; âm = chunk chưa tải. */
  getCell(x: number, y: number, z: number): number;
  /** Ghi block (và báo cho mesh/ánh sáng). */
  setCell(x: number, y: number, z: number, id: number, meta: number): void;
}

/** Block rơi ra (Giai đoạn 4 tạo vật phẩm; 3b chỉ ghi lại). */
export interface Dropped {
  id: number;
  meta: number; // dữ liệu phụ lúc rơi (lúa chín hay chưa)
  forced: boolean; // rơi vì mất chỗ bám / bị đè: không cần công cụ
  x: number;
  y: number;
  z: number;
}

type IdAt = (x: number, y: number, z: number) => number;

/** Khối đầy, không trong suốt: chỗ bám hợp lệ (không tính lá, kính, rào, đất cày...). */
export function isFullSolid(id: number): boolean {
  const d = BLOCKS[id];
  return !!d && d.render === "cube" && d.opaque && d.solid && !d.liquid;
}

/** Có thể đặt đè lên (không khí, chất lỏng, cỏ cao, tuyết phủ). */
export function isReplaceable(id: number): boolean {
  const d = BLOCKS[id];
  return !d || d.render === "none" || d.liquid || id === B.TALLGRASS || id === B.SNOW_LAYER;
}

/** Xương rồng: 4 ô ngang bên cạnh không có block va chạm / dung nham (DESIGN.md 2.13). */
export function cactusSidesFree(idAt: IdAt, x: number, y: number, z: number): boolean {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n = idAt(x + dx, y, z + dz);
    if (n === B.LAVA || BLOCKS[n]?.solid) return false;
  }
  return true;
}

/** Block ở ô có còn chỗ bám không. */
export function hasSupport(cell: number, x: number, y: number, z: number, idAt: IdAt): boolean {
  const id = cellId(cell), m = cellMeta(cell);
  const below = idAt(x, y - 1, z);
  if (isSapling(id) || isFlower(id)) return below === B.GRASS || below === B.DIRT || below === B.FARMLAND;
  switch (id) {
    case B.CACTUS:
      return (below === B.SAND || below === B.CACTUS) && cactusSidesFree(idAt, x, y, z);
    case B.TORCH: {
      const wall = torchWall(m);
      // đuốc trên sàn: khối đầy, hoặc đầu cột rào (như đuốc trong hầm mỏ)
      if (wall === null) return isFullSolid(below) || below === B.FENCE;
      return isFullSolid(idAt(x + HDX[wall]!, y, z + HDZ[wall]!));
    }
    case B.LADDER:
      return isFullSolid(idAt(x + HDX[m & 3]!, y, z + HDZ[m & 3]!));
    case B.RAIL:
    case B.SNOW_LAYER:
      return isFullSolid(below);
    case B.TALLGRASS:
      return below === B.GRASS || below === B.DIRT || below === B.FARMLAND;
    case B.WHEAT:
    case B.CARROTS:
    case B.POTATOES:
    case B.BEETROOTS:
    case B.MELON_STEM:
    case B.PUMPKIN_STEM:
      return isFarmPlant(id) && below === B.FARMLAND;
    case B.DOOR: {
      if (doorUpper(m)) return below === B.DOOR;
      return isFullSolid(below) && idAt(x, y + 1, z) === B.DOOR;
    }
    case B.BED: {
      const o = linkedCell(cell, x, y, z)!;
      return isFullSolid(below) && idAt(o.x, o.y, o.z) === B.BED;
    }
    default:
      return true;
  }
}

/**
 * Đặt được các ô này không: ô đích thay được, có chỗ bám (tính cả các ô cùng đặt),
 * và hộp va chạm của block mới không chồng lên hộp người chơi (nếu có).
 */
export function canPlace(cells: readonly PlacedCell[], getCell: (x: number, y: number, z: number) => number, player: number[] | null): boolean {
  const planned = new Map(cells.map((c) => [`${c.x},${c.y},${c.z}`, c.id | (c.meta << 8)]));
  const cellAt = (x: number, y: number, z: number): number => planned.get(`${x},${y},${z}`) ?? getCell(x, y, z);
  const idAt: IdAt = (x, y, z) => Math.max(0, cellAt(x, y, z)) & 255;
  for (const c of cells) {
    const cur = getCell(c.x, c.y, c.z);
    if (cur < 0 || c.y < 1 || c.y > 127 || !isReplaceable(cur & 255)) return false;
    const cell = c.id | (c.meta << 8);
    if (!hasSupport(cell, c.x, c.y, c.z, idAt)) return false;
    if (!player) continue;
    for (const b of collisionBoxes(cell, c.x, c.y, c.z, idAt)) {
      if (c.x + b[0] < player[3]! && c.x + b[3] > player[0]! && c.y + b[1] < player[4]! && c.y + b[4] > player[1]!
        && c.z + b[2] < player[5]! && c.z + b[5] > player[2]!) return false;
    }
  }
  return true;
}

const NEIGHBORS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;

/** Có đường rơi xuống (ô dưới không có hộp va chạm): cát, sỏi rơi. */
export function canFallInto(id: number): boolean {
  const d = BLOCKS[id];
  return !d || !d.solid || d.liquid;
}

/**
 * Xử lý dây chuyền sau khi các ô `changed` thay đổi: block mất chỗ bám thì rơi ra
 * (cửa/giường mất cả hai nửa, chỉ tính 1), cát/sỏi hết đỡ thì gọi startFalling (đã gỡ
 * khỏi thế giới). Trả về các block rơi ra.
 */
export function settle(
  acc: BlockAccess, changed: readonly { x: number; y: number; z: number }[],
  startFalling: (x: number, y: number, z: number, id: number, meta: number) => void,
): Dropped[] {
  const drops: Dropped[] = [];
  const idAt: IdAt = (x, y, z) => Math.max(0, acc.getCell(x, y, z)) & 255;
  const queue: [number, number, number][] = [];
  const push = (x: number, y: number, z: number): void => {
    queue.push([x, y, z]);
    for (const [dx, dy, dz] of NEIGHBORS) queue.push([x + dx, y + dy, z + dz]);
  };
  for (const c of changed) push(c.x, c.y, c.z);
  for (let guard = 0; queue.length > 0 && guard < 100000; guard++) {
    const [x, y, z] = queue.shift()!;
    if (y < 1 || y > 127) continue;
    const cell = acc.getCell(x, y, z);
    if (cell <= 0) continue;
    const id = cell & 255;
    if (!hasSupport(cell, x, y, z, idAt)) {
      const other = linkedCell(cell, x, y, z);
      acc.setCell(x, y, z, B.AIR, 0);
      if (other && idAt(other.x, other.y, other.z) === id) {
        acc.setCell(other.x, other.y, other.z, B.AIR, 0);
        push(other.x, other.y, other.z);
      }
      drops.push({ id, meta: cell >> 8, forced: true, x, y, z });
      if (id === B.RAIL) updateRailsAround(x, y, z, idAt, (px, py, pz, m) => acc.setCell(px, py, pz, B.RAIL, m));
      push(x, y, z);
    } else if (stemDetach(id, cell >> 8, x, y, z, idAt) !== null) {
      acc.setCell(x, y, z, id, stemDetach(id, cell >> 8, x, y, z, idAt)!); // quả bị phá: thân về tuổi 7
    } else if (BLOCKS[id]!.falls && canFallInto(idAt(x, y - 1, z))) {
      acc.setCell(x, y, z, B.AIR, 0);
      startFalling(x, y, z, id, cell >> 8);
      push(x, y, z);
    }
  }
  return drops;
}

/** Phá block người chơi nhắm (cửa/giường mất cả hai nửa), rồi xử lý dây chuyền. */
export function breakAt(
  acc: BlockAccess, x: number, y: number, z: number,
  startFalling: (x: number, y: number, z: number, id: number, meta: number) => void,
): Dropped[] {
  const cell = acc.getCell(x, y, z);
  if (cell <= 0) return [];
  const id = cell & 255;
  const changed = [{ x, y, z }];
  const other = linkedCell(cell, x, y, z);
  acc.setCell(x, y, z, B.AIR, 0);
  if (other && (Math.max(0, acc.getCell(other.x, other.y, other.z)) & 255) === id) {
    acc.setCell(other.x, other.y, other.z, B.AIR, 0);
    changed.push(other);
  }
  const idAt: IdAt = (a, b, c) => Math.max(0, acc.getCell(a, b, c)) & 255;
  if (id === B.RAIL) updateRailsAround(x, y, z, idAt, (px, py, pz, m) => acc.setCell(px, py, pz, B.RAIL, m));
  // phá một nửa rương đôi: nửa kia trở lại rương đơn (giữ đồ của nó)
  const p = chestPartner(cell, x, y, z);
  if (p && idAt(p.x, p.y, p.z) === B.CHEST) acc.setCell(p.x, p.y, p.z, B.CHEST, chestMeta(facingDir(cell >> 8), 0));
  return [{ id, meta: cell >> 8, forced: false, x, y, z }, ...settle(acc, changed, startFalling)];
}

/** Đặt các ô (đã kiểm canPlace), cập nhật ray, xử lý dây chuyền (cát đặt lơ lửng thì rơi). */
export function placeCells(
  acc: BlockAccess, cells: readonly PlacedCell[],
  startFalling: (x: number, y: number, z: number, id: number, meta: number) => void,
): Dropped[] {
  for (const c of cells) acc.setCell(c.x, c.y, c.z, c.id, c.meta);
  const idAt: IdAt = (a, b, c) => Math.max(0, acc.getCell(a, b, c)) & 255;
  for (const c of cells) if (c.id === B.RAIL) updateRailsAround(c.x, c.y, c.z, idAt, (px, py, pz, m) => acc.setCell(px, py, pz, B.RAIL, m));
  return settle(acc, cells, startFalling);
}
