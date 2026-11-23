// Lồng sinh quái (Giai đoạn 7b; MECHANICS.md 8.4): loài theo dữ liệu phụ của lồng (SPAWNER_MOBS: nhện hang, xác sống, bộ xương,
// nhện — hầm mỏ và hầm quái). Lồng ghi lại khi chunk tải
// (quét block); có người chơi trong 16 block thì lượt đầu sau 1 giây, sau đó mỗi 10–40 giây thử 4 chỗ trong vùng 9 × 3 × 9 quanh
// lồng (chỗ trống, quái rơi xuống nền), ánh sáng ≤ 11, nếu quanh lồng chưa có quá 6 con cùng loài. Thông số: CAGE (shared). Thắp đuốc kín quanh lồng (sáng ≥ 12) thì không sinh.
// Đá nhiễm: phá thì ra mọt đá; mọt đá bị đánh thì gọi mọt trong đá nhiễm quanh đó ra; mọt đá rảnh thì chui vào đá thường.
import { B, CAGE, CHUNK_VOLUME, SPAWNER_MOBS, mobDef, mobFits, randInt, type MobKey, type Rng } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerWorld } from "../serverWorld.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

export const SILVERFISH = { WAKE_H: 10, WAKE_V: 5, WAKE_MAX: 8, HIDE_CHANCE_S: 0.2 } as const;

interface Cage { x: number; y: number; z: number; delay: number; kind: MobKey }

export class Cages {
  private readonly cages = new Map<string, Cage>();

  constructor(private readonly w: ServerWorld, private readonly mobs: Mobs, private readonly rng: Rng) {}

  get count(): number {
    return this.cages.size;
  }

  /** Chunk vừa tải: ghi lại các lồng trong chunk. */
  scan(cx: number, cz: number): void {
    const c = this.w.world.getChunk(cx, cz);
    if (!c) return;
    for (let i = 0; i < CHUNK_VOLUME; i++) {
      if (c.data[i] !== B.SPAWNER) continue;
      const x = cx * 16 + (i & 15), y = i >> 8, z = cz * 16 + ((i >> 4) & 15);
      this.cages.set(`${x},${y},${z}`, { x, y, z, delay: CAGE.FIRST_DELAY_S, kind: SPAWNER_MOBS[c.meta[i]! & 7] ?? "cave_spider" }); // (10c) 4 = quỷ lửa
    }
  }

  tick(players: readonly ServerPlayer[], dt: number): void {
    for (const [k, c] of this.cages) {
      if (!this.w.world.getChunk(c.x >> 4, c.z >> 4) || (this.w.getCell(c.x, c.y, c.z) & 255) !== B.SPAWNER) {
        this.cages.delete(k); // chunk đã gỡ (tải lại thì quét lại) hoặc lồng bị phá
        continue;
      }
      if (!players.some((p) => !p.dead && Math.hypot(p.x - c.x - 0.5, p.y - c.y, p.z - c.z - 0.5) <= CAGE.RANGE)) continue;
      c.delay -= dt;
      if (c.delay > 0) continue;
      c.delay = CAGE.DELAY_MIN_S + this.rng() * (CAGE.DELAY_MAX_S - CAGE.DELAY_MIN_S);
      this.spawnAround(c);
    }
  }

  private spawnAround(c: Cage): void {
    const near = this.mobs.list.filter((m) => m.def.key === c.kind && Math.abs(m.x - c.x) <= 8 && Math.abs(m.z - c.z) <= 8 && Math.abs(m.y - c.y) <= 4);
    const def = mobDef(c.kind), cells = Math.max(1, Math.ceil(def.height - 0.05)), cell = (x: number, y: number, z: number): number => this.w.getCell(x, y, z);
    let room = CAGE.MAX_NEAR - near.length;
    for (let i = 0; i < CAGE.PER_SPAWN && room > 0; i++) {
      const x = c.x + randInt(this.rng, -CAGE.SPREAD, CAGE.SPREAD), z = c.z + randInt(this.rng, -CAGE.SPREAD, CAGE.SPREAD);
      const y = c.y + randInt(this.rng, -1, 1);
      // như Minecraft: chỉ cần chỗ trống đủ cho thân (ô lơ lửng thì quái rơi xuống), nhưng phải có nền trong vài block bên dưới
      if (!mobFits(cell, def.width, def.height, x + 0.5, y, z + 0.5) || !this.floorBelow(x, y, z, cells)) continue;
      if (this.mobs.brightness(x, y, z) > CAGE.MAX_LIGHT) continue;
      this.mobs.spawn(c.kind, x + 0.5, y, z + 0.5);
      room--;
    }
  }

  /** Có chỗ đứng trong CAGE.MAX_DROP block dưới (x, y, z) (không sinh rơi xuống vực). */
  private floorBelow(x: number, y: number, z: number, cells: number): boolean {
    for (let d = 0; d <= CAGE.MAX_DROP; d++) if (this.mobs.paths.standable(x, y - d, z, cells)) return true;
    return false;
  }

  // ---------- đá nhiễm, mọt đá ----------

  /** Ô đá nhiễm vừa bị phá: một mọt đá chui ra. */
  infestedBroken(x: number, y: number, z: number): void {
    this.mobs.spawn("silverfish", x + 0.5, y, z + 0.5);
  }

  /** Mọt đá bị đánh (chưa chết): mọt trong đá nhiễm quanh đó (21 × 11 × 21) chui ra đánh cùng. */
  wakeFriends(m: Mob): void {
    let woke = 0;
    const x0 = Math.floor(m.x), y0 = Math.floor(m.y), z0 = Math.floor(m.z);
    for (let dy = -SILVERFISH.WAKE_V; dy <= SILVERFISH.WAKE_V && woke < SILVERFISH.WAKE_MAX; dy++)
      for (let dx = -SILVERFISH.WAKE_H; dx <= SILVERFISH.WAKE_H && woke < SILVERFISH.WAKE_MAX; dx++)
        for (let dz = -SILVERFISH.WAKE_H; dz <= SILVERFISH.WAKE_H && woke < SILVERFISH.WAKE_MAX; dz++) {
          const x = x0 + dx, y = y0 + dy, z = z0 + dz;
          if ((this.w.getCell(x, y, z) & 255) !== B.INFESTED_STONE) continue;
          this.w.setCell(x, y, z, B.AIR, 0);
          const f = this.mobs.spawn("silverfish", x + 0.5, y, z + 0.5);
          f.target = m.target;
          woke++;
        }
  }

  /** Mọt đá rảnh (không đuổi ai): thỉnh thoảng chui vào ô đá thường kề bên (đá → đá nhiễm, mọt biến mất). */
  tryHide(m: Mob, dt: number, canGrief: (x: number, z: number) => boolean): boolean {
    if (m.target || m.dead || this.rng() >= SILVERFISH.HIDE_CHANCE_S * dt) return false;
    const x = Math.floor(m.x), y = Math.floor(m.y), z = Math.floor(m.z);
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]] as const) {
      if ((this.w.getCell(x + dx, y + dy, z + dz) & 255) !== B.STONE || !canGrief(x + dx, z + dz)) continue;
      this.w.setCell(x + dx, y + dy, z + dz, B.INFESTED_STONE, 0);
      this.mobs.remove(m);
      return true;
    }
    return false;
  }
}
