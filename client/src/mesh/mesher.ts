// Dựng mesh cho chunk giữa của một vùng 3x3 chunk (đã có ánh sáng), chia thành 8 đoạn
// 16 block. Chỉ vẽ mặt lộ; AO + ánh sáng mượt theo đỉnh; nước hạ 1/8, tối dần theo độ sâu.
// Đỉnh theo tọa độ trong chunk (0..16) để giữ chính xác ở xa gốc tọa độ.
import { B, BLOCKS, CHUNK_HEIGHT, chestHalf, facingDir, furnaceLit, liquidFalling, liquidLevel } from "../../../shared/src/index.js";
import type { TileUV } from "../atlas.js";
import { regionIndex, type Region } from "../light/regionLight.js";
import { GeomBuilder, type MeshArrays } from "./geomBuilder.js";
import { addSpecial, type SpecialUv } from "./specialBlocks.js";
import { sectionConnectivity } from "./connectivity.js";

export const SECTION_H = 16;
export const SECTIONS = CHUNK_HEIGHT / SECTION_H;

type Vec3 = readonly [number, number, number];
interface FaceDef { n: Vec3; u: Vec3; v: Vec3; shade: number; slot: 0 | 1 | 2 | 3 }
// u × v = n để đỉnh xếp ngược chiều kim đồng hồ nhìn từ ngoài
const FACES: readonly FaceDef[] = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], shade: 0.6, slot: 2 },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.6, slot: 2 },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], shade: 1.0, slot: 0 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.5, slot: 1 },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.8, slot: 3 },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.8, slot: 2 },
];
/** Mặt (chỉ số trong FACES) quay về hướng d: 0 Nam (+Z), 1 Tây (−X), 2 Bắc (−Z), 3 Đông (+X). */
const FACE_OF_DIR = [4, 1, 5, 0] as const;
const CORNERS: ReadonlyArray<readonly [number, number]> = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const AO_LEVELS = [0.5, 0.68, 0.84, 1.0] as const;
const LIQUID_TOP = 14 / 16;
const LAYER_TOP = 2 / 16;
// texture nước gốc ngả tím; nhuộm xanh cho giống nước hơn
const WATER_TINT = [0.55, 0.75, 1.0] as const;
const NO_TINT = [1, 1, 1] as const;
const UNDERWATER_FALLOFF = 0.35; // càng lớn đáy sâu càng tối nhanh

const OPAQUE = new Uint8Array(256);
const CUBE_SOLID = new Uint8Array(256); // khối đầy đủ, che mặt kề
for (const b of BLOCKS) {
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  CUBE_SOLID[b.id] = b.render === "cube" && !b.transparent ? 1 : 0;
}

export interface UvTable extends SpecialUv {
  snowSide: TileUV;
  furnaceOn: TileUV;
  chestFront: [TileUV, TileUV]; // hai nửa mặt trước rương đôi (nửa A, nửa B)
}

export function buildUvTable(uv: (name: string) => TileUV): UvTable {
  return {
    blocks: BLOCKS.map((b) => [uv(b.tex.top), uv(b.tex.bottom), uv(b.tex.side), uv(b.tex.front ?? b.tex.side)]),
    snowSide: uv("snow_side"),
    railCurved: uv("rail_curved"),
    railT: uv("rail_t"),
    railCross: uv("rail_cross"),
    bedFootSide: uv("bed_foot_side"),
    furnaceOn: uv("furnace_front_on"),
    chestFront: [uv("chest_front_a"), uv("chest_front_b")],
    farmlandWet: uv("farmland_wet"),
    wheat: Array.from({ length: 8 }, (_, i) => uv(`wheat_${i}`)),
  };
}

export interface SectionMesh {
  solid: MeshArrays | null; // khối + cắt alpha (lá, cỏ, kính, ray...) + dung nham
  water: MeshArrays | null; // nước bán trong suốt
  conn: Uint8Array; // độ thông giữa 6 mặt của đoạn (ẩn hang khuất)
}

