// Hình dạng block theo id + dữ liệu phụ: hộp va chạm (vật lý) và hộp nhắm (raycast,
// khung viền). Đơn vị block, tọa độ trong ô [x0, y0, z0, x1, y1, z1]; có thể cao quá 1
// (hàng rào va chạm cao 1.5).
import { B, BLOCKS, type BlockBox } from "./blocks.js";
import { HDX, HDZ, cellId, cellMeta, doorSide, facingDir, rotXZ, torchWall } from "./blockMeta.js";
import { isFence, slabBox, stairBoxes, wallBoxes } from "./building.js";
import { buttonBoxes, lanternBoxes, leverBoxes, paneBoxes, plateBox } from "./decor.js";

export type Box = BlockBox;
/** Đọc id block tại tọa độ thế giới (dùng cho hàng rào nối nhau). */
export type IdAt = (x: number, y: number, z: number) => number;

const FULL: Box = [0, 0, 0, 1, 1, 1];
const px = (n: number): number => n / 16;

/** Xoay hộp vẽ cho hướng 0 (Nam, +Z) sang hướng d. */
function rotBox(b: Box, d: number): Box {
  const [ax, az] = rotXZ(b[0], b[2], d);
  const [bx, bz] = rotXZ(b[3], b[5], d);
  return [Math.min(ax, bx), b[1], Math.min(az, bz), Math.max(ax, bx), b[4], Math.max(az, bz)];
}

/** Tấm mỏng sát cạnh d của ô (dày t), cao h. */
function sidePanel(d: number, t: number, h = 1): Box {
  return rotBox([0, 0, 1 - t, 1, h, 1], d);
}

function fenceJoins(id: number): boolean {
  return isFence(id) || (BLOCKS[id]?.opaque ?? false); // rào mọi loài gỗ nối với nhau
}

/** Cột rào + thanh nối tới rào / khối đặc kề, cao h. */
function fenceBoxes(x: number, y: number, z: number, idAt: IdAt, h: number): Box[] {
  const out: Box[] = [[px(6), 0, px(6), px(10), h, px(10)]];
  for (let d = 0; d < 4; d++) {
    if (!fenceJoins(idAt(x + HDX[d]!, y, z + HDZ[d]!))) continue;
    out.push(rotBox([px(6), 0, px(10), px(10), h, 1], d));
  }
  return out;
}

// (8b3) Đe như model Minecraft: đế, thân dưới, cổ, mặt đe (mặt đe dài theo Z ở bảng gốc). Người đặt nhìn dọc trục Z
// (hướng 0 / 2) thì đe nằm ngang trục X — sừng đe chỉ sang trái / phải.
const ANVIL_Z: readonly Box[] = ([[2, 0, 2, 14, 4, 14], [4, 4, 3, 12, 5, 13], [6, 5, 4, 10, 10, 12], [3, 10, 0, 13, 16, 16]] as const)
  .map((b) => b.map(px) as unknown as Box);
const ANVIL_X: readonly Box[] = ANVIL_Z.map((b) => [b[2], b[1], b[0], b[5], b[4], b[3]] as Box);
/** Đe nằm dọc trục X (mặt trên cần xoay texture 90°). */
export const anvilAlongX = (meta: number): boolean => (facingDir(meta) & 1) === 0;
/** 4 hộp của đe (hộp cuối là mặt đe). */
export const anvilBoxes = (meta: number): readonly Box[] => (anvilAlongX(meta) ? ANVIL_X : ANVIL_Z);

const COLLISION_CACHE = new Map<number, Box[]>();

/** Hộp va chạm của ô (x, y, z) có giá trị cell (id | meta << 8). Rỗng = đi xuyên được. */
export function collisionBoxes(cell: number, x: number, y: number, z: number, idAt: IdAt): readonly Box[] {
  const id = cellId(cell);
  const def = BLOCKS[id];
  if (!def || !def.solid || def.liquid) return [];
  if (def.render === "fence") return fenceBoxes(x, y, z, idAt, 1.5); // cao 1.5: không nhảy qua được
  if (def.render === "wall") return wallBoxes(x, y, z, idAt, 1.5, 1.5);
  if (def.render === "pane") return paneBoxes(x, y, z, idAt);
  if (def.render === "lantern") return lanternBoxes(cellMeta(cell));
  if (def.render === "anvil") return anvilBoxes(cellMeta(cell));
  if (def.render === "stairs" || def.render === "slab") {
    let hit = COLLISION_CACHE.get(cell);
    if (!hit) COLLISION_CACHE.set(cell, (hit = def.render === "stairs" ? stairBoxes(cellMeta(cell)) : [slabBox(cellMeta(cell))]));
    return hit;
  }
  if (def.render === "door") {
    let hit = COLLISION_CACHE.get(cell);
    if (!hit) COLLISION_CACHE.set(cell, (hit = [sidePanel(doorSide(cellMeta(cell)), px(3))]));
    return hit;
  }
  if (def.box) return [def.box];
  return [FULL];
}

/** Hộp nhắm của ô (để raycast trúng đúng hình và vẽ khung viền). Rỗng = không nhắm được. */
export function selectionBoxes(cell: number, x: number, y: number, z: number, idAt: IdAt): Box[] {
  const id = cellId(cell);
  const meta = cellMeta(cell);
  const def = BLOCKS[id];
  if (!def || def.render === "none" || def.liquid) return [];
  switch (def.render) {
    case "fence":
      return fenceBoxes(x, y, z, idAt, 1);
    case "wall":
      return wallBoxes(x, y, z, idAt, 1, 14 / 16);
    case "pane":
      return paneBoxes(x, y, z, idAt);
    case "lantern":
      return lanternBoxes(meta);
    case "anvil":
      return [...anvilBoxes(meta)];
    case "button":
      return buttonBoxes(meta);
    case "plate":
      return [plateBox(meta)];
    case "lever": {
      const l = leverBoxes(meta);
      return [l.base, l.handle];
    }
    case "fire":
      return []; // không nhắm vào lửa (đặt block vào ô lửa thì đè lên)
    case "stairs":
      return stairBoxes(meta);
    case "slab":
      return [slabBox(meta)];
    case "door":
      return [sidePanel(doorSide(meta), px(3))];
    case "torch": {
      const wall = torchWall(meta);
      if (wall === null) return [[px(6), 0, px(6), px(10), px(10), px(10)]];
      return [rotBox([px(5.5), px(3), px(11), px(10.5), px(13), 1], wall)];
    }
    case "ladder":
      return [sidePanel(meta & 3, px(2))];
    case "rail":
      return [[0, 0, 0, 1, px(2), 1]];
    case "cross":
      return id === B.COBWEB ? [FULL] : [[px(2), 0, px(2), px(14), px(13), px(14)]];
    case "crop":
      return [[0, 0, 0, 1, px(2 + 2 * (meta & 7)), 1]];
    default:
      return [def.box ?? FULL];
  }
}
