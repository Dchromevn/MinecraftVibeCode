// Icon vật phẩm cho giao diện: block khối đầy vẽ thành khối 3D nhỏ (3 mặt nghiêng) từ
// texture block; còn lại dùng ảnh phẳng trong /icons hoặc /textures. Thiếu ảnh thì vẽ ô màu.
import { BLOCKS, allItems, itemDef } from "../../../shared/src/index.js";
import { STR } from "../strings.js";

const SIZE = 32;
const urls = new Map<string, string>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

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

async function render(key: string): Promise<string> {
  const def = itemDef(key);
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  let ok = false;
  if (def?.icon.type === "cube") ok = await drawCube(ctx, def.icon.block);
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
