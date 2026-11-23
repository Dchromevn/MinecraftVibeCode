// Sinh vật đặt sẵn trong mẫu làng (Giai đoạn 8a): lần đầu tải chunk, mỗi chỗ một lần (lưu cùng thế giới). Dân làng thất nghiệp
// nhận nghề theo bàn nghề gần nhất trong làng (như Minecraft: dân làng tìm bàn nghề), không có thì nghề ngẫu nhiên; người sắt tuần
// tra quanh giữa làng; mèo theo màu của mẫu; lạc đà (làng sa mạc), bò / lợn / cừu / ngựa trong chuồng.
import {
  B, CAT_SKINS, VILLAGERS, jigsawIn, worldOf, type MobKey, type Profession, type Rng, type TerrainSampler, type VillagePlan,
} from "../../../shared/src/index.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";
import { parseVillagerKey, setVillager } from "./villagers.js";

/** Bàn nghề → nghề. */
const JOB_BLOCKS: Readonly<Record<number, Profession>> = {
  [B.COMPOSTER]: "farmer", [B.BARREL]: "fisherman", [B.LOOM]: "shepherd", [B.FLETCHING_TABLE]: "fletcher", [B.LECTERN]: "librarian",
  [B.CARTOGRAPHY_TABLE]: "cartographer", [B.BREWING_STAND]: "cleric", [B.BLAST_FURNACE]: "armorer", [B.GRINDSTONE]: "weaponsmith",
  [B.SMITHING_TABLE]: "toolsmith", [B.SMOKER]: "butcher", [B.CAULDRON]: "leatherworker", [B.STONECUTTER]: "mason",
};

const jobsCache = new WeakMap<VillagePlan, [number, number, number, Profession][]>();
function jobsOf(v: VillagePlan): [number, number, number, Profession][] {
  let out = jobsCache.get(v);
  if (out) return out;
  out = [];
  for (const p of v.pieces) {
    if (p.terrain) continue;
    const c = p.t.cells;
    for (let i = 0; i < c.length; i += 4) {
      const job = JOB_BLOCKS[p.t.pal[c[i + 3]!]! & 255];
      if (job) out.push([...worldOf(p, c[i]!, c[i + 1]!, c[i + 2]!), job]);
    }
  }
  jobsCache.set(v, out);
  return out;
}

/** Nghề theo bàn nghề gần (x, y, z) nhất trong làng, hoặc null. */
function nearestJob(v: VillagePlan, x: number, y: number, z: number): Profession | null {
  let best: Profession | null = null, bd: number = VILLAGERS.JOB_R;
  for (const [jx, jy, jz, job] of jobsOf(v)) {
    const d = Math.hypot(jx - x, (jy - y) * 2, jz - z);
    if (d < bd) [bd, best] = [d, job];
  }
  return best;
}

/** Sinh vật của các làng có chỗ đặt nằm trong chunk (cx, cz). */
export function spawnVillageMobs(mobs: Mobs, s: TerrainSampler, cx: number, cz: number, done: Set<string>, rng: Rng): void {
  for (const v of jigsawIn(s, cx * 16, cz * 16, cx * 16 + 15, cz * 16 + 15))
    for (const piece of v.pieces) {
      const seen = new Map<string, number>();
      for (const [mx, my, mz, key] of piece.t.mobs ?? []) {
        const [x, y, z] = worldOf(piece, mx, my, mz), k0 = `${x},${y},${z},${key}`, n = seen.get(k0) ?? 0;
        seen.set(k0, n + 1);
        const k = n ? `${k0}#${n}` : k0; // (8b) hai tiểu linh cùng một chỗ trong lồng
        if (x >> 4 !== cx || z >> 4 !== cz || done.has(k)) continue;
        done.add(k);
        const m = spawnOne(mobs, v, key, x + 0.5, y, z + 0.5, rng);
        if (m) m.persistent = true;
      }
    }
}

function spawnOne(mobs: Mobs, v: VillagePlan, key: string, x: number, y: number, z: number, rng: Rng): Mob | null {
  const [kind = "", variant = ""] = key.split(":");
  if (kind === "villager") {
    const r = parseVillagerKey(key, nearestJob(v, x, y, z), rng), m = mobs.spawn("villager", x, y, z, { baby: r.baby });
    setVillager(m, r.type, r.prof);
    m.home = { x, y, z };
    return m;
  }
  if (kind === "cat") return mobs.spawn("cat", x, y, z, { variant: Math.max(0, CAT_SKINS.indexOf(variant as (typeof CAT_SKINS)[number])) });
  if (kind === "iron_golem") {
    const m = mobs.spawn("iron_golem", x, y, z);
    m.home = { x: v.kind === "village" ? v.x : x, y, z: v.kind === "village" ? v.z : z }; // tiền đồn: người sắt trong lồng
    return m;
  }
  if (kind === "allay") return mobs.spawn("allay", x, y, z); // (8b) tiền đồn
  if (["camel", "cow", "pig", "sheep", "horse", "chicken"].includes(kind)) return mobs.spawn(kind as MobKey, x, y, z);
  return null;
}