function waterDepth(at: (x: number, y: number, z: number) => number, x: number, y: number, z: number): number {
  let d = 0;
  while (d < 32 && at(x, y + d, z) === B.WATER) d++;
  return d;
}

function underwaterTint(depth: number): readonly [number, number, number] {
  const k = Math.exp(-UNDERWATER_FALLOFF * depth);
  return [0.18 + 0.82 * k, 0.28 + 0.72 * k, 0.5 + 0.5 * k];
}

/** Mặt trên chất lỏng theo mức trong dữ liệu phụ (nguồn 14/16, mức càng cao càng thấp). */
function liquidTop(meta: number): number {
  if (liquidFalling(meta)) return LIQUID_TOP;
  return (LIQUID_TOP * (8 - liquidLevel(meta))) / 8;
}

/** region: block + dữ liệu phụ của vùng 3x3 chunk; light: ánh sáng cùng chỉ số. Trả về 8 đoạn của chunk giữa. */
export function meshRegion(region: Region, light: Uint8Array, uvt: UvTable): SectionMesh[] {
  const blocks = region.blocks, metas = region.meta;
  const at = (x: number, y: number, z: number): number => {
    if (y >= CHUNK_HEIGHT) return B.AIR;
    if (y < 0) return B.BEDROCK;
    return blocks[regionIndex(x + 16, y, z + 16)]!;
  };
  const mt = (x: number, y: number, z: number): number =>
    y >= CHUNK_HEIGHT || y < 0 ? 0 : metas[regionIndex(x + 16, y, z + 16)]!;
  const sky = (x: number, y: number, z: number): number =>
    y >= CHUNK_HEIGHT ? 15 : y < 0 ? 0 : light[regionIndex(x + 16, y, z + 16)]! >> 4;
  const blk = (x: number, y: number, z: number): number =>
    y >= CHUNK_HEIGHT || y < 0 ? 0 : light[regionIndex(x + 16, y, z + 16)]! & 15;
  const pos = new Float32Array(12), uvArr = new Float32Array(8), rgb = new Float32Array(12), lit = new Float32Array(8);
  const out: SectionMesh[] = [];

  for (let sy = 0; sy < SECTIONS; sy++) {
    const solid = new GeomBuilder();
    const water = new GeomBuilder();
    for (let y = sy * SECTION_H; y < (sy + 1) * SECTION_H; y++) {
      for (let z = 0; z < 16; z++) {
        for (let x = 0; x < 16; x++) {
          const id = at(x, y, z);
          if (id === B.AIR) continue;
          const def = BLOCKS[id]!;
          if (def.render === "none") continue;
          const cellLight = [sky(x, y, z) / 15, blk(x, y, z) / 15];
          const meta = mt(x, y, z);
          if (addSpecial(solid, id, meta, x, y, z, at, uvt, cellLight)) continue;

          const isWater = id === B.WATER;
          const isLiquid = def.render === "liquid";
          const isLayer = def.render === "layer";
          const builder = isWater ? water : solid;
          const top = isLiquid ? (at(x, y + 1, z) === id ? 1 : liquidTop(meta)) : isLayer ? LAYER_TOP : 1;
          // block có hướng (lò, rương): mặt trước quay theo dữ liệu phụ
          const frontFace: number = def.meta === "facing" || def.meta === "chest" ? FACE_OF_DIR[facingDir(meta)]! : -1;
          const snowAbove = id === B.GRASS && at(x, y + 1, z) === B.SNOW_LAYER;

          for (let fi = 0; fi < 6; fi++) {
            const f = FACES[fi]!;
            const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
            if (ny < 0) continue;
            const nid = at(nx, ny, nz);
            if (CUBE_SOLID[nid]) continue;
            if (nid === id && def.transparent) continue; // lá–lá, nước–nước, kính–kính
            if (isLiquid && nid === id) continue;
            if (isLayer && f.n[1] === -1) continue;
            if (isLiquid && f.n[1] === 1 && top === 1) continue;

            const depth = !isWater && nid === B.WATER ? waterDepth(at, nx, ny, nz) : 0;
            const tint = isWater ? WATER_TINT : depth > 0 ? underwaterTint(depth) : NO_TINT;
            let uv = uvt.blocks[id]![frontFace < 0 || f.n[1] !== 0 ? f.slot : fi === frontFace ? 3 : 2]!;
            if (fi === frontFace && id === B.FURNACE && furnaceLit(meta)) uv = uvt.furnaceOn;
            if (fi === frontFace && id === B.CHEST && chestHalf(meta) > 0) uv = uvt.chestFront[chestHalf(meta) - 1]!;
            if (snowAbove && f.n[1] === 0) uv = uvt.snowSide;
            const vTop = f.n[1] === 0 ? uv.v0 + (uv.v1 - uv.v0) * top : uv.v1;
            const nSky = sky(nx, ny, nz), nBlk = blk(nx, ny, nz);

            for (let k = 0; k < 4; k++) {
              const [us, vs] = CORNERS[k]!;
              let cy = 0.5 + f.n[1] * 0.5 + (f.u[1] * us + f.v[1] * vs) * 0.5;
              if (cy > 0.99) cy = top;
              pos[k * 3] = x + 0.5 + f.n[0] * 0.5 + (f.u[0] * us + f.v[0] * vs) * 0.5;
              pos[k * 3 + 1] = y + cy;
              pos[k * 3 + 2] = z + 0.5 + f.n[2] * 0.5 + (f.u[2] * us + f.v[2] * vs) * 0.5;
              if (isWater) {
                // nước dùng texture riêng lặp lại theo tọa độ block (để trôi được)
                uvArr[k * 2] = f.n[0] !== 0 ? pos[k * 3 + 2]! : pos[k * 3]!;
                uvArr[k * 2 + 1] = f.n[1] !== 0 ? pos[k * 3 + 2]! : pos[k * 3 + 1]!;
              } else {
                uvArr[k * 2] = us < 0 ? uv.u0 : uv.u1;
                uvArr[k * 2 + 1] = vs < 0 ? uv.v0 : vTop;
              }

              let shade = f.shade, s = nSky, bl = nBlk, cnt = 1;
              if (!isLiquid) {
                const ax = nx + f.u[0] * us, ay = ny + f.u[1] * us, az = nz + f.u[2] * us;
                const bx = nx + f.v[0] * vs, by = ny + f.v[1] * vs, bz = nz + f.v[2] * vs;
                const qx = ax + f.v[0] * vs, qy = ay + f.v[1] * vs, qz = az + f.v[2] * vs;
                const s1 = OPAQUE[at(ax, ay, az)]!, s2 = OPAQUE[at(bx, by, bz)]!;
                const c = s1 && s2 ? 1 : OPAQUE[at(qx, qy, qz)]!;
                shade *= AO_LEVELS[s1 && s2 ? 0 : 3 - (s1 + s2 + c)]!;
                // ánh sáng mượt: trung bình các ô không đặc quanh đỉnh
                if (!s1) { s += sky(ax, ay, az); bl += blk(ax, ay, az); cnt++; }
                if (!s2) { s += sky(bx, by, bz); bl += blk(bx, by, bz); cnt++; }
                if (!c) { s += sky(qx, qy, qz); bl += blk(qx, qy, qz); cnt++; }
              }
              rgb[k * 3] = shade * tint[0];
              rgb[k * 3 + 1] = shade * tint[1];
              rgb[k * 3 + 2] = shade * tint[2];
              lit[k * 2] = s / cnt / 15;
              lit[k * 2 + 1] = def.lightEmit > 0 ? def.lightEmit / 15 : bl / cnt / 15;
            }
            builder.quad(pos, uvArr, rgb, lit);
          }
        }
      }
    }
    out.push({ solid: solid.build(), water: water.build(), conn: sectionConnectivity(blocks, sy, SECTION_H) });
  }
  return out;
}
