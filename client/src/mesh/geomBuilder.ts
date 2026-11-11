// Gom đỉnh/màu/uv/chỉ số thành mảng có kiểu (chạy được trong Web Worker, không cần three).

export interface MeshArrays {
  positions: Float32Array;
  colors: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
}

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
    // chọn đường chéo đi qua cặp đỉnh sáng hơn để AO không bị vằn
    const l0 = rgb[0]! + rgb[1]! + rgb[2]!;
    const l1 = rgb[3]! + rgb[4]! + rgb[5]!;
    const l2 = rgb[6]! + rgb[7]! + rgb[8]!;
    const l3 = rgb[9]! + rgb[10]! + rgb[11]!;
    if (l0 + l2 >= l1 + l3) this.indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
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
      indices: this.vcount > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
    };
  }
}

/** Các buffer cần chuyển (transfer) khi gửi qua postMessage. */
export function meshTransferables(m: MeshArrays | null): ArrayBuffer[] {
  if (!m) return [];
  return [m.positions.buffer, m.colors.buffer, m.uvs.buffer, m.indices.buffer] as ArrayBuffer[];
}
