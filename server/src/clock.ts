// Đồng hồ ngày đêm và giường (Giai đoạn 7a; DESIGN.md 2.7, MECHANICS.md 7): server giữ giờ (lưu trong world.json), gửi
// cho client lúc vào game và mỗi 5 giây. Chuột phải vào giường: đặt điểm hồi sinh (cả khi không ngủ được), ban đêm và
// không có quái thù địch gần thì nằm xuống; đủ SLEEP_PERCENT% người online nằm đủ 5 giây thì tua sang sáng. Bị đánh,
// tự dậy (nút / Shift) hoặc giường mất thì dậy. Chết thì hồi sinh cạnh giường; giường đã mất thì về điểm của thế giới.
import {
  B, BED, DAY, HDX, HDZ, PLAYER, bedDir, bedHead, canSleepAt, dayTick, mobFits, playerHeight, type ServerMsg,
} from "../../shared/src/index.js";
import type { ServerPlayer } from "./player.js";
import type { ServerWorld } from "./serverWorld.js";

export interface ClockHost {
  w: ServerWorld;
  online(): ServerPlayer[];
  /** Có quái thù địch trong khoảng ngang h, dọc v quanh điểm không. */
  monstersNear(x: number, y: number, z: number, h: number, v: number): boolean;
  info(key: "sleeping", args: string[]): void;
  /** Điểm hồi sinh của thế giới. */
  worldSpawn: { x: number; y: number; z: number };
}

export class Clock {
  /** Số tick từ lúc tạo thế giới (giờ trong ngày = time mod 24000). */
  time: number;
  sleepPercent: number = BED.SLEEP_PERCENT;
  private syncT = 0;

  constructor(private readonly host: ClockHost, saved: number | undefined) {
    this.time = Number.isFinite(saved) && saved! > 0 ? saved! : DAY.START;
  }

  private broadcast(msg: ServerMsg): void {
    for (const p of this.host.online()) p.send(msg);
  }

  /** Đặt giờ (lệnh /time): báo mọi người ngay. */
  set(t: number): void {
    this.time = Math.max(0, Math.floor(t));
    this.broadcast({ t: "time", time: this.time });
  }

  /** Sang buổi sáng của ngày kế tiếp (tick 0 = bình minh). */
  private skipNight(): void {
    this.set(this.time - dayTick(this.time) + DAY.TICKS);
    for (const p of this.host.online()) if (p.sleeping) this.wake(p);
  }

  /** Một tick server. */
  tick(): void {
    this.time++;
    if (++this.syncT >= DAY.SYNC_S * DAY.TICKS_PER_S) {
      this.syncT = 0;
      this.broadcast({ t: "time", time: this.time });
    }
    const all = this.host.online().filter((p) => !p.dead);
    for (const p of all) {
      if (!p.sleeping) continue;
      // bị đánh / giường mất / trời sáng thì dậy
      if (p.health < p.sleepHealth - 1e-6 || (this.host.w.getCell(p.sleeping.x, p.sleeping.y, p.sleeping.z) & 255) !== B.BED || !canSleepAt(this.time)) {
        this.wake(p);
        continue;
      }
      p.sleepS += 1 / DAY.TICKS_PER_S;
      Object.assign(p.state, { vx: 0, vz: 0 });
    }
    const asleep = all.filter((p) => p.sleeping && p.sleepS >= BED.SKIP_DELAY_S).length;
    if (asleep > 0 && asleep * 100 >= all.length * this.sleepPercent) this.skipNight();
  }

  /** Chuột phải vào giường ở ô (x, y, z) (một trong hai nửa). */
  useBed(p: ServerPlayer, x: number, y: number, z: number, cell: number): void {
    if (p.dead || p.sleeping) return;
    const m = cell >> 8, d = bedDir(m), sign = bedHead(m) ? 0 : 1;
    const head = { x: x + HDX[d]! * sign, y, z: z + HDZ[d]! * sign }; // ô đầu giường
    if (Math.hypot(head.x + 0.5 - p.x, head.z + 0.5 - p.z) > BED.USE_RANGE + 1.5) return;
    const same = p.spawnPoint && p.spawnPoint.x === head.x && p.spawnPoint.y === head.y && p.spawnPoint.z === head.z;
    if (!same) {
      p.spawnPoint = head;
      p.send({ t: "chat", kind: "info", key: "spawnSet", args: [] });
      p.send({ t: "respawnAt", ...this.respawnPos(p) });
    }
    if (!canSleepAt(this.time)) return p.send({ t: "chat", kind: "error", key: "noSleepDay", args: [] });
    if (this.host.monstersNear(head.x + 0.5, y, head.z + 0.5, BED.MONSTER_H, BED.MONSTER_V))
      return p.send({ t: "chat", kind: "error", key: "noSleepMobs", args: [] });
    p.sleeping = head;
    p.sleepS = 0;
    p.awakeS = 0; // (7b) đã ngủ: bóng ma đêm thôi kéo tới
    p.sleepHealth = p.health;
    Object.assign(p.state, { x: head.x + 0.5, y: y + 9 / 16, z: head.z + 0.5, vx: 0, vy: 0, vz: 0, fallDist: 0 });
    p.stateDirty = true;
    p.send({ t: "tp", x: p.x, y: p.y, z: p.z });
    p.send({ t: "sleep", on: true });
    const all = this.host.online().filter((o) => !o.dead);
    const need = Math.max(1, Math.ceil((all.length * this.sleepPercent) / 100));
    this.host.info("sleeping", [String(all.filter((o) => o.sleeping).length), String(need)]);
  }

  /** Rời giường. */
  wake(p: ServerPlayer): void {
    if (!p.sleeping) return;
    p.sleeping = null;
    p.sleepS = 0;
    p.send({ t: "sleep", on: false });
  }

  /**
   * Chỗ hồi sinh của p: cạnh giường (ô trống đủ cao quanh giường, ưu tiên phía chân), giường mất thì báo người chơi và về
   * điểm của thế giới.
   */
  respawnPos(p: ServerPlayer): { x: number; y: number; z: number } {
    const b = p.spawnPoint, w = this.host.w;
    if (!b || b.dim) return this.host.worldSpawn; // (10d2) mỏ neo hồi sinh: Game.respawnOf xử lý
    if ((w.cellLoading(b.x, b.y, b.z) & 255) !== B.BED) {
      p.spawnPoint = null;
      p.send({ t: "chat", kind: "error", key: "bedMissing", args: [] });
      p.send({ t: "respawnAt", ...this.host.worldSpawn });
      return this.host.worldSpawn;
    }
    const cell = (x: number, y: number, z: number): number => w.getCell(x, y, z);
    const h = playerHeight({ sneaking: false });
    for (let r = 1; r <= 2; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++)
          for (const dy of [0, 1, -1]) {
            const x = b.x + dx, y = b.y + dy, z = b.z + dz;
            const below = cell(x, y - 1, z);
            if (below <= 0 || (below & 255) === B.WATER || (below & 255) === B.LAVA) continue;
            if (mobFits(cell, PLAYER.WIDTH, h, x + 0.5, y, z + 0.5) && !mobFits(cell, PLAYER.WIDTH, 0.1, x + 0.5, y - 0.2, z + 0.5))
              return { x: x + 0.5, y, z: z + 0.5 };
          }
    return { x: b.x + 0.5, y: b.y + 9 / 16, z: b.z + 0.5 }; // không có chỗ trống: đứng trên giường
  }
}
