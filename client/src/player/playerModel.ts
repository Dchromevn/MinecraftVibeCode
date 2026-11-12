// Mô hình nhân vật 6 phần (đầu, thân, 2 tay, 2 chân) từ skin 64x32 (entities/player.png).
// Dùng cho hình nhân vật trong túi đồ và người chơi khác (Giai đoạn 5a).
import * as THREE from "three";
import { ArmorLayer } from "./armorModel.js";

const PX = 1 / 16;

/** Gán uv skin cho BoxGeometry: hộp w x h x d điểm ảnh, gốc (u, v) trên skin 64x32. */
export function skinBoxUV(geo: THREE.BoxGeometry, u: number, v: number, w: number, h: number, d: number): void {
  const r = (x0: number, y0: number, x1: number, y1: number): number[] => [x0 / 64, 1 - y1 / 32, x1 / 64, 1 - y0 / 32];
  // thứ tự mặt BoxGeometry: +X (trái nhân vật), −X (phải), +Y, −Y, +Z (trước), −Z (sau)
  const faces = [
    r(u + d + w, v + d, u + 2 * d + w, v + d + h), r(u, v + d, u + d, v + d + h),
    r(u + d, v, u + d + w, v + d), r(u + d + w, v, u + d + 2 * w, v + d),
    r(u + d, v + d, u + d + w, v + d + h), r(u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h),
  ];
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const [u0, v0, u1, v1] = faces[f]!;
    for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, k % 2 ? u1! : u0!, k < 2 ? v1! : v0!);
  }
  uv.needsUpdate = true;
}

/** Hộp có gốc xoay (pivot) ở đầu trên: dùng cho tay, chân, đầu (gốc ở cổ). */
function part(mat: THREE.Material, u: number, v: number, w: number, h: number, d: number, pivotTop: boolean): THREE.Group {
  const geo = new THREE.BoxGeometry(w * PX, h * PX, d * PX);
  skinBoxUV(geo, u, v, w, h, d);
  geo.translate(0, pivotTop ? (-h * PX) / 2 : (h * PX) / 2, 0);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

export interface PlayerModel {
  root: THREE.Group;
  head: THREE.Group;
  body: THREE.Group;
  rArm: THREE.Group;
  lArm: THREE.Group;
  rLeg: THREE.Group;
  lLeg: THREE.Group;
  armor: ArmorLayer;
}

/** Nhân vật cao 32 điểm ảnh (2 block theo đơn vị 1/16), đứng tại gốc, mặt hướng +Z. */
export function createPlayerModel(skin: THREE.Texture): PlayerModel {
  const mat = new THREE.MeshBasicMaterial({ map: skin, transparent: true, alphaTest: 0.1 });
  const root = new THREE.Group();
  const head = part(mat, 0, 0, 8, 8, 8, false);
  head.position.y = 24 * PX;
  const body = part(mat, 16, 16, 8, 12, 4, true);
  body.position.y = 24 * PX;
  const rArm = part(mat, 40, 16, 4, 12, 4, true);
  rArm.position.set(-6 * PX, 24 * PX, 0);
  const lArm = part(mat, 40, 16, 4, 12, 4, true);
  lArm.position.set(6 * PX, 24 * PX, 0);
  const rLeg = part(mat, 0, 16, 4, 12, 4, true);
  rLeg.position.set(-2 * PX, 12 * PX, 0);
  const lLeg = part(mat, 0, 16, 4, 12, 4, true);
  lLeg.position.set(2 * PX, 12 * PX, 0);
  root.add(head, body, rArm, lArm, rLeg, lLeg);
  const armor = new ArmorLayer({ head, body, rArm, lArm, rLeg, lLeg });
  return { root, head, body, rArm, lArm, rLeg, lLeg, armor };
}

/** Nạp skin người chơi (lọc điểm ảnh rõ nét). */
export function loadSkin(): THREE.Texture {
  const tex = new THREE.TextureLoader().load("/entities/player.png");
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
