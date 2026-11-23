// Dựng model khối sinh vật (Giai đoạn 7a–7b) từ khai báo trong mobModelDefs.ts: đổi hệ Minecraft (y xuống, mặt đất y = 24,
// mặt hướng −Z) sang hệ của game (y lên, mặt hướng +Z như model người chơi), gán UV theo bố cục hộp Minecraft.
import * as THREE from "three";
import type { MobKey } from "../../../shared/src/index.js";
import { MOB_MODELS, type PartDef } from "./mobModelDefs.js";

export { MOB_MODELS };
const PX = 1 / 16;

/** Gán UV cho BoxGeometry theo bố cục hộp Minecraft (u, v, w, h, d) trên ảnh tw × th; mirror: lật ngang. */
function boxUV(geo: THREE.BoxGeometry, u: number, v: number, w: number, h: number, d: number, tw: number, th: number, mirror: boolean): void {
  const r = (x0: number, y0: number, x1: number, y1: number): number[] =>
    mirror ? [x1 / tw, 1 - y1 / th, x0 / tw, 1 - y0 / th] : [x0 / tw, 1 - y1 / th, x1 / tw, 1 - y0 / th];
  // thứ tự mặt BoxGeometry: +X, −X, +Y, −Y, +Z (trước), −Z (sau) — như model người chơi
  const side = [r(u + d + w, v + d, u + 2 * d + w, v + d + h), r(u, v + d, u + d, v + d + h)];
  if (mirror) side.reverse();
  const faces = [
    ...side,
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

export interface MobModel {
  root: THREE.Group; // gốc ở chân, quay theo hướng thân
  body: THREE.Group; // đã nhân cỡ của loài (phồng lên khi quái nổ sắp nổ)
  parts: Map<string, THREE.Group>;
  /** Phần lớp phủ / mắt cùng tên để cử động theo. */
  layers: Map<string, THREE.Group>[];
  /** Vật liệu bị tối theo ánh sáng / nháy đỏ (lớp phủ có màu riêng ở userData.base). */
  materials: THREE.MeshBasicMaterial[];
  overlayMat: THREE.MeshBasicMaterial | null;
  overlay: Map<string, THREE.Group>;
  /** (7c) Lớp phủ thêm theo tên: vật liệu (màu riêng ở userData.base) + các phần. */
  extra: Map<string, { mat: THREE.MeshBasicMaterial; parts: Map<string, THREE.Group> }>;
}

function buildParts(defs: PartDef[], tex: [number, number], mats: THREE.Material[], root: THREE.Group): Map<string, THREE.Group> {
  const out = new Map<string, THREE.Group>();
  for (const p of defs) {
    const g = new THREE.Group();
    for (const c of p.cubes ?? [{ uv: p.uv, box: p.box, inflate: p.inflate ?? 0, mirror: !!p.mirror }]) {
      const [ox, oy, oz, w, h, d] = c.box as [number, number, number, number, number, number], inf = c.inflate;
      const geo = new THREE.BoxGeometry(Math.max(0.01, w + inf * 2) * PX, Math.max(0.01, h + inf * 2) * PX, Math.max(0.01, d + inf * 2) * PX);
      boxUV(geo, c.uv[0], c.uv[1], w, h, d, tex[0], tex[1], c.mirror);
      // tâm hộp so với điểm xoay, đổi hệ (x, y, z) Minecraft → (−x, −y, −z)
      geo.translate(-(ox + w / 2) * PX, -(oy + h / 2) * PX, -(oz + d / 2) * PX);
      g.add(new THREE.Mesh(geo, mats[p.mat ?? 0] ?? mats[0]!));
    }
    if (p.zyx) g.rotation.order = "ZYX";
    const parent = p.parent ? out.get(p.parent) : undefined;
    if (parent) g.position.set(-p.pivot[0] * PX, -p.pivot[1] * PX, -p.pivot[2] * PX); // điểm xoay tính từ phần cha
    else g.position.set(-p.pivot[0] * PX, (24 - p.pivot[1]) * PX, -p.pivot[2] * PX);
    if (p.rot) g.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    g.userData.rest = g.rotation.clone();
    g.userData.restPos = g.position.clone();
    (parent ?? root).add(g);
    out.set(p.name, g);
  }
  return out;
}

const mat = (map: THREE.Texture, translucent = false): THREE.MeshBasicMaterial =>
  translucent
    ? new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0.85 })
    : new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.1 });

/** Dựng model cho loài key; skin(name) trả ảnh skin theo tên (lớp phủ, mắt dùng tên trong khai báo). */
export function buildMobModel(key: MobKey | string, base: THREE.Texture, skin: (name: string) => THREE.Texture): MobModel {
  const def = MOB_MODELS[key]!;
  const root = new THREE.Group(), body = new THREE.Group();
  body.scale.setScalar(def.scale);
  root.add(body);
  const mats = [mat(base), mat(base, true)];
  const parts = buildParts(def.parts, def.tex, mats, body);
  const layers: Map<string, THREE.Group>[] = [];
  let overlayMat: THREE.MeshBasicMaterial | null = null, overlay = new Map<string, THREE.Group>();
  if (def.overlay) {
    overlayMat = mat(skin(def.overlay.skin));
    overlay = buildParts(def.overlay.parts, def.overlay.tex, [overlayMat], body);
    layers.push(overlay);
  }
  if (def.glow) {
    // mắt phát sáng: hộp to hơn một chút, không đổi màu theo ánh sáng
    const glowMat = new THREE.MeshBasicMaterial({ map: skin(def.glow), transparent: true, alphaTest: 0.1, depthWrite: false });
    layers.push(buildParts(def.parts.map((p) => ({ ...p, inflate: (p.inflate ?? 0) + 0.02, mat: 0 })), def.tex, [glowMat], body));
  }
  const extra = new Map<string, { mat: THREE.MeshBasicMaterial; parts: Map<string, THREE.Group> }>();
  for (const [name, l] of Object.entries(def.layers ?? {})) {
    const m = mat(skin(l.skin));
    m.userData.base = new THREE.Color(0xffffff);
    const ps = buildParts(l.parts, l.tex, [m], body);
    layers.push(ps);
    extra.set(name, { mat: m, parts: ps });
  }
  return { root, body, parts, layers, materials: mats, overlayMat, overlay, extra };
}
