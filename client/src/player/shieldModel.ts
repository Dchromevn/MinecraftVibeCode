// Mô hình khiên 3D (Giai đoạn 6a) theo kích thước Minecraft: tấm 12x22x1 điểm ảnh + tay cầm 2x6x6 phía sau, texture
// entities/shield.png (64x64, lấy từ client.jar). Mặt trước (có viền sắt) quay về −Z, tay cầm phía +Z.
// Chưa nhập texture thì tô màu gỗ.
import * as THREE from "three";

const PX = 1 / 16;
let texture: THREE.Texture | null = null;
const material = new THREE.MeshBasicMaterial({ color: 0x9a7040 });

function loadTexture(): void {
  if (texture) return;
  texture = new THREE.TextureLoader().load("/entities/shield.png", (t) => {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    material.map = t;
    material.color.set(0xdddddd);
    material.needsUpdate = true;
  });
}

/** uv hộp kiểu Minecraft (w x h x d điểm ảnh, gốc (u, v) trên ảnh 64x64): mặt −Z là "trước". */
function boxUV(geo: THREE.BoxGeometry, u: number, v: number, w: number, h: number, d: number): void {
  const r = (x: number, y: number, ww: number, hh: number): number[] => [x / 64, 1 - (y + hh) / 64, (x + ww) / 64, 1 - y / 64];
  // thứ tự mặt BoxGeometry: +X, −X, +Y, −Y, +Z, −Z
  const faces = [
    r(u + d + w, v + d, d, h), r(u, v + d, d, h), r(u + d, v, w, d), r(u + d + w, v, w, d),
    r(u + 2 * d + w, v + d, w, h), r(u + d, v + d, w, h),
  ];
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const [u0, v0, u1, v1] = faces[f]!;
    for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, k % 2 ? u1! : u0!, k < 2 ? v1! : v0!);
  }
  uv.needsUpdate = true;
}

/** Khiên mới (gốc ở tâm tay cầm). */
export function createShield(): THREE.Group {
  loadTexture();
  const g = new THREE.Group();
  const plate = new THREE.BoxGeometry(12 * PX, 22 * PX, 1 * PX);
  boxUV(plate, 0, 0, 12, 22, 1);
  plate.translate(0, 0, -1.5 * PX);
  const handle = new THREE.BoxGeometry(2 * PX, 6 * PX, 6 * PX);
  boxUV(handle, 26, 0, 2, 6, 6);
  handle.translate(0, 0, 2 * PX);
  g.add(new THREE.Mesh(plate, material), new THREE.Mesh(handle, material));
  g.userData.kind = "shield";
  return g;
}
