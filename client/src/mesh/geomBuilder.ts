// Gom đỉnh/màu/uv/chỉ số rồi tạo BufferGeometry.
import * as THREE from "three";

export class GeomBuilder {
  private positions: number[] = [];
  private colors: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];
  private vcount = 0;

  /**
   * 4 đỉnh ngược chiều kim đồng hồ (nhìn từ phía mặt trước).
   * rgb: 12 số (màu từng đỉnh).
   */
  quad(p: ArrayLike<number>, uv: ArrayLike<number>, rgb: ArrayLike<number>): void {
    for (let i = 0; i < 12; i++) this.positions.push(p[i]!);
    for (let i = 0; i < 8; i++) this.uvs.push(uv[i]!);
    for (let i = 0; i < 12; i++) this.colors.push(rgb[i]!);
    const b = this.vcount;
    // chọn đường chéo đi qua cặp đỉnh sáng hơn để AO/ánh sáng không bị vằn
    const l0 = rgb[0]! + rgb[1]! + rgb[2]!;
    const l1 = rgb[3]! + rgb[4]! + rgb[5]!;
    const l2 = rgb[6]! + rgb[7]! + rgb[8]!;
    const l3 = rgb[9]! + rgb[10]! + rgb[11]!;
    if (l0 + l2 >= l1 + l3) this.indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    else this.indices.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    this.vcount += 4;
  }

  build(): THREE.BufferGeometry | null {
    if (this.vcount === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setIndex(
      this.vcount > 65535
        ? new THREE.Uint32BufferAttribute(this.indices, 1)
        : new THREE.Uint16BufferAttribute(this.indices, 1),
    );
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}
