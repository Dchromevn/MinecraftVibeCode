// Ẩn đoạn khuất: duyệt BFS từ đoạn chứa camera, chỉ đi qua mặt thông nhau (độ thông
// của từng đoạn) và nằm trong khối nhìn. Hang dưới đất không thấy từ mặt đất sẽ bị ẩn.
import * as THREE from "three";
import { chunkKey } from "../../../shared/src/index.js";
import { SECTIONS, SECTION_H } from "../mesh/mesher.js";

// Mặt: 0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z; mặt đối diện = f ^ 1
const FDX = [1, -1, 0, 0, 0, 0];
const FDY = [0, 0, 1, -1, 0, 0];
const FDZ = [0, 0, 0, 0, 1, -1];

export function sectionKey(cx: number, sy: number, cz: number): number {
  return chunkKey(cx, cz) * SECTIONS + sy;
}

interface Node {
  cx: number;
  sy: number;
  cz: number;
  from: number; // mặt đi vào (-1 = đoạn xuất phát)
  dirs: number; // các hướng đã đi
}

export class SectionCuller {
  readonly visible = new Set<number>();
  private readonly frustum = new THREE.Frustum();
  private readonly mat = new THREE.Matrix4();
  private readonly box = new THREE.Box3();

  /**
   * getConn(key): độ thông của đoạn đã dựng, null nếu chưa có (coi như thông hết).
   * Trả về false nếu không ẩn được (camera ngoài phạm vi) — khi đó vẽ hết.
   */
  update(camera: THREE.Camera, radius: number, getConn: (key: number) => Uint8Array | null): boolean {
    this.mat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.mat);
    this.visible.clear();
    const p = camera.position;
    if (p.y < 0) return false;
    const ccx = Math.floor(p.x / 16), ccz = Math.floor(p.z / 16);
    const queue: Node[] = [];
    const csy = Math.floor(p.y / SECTION_H);
    if (csy >= SECTIONS) {
      // trên đỉnh thế giới: đi vào mọi đoạn trên cùng từ mặt trên
      for (let dz = -radius; dz <= radius; dz++)
        for (let dx = -radius; dx <= radius; dx++) {
          const cx = ccx + dx, cz = ccz + dz;
          if (!this.inFrustum(cx, SECTIONS - 1, cz)) continue;
          this.visible.add(sectionKey(cx, SECTIONS - 1, cz));
          queue.push({ cx, sy: SECTIONS - 1, cz, from: 2, dirs: 1 << 3 });
        }
    } else {
      this.visible.add(sectionKey(ccx, csy, ccz));
      queue.push({ cx: ccx, sy: csy, cz: ccz, from: -1, dirs: 0 });
    }

    for (let head = 0; head < queue.length; head++) {
      const n = queue[head]!;
      const conn = n.from >= 0 ? getConn(sectionKey(n.cx, n.sy, n.cz)) : null;
      for (let f = 0; f < 6; f++) {
        if (n.dirs & (1 << (f ^ 1))) continue; // không quay ngược hướng
        if (conn && !(conn[n.from]! & (1 << f))) continue;
        const cx = n.cx + FDX[f]!, sy = n.sy + FDY[f]!, cz = n.cz + FDZ[f]!;
        if (sy < 0 || sy >= SECTIONS || Math.abs(cx - ccx) > radius || Math.abs(cz - ccz) > radius) continue;
        const key = sectionKey(cx, sy, cz);
        if (this.visible.has(key) || !this.inFrustum(cx, sy, cz)) continue;
        this.visible.add(key);
        queue.push({ cx, sy, cz, from: f ^ 1, dirs: n.dirs | (1 << f) });
      }
    }
    return true;
  }

  private inFrustum(cx: number, sy: number, cz: number): boolean {
    this.box.min.set(cx * 16, sy * SECTION_H, cz * 16);
    this.box.max.set(cx * 16 + 16, sy * SECTION_H + SECTION_H, cz * 16 + 16);
    return this.frustum.intersectsBox(this.box);
  }
}
