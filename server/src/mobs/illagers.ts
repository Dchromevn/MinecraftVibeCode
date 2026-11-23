// Kẻ cướp phía server (Giai đoạn 8b; người dùng chọn 2026-11-15: bỏ điềm xấu / cướp làng): tiền đồn sinh kẻ cướp liên tục (cả ban
// ngày) khi có người chơi gần; đội tuần tra 2–5 tên (đội trưởng đeo cờ dẫn đường) thỉnh thoảng xuất hiện quanh người chơi từ ngày
// thứ 5; tiểu linh: đưa một món thì đi nhặt món giống thế mang về, tay không chuột phải thì lấy lại.
import {
  ALLAY, OUTPOST, PATROL, colKey, outpostsIn, randInt, stack, type Rng, type TerrainSampler,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

export interface IllagersHost {
  mobs: Mobs;
  items: ServerItems;
  rng: Rng;
  sampler: TerrainSampler;
  /** Ô đứng được cao nhất ở cột (x, z) (chân), hoặc null (chưa tải / nước). */
  groundAt(x: number, z: number): number | null;
  /** Ngày thứ mấy của thế giới (0 = ngày đầu). */
  day(): number;
  fx(m: Mob, kind: "hearts" | "smoke"): void;
}

export class Illagers {
  private spawnS = OUTPOST.SPAWN_TRY_S;
  private patrolS: number;

  constructor(readonly host: IllagersHost) {
    this.patrolS = this.nextPatrol();
  }

  private nextPatrol(): number {
    return PATROL.TRY_S[0] + this.host.rng() * (PATROL.TRY_S[1] - PATROL.TRY_S[0]);
  }

  /** Chuột phải tiểu linh: đưa món đang cầm (1 cái) / tay không thì lấy lại món + đồ đã nhặt. true = đã xử lý. */
  use(p: ServerPlayer, m: Mob): boolean {
    if (m.def.key !== "allay") return false;
    const held = p.inv.held;
    if (!m.held && held) {
      m.held = stack(held.item, 1, held.damage);
      m.owner = p.name;
      p.inv.takeHeld(1);
      p.invDirty = true;
      this.host.fx(m, "hearts");
      return true;
    }
    if (m.held && !held) {
      for (const s of [m.held, m.bag]) {
        if (!s) continue;
        const left = p.inv.add(s);
        if (left) this.host.items.throwFrom(left, p);
      }
      m.held = m.bag = null;
      m.owner = null;
      p.invDirty = true;
      return true;
    }
    return true;
  }

  /** Mỗi tick (khi bật sinh quái): kẻ cướp ở tiền đồn, đội tuần tra. */
  tick(online: readonly ServerPlayer[], dt: number): void {
    const live = online.filter((p) => !p.dead);
    if ((this.spawnS -= dt) <= 0) {
      this.spawnS = OUTPOST.SPAWN_TRY_S;
      this.outposts(live);
    }
    if ((this.patrolS -= dt) <= 0) {
      this.patrolS = this.nextPatrol();
      if (live.length && this.host.day() >= PATROL.MIN_DAY && this.host.rng() < PATROL.CHANCE) this.patrol(live[randInt(this.host.rng, 0, live.length - 1)]!);
    }
  }

  /** Tiền đồn có người chơi gần: sinh một kẻ cướp trên nền tiền đồn nếu quanh đó chưa đủ. */
  private outposts(live: readonly ServerPlayer[]): void {
    const R = OUTPOST.SPAWN_R, done = new Set<string>();
    for (const p of live)
      for (const o of outpostsIn(this.host.sampler, p.x - R, p.z - R, p.x + R, p.z + R)) {
        const key = `${o.x},${o.z}`;
        if (done.has(key) || Math.hypot(o.x - p.x, o.z - p.z) > R + 40) continue;
        done.add(key);
        const near = this.host.mobs.list.filter((m) => m.def.key === "pillager" && !m.dead && Math.hypot(m.x - o.x, m.z - o.z) < 48).length;
        if (near >= OUTPOST.SPAWN_MAX) continue;
        const cols = [...o.cols];
        for (let i = 0; i < 6; i++) {
          const k = cols[randInt(this.host.rng, 0, cols.length - 1)]!, x = Math.floor(k / 65536) - 32768, z = (k % 65536) - 32768;
          if (colKey(x, z) !== k || Math.hypot(x - p.x, z - p.z) < 16) continue; // không sinh ngay cạnh người chơi
          const y = this.host.groundAt(x, z);
          if (y === null) continue;
          this.host.mobs.spawn("pillager", x + 0.5, y, z + 0.5);
          break;
        }
      }
  }

  /** Đội tuần tra quanh người chơi p: đội trưởng (biến thể 1, đeo cờ) + lính đi theo. */
  private patrol(p: ServerPlayer): void {
    const rng = this.host.rng, sign = (): number => (rng() < 0.5 ? -1 : 1);
    const x = Math.floor(p.x + sign() * (PATROL.DIST[0] + rng() * (PATROL.DIST[1] - PATROL.DIST[0])));
    const z = Math.floor(p.z + sign() * (PATROL.DIST[0] + rng() * (PATROL.DIST[1] - PATROL.DIST[0])));
    spawnPatrol(this.host, x, z);
  }
}

/** Sinh đội tuần tra ở cột (x, z); trả về đội trưởng (null nếu chỗ đó không đứng được). */
export function spawnPatrol(h: Pick<IllagersHost, "mobs" | "rng" | "groundAt">, x: number, z: number): Mob | null {
  const y = h.groundAt(x, z);
  if (y === null) return null;
  const rng = h.rng, n = randInt(rng, PATROL.SIZE[0], PATROL.SIZE[1]);
  const leader = h.mobs.spawn("pillager", x + 0.5, y, z + 0.5, { variant: 1 });
  const a = rng() * Math.PI * 2;
  leader.patrolTo = { x: x + Math.cos(a) * PATROL.WANDER, z: z + Math.sin(a) * PATROL.WANDER };
  for (let i = 1; i < n; i++) {
    const mx = x + randInt(rng, -2, 2), mz = z + randInt(rng, -2, 2), my = h.groundAt(mx, mz) ?? y;
    h.mobs.spawn("pillager", mx + 0.5, my, mz + 0.5).leader = leader;
  }
  return leader;
}

/** (cho AI) Đồ rơi cùng loại gần tiểu linh. */
export function allayTarget(items: ServerItems, m: Mob): ServerItems["list"][number] | null {
  if (!m.held) return null;
  let best: ServerItems["list"][number] | null = null, bd: number = ALLAY.SEARCH_R;
  for (const e of items.list) {
    if (e.stack.item !== m.held.item || e.pickupDelay > 0) continue;
    const d = Math.hypot(e.x - m.x, e.y - m.y, e.z - m.z);
    if (d < bd) [bd, best] = [d, e];
  }
  return best;
}
