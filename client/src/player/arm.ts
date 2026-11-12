// Tay phải góc nhìn thứ nhất, vẽ trong cảnh riêng chồng lên thế giới (xóa độ sâu trước) để
// không xuyên vào tường: tay trống thì hiện cánh tay (skin 64x32), cầm đồ thì hiện mô hình vật
// phẩm (block = khối nhỏ, vật phẩm khác = hình nổi khối). Vung khi đào/đặt/ăn.
import * as THREE from "three";
import type { Atlas } from "../atlas.js";
import { heldModel } from "./heldItem.js";

const W = 0.16, H = 0.75; // block (cánh tay 4x12 điểm ảnh, phóng to cho góc nhìn)
const SWING_S = 0.25;
const REST = { x: 0.48, y: -0.52, z: -0.2, rx: 1.95, ry: 0.15, rz: 0.12 };
/** Tư thế cầm: block xoay 45°, công cụ/vật phẩm nghiêng chéo như cầm trong tay. */
const HOLD = {
  block: { x: 0.4, y: -0.36, z: -0.8, rx: 0.12, ry: 0.78, rz: 0, s: 0.22 },
  flat: { x: 0.42, y: -0.3, z: -0.78, rx: 0.05, ry: -1.3, rz: 0.4, s: 0.4 },
} as const;

/** Ô điểm ảnh trên skin 64x32 → uv (v tính từ dưới lên). */
function px(x0: number, y0: number, x1: number, y1: number): [number, number, number, number] {
  return [x0 / 64, 1 - y1 / 32, x1 / 64, 1 - y0 / 32];
}
// mặt: +X ngoài, −X trong, +Y vai, −Y bàn tay, +Z trước, −Z sau
const FACES = [px(40, 20, 44, 32), px(48, 20, 52, 32), px(44, 16, 48, 20), px(48, 16, 52, 20), px(44, 20, 48, 32), px(52, 20, 56, 32)];

export class FirstPersonArm {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly pivot = new THREE.Group();
  private readonly itemPivot = new THREE.Group();
  private heldKey: string | null = null;
  private holdKind: keyof typeof HOLD = "flat";
  private swingT = -1;
  visible = true;

  constructor(fov: number, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 10);
    const geo = new THREE.BoxGeometry(W, H, W);
    geo.translate(0, -H / 2, 0); // gốc ở vai
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let f = 0; f < 6; f++) {
      const [u0, v0, u1, v1] = FACES[f]!;
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) > 0.5 ? u1 : u0, uv.getY(i) > 0.5 ? v1 : v0);
      }
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0xd8b48c }); // màu da nếu thiếu skin
    new THREE.TextureLoader().load("/entities/player.png", (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.color.set(0xcccccc);
      mat.needsUpdate = true;
    });
    this.pivot.add(new THREE.Mesh(geo, mat));
    this.scene.add(this.pivot, this.itemPivot);
    this.applyPose(0);
  }

  /** Bắt đầu một lần vung (đào/đặt); đang vung thì để yên. */
  swing(): void {
    if (this.swingT < 0) this.swingT = 0;
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    let k = 0;
    if (this.swingT >= 0) {
      this.swingT += dt / SWING_S;
      if (this.swingT >= 1) this.swingT = -1;
      else k = Math.sin(this.swingT * Math.PI);
    }
    this.applyPose(k);
  }

  /** Đổi vật phẩm đang cầm (null = tay trống). */
  setHeld(key: string | null, atlas: Atlas): void {
    if (key === this.heldKey) return;
    this.heldKey = key;
    this.itemPivot.clear();
    this.pivot.visible = key === null;
    if (!key) return;
    void heldModel(key, atlas).then((obj) => {
      if (this.heldKey !== key) return;
      this.itemPivot.clear();
      this.holdKind = obj.userData.kind === "block" ? "block" : "flat";
      this.itemPivot.add(obj);
    });
  }

  private applyPose(k: number): void {
    this.pivot.position.set(REST.x - k * 0.12, REST.y + k * 0.1, REST.z - k * 0.15);
    this.pivot.rotation.set(REST.rx - k * 0.7, REST.ry + k * 0.4, REST.rz, "YXZ");
    const h = HOLD[this.holdKind];
    this.itemPivot.position.set(h.x - k * 0.18, h.y + k * 0.12 - Math.sin(k * Math.PI) * 0.05, h.z - k * 0.1);
    this.itemPivot.rotation.set(h.rx - k * 0.9, h.ry + k * 0.3, h.rz, "YXZ");
    this.itemPivot.scale.setScalar(h.s);
  }

  /** Vẽ sau thế giới: xóa độ sâu rồi vẽ cánh tay. */
  render(renderer: THREE.WebGLRenderer): void {
    if (!this.visible) return;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
