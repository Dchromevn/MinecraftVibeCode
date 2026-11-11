// Gom đỉnh/màu/uv/ánh sáng/chỉ số thành mảng có kiểu (chạy được trong Web Worker).

export interface MeshArrays {
  positions: Float32Array;
  colors: Float32Array; // AO × độ sáng theo hướng mặt × màu nhuộm
  uvs: Float32Array;
  light: Float32Array; // (trời, block) 0..1 cho từng đỉnh — shader đổi thành độ sáng
  indices: Uint16Array | Uint32Array;
}

const FULL_LIGHT = [1, 0, 1, 0, 1, 0, 1, 0];

export class GeomBuilder {
  private positions: number[] = [];
  private colors: number[] = [];
  private uvs: number[] = [];
  private light: number[] = [];
  private indices: number[] = [];
  private vcount = 0;

  /**
   * 4 đỉnh ngược chiều kim đồng hồ (nhìn từ phía mặt trước).
   * rgb: 12 số; light: 8 số (trời, block) cho 4 đỉnh, mặc định sáng như ngoài trời.
   */
  quad(p: ArrayLike<number>, uv: ArrayLike<number>, rgb: ArrayLike<number>, light: ArrayLike<number> = FULL_LIGHT): void {
    for (let i = 0; i < 12; i++) this.positions.push(p[i]!);
    for (let i = 0; i < 8; i++) this.uvs.push(uv[i]!);
    for (let i = 0; i < 12; i++) this.colors.push(rgb[i]!);
    for (let i = 0; i < 8; i++) this.light.push(light[i]!);
    const b = this.vcount;
    // chọn đường chéo đi qua cặp đỉnh sáng hơn để AO/ánh sáng không bị vằn
    const lum = (k: number): number => rgb[k * 3]! + rgb[k * 3 + 1]! + rgb[k * 3 + 2]! + 3 * Math.max(light[k * 2]!, light[k * 2 + 1]!);
    if (lum(0) + lum(2) >= lum(1) + lum(3)) this.indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    else this.indices.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    this.vcount += 4;
  }

  get vertexCount(): number {
    return this.vcount;
  }

  build(): MeshArrays | null {
    if (this.vcount === 0) return null;
    return {
      positions: new Float32Array(this.positions),
      colors: new Float32Array(this.colors),
      uvs: new Float32Array(this.uvs),
      light: new Float32Array(this.light),
      indices: this.vcount > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
    };
  }
}

/** Các buffer cần chuyển (transfer) khi gửi qua postMessage. */
export function meshTransferables(m: MeshArrays | null): ArrayBuffer[] {
  if (!m) return [];
  return [m.positions.buffer, m.colors.buffer, m.uvs.buffer, m.light.buffer, m.indices.buffer] as ArrayBuffer[];
}
