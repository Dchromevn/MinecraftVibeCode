// Lệnh /locate (người dùng yêu cầu 2026-11-16): công trình ở thế giới chính gần (x, z) nhất — tính lại từ seed bằng đúng bộ sinh của
// game (như scripts/list-places.ts). Dò hình vuông nở dần (512 → 8192 block): vuông cạnh 2r chứa cả vòng tròn bán kính r nên công trình
// gần nhất trong vòng đó là gần nhất thật. Kim tự tháp, lều tuyết, trại, tàu đắm, tàn tích đại dương, dinh thự: cả thế giới chỉ 1–2 cái.
import { hutsIn } from "./witchHuts.js";
import { outpostsIn } from "./outpostPlan.js";
import { structuresIn, uniquePlacements } from "./structPlan.js";
import type { TerrainSampler } from "./terrainSampler.js";
import { villagesIn } from "./villagePlan.js";

/** Loại công trình /locate ở thế giới chính (tên lệnh). */
export const LOCATE_KINDS = ["village", "outpost", "witch_hut", "mansion", "desert_pyramid", "igloo", "camp", "shipwreck", "ocean_ruin", "ruined_portal"] as const;
export type LocateKind = (typeof LOCATE_KINDS)[number];
/** Tên gọi khác người chơi hay gõ. */
export const LOCATE_ALIAS: Readonly<Record<string, LocateKind>> = {
  pyramid: "desert_pyramid", temple: "desert_pyramid", swamp_hut: "witch_hut", hut: "witch_hut", pillager_outpost: "outpost",
  woodland_mansion: "mansion", portal: "ruined_portal", ruin: "ocean_ruin", ocean_ruins: "ocean_ruin", ship: "shipwreck",
};
const UNIQUE = new Set<LocateKind>(["mansion", "desert_pyramid", "igloo", "camp", "shipwreck", "ocean_ruin"]);
const STEPS = [512, 1024, 2048, 4096, 8192];

type Pt = { x: number; y: number; z: number };
const groundY = (s: TerrainSampler, x: number, z: number): number => s.column(x, z).height + 1;

/** Mọi công trình loại kind trong vuông [x0..x1] × [z0..z1]. */
function within(s: TerrainSampler, kind: LocateKind, x0: number, z0: number, x1: number, z1: number): Pt[] {
  switch (kind) {
    case "village": return villagesIn(s, x0, z0, x1, z1).map((v) => ({ x: v.x, y: groundY(s, v.x, v.z), z: v.z }));
    case "outpost": return outpostsIn(s, x0, z0, x1, z1).map((v) => ({ x: v.x, y: groundY(s, v.x, v.z), z: v.z }));
    case "witch_hut": return hutsIn(s, x0, z0, x1, z1).map((h) => ({ x: h.x + 3, y: h.floor, z: h.z + 3 }));
    default: return structuresIn(s, x0, z0, x1, z1).filter((p) => p.kind === kind).map((p) => ({ x: p.pieces[0]!.x, y: p.pieces[0]!.y, z: p.pieces[0]!.z }));
  }
}

/** Công trình loại kind gần (x, z) nhất (trong 8192 block), hoặc null. */
export function locateOverworld(s: TerrainSampler, kind: LocateKind, x: number, z: number): Pt | null {
  const d = (p: Pt): number => Math.hypot(p.x - x, p.z - z);
  const best = (list: Pt[]): Pt | null => list.reduce<Pt | null>((a, p) => (!a || d(p) < d(a) ? p : a), null);
  if (UNIQUE.has(kind)) return best(uniquePlacements(s, kind as Parameters<typeof uniquePlacements>[1]).map((p) => {
    const b = p.box, a = p.pieces[0]!;
    return b ? { x: (b.x0 + b.x1) >> 1, y: a.y, z: (b.z0 + b.z1) >> 1 } : { x: a.x, y: a.y, z: a.z };
  }));
  for (const r of STEPS) {
    const b = best(within(s, kind, Math.floor(x - r), Math.floor(z - r), Math.floor(x + r), Math.floor(z + r)));
    if (b && d(b) <= r) return b;
  }
  return null;
}
