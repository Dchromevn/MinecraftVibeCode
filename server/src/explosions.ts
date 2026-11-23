// Vụ nổ phía server (Giai đoạn 7b; MECHANICS.md 16): quái nổ (sức 3), TNT (sức 4; người dùng chọn có TNT). Phá block theo tia
// (explosion.ts dùng chung), block do quái phá rơi ra với xác suất 1 / sức nổ, TNT rơi đủ; rương / lò bị phá thì đồ bên trong
// rơi ra; TNT bị nổ trúng thì cháy ngòi ngắn. Không phá block trong vùng an toàn; mobGriefing = false thì quái không phá
// block (TNT vẫn phá). Sát thương + đẩy văng người chơi, sinh vật; vật phẩm rơi trong vùng nổ bị phá hủy.
import {
  B, GHAST, MOB_AI, PLAYER, breakAt, isFullSolid, createMobBody, explosionBlocks, explosionDamage, explosionImpact, exposure, inSafeZone, mobBox,
  playerHitBox, stepMobBody, type Rng,
} from "../../shared/src/index.js";
import type { Combat } from "./combat.js";
import type { Containers } from "./containers.js";
import type { Mobs } from "./mobs/mobs.js";
import type { ServerPlayer } from "./player.js";
import type { ServerItems } from "./serverItems.js";
import type { ServerTicker } from "./ticker.js";
import type { ServerWorld } from "./serverWorld.js";
import type { BlockEntities } from "../../shared/src/index.js";

export const TNT = { POWER: 4, FUSE_S: 4, CHAIN_FUSE_MIN_S: 0.5, CHAIN_FUSE_MAX_S: 1.5, TRAP_DEPTH: 3 } as const; // TRAP_DEPTH: 7e bẫy tấm áp lực
export const CREEPER_POWER = 3;

interface Primed { id: number; body: ReturnType<typeof createMobBody>; fuse: number; by: string }

export interface ExplosionDeps {
  w: ServerWorld;
  ticker: ServerTicker;
  entities: BlockEntities;
  containers: Containers;
  items: ServerItems;
  combat: Combat;
  mobs: () => Mobs;
  online: () => ServerPlayer[];
  safe: { x: number; z: number; r: number };
  rng: Rng;
}

export class Explosions {
  /** Quái được phá block không (cấu hình mobGriefing, mặc định bật — người dùng chọn 2026-11-14). */
  mobGriefing = true;
  readonly primed: Primed[] = [];
  private nextId = 1;

  constructor(private readonly d: ExplosionDeps) {}

  /** TNT ở ô (x, y, z) bắt đầu cháy ngòi (by: ai châm). */
  prime(x: number, y: number, z: number, fuse: number = TNT.FUSE_S, by = ""): void {
    const d = this.d;
    if ((d.w.getCell(x, y, z) & 255) !== B.TNT) return;
    d.ticker.acc.setCell(x, y, z, B.AIR, 0);
    const body = createMobBody(x + 0.5, y, z + 0.5);
    const a = d.rng() * Math.PI * 2;
    Object.assign(body, { vx: Math.cos(a) * 0.4, vy: 4, vz: Math.sin(a) * 0.4 });
    const p: Primed = { id: this.nextId++, body, fuse, by };
    this.primed.push(p);
    for (const o of d.online()) if (Math.hypot(o.x - x, o.z - z) <= MOB_AI.VIEW) o.send({ t: "tnt", id: p.id, x: x + 0.5, y, z: z + 0.5, fuse });
  }

  /** (7e) Bẫy: tấm áp lực ở (x, y, z) vừa bật → TNT trong 3 × 3 ngay dưới, sâu tới TNT.TRAP_DEPTH block, cháy ngòi. */
  trap(x: number, y: number, z: number): void {
    for (let dy = 1; dy <= TNT.TRAP_DEPTH; dy++)
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.prime(x + dx, y - dy, z + dz, TNT.FUSE_S, "trap");
  }

  /** Mỗi tick: TNT đang cháy ngòi rơi xuống, hết ngòi thì nổ. */
  tick(): void {
    const dt = 1 / 20, cell = (x: number, y: number, z: number): number => this.d.w.getCell(x, y, z);
    for (let i = this.primed.length - 1; i >= 0; i--) {
      const p = this.primed[i]!;
      stepMobBody(p.body, 0.98, 0.98, 0.5, { vx: p.body.vx * 0.9, vz: p.body.vz * 0.9, jump: false }, cell, dt);
      p.fuse -= dt;
      if (p.fuse > 0) continue;
      this.primed.splice(i, 1);
      this.explode(p.body.x, p.body.y + 0.5, p.body.z, TNT.POWER, { by: p.by, grief: true, dropAll: true });
    }
  }

