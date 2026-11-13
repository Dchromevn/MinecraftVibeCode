// Mô hình vật phẩm cầm trên tay: block khối đầy là khối nhỏ (texture atlas); vật phẩm khác là
// hình "nổi khối" dựng từ từng điểm ảnh của icon 16x16 (mặt trước/sau + cạnh nơi giáp ô trống).
import * as THREE from "three";
import { itemDef } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { blockTiles, setBoxTiles, shapeObject } from "../interact/boxMesh.js";
import { loadImage } from "../util/loadImage.js";

const RES = 16;
const cache = new Map<string, Promise<THREE.Object3D>>();

/** Điểm ảnh của icon, thu về 16x16. */
async function loadPixels(url: string): Promise<ImageData | null> {
  const img = await loadImage(url);
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = c.height = RES;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, RES, RES);
  return ctx.getImageData(0, 0, RES, RES);
}

/** Hình nổi khối dày 1 điểm ảnh, cạnh 1 đơn vị, tâm ở gốc, mặt hướng +Z. */
function extrude(px: ImageData): THREE.Mesh {
  const pos: number[] = [], col: number[] = [];
  const s = 1 / RES, t = s / 2;
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < RES && y < RES && px.data[(y * RES + x) * 4 + 3]! > 127;
  const quad = (a: number[], b: number[], c: number[], d: number[], r: number, g: number, bl: number): void => {
    for (const p of [a, b, c, a, c, d]) {
      pos.push(...p);
      col.push(r, g, bl);
    }
  };
  for (let y = 0; y < RES; y++)
    for (let x = 0; x < RES; x++) {
      if (!solid(x, y)) continue;
      const i = (y * RES + x) * 4;
      const [r, g, b] = [px.data[i]! / 255, px.data[i + 1]! / 255, px.data[i + 2]! / 255].map((v) => Math.pow(v, 2.2));
      const x0 = x * s - 0.5, x1 = x0 + s, y1 = 0.5 - y * s, y0 = y1 - s;
      quad([x0, y0, t], [x1, y0, t], [x1, y1, t], [x0, y1, t], r!, g!, b!); // trước
      quad([x1, y0, -t], [x0, y0, -t], [x0, y1, -t], [x1, y1, -t], r! * 0.8, g! * 0.8, b! * 0.8); // sau
      const k = 0.65;
      if (!solid(x - 1, y)) quad([x0, y0, -t], [x0, y0, t], [x0, y1, t], [x0, y1, -t], r! * k, g! * k, b! * k);
      if (!solid(x + 1, y)) quad([x1, y0, t], [x1, y0, -t], [x1, y1, -t], [x1, y1, t], r! * k, g! * k, b! * k);
      if (!solid(x, y - 1)) quad([x0, y1, t], [x1, y1, t], [x1, y1, -t], [x0, y1, -t], r! * 0.9, g! * 0.9, b! * 0.9);
      if (!solid(x, y + 1)) quad([x0, y0, -t], [x1, y0, -t], [x1, y0, t], [x0, y0, t], r! * 0.5, g! * 0.5, b! * 0.5);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
}

/** Mô hình của vật phẩm (đã lưu sẵn); kind = "block" hoặc "flat" để chọn tư thế cầm. */
export function heldModel(key: string, atlas: Atlas): Promise<THREE.Object3D> {
  let p = cache.get(key);
  if (p) return p;
  p = (async () => {
    const icon = itemDef(key)?.icon;
    if (icon?.type === "cube") {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      setBoxTiles(geo, blockTiles(atlas, icon.block));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: atlas.texture, color: 0xdddddd }));
      m.userData.kind = "block";
      return m;
    }
    if (icon?.type === "shape") {
      const g = shapeObject(atlas, icon.block, 1, new THREE.MeshBasicMaterial({ map: atlas.texture, color: 0xdddddd }));
      g.userData.kind = "block";
      return g;
    }
    const url = icon?.type === "icon" ? `/icons/${icon.name}.png` : icon?.type === "tex" ? `/textures/${icon.name}.png` : "";
    const px = url ? await loadPixels(url) : null;
    const m: THREE.Object3D = px ? extrude(px) : new THREE.Object3D();
    m.userData.kind = "flat";
    return m;
  })();
  cache.set(key, p);
  return p;
}
