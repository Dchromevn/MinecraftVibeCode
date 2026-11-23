// Phép của pháp sư (Giai đoạn 8c; theo Minecraft EvokerAttackSpellGoal / EvokerFangs / EvokerSummonSpellGoal): nanh mọc từ mặt đất
// (hàng 16 nanh về phía mục tiêu, hoặc 2 vòng quanh pháp sư khi mục tiêu sát bên), mỗi nanh cắn sau trễ + 8 tick: 6 sát thương phép
// cho người chơi / sinh vật (trừ pháp sư, kẻ cướp, tiểu quỷ) trong hộp nhỏ của nó; gọi 3 tiểu quỷ quanh pháp sư (sống 30–119 giây).
import { EVOKER, FANGS, MOB_AI, PLAYER, VEX, isFullSolid, randInt, type CellReader, type Rng, type ServerMsg } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

export interface SpellHost {
  mobs: Mobs;
  rng: Rng;
  cell: CellReader;
  online(): ServerPlayer[];
  /** Nanh cắn người chơi (sát thương phép, không đẩy lùi). */
  bite(p: ServerPlayer, dmg: number, by: Mob): void;
}

interface Fang { x: number; y: number; z: number; ticks: number; owner: Mob }

/** Phe kẻ cướp: nanh không cắn. */
const ILLAGERS: ReadonlySet<string> = new Set(["evoker", "vindicator", "pillager", "vex"]);

export class Spells {
  private readonly fangs: Fang[] = [];

  constructor(private readonly h: SpellHost) {}

  /** Tung nanh từ pháp sư m về phía t. */
  fangsAt(m: Mob, t: { x: number; y: number; z: number }): void {
    const lo = Math.min(t.y, m.y), hi = Math.max(t.y, m.y) + 1, f = Math.atan2(t.z - m.z, t.x - m.x);
    if (Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z) < FANGS.CLOSE_R) {
      const [n1, r1] = FANGS.RING1, [n2, r2] = FANGS.RING2;
      for (let i = 0; i < n1; i++) {
        const a = f + (i * Math.PI * 2) / n1;
        this.spawn(m, m.x + Math.cos(a) * r1, m.z + Math.sin(a) * r1, lo, hi, a, 0);
      }
      for (let k = 0; k < n2; k++) {
        const a = f + (k * Math.PI * 2) / n2 + 1.2566371;
        this.spawn(m, m.x + Math.cos(a) * r2, m.z + Math.sin(a) * r2, lo, hi, a, FANGS.RING2_DELAY);
      }
    } else
      for (let l = 0; l < FANGS.LINE; l++) {
        const d = FANGS.STEP * (l + 1);
        this.spawn(m, m.x + Math.cos(f) * d, m.z + Math.sin(f) * d, lo, hi, f, l);
      }
  }

  /** Một nanh ở (x, z): tìm mặt đất từ hi xuống lo − 1 (khối đặc bên dưới); không có chỗ thì bỏ. */
  private spawn(m: Mob, x: number, z: number, lo: number, hi: number, yaw: number, delay: number): void {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let y = Math.floor(hi); y >= Math.floor(lo) - 1; y--) {
      const below = this.h.cell(bx, y - 1, bz);
      if (below < 0 || !isFullSolid(below & 255)) continue;
      const here = this.h.cell(bx, y, bz) & 255;
      const fy = here && isFullSolid(here) ? y + 1 : y;
      this.fangs.push({ x, y: fy, z, ticks: delay + FANGS.BITE_TICKS, owner: m });
      // client vẽ hàm nanh: mọc lên sau `delay` tick, cắn, rồi lặn xuống (hướng theo hàng / vòng)
      this.send(x, z, { t: "fangs", x, y: fy, z, yaw, delay });
      return;
    }
  }

  /** Gọi tiểu quỷ quanh pháp sư m. */
  summon(m: Mob): void {
    const rng = this.h.rng;
    for (let i = 0; i < EVOKER.SUMMON.COUNT; i++) {
      const x = Math.floor(m.x) - 2 + randInt(rng, 0, 4), y = Math.floor(m.y) + 1, z = Math.floor(m.z) - 2 + randInt(rng, 0, 4);
      const v = this.h.mobs.spawn("vex", x + 0.5, y, z + 0.5);
      Object.assign(v, { leader: m, home: { x: x + 0.5, y, z: z + 0.5 }, lifeS: randInt(rng, VEX.LIFE_S[0], VEX.LIFE_S[1]), limitedLife: true, target: m.target });
    }
  }

  /** Mỗi tick: nanh tới lúc thì cắn. */
  tick(): void {
    for (let i = this.fangs.length - 1; i >= 0; i--) {
      const f = this.fangs[i]!;
      if (--f.ticks > 0) continue;
      this.fangs.splice(i, 1);
      const r = FANGS.HALF_W + 0.2;
      for (const p of this.h.online())
        if (!p.dead && !p.flying && Math.abs(p.x - f.x) < r + PLAYER.WIDTH / 2 && Math.abs(p.z - f.z) < r + PLAYER.WIDTH / 2 &&
          p.y < f.y + FANGS.HEIGHT && p.y + PLAYER.HEIGHT > f.y) this.h.bite(p, FANGS.DAMAGE, f.owner);
      for (const o of [...this.h.mobs.list])
        if (!o.dead && !ILLAGERS.has(o.def.key) && Math.abs(o.x - f.x) < r + o.width / 2 && Math.abs(o.z - f.z) < r + o.width / 2 &&
          o.y < f.y + FANGS.HEIGHT && o.y + o.height > f.y) this.h.mobs.hurt(o, FANGS.DAMAGE, "magic", { byMob: f.owner });
    }
  }

  private send(x: number, z: number, msg: ServerMsg): void {
    for (const p of this.h.online()) if (Math.hypot(p.x - x, p.z - z) <= MOB_AI.VIEW) p.send(msg);
  }
}