  /** Nổ ở (x, y, z) với sức nổ power. grief: được phá block; dropAll: block bị phá rơi đủ (TNT). */
  explode(x: number, y: number, z: number, power: number, o: { by: string; grief: boolean; dropAll?: boolean; source?: unknown; fire?: boolean }): void {
    const d = this.d, rng = d.rng, cell = (a: number, b: number, c: number): number => d.w.getCell(a, b, c);
    // 1. sát thương + đẩy văng (tính trước khi phá block, như Minecraft)
    for (const p of d.online()) {
      if (p.dead || p.flying) continue;
      const dist = Math.hypot(p.x - x, p.y + PLAYER.HEIGHT / 2 - y, p.z - z);
      if (dist > power * 2) continue;
      const impact = explosionImpact(power, dist, exposure(cell, x, y, z, playerHitBox(p.x, p.y, p.z, p.sneaking)));
      if (impact > 0) d.combat.blast(p, explosionDamage(power, impact), x, y, z, impact, o.by);
    }
    const mobs = d.mobs();
    for (const m of [...mobs.list]) {
      const dist = Math.hypot(m.x - x, m.y + m.height / 2 - y, m.z - z);
      if (m.dead || dist > power * 2 || o.source === m) continue;
      const impact = explosionImpact(power, dist, exposure(cell, x, y, z, mobBox(m.def, m.x, m.y, m.z, m.scale)));
      if (impact <= 0) continue;
      mobs.hurt(m, explosionDamage(power, impact), "explosion");
      const dx = m.x - x, dy = m.y + m.height / 2 - y, dz = m.z - z, len = Math.hypot(dx, dy, dz) || 1;
      m.body.vx += (dx / len) * impact * 20;
      m.body.vy += (dy / len) * impact * 20;
      m.body.vz += (dz / len) * impact * 20;
    }
    for (let i = d.items.list.length - 1; i >= 0; i--) {
      const e = d.items.list[i]!;
      if (Math.hypot(e.x - x, e.y - y, e.z - z) < power) d.items.list.splice(i, 1);
    }
    for (const p of d.online()) if (Math.hypot(p.x - x, p.z - z) <= MOB_AI.VIEW) p.send({ t: "fx", kind: "boom", x, y, z, n: power });
    // 2. phá block
    if (!o.grief) return;
    for (const b of explosionBlocks(cell, x, y, z, power, rng)) {
      if (inSafeZone(b.x + 0.5, b.z + 0.5, d.safe)) continue;
      const c = cell(b.x, b.y, b.z), id = c & 255;
      if (c <= 0) continue;
      if (id === B.TNT) {
        this.prime(b.x, b.y, b.z, TNT.CHAIN_FUSE_MIN_S + rng() * (TNT.CHAIN_FUSE_MAX_S - TNT.CHAIN_FUSE_MIN_S), o.by);
        continue;
      }
      if (id === B.CHEST || id === B.FURNACE) {
        d.containers.closeAt(b.x, b.y, b.z);
        for (const s of d.entities.remove(b.x, b.y, b.z, id)) d.items.pop(s, b.x, b.y, b.z);
      }
      // rơi như khi đào bằng đúng công cụ (đá vẫn ra đá cuội — như Minecraft)
      const dropped = breakAt(d.ticker.acc, b.x, b.y, b.z, d.ticker.startFalling).map((x) => ({ ...x, forced: true }));
      d.ticker.spawnDrops(o.dropAll ? dropped : dropped.filter(() => rng() < 1 / power), null);
    }
    if (o.fire) this.ignite(x, y, z, power); // (10b) cầu lửa ma bay: lửa quanh chỗ nổ
  }

  /** Ô trống có khối đặc bên dưới trong bán kính 2 × sức nổ: 1/3 bốc lửa (trên cát / đất linh hồn: lửa linh hồn). */
  private ignite(x: number, y: number, z: number, power: number): void {
    const d = this.d, r = Math.ceil(power * 2), cell = (a: number, b: number, c: number): number => d.w.getCell(a, b, c);
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (let dz = -r; dz <= r; dz++) {
          const fx = Math.floor(x) + dx, fy = Math.floor(y) + dy, fz = Math.floor(z) + dz;
          if (dx * dx + dy * dy + dz * dz > r * r || cell(fx, fy, fz) !== 0 || inSafeZone(fx + 0.5, fz + 0.5, d.safe) || d.rng() >= GHAST.FIRE_CHANCE) continue;
          const below = cell(fx, fy - 1, fz) & 255, soul = below === B.SOUL_SAND || below === B.SOUL_SOIL;
          if (!soul && !isFullSolid(below)) continue;
          d.ticker.acc.setCell(fx, fy, fz, soul ? B.SOUL_FIRE : B.FIRE, 0);
          if (!soul) d.ticker.scheduleFire(fx, fy, fz);
        }
  }
}
