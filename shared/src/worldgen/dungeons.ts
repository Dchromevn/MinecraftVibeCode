// Hầm quái (Giai đoạn 7b, người dùng chọn 2026-11-14; như Minecraft): phòng trong lòng đất, ruột 5–7 × 3 × 5–7, tường và trần
// đá cuội, sàn đá cuội lẫn đá cuội rêu, lồng sinh quái (xác sống / bộ xương / nhện) giữa phòng, 1–2 rương sát tường. Vị trí
// quyết định theo seed + tọa độ chunk; xét cả 8 chunk kề nên phòng vắt qua ranh giới chunk vẫn liền.
import { DUNGEON as D } from "../constants.js";
import { B } from "../blocks.js";
import { blockIndex } from "../chunk.js";
import { hashInts, mulberry32, randInt } from "../rng.js";
import { BIOME, type TerrainSampler } from "./terrainSampler.js";

interface Room { x: number; y: number; z: number; rx: number; rz: number; kind: number; chests: { x: number; z: number }[] }

/** Các hầm quái có tâm trong chunk (cx, cz). */
function roomsOf(sampler: TerrainSampler, cx: number, cz: number): Room[] {
  const rng = mulberry32(hashInts(sampler.seed, cx, cz, 51)), out: Room[] = [];
  for (let a = 0; a < D.ATTEMPTS; a++) {
    // rút đủ số ngẫu nhiên trước khi bỏ qua để mọi chunk tính ra cùng kết quả
    const hit = rng() < D.CHANCE;
    const x = cx * 16 + randInt(rng, 0, 15), z = cz * 16 + randInt(rng, 0, 15), y = randInt(rng, D.MIN_Y, D.MAX_Y);
    const rx = randInt(rng, 2, 3), rz = randInt(rng, 2, 3), k = rng();
    const kind = k < D.ZOMBIE ? 1 : k < D.ZOMBIE + D.SKELETON ? 2 : 3;
    const chests: { x: number; z: number }[] = [];
    for (let c = randInt(rng, 1, 2); c > 0; c--) {
      const side = randInt(rng, 0, 3), t = randInt(rng, -1, 1);
      chests.push(side === 0 ? { x: x - rx, z: z + t } : side === 1 ? { x: x + rx, z: z + t } : side === 2 ? { x: x + t, z: z - rz } : { x: x + t, z: z + rz });
    }
    if (!hit) continue;
    // phải nằm hẳn trong lòng đất (cả 4 góc), không dưới biển
    const corners = [[-rx - 1, -rz - 1], [rx + 1, -rz - 1], [-rx - 1, rz + 1], [rx + 1, rz + 1]];
    if (corners.some(([dx, dz]) => {
      const col = sampler.column(x + dx!, z + dz!);
      return col.biome === BIOME.OCEAN || col.height < col.waterTop || y + 3 + D.COVER > col.height;
    })) continue;
    out.push({ x, y, z, rx, rz, kind, chests });
  }
  return out;
}

/** Ô (x, y, z) có phải rương của hầm quái không (chọn bảng đồ). */
export function dungeonChestAt(sampler: TerrainSampler, x: number, y: number, z: number): boolean {
  const cx = x >> 4, cz = z >> 4;
  for (let ncz = cz - 1; ncz <= cz + 1; ncz++)
    for (let ncx = cx - 1; ncx <= cx + 1; ncx++)
      if (roomsOf(sampler, ncx, ncz).some((r) => r.y === y && r.chests.some((c) => c.x === x && c.z === z))) return true;
  return false;
}

/** Đặt phần hầm quái thuộc chunk (cx, cz). */
export function placeDungeons(sampler: TerrainSampler, data: Uint8Array, meta: Uint8Array, cx: number, cz: number): void {
  const x0 = cx * 16, z0 = cz * 16;
  const put = (x: number, y: number, z: number, id: number, m = 0): void => {
    const lx = x - x0, lz = z - z0;
    if (lx < 0 || lz < 0 || lx > 15 || lz > 15 || y < 1 || y > 127) return;
    const i = blockIndex(lx, y, lz);
    if (data[i] === B.BEDROCK) return;
    data[i] = id;
    meta[i] = m;
  };
  for (let ncz = cz - 1; ncz <= cz + 1; ncz++)
    for (let ncx = cx - 1; ncx <= cx + 1; ncx++)
      for (const r of roomsOf(sampler, ncx, ncz)) {
        for (let dx = -r.rx - 1; dx <= r.rx + 1; dx++)
          for (let dz = -r.rz - 1; dz <= r.rz + 1; dz++)
            for (let dy = -1; dy <= 3; dy++) {
              const x = r.x + dx, y = r.y + dy, z = r.z + dz;
              const wall = Math.abs(dx) === r.rx + 1 || Math.abs(dz) === r.rz + 1 || dy === 3;
              if (dy === -1) put(x, y, z, mulberry32(hashInts(x, y, z, 52))() < D.MOSSY_FLOOR ? B.MOSSY_COBBLE : B.COBBLE);
              else put(x, y, z, wall ? B.COBBLE : B.AIR);
            }
        put(r.x, r.y, r.z, B.SPAWNER, r.kind);
        for (const c of r.chests) put(c.x, r.y, c.z, B.CHEST);
      }
}
