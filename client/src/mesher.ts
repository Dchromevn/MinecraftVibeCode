// Dựng geometry cho một chunk: chỉ vẽ mặt tiếp giáp không khí / block trong suốt,
// ambient occlusion theo đỉnh, mỗi hướng một độ sáng. Hai geometry: đặc và cắt alpha.
import * as THREE from "three";
import { B, BLOCKS, CHUNK_SIZE, CHUNK_HEIGHT, type Chunk, type World } from "../../shared/src/index.js";
import type { Atlas, TileUV } from "./atlas.js";

type Vec3 = readonly [number, number, number];
interface FaceDef {
  n: Vec3;
  u: Vec3;
  v: Vec3;
  shade: number;
  tex: "top" | "bottom" | "side" | "front";
}

// u × v = n để đỉnh xếp ngược chiều kim đồng hồ nhìn từ ngoài
const FACES: readonly FaceDef[] = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], shade: 0.6, tex: "side" },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.6, tex: "side" },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], shade: 1.0, tex: "top" },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.5, tex: "bottom" },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.8, tex: "front" },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.8, tex: "side" },
];
const CORNERS: ReadonlyArray<readonly [number, number]> = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const AO_LEVELS = [0.5, 0.68, 0.84, 1.0] as const;
const CROSS_LIGHT = 0.95;

class GeomBuilder {
  positions: number[] = [];
  colors: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];
  private vcount = 0;

  /** 4 đỉnh ngược chiều kim đồng hồ; light là độ sáng mỗi đỉnh. */
  quad(p: ArrayLike<number>, uv: ArrayLike<number>, light: readonly number[]): void {
    for (let i = 0; i < 12; i++) this.positions.push(p[i]!);
    for (let i = 0; i < 8; i++) this.uvs.push(uv[i]!);
    for (let i = 0; i < 4; i++) {
      const l = light[i]!;
      this.colors.push(l, l, l);
    }
    const b = this.vcount;
    // chọn đường chéo đi qua cặp đỉnh sáng hơn để AO không bị vằn
    if (light[0]! + light[2]! >= light[1]! + light[3]!) {
      this.indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    } else {
      this.indices.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    }
    this.vcount += 4;
  }

  build(): THREE.BufferGeometry | null {
    if (this.vcount === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setIndex(this.vcount > 65535 ? new THREE.Uint32BufferAttribute(this.indices, 1) : new THREE.Uint16BufferAttribute(this.indices, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export interface ChunkGeometry {
  opaque: THREE.BufferGeometry | null;
  cutout: THREE.BufferGeometry | null;
}

/**
 * @param cutY debug: nếu khác null, mọi block có y > cutY coi như không khí
 *             để mặt cắt ngang lộ ra đá và quặng bên trong.
 */
export function buildChunkGeometry(
  world: World,
  chunk: Chunk,
  atlas: Atlas,
  cutY: number | null = null,
): ChunkGeometry {
  const ox = chunk.cx * CHUNK_SIZE;
  const oz = chunk.cz * CHUNK_SIZE;
  const opaque = new GeomBuilder();
  const cutout = new GeomBuilder();
  const maxY = cutY === null ? CHUNK_HEIGHT - 1 : Math.min(CHUNK_HEIGHT - 1, cutY);
  const blockAt = (x: number, y: number, z: number): number => (y > maxY ? B.AIR : world.getBlock(x, y, z));

  // dưới y=0 coi như đặc để không vẽ đáy đá nền
  const isOpaque = (x: number, y: number, z: number): number =>
    y < 0 ? 1 : BLOCKS[blockAt(x, y, z)]!.opaque ? 1 : 0;

  const pos = new Float32Array(12);
  const uvArr = new Float32Array(8);
  const light = [0, 0, 0, 0];

  for (let y = 0; y <= maxY; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const id = chunk.get(x, y, z);
        if (id === B.AIR) continue;
        const def = BLOCKS[id]!;
        const wx = ox + x;
        const wz = oz + z;

        if (def.render === "cross") {
          addCross(cutout, wx, y, wz, atlas.uv(def.tex.side));
          continue;
        }

        const builder = def.transparent ? cutout : opaque;
        for (const f of FACES) {
          const nx = wx + f.n[0];
          const ny = y + f.n[1];
          const nz = wz + f.n[2];
          if (ny < 0) continue;
          const ndef = BLOCKS[blockAt(nx, ny, nz)]!;
          // bỏ mặt giáp block đặc, và mặt giữa hai block trong suốt cùng loại (lá–lá)
          if (ndef.render === "cube" && (!ndef.transparent || ndef.id === def.id)) continue;

          const texName = f.tex === "front" ? (def.tex.front ?? def.tex.side) : def.tex[f.tex];
          const uv = atlas.uv(texName);
          const cx = wx + 0.5 + f.n[0] * 0.5;
          const cy = y + 0.5 + f.n[1] * 0.5;
          const cz = wz + 0.5 + f.n[2] * 0.5;

          for (let k = 0; k < 4; k++) {
            const [us, vs] = CORNERS[k]!;
            pos[k * 3] = cx + (f.u[0] * us + f.v[0] * vs) * 0.5;
            pos[k * 3 + 1] = cy + (f.u[1] * us + f.v[1] * vs) * 0.5;
            pos[k * 3 + 2] = cz + (f.u[2] * us + f.v[2] * vs) * 0.5;
            uvArr[k * 2] = us < 0 ? uv.u0 : uv.u1;
            uvArr[k * 2 + 1] = vs < 0 ? uv.v0 : uv.v1;

            const s1 = isOpaque(nx + f.u[0] * us, ny + f.u[1] * us, nz + f.u[2] * us);
            const s2 = isOpaque(nx + f.v[0] * vs, ny + f.v[1] * vs, nz + f.v[2] * vs);
            const c = isOpaque(
              nx + f.u[0] * us + f.v[0] * vs,
              ny + f.u[1] * us + f.v[1] * vs,
              nz + f.u[2] * us + f.v[2] * vs,
            );
            const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
            light[k] = f.shade * AO_LEVELS[ao]!;
          }
          builder.quad(pos, uvArr, light);
        }
      }
    }
  }

  return { opaque: opaque.build(), cutout: cutout.build() };
}

/** Hai mặt phẳng chéo hình chữ X, mỗi mặt phẳng vẽ cả hai chiều (vật liệu một mặt). */
function addCross(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV): void {
  const l = [CROSS_LIGHT, CROSS_LIGHT, CROSS_LIGHT, CROSS_LIGHT];
  const uvs = [uv.u0, uv.v0, uv.u1, uv.v0, uv.u1, uv.v1, uv.u0, uv.v1];
  const uvsBack = [uv.u1, uv.v0, uv.u0, uv.v0, uv.u0, uv.v1, uv.u1, uv.v1];
  const a = 0.15; // thu vào một chút để không chạm mép block
  const lo = a;
  const hi = 1 - a;
  b.quad([x + lo, y, z + lo, x + hi, y, z + hi, x + hi, y + 1, z + hi, x + lo, y + 1, z + lo], uvs, l);
  b.quad([x + hi, y, z + hi, x + lo, y, z + lo, x + lo, y + 1, z + lo, x + hi, y + 1, z + hi], uvsBack, l);
  b.quad([x + hi, y, z + lo, x + lo, y, z + hi, x + lo, y + 1, z + hi, x + hi, y + 1, z + lo], uvs, l);
  b.quad([x + lo, y, z + hi, x + hi, y, z + lo, x + hi, y + 1, z + lo, x + lo, y + 1, z + hi], uvsBack, l);
}
