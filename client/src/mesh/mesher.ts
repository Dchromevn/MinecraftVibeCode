// Dựng mesh cho một chunk từ khối dữ liệu có viền (18 x 128 x 18: chunk + 1 block
// của các chunk kề). Chỉ vẽ mặt lộ, AO theo đỉnh, mặt nước hạ thấp 1/8.
// Đỉnh tính theo tọa độ cục bộ của chunk (0..16) để giữ chính xác ở xa gốc tọa độ.
import { B, BLOCKS, CHUNK_HEIGHT } from "../../../shared/src/index.js";
import type { TileUV } from "../atlas.js";
import { GeomBuilder, type MeshArrays } from "./geomBuilder.js";
import { addCross } from "./shapes.js";

export const PAD = 18; // 16 + 2 viền
export function padIndex(px: number, y: number, pz: number): number {
  return (y * PAD + pz) * PAD + px;
}

type Vec3 = readonly [number, number, number];
interface FaceDef {
  n: Vec3;
  u: Vec3;
  v: Vec3;
  shade: number;
  slot: 0 | 1 | 2 | 3; // top, bottom, side, front
}

// u × v = n để đỉnh xếp ngược chiều kim đồng hồ nhìn từ ngoài
const FACES: readonly FaceDef[] = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], shade: 0.6, slot: 2 },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.6, slot: 2 },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], shade: 1.0, slot: 0 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.5, slot: 1 },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.8, slot: 3 },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.8, slot: 2 },
];
const CORNERS: ReadonlyArray<readonly [number, number]> = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const AO_LEVELS = [0.5, 0.68, 0.84, 1.0] as const;
const WATER_TOP = 14 / 16;
const LAYER_TOP = 2 / 16;
// texture nước gốc ngả tím; nhuộm xanh cho giống nước hơn
const WATER_TINT = [0.3, 0.5, 0.95] as const;
const NO_TINT = [1, 1, 1] as const;

const OPAQUE = new Uint8Array(256);
const CUBE_SOLID = new Uint8Array(256); // khối đầy đủ, che mặt kề
for (const b of BLOCKS) {
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  CUBE_SOLID[b.id] = b.render === "cube" && !b.transparent ? 1 : 0;
}

/** UV cho từng block: [top, bottom, side, front] và vài texture phụ. */
export interface UvTable {
  blocks: TileUV[][]; // blocks[id][slot]
  snowSide: TileUV;
}

export function buildUvTable(uv: (name: string) => TileUV): UvTable {
  return {
    blocks: BLOCKS.map((b) => [uv(b.tex.top), uv(b.tex.bottom), uv(b.tex.side), uv(b.tex.front ?? b.tex.side)]),
    snowSide: uv("snow_side"),
  };
}

export interface ChunkMesh {
  solid: MeshArrays | null; // khối + cắt alpha (lá, cỏ cao)
  water: MeshArrays | null; // bán trong suốt
}

export function meshChunk(pad: Uint8Array, uvt: UvTable): ChunkMesh {
  const solid = new GeomBuilder();
  const water = new GeomBuilder();
  const at = (px: number, y: number, pz: number): number => {
    if (y >= CHUNK_HEIGHT) return B.AIR;
    if (y < 0) return B.BEDROCK;
    return pad[padIndex(px, y, pz)]!;
  };
  const pos = new Float32Array(12);
  const uvArr = new Float32Array(8);
  const rgb = new Float32Array(12);

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < 16; z++) {
      for (let x = 0; x < 16; x++) {
        const px = x + 1, pz = z + 1;
        const id = pad[padIndex(px, y, pz)]!;
        if (id === B.AIR) continue;
        const def = BLOCKS[id]!;
        if (def.render === "none") continue;
        if (def.render === "cross") {
          addCross(solid, x, y, z, uvt.blocks[id]![2]!, [1, 1, 1]);
          continue;
        }

        const isWater = def.render === "liquid";
        const isLayer = def.render === "layer";
        const builder = isWater ? water : solid;
        // nước: mặt trên hạ xuống nếu bên trên không phải nước
        const top = isWater ? (at(px, y + 1, pz) === id ? 1 : WATER_TOP) : isLayer ? LAYER_TOP : 1;
        const snowAbove = id === B.GRASS && at(px, y + 1, pz) === B.SNOW_LAYER;

        for (const f of FACES) {
          const nx = px + f.n[0], ny = y + f.n[1], nz = pz + f.n[2];
          if (ny < 0) continue;
          const nid = at(nx, ny, nz);
          if (CUBE_SOLID[nid]) continue;
          if (nid === id && def.transparent) continue; // lá–lá, nước–nước
          if (isLayer && f.n[1] === -1) continue; // lớp tuyết nằm trên khối đặc
          if (isWater && f.n[1] === 1 && top === 1) continue;
          if (isLayer && f.n[1] === 0 && nid === id) continue;

          let uv = uvt.blocks[id]![f.slot]!;
          if (snowAbove && f.n[1] === 0) uv = uvt.snowSide;
          // khối thấp hơn (nước, tuyết): cắt texture mặt bên theo chiều cao
          const vTop = f.n[1] === 0 ? uv.v0 + (uv.v1 - uv.v0) * top : uv.v1;

          for (let k = 0; k < 4; k++) {
            const [us, vs] = CORNERS[k]!;
            const cx = 0.5 + f.n[0] * 0.5 + (f.u[0] * us + f.v[0] * vs) * 0.5;
            let cy = 0.5 + f.n[1] * 0.5 + (f.u[1] * us + f.v[1] * vs) * 0.5;
            const cz = 0.5 + f.n[2] * 0.5 + (f.u[2] * us + f.v[2] * vs) * 0.5;
            if (cy > 0.99) cy = top; // hạ đỉnh trên cùng cho nước / lớp tuyết
            pos[k * 3] = x + cx;
            pos[k * 3 + 1] = y + cy;
            pos[k * 3 + 2] = z + cz;
            uvArr[k * 2] = us < 0 ? uv.u0 : uv.u1;
            uvArr[k * 2 + 1] = vs < 0 ? uv.v0 : vTop;

            let light = f.shade;
            if (!isWater) {
              const ax = nx + f.u[0] * us, ay = ny + f.u[1] * us, az = nz + f.u[2] * us;
              const bx = nx + f.v[0] * vs, by = ny + f.v[1] * vs, bz = nz + f.v[2] * vs;
              const s1 = OPAQUE[at(ax, ay, az)]!;
              const s2 = OPAQUE[at(bx, by, bz)]!;
              const c = s1 && s2 ? 1 : OPAQUE[at(ax + f.v[0] * vs, ay + f.v[1] * vs, az + f.v[2] * vs)]!;
              light *= AO_LEVELS[s1 && s2 ? 0 : 3 - (s1 + s2 + c)]!;
            }
            const tint = isWater ? WATER_TINT : NO_TINT;
            rgb[k * 3] = light * tint[0];
            rgb[k * 3 + 1] = light * tint[1];
            rgb[k * 3 + 2] = light * tint[2];
          }
          builder.quad(pos, uvArr, rgb);
        }
      }
    }
  }
  return { solid: solid.build(), water: water.build() };
}
