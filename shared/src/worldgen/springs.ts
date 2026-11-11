// Mạch nước trên vách núi (chỉ biome núi, vách cao ≥ 4 block): một block nước gắn vào vách, có đá phía trên
// và không khí ở một bên. Trước Giai đoạn 4 nó chỉ là một block nước; khi có mô
// phỏng chảy, Giai đoạn 4 quét các ô nước "hở" lúc tải chunk để cho chảy thành thác.
import { SPRINGS } from "../constants.js";
import { B, BLOCKS } from "../blocks.js";
import { blockIndex } from "../chunk.js";
import { hashInts, mulberry32 } from "../rng.js";
import { BIOME, type Column, type TerrainSampler } from "./terrainSampler.js";

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function placeSprings(
  sampler: TerrainSampler,
  data: Uint8Array,
  cx: number,
  cz: number,
  cols: Column[],
): void {
  const isMountain = (c: Column): boolean => c.biome === BIOME.MOUNTAINS && c.height >= SPRINGS.MIN_SURFACE_Y;
  if (!cols.some(isMountain)) return;
  const rng = mulberry32(hashInts(sampler.seed, cx, cz, 17));
  if (rng() >= SPRINGS.MOUNTAIN_CHANCE) return;
  const heightAt = (x: number, z: number): number => {
    const lx = x - cx * 16, lz = z - cz * 16;
    if (lx >= 0 && lz >= 0 && lx < 16 && lz < 16) return cols[lz * 16 + lx]!.height;
    return sampler.column(x, z).height;
  };

  // mọi chỗ vách hợp lệ trong chunk: cột cao, cột kề thấp hơn ít nhất MIN_DROP
  const spots: { lx: number; lz: number; low: number; high: number }[] = [];
  for (let lz = 0; lz < 16; lz++)
    for (let lx = 0; lx < 16; lx++) {
      const col = cols[lz * 16 + lx]!;
      if (!isMountain(col)) continue;
      const h = col.height;
      for (const [dx, dz] of DIRS) {
        const nh = heightAt(cx * 16 + lx + dx, cz * 16 + lz + dz);
        if (h - nh >= SPRINGS.MIN_DROP) spots.push({ lx, lz, low: nh, high: h });
      }
    }
  if (spots.length === 0) return;
  const s = spots[Math.floor(rng() * spots.length)]!;
  // đặt ở mặt vách (cao hơn cột thấp) và dưới mặt đất ít nhất 1 block để có đá phía trên
  const y = s.low + 1 + Math.floor(rng() * (s.high - s.low - 1));
  const i = blockIndex(s.lx, y, s.lz);
  const cur = data[i]!;
  // phía trên phải còn block đặc (hang có thể đã đục mất)
  const above = y + 1 < 128 ? data[blockIndex(s.lx, y + 1, s.lz)]! : B.AIR;
  if (BLOCKS[cur]!.opaque && cur !== B.BEDROCK && BLOCKS[above]!.opaque) data[i] = B.WATER;
}
