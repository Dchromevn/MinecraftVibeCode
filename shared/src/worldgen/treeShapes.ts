// Hình dạng cây theo loài (DESIGN.md 2.13): danh sách ô thân gỗ và ô lá của một cây có gốc ở
// (x, base, z). Dùng chung cho cây sinh sẵn (trees.ts) và cây non lớn lên (randomTick.ts).
import { TREE_SPECIES } from "../constants.js";
import type { Rng } from "../rng.js";
import type { WoodKind } from "../woods.js";

export type Pos = [number, number, number];

export interface TreePlan {
  logs: Pos[];
  leaves: Pos[];
}

const OAK_R = 2;

/** Tán lá kiểu sồi / bạch dương: ngọn ở top (giữ nguyên thứ tự gọi rng như trước 4d). */
export function treeCanopy(x: number, z: number, top: number, rng: Rng, leaf: (x: number, y: number, z: number) => void): void {
  for (let dy = -2; dy <= -1; dy++)
    for (let dx = -OAK_R; dx <= OAK_R; dx++)
      for (let dz = -OAK_R; dz <= OAK_R; dz++) {
        const corner = Math.abs(dx) === OAK_R && Math.abs(dz) === OAK_R;
        if (corner && rng() < 0.6) continue;
        leaf(x + dx, top + dy, z + dz);
      }
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) === 1 && Math.abs(dz) === 1 && rng() < 0.5) continue;
      leaf(x + dx, top, z + dz);
    }
  leaf(x, top + 1, z);
  leaf(x + 1, top + 1, z);
  leaf(x - 1, top + 1, z);
  leaf(x, top + 1, z + 1);
  leaf(x, top + 1, z - 1);
}

/** Lớp lá tròn bán kính r (bỏ góc vuông) ở độ cao y quanh (cx, cz). */
function disc(cx: number, y: number, cz: number, r: number, out: Pos[]): void {
  for (let dx = -r; dx <= r; dx++)
    for (let dz = -r; dz <= r; dz++) {
      if (r > 0 && Math.abs(dx) === r && Math.abs(dz) === r) continue;
      if (dx * dx + dz * dz > r * r + r) continue;
      out.push([cx + dx, y, cz + dz]);
    }
}

/** Thông: thân thẳng, tán hình nón nhiều tầng (to dần xuống dưới, xen tầng hẹp). */
function spruce(x: number, base: number, z: number, trunk: number, rng: Rng, p: TreePlan): void {
  const top = base + trunk - 1;
  for (let y = base; y <= top; y++) p.logs.push([x, y, z]);
  const leafFrom = base + 1 + Math.floor(rng() * 2); // 1–2 khúc thân trần dưới gốc
  p.leaves.push([x, top + 1, z], [x, top + 2, z]);
  disc(x, top, z, 1, p.leaves);
  for (let y = top - 1, d = 1; y >= leafFrom; y--, d++) {
    const r = Math.min(TREE_SPECIES.SPRUCE_MAX_RADIUS, 1 + (d % 2) + Math.floor(d / 4));
    disc(x, y, z, r, p.leaves);
  }
}

/** Keo: thân thẳng 2–3 khúc rồi nghiêng 1–2 bước, tán phẳng rộng; có thể thêm một nhánh phụ. */
function acacia(x: number, base: number, z: number, trunk: number, rng: Rng, p: TreePlan): void {
  const DIRS: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const straight = 2 + Math.floor(rng() * 2);
  const lean = 1 + Math.floor(rng() * 2);
  const [dx, dz] = DIRS[Math.floor(rng() * 4)]!;
  let cx = x, cz = z, y = base;
  for (let i = 0; i < trunk; i++, y++) {
    if (i >= straight && i < straight + lean) {
      cx += dx;
      cz += dz;
    }
    p.logs.push([cx, y, cz]);
  }
  const topY = y - 1;
  disc(cx, topY + 1, cz, TREE_SPECIES.ACACIA_CANOPY_RADIUS, p.leaves);
  disc(cx, topY + 2, cz, TREE_SPECIES.ACACIA_CANOPY_RADIUS - 1, p.leaves);
  if (rng() >= TREE_SPECIES.ACACIA_BRANCH_CHANCE) return;
  // nhánh phụ: tách từ thân thẳng, chéo về hướng ngược lại, tán nhỏ
  let bx = x, bz = z, by = base + straight - 1;
  const len = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < len; i++) {
    bx -= dx;
    bz -= dz;
    by++;
    p.logs.push([bx, by, bz]);
  }
  disc(bx, by + 1, bz, 2, p.leaves);
  disc(bx, by + 2, bz, 1, p.leaves);
}

/** Kế hoạch một cây; trunk = số khúc gỗ của thân chính. */
export function planTree(kind: WoodKind, x: number, base: number, z: number, trunk: number, rng: Rng): TreePlan {
  const p: TreePlan = { logs: [], leaves: [] };
  switch (kind) {
    case "spruce":
      spruce(x, base, z, trunk, rng, p);
      break;
    case "acacia":
      acacia(x, base, z, trunk, rng, p);
      break;
    default: // sồi, bạch dương
      treeCanopy(x, z, base + trunk - 1, rng, (a, b, c) => void p.leaves.push([a, b, c]));
      for (let dy = 0; dy < trunk; dy++) p.logs.push([x, base + dy, z]);
  }
  return p;
}

/** Số khúc thân theo loài từ một số ngẫu nhiên r ∈ [0, 1). */
export function trunkLength(kind: WoodKind, r: number): number {
  const s = TREE_SPECIES[kind];
  return s.trunkMin + Math.floor(r * (s.trunkMax - s.trunkMin + 1));
}
