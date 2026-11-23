// Trại bỏ hoang (Giai đoạn 7e, theo mẫu client.jar): một lều chọn từ nhóm lều của biome, khối ghép ở cửa lều nối ra một khu lửa
// trại (nhóm cùng biome: 45 mẫu chung + 4 mẫu riêng) — hai khối ghép đối mặt nhau, mảnh con xoay cho khớp. Khối ghép dựng đứng
// (hướng "up_*") trồng một cây (loài của game theo nhóm cây trong mẫu). Lấp móng bằng đất chỗ trũng.
import { B } from "../blocks.js";
import { randInt, type Rng } from "../rng.js";
import { CAMP_BIOME_POOLS, structureData, type Jig, type StructTemplate } from "../structures.js";
import type { WoodKind } from "../woods.js";
import type { Placement } from "./structPlan.js";
import { rotDir, rotSize, worldOf, type Piece } from "./structPaint.js";
import type { Column, TerrainSampler } from "./terrainSampler.js";

const FRONT: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 };
const DX = [0, -1, 0, 1], DZ = [1, 0, -1, 0];

/** Chọn theo trọng số trong nhóm (bỏ phần tử không có mẫu). */
function pickPool(name: string, rng: Rng): string | null {
  const pool = structureData()?.pools[name];
  if (!pool?.length) return null;
  let r = rng() * pool.reduce((s, [, w]) => s + w, 0);
  for (const [n, w] of pool) if ((r -= w) < 0) return n;
  return pool[0]![0];
}

const front = (j: Jig): string => j[3].split("_")[0]!;

export function planCamp(s: TerrainSampler, rng: Rng, x: number, z: number, col: Column, biome: string): Placement | null {
  const data = structureData(), mcs = CAMP_BIOME_POOLS[biome];
  if (!data || !mcs || col.height <= col.waterTop || col.lake || col.river) return null;
  const mcb = mcs[randInt(rng, 0, mcs.length - 1)]!;
  const tentName = pickPool(`abandoned_camp/tent/${mcb}`, rng), tent = tentName ? data.templates[tentName] : undefined;
  if (!tent) return null;
  const rot = randInt(rng, 0, 3), [sx, , sz] = rotSize(tent, rot);
  const root: Piece = { t: tent, rot, x: x - (sx >> 1), y: col.height, z: z - (sz >> 1), air: false, fill: B.DIRT };
  const pieces: Piece[] = [root], trees: Placement["trees"] = [];
  const expand = (p: Piece, depth: number): void => {
    for (const j of p.t.jig) {
      const [wx, wy, wz] = worldOf(p, j[0], j[1], j[2]);
      if (front(j) === "up") { // cây
        const t = j[6] ? pickPool(j[6], rng) : null;
        if (t?.startsWith("tree:")) trees.push({ kind: t.slice(5) as WoodKind, x: wx, y: wy + 1, z: wz });
        continue;
      }
      if (depth > 0 || !j[6] || j[6] === "empty" || FRONT[front(j)] === undefined) continue;
      const childName = pickPool(j[6], rng), child: StructTemplate | undefined = childName ? data.templates[childName] : undefined;
      const cj = child?.jig.find((k) => k[4] === j[5] && FRONT[front(k)] !== undefined);
      if (!child || !cj) continue;
      const pf = rotDir(FRONT[front(j)]!, p.rot), want = (pf + 2) & 3, crot = (want - FRONT[front(cj)]! + 4) & 3;
      const tx = wx + DX[pf]!, tz = wz + DZ[pf]!; // ô ngay trước khối ghép của mảnh cha
      const c: Piece = { t: child, rot: crot, x: 0, y: wy - cj[1], z: 0, air: false, fill: B.DIRT };
      const [ox, , oz] = worldOf(c, cj[0], 0, cj[2]);
      c.x = tx - ox;
      c.z = tz - oz;
      pieces.push(c);
      expand(c, depth + 1);
    }
  };
  expand(root, 0);
  return { kind: "camp", pieces, trees };
}
