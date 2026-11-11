// Dựng geometry cho một đoạn (section) 16 x SECTION_H x 16: chỉ vẽ mặt lộ,
// AO + ánh sáng mượt theo đỉnh, các hình dạng đặc biệt. Hai geometry: đặc và cắt alpha.
import * as THREE from "three";
import { B, BLOCKS, CHUNK_HEIGHT, type World } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { LightMap } from "../light/lightMap.js";
import { SECTION_H } from "../light/lightMap.js";
import { GeomBuilder } from "./geomBuilder.js";
import { writeColor } from "./shade.js";
import { addCross, addPost, addRail, addTorch } from "./shapes.js";

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

const OPAQUE = new Uint8Array(256);
for (const b of BLOCKS) OPAQUE[b.id] = b.opaque ? 1 : 0;

export interface SectionGeometry {
  opaque: THREE.BufferGeometry | null;
  cutout: THREE.BufferGeometry | null;
}

/**
 * @param light null = sáng đều (dùng cho mặt cắt debug)
 * @param cutY debug: mọi block có y > cutY coi như không khí
 */
export function buildSectionGeometry(
  world: World,
  light: LightMap | null,
  atlas: Atlas,
  cx: number,
  sy: number,
  cz: number,
  cutY: number | null,
): SectionGeometry {
  const ox = cx * 16, oz = cz * 16, oy = sy * SECTION_H;
  const maxY = Math.min(CHUNK_HEIGHT - 1, cutY ?? CHUNK_HEIGHT - 1);
  const data = world.chunkAt(cx, cz)!.data;
  const opaque = new GeomBuilder();
  const cutout = new GeomBuilder();

  // đọc nhanh trong chunk hiện tại, ngoài chunk thì hỏi World
  const blockAt = (x: number, y: number, z: number): number => {
    if (y > maxY || y >= CHUNK_HEIGHT) return B.AIR;
    if (y < 0) return B.BEDROCK; // coi như đặc để không vẽ đáy
    const lx = x - ox, lz = z - oz;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16) return data[(y * 16 + lz) * 16 + lx]!;
    return world.getBlock(x, y, z);
  };
  const skyAt = (x: number, y: number, z: number): number => (light ? light.sky(x, y, z) : 15);
  const blkAt = (x: number, y: number, z: number): number => (light ? light.block(x, y, z) : 0);
  const cellRgb = (x: number, y: number, z: number): number[] => {
    const out = [0, 0, 0];
    writeColor(out, 0, skyAt(x, y, z), blkAt(x, y, z), 1);
    return out;
  };

  const pos = new Float32Array(12);
  const uvArr = new Float32Array(8);
  const rgb = new Float32Array(12);

  for (let y = oy; y < oy + SECTION_H && y <= maxY; y++) {
    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        const id = data[(y * 16 + lz) * 16 + lx]!;
        if (id === B.AIR) continue;
        const def = BLOCKS[id]!;
        const wx = ox + lx, wz = oz + lz;

        if (def.render !== "cube") {
          const uv = atlas.uv(def.tex.side);
          if (def.render === "cross") addCross(cutout, wx, y, wz, uv, cellRgb(wx, y, wz));
          else if (def.render === "torch") addTorch(cutout, wx, y, wz, uv);
          else if (def.render === "rail") addRail(cutout, wx, y, wz, uv, cellRgb(wx, y, wz), id === B.RAIL_X);
          else if (def.render === "post") {
            const top = !OPAQUE[blockAt(wx, y + 1, wz)] && blockAt(wx, y + 1, wz) !== id;
            const bottom = !OPAQUE[blockAt(wx, y - 1, wz)] && blockAt(wx, y - 1, wz) !== id;
            addPost(opaque, wx, y, wz, uv, cellRgb(wx, y, wz), top, bottom);
          }
          continue;
        }

        const builder = def.transparent ? cutout : opaque;
        for (const f of FACES) {
          const nx = wx + f.n[0], ny = y + f.n[1], nz = wz + f.n[2];
          if (ny < 0) continue;
          const nid = blockAt(nx, ny, nz);
          const ndef = BLOCKS[nid]!;
          // bỏ mặt giáp block đặc, và mặt giữa hai block trong suốt cùng loại (lá–lá)
          if (ndef.render === "cube" && (!ndef.transparent || nid === id)) continue;

          const texName = f.tex === "front" ? (def.tex.front ?? def.tex.side) : def.tex[f.tex];
          const uv = atlas.uv(texName);
          const cxw = wx + 0.5 + f.n[0] * 0.5, cyw = y + 0.5 + f.n[1] * 0.5, czw = wz + 0.5 + f.n[2] * 0.5;
          const nSky = skyAt(nx, ny, nz), nBlk = blkAt(nx, ny, nz);

          for (let k = 0; k < 4; k++) {
            const [us, vs] = CORNERS[k]!;
            pos[k * 3] = cxw + (f.u[0] * us + f.v[0] * vs) * 0.5;
            pos[k * 3 + 1] = cyw + (f.u[1] * us + f.v[1] * vs) * 0.5;
            pos[k * 3 + 2] = czw + (f.u[2] * us + f.v[2] * vs) * 0.5;
            uvArr[k * 2] = us < 0 ? uv.u0 : uv.u1;
            uvArr[k * 2 + 1] = vs < 0 ? uv.v0 : uv.v1;

            const ax = nx + f.u[0] * us, ay = ny + f.u[1] * us, az = nz + f.u[2] * us;
            const bx = nx + f.v[0] * vs, by = ny + f.v[1] * vs, bz = nz + f.v[2] * vs;
            const qx = ax + f.v[0] * vs, qy = ay + f.v[1] * vs, qz = az + f.v[2] * vs;
            const s1 = OPAQUE[blockAt(ax, ay, az)]!;
            const s2 = OPAQUE[blockAt(bx, by, bz)]!;
            const c = s1 && s2 ? 1 : OPAQUE[blockAt(qx, qy, qz)]!;
            const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + c);

            // ánh sáng mượt: trung bình các ô không đặc quanh đỉnh
            let sky = nSky, blk = nBlk, cnt = 1;
            if (light) {
              if (!s1) { sky += skyAt(ax, ay, az); blk += blkAt(ax, ay, az); cnt++; }
              if (!s2) { sky += skyAt(bx, by, bz); blk += blkAt(bx, by, bz); cnt++; }
              if (!c) { sky += skyAt(qx, qy, qz); blk += blkAt(qx, qy, qz); cnt++; }
            }
            writeColor(rgb, k * 3, sky / cnt, blk / cnt, f.shade * AO_LEVELS[ao]!);
          }
          builder.quad(pos, uvArr, rgb);
        }
      }
    }
  }

  return { opaque: opaque.build(), cutout: cutout.build() };
}
