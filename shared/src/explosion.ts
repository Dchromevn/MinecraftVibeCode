// Vụ nổ (Giai đoạn 7b; MECHANICS.md 16, như Minecraft): bắn 1352 tia từ tâm theo mặt ngoài khối lưới 16×16×16, mỗi tia
// cường độ (0.7–1.3) × sức nổ, đi từng bước 0.3 block, mỗi bước trừ 0.225 và trừ (sức chống nổ + 0.3) × 0.3 khi qua block;
// còn cường độ thì phá ô đó. Sát thương theo khoảng cách và phần thân "nhìn thấy" tâm nổ.
import { B, BLOCKS } from "./blocks.js";
import { collisionBoxes } from "./blockShapes.js";
import { isLiquidId } from "./liquids.js";
import type { Rng } from "./rng.js";

export type CellGet = (x: number, y: number, z: number) => number;

/** Sức chống nổ theo block (MECHANICS.md 16): đá các loại 6, đá vỏ chai 1200, đá nền / chất lỏng không phá được. */
export function blastResistance(id: number): number {
  const b = BLOCKS[id];
  if (!b || id === B.AIR) return 0;
  if (!Number.isFinite(b.hardness) || isLiquidId(id) || id === B.BEDROCK) return Infinity;
  if (id === B.OBSIDIAN || id === B.CRYING_OBSIDIAN || id === B.ANCIENT_DEBRIS || id === B.NETHERITE_BLOCK || id === B.RESPAWN_ANCHOR) return 1200; // (10d2)
  if (id === B.TNT) return 0;
  // khối "đá" đào bằng cuốc (đá, đá cuội, gạch, đá sâu, sa thạch dày…): 6; còn lại ≈ độ cứng (đất 0.5, gỗ 2–3, quặng 3, kính 0.3)
  if (b.tool === "pickaxe" && b.hardness >= 1.5 && b.hardness < 3) return 6;
  if (b.tool === "pickaxe" && b.hardness >= 5) return 6;
  return Math.max(0.1, b.hardness);
}

const RAYS: number[][] = [];
for (let i = 0; i < 16; i++)
  for (let j = 0; j < 16; j++)
    for (let k = 0; k < 16; k++) {
      if (i !== 0 && i !== 15 && j !== 0 && j !== 15 && k !== 0 && k !== 15) continue;
      const d = [i / 15 * 2 - 1, j / 15 * 2 - 1, k / 15 * 2 - 1], len = Math.hypot(d[0]!, d[1]!, d[2]!);
      RAYS.push(d.map((v) => v / len));
    }

/** Các ô bị phá bởi vụ nổ sức `power` ở (x, y, z) — chưa xét vùng an toàn / cấu hình (server lọc). */
export function explosionBlocks(cell: CellGet, x: number, y: number, z: number, power: number, rng: Rng): { x: number; y: number; z: number }[] {
  const out = new Map<string, { x: number; y: number; z: number }>();
  for (const d of RAYS) {
    let f = power * (0.7 + rng() * 0.6), px = x, py = y, pz = z;
    while (f > 0) {
      const bx = Math.floor(px), by = Math.floor(py), bz = Math.floor(pz);
      const c = by < 0 || by > 127 ? 0 : cell(bx, by, bz);
      if (c < 0) break; // chunk chưa tải
      const id = c & 255;
      if (id !== B.AIR) {
        f -= (blastResistance(id) + 0.3) * 0.3;
        if (f > 0 && Number.isFinite(blastResistance(id))) out.set(`${bx},${by},${bz}`, { x: bx, y: by, z: bz });
      }
      px += d[0]! * 0.3;
      py += d[1]! * 0.3;
      pz += d[2]! * 0.3;
      f -= 0.225;
    }
  }
  return [...out.values()];
}

/** Có block va chạm trên đoạn từ a tới b không (bước 0.25 block). */
function blocked(cell: CellGet, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const len = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(len / 0.25);
  const idAt = (x: number, y: number, z: number): number => Math.max(0, cell(x, y, z)) & 255;
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z), c = cell(fx, fy, fz);
    if (c <= 0) continue;
    for (const b of collisionBoxes(c, fx, fy, fz, idAt))
      if (x >= fx + b[0]! && x <= fx + b[3]! && y >= fy + b[1]! && y <= fy + b[4]! && z >= fz + b[2]! && z <= fz + b[5]!) return true;
  }
  return false;
}

/** Tỉ lệ điểm trên hộp [x0..x1] nhìn thẳng được tới tâm nổ (0..1). */
export function exposure(cell: CellGet, cx: number, cy: number, cz: number, box: readonly number[]): number {
  let seen = 0, total = 0;
  for (let i = 0; i <= 2; i++)
    for (let j = 0; j <= 2; j++)
      for (let k = 0; k <= 2; k++) {
        const x = box[0]! + (box[3]! - box[0]!) * i / 2, y = box[1]! + (box[4]! - box[1]!) * j / 2, z = box[2]! + (box[5]! - box[2]!) * k / 2;
        total++;
        if (!blocked(cell, x, y, z, cx, cy, cz)) seen++;
      }
  return seen / total;
}

/** Tác động ở khoảng cách dist (0..1); 0 nếu ngoài bán kính 2 × sức nổ. */
export function explosionImpact(power: number, dist: number, seen: number): number {
  const d = dist / (power * 2);
  return d >= 1 ? 0 : (1 - d) * seen;
}

/** Sát thương: ⌊(tác_động² + tác_động) / 2 × 7 × 2P + 1⌋ (quái nổ sát mặt ≈ 43, TNT ≈ 57). */
export const explosionDamage = (power: number, impact: number): number =>
  impact <= 0 ? 0 : Math.floor(((impact * impact + impact) / 2) * 7 * power * 2 + 1);
