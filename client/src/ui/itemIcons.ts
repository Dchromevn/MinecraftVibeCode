// Icon vật phẩm cho giao diện: block khối đầy vẽ thành khối 3D nhỏ từ texture block, còn lại dùng
// ảnh phẳng trong /icons hoặc /textures (ảnh gốc từ client.jar nếu đã nhập, không thì REFI).
// Thiếu ảnh thì vẽ ô màu.
import { BLOCKS, allItems, itemDef } from "../../../shared/src/index.js";
import { shapeBoxes } from "../interact/boxMesh.js";
import { STR } from "../strings.js";
import { loadImage } from "../util/loadImage.js";

const SIZE = 32;
const urls = new Map<string, string>();

function placeholder(ctx: CanvasRenderingContext2D, key: string): void {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  ctx.fillStyle = `hsl(${h % 360}, 45%, 50%)`;
  ctx.fillRect(6, 6, 20, 20);
}

/** Khối 3D: mặt trên + hai mặt bên (tối dần), phép biến đổi affine trên canvas 2D. */
async function drawCube(ctx: CanvasRenderingContext2D, blockId: number): Promise<boolean> {
  const t = BLOCKS[blockId]!.tex;
  const [top, side, front] = await Promise.all([t.top, t.side, t.front ?? t.side].map((n) => loadImage(`/textures/${n}.png`)));
  if (!top || !side || !front) return false;
  const faces: [HTMLImageElement, number[], number][] = [
    [top, [14 / 16, -7 / 16, 14 / 16, 7 / 16, 2, 9], 0],
    [side, [14 / 16, 7 / 16, 0, 14 / 16, 2, 9], 0.25],
    [front, [14 / 16, -7 / 16, 0, 14 / 16, 16, 16], 0.42],
  ];
  for (const [img, m, dark] of faces) {
    ctx.setTransform(m[0]!, m[1]!, m[2]!, m[3]!, m[4]!, m[5]!);
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 16, 16);
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, 16, 16);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}

/**
 * Vẽ các hộp (0..1) theo cùng phép chiếu với drawCube: thấy mặt trên, mặt −X (trái), mặt +Z (phải);
 * hộp xa vẽ trước. Mỗi mặt lấy đúng phần texture tương ứng.
 */
async function drawShape(ctx: CanvasRenderingContext2D, blockId: number): Promise<boolean> {
  const t = BLOCKS[blockId]!.tex;
  const [top, side] = await Promise.all([t.top, t.side].map((n) => loadImage(`/textures/${n}.png`)));
  if (!top || !side) return false;
  const A = [14, -7], Bv = [14, 7], O = [2, 9], DOWN = 14; // trục x, trục z, gốc, chiều xuống mỗi block
  const boxes = [...shapeBoxes(blockId)].sort((p, q) => (-p[3] + p[2] + p[1]) - (-q[3] + q[2] + q[1]));
  const face = (img: HTMLImageElement, m: number[], sx: number, sy: number, sw: number, sh: number, dark: number): void => {
    if (sw <= 0 || sh <= 0) return;
    ctx.setTransform(m[0]!, m[1]!, m[2]!, m[3]!, m[4]!, m[5]!);
    const k = img.width / 16;
    ctx.drawImage(img, sx * k, sy * k, sw * k, sh * k, sx, sy, sw, sh);
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(sx, sy, sw, sh);
    }
  };
  for (const [x0, y0, z0, x1, y1, z1] of boxes) {
    const at = (x: number, y: number, z: number): [number, number] => [O[0]! + x * A[0]! + z * Bv[0]!, O[1]! + x * A[1]! + z * Bv[1]! + (1 - y) * DOWN];
    const oTop = at(0, y1, 0), oLeft = at(x0, 1, 0), oFront = at(0, 1, z1);
    face(top, [A[0]! / 16, A[1]! / 16, Bv[0]! / 16, Bv[1]! / 16, oTop[0], oTop[1]], x0 * 16, z0 * 16, (x1 - x0) * 16, (z1 - z0) * 16, 0);
    face(side, [Bv[0]! / 16, Bv[1]! / 16, 0, DOWN / 16, oLeft[0], oLeft[1]], z0 * 16, (1 - y1) * 16, (z1 - z0) * 16, (y1 - y0) * 16, 0.25);
    face(side, [A[0]! / 16, A[1]! / 16, 0, DOWN / 16, oFront[0], oFront[1]], x0 * 16, (1 - y1) * 16, (x1 - x0) * 16, (y1 - y0) * 16, 0.42);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}

async function render(key: string): Promise<string> {
  const def = itemDef(key);
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  let ok = false;
  if (def?.icon.type === "cube") ok = await drawCube(ctx, def.icon.block);
  else if (def?.icon.type === "shape") ok = await drawShape(ctx, def.icon.block);
  else if (def) {
    const img = await loadImage(def.icon.type === "icon" ? `/icons/${def.icon.name}.png` : `/textures/${def.icon.name}.png`);
    if (img) {
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, SIZE, SIZE);
      ok = true;
    }
  }
  if (!ok) placeholder(ctx, key);
  return c.toDataURL();
}

/** Vẽ sẵn icon mọi vật phẩm (gọi một lần khi khởi động). */
export async function preloadIcons(): Promise<void> {
  await Promise.all(allItems().map(async (d) => urls.set(d.key, await render(d.key))));
}

export function iconUrl(key: string): string {
  return urls.get(key) ?? "";
}

/** Tên tiếng Việt của vật phẩm. */
export function itemName(key: string): string {
  const d = itemDef(key);
  if (d?.tool) return `${STR.toolKinds[d.tool.kind] ?? d.tool.kind} ${STR.tiers[d.tool.tier] ?? d.tool.tier}`;
  if (d?.armor) return `${STR.armorPieces[d.armor.piece] ?? d.armor.piece} ${STR.tiers[d.armor.tier] ?? d.armor.tier}`;
  return STR.items[key] ?? STR.blocks[key] ?? key;
}
