// Sinh sinh vật ở Vực Lửa (Giai đoạn 10b; Minecraft Java): quái sinh quanh người chơi (24–128 block, giới hạn chung 30) theo bảng biome
// NETHER_SPAWNS — chỗ đứng: ô dưới chân đặc, không phải khối mụn; ma bay cần chỗ trống 4 × 4 × 4 và chỉ 1/20 lần thử thành công; bộ
// xương / kẻ hư không cần ánh sáng block ≤ 7; người lợn xác sống / ma bay / khối nhầy dung nham / lợn rừng lửa không xét ánh sáng.
// Kẻ lội dung nham: chunk mới có mặt dung nham lộ thiên thì một đàn 1–2 con (như động vật, lưu lại).
import {
  B, FORTRESS_SPAWNS, NETHER_SPAWNS, PIGLIN, SPAWN_RULES, STRIDER, ZPIGLIN, chunkKey, mobDef, mobFits, randInt, type CellReader, type MobKey, type NetherBiome, type Rng,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";
import { piglinHurt } from "./brainPiglin.js";

const GHAST_CHANCE = 1 / 20;
const DARK_KEYS = new Set(["skeleton", "enderman"]);
const NO_WART = new Set(["zombified_piglin", "hoglin"]);

/** (10b) Quái trung lập bị đánh: nó và đồng loại trong vùng ZPIGLIN.ALERT_* tức người đánh 20–39 giây. */
export function angerPack(list: readonly Mob[], m: Mob, by: ServerPlayer, rng: Rng): void {
  const Z = ZPIGLIN;
  for (const o of list)
    if (o.def.key === m.def.key && !o.dead && Math.abs(o.x - m.x) <= Z.ALERT_H && Math.abs(o.z - m.z) <= Z.ALERT_H && Math.abs(o.y - m.y) <= Z.ALERT_V) {
      o.target = by;
      o.angryS = Z.ANGER_S[0] + rng() * (Z.ANGER_S[1] - Z.ANGER_S[0]);
    }
}

/** (10d1) Sinh vật bị đánh (Mobs.hurt): người lợn xác sống cả bầy tức; người lợn cả bầy tức / đánh trả sinh vật. */
export function netherHurt(list: readonly Mob[], m: Mob, by: ServerPlayer | null, byMob: Mob | null, rng: Rng): void {
  if (m.def.neutral && by) angerPack(list, m, by, rng);
  piglinHurt(list, m, by, byMob);
}

export class NetherSpawner {
  constructor(
    private readonly mobs: Mobs,
    private readonly cell: CellReader,
    private readonly rawLight: (x: number, y: number, z: number) => number,
    private readonly biome: (x: number, z: number) => NetherBiome,
    private readonly rng: Rng,
    private readonly populated: Set<number>,
    /** (10c) Ô thuộc một mảnh pháo đài: dùng bảng sinh quái của pháo đài. */
    private readonly inFortress: (x: number, y: number, z: number) => boolean = () => false,
    /** (10d2) Sinh vật đặt sẵn của tàn tích chạm chunk có góc (x0, z0): [x, y, z, "piglin:1|2" / "piglin_brute" / "hoglin"]. */
    private readonly bastionMobs: (x0: number, z0: number) => [number, number, number, string][] = () => [],
  ) {}

  private id(x: number, y: number, z: number): number {
    const c = this.cell(x, y, z);
    return c < 0 ? -1 : c & 255;
  }

  /** Ô đứng được: chân + đầu trống, dưới đặc (không phải chất lỏng). */
  private stand(x: number, y: number, z: number): boolean {
    const below = this.id(x, y - 1, z);
    return this.id(x, y, z) === B.AIR && below > 0 && below !== B.LAVA && below !== B.WATER && below !== B.SOUL_FIRE;
  }

  /** Mỗi tick: thử sinh quái quanh từng người chơi (giới hạn như thế giới chính). */
  tick(players: readonly ServerPlayer[]): void {
    for (const p of players) {
      if (p.dead) continue;
      const near = this.mobs.list.filter((m) => m.def.hostile && Math.hypot(m.x - p.x, m.z - p.z) <= SPAWN_RULES.CAP_RADIUS).length;
      if (near >= SPAWN_RULES.CAP) continue;
      for (let t = 0; t < SPAWN_RULES.TRIES_PER_TICK; t++) this.tryMonster(p, players);
    }
  }

  private tryMonster(p: ServerPlayer, live: readonly ServerPlayer[]): void {
    const rng = this.rng, a = rng() * Math.PI * 2, d = SPAWN_RULES.MIN_DIST + rng() * (SPAWN_RULES.MAX_DIST - SPAWN_RULES.MIN_DIST);
    const x0 = Math.floor(p.x + Math.cos(a) * d), z0 = Math.floor(p.z + Math.sin(a) * d), y0 = randInt(rng, 6, 120);
    if (this.id(x0, y0, z0) < 0) return; // chunk chưa tải
    const table = this.inFortress(x0, y0, z0) ? FORTRESS_SPAWNS : NETHER_SPAWNS[this.biome(x0, z0)]!;
    let r = rng() * table.reduce((s, e) => s + e.w, 0);
    const e = table.find((v) => (r -= v.w) < 0) ?? table[0]!;
    const key = e.key as MobKey, def = mobDef(key);
    if (key === "ghast" && rng() >= GHAST_CHANCE) return;
    // ô sàn: dò xuống từ y0 tới chỗ đứng được (tối đa 16 ô)
    let y = y0;
    while (y > y0 - 16 && y > 2 && !this.stand(x0, y, z0)) y--;
    if (!this.stand(x0, y, z0)) return;
    if (key === "ghast") y += 1; // ma bay lơ lửng
    const n = randInt(rng, e.min, e.max);
    for (let i = 0, made = 0; i < n * 3 && made < n; i++) {
      const s = SPAWN_RULES.GROUP_SPREAD, x = x0 + (i ? randInt(rng, -s, s) : 0), z = z0 + (i ? randInt(rng, -s, s) : 0);
      let yy = y + (i ? randInt(rng, -1, 1) : 0);
      if (key !== "ghast") {
        if (!this.stand(x, yy, z)) continue;
        const below = this.id(x, yy - 1, z);
        if (NO_WART.has(key) && below === B.NETHER_WART_BLOCK) continue;
      } else if (this.id(x, yy, z) !== B.AIR) continue;
      if (live.some((o) => Math.hypot(o.x - (x + 0.5), o.y - yy, o.z - (z + 0.5)) < SPAWN_RULES.MIN_DIST)) continue;
      const size = key === "magma_cube" ? SPAWN_RULES.SLIME_SIZES[randInt(rng, 0, 2)]! : 1;
      if (!mobFits(this.cell, def.width * size, def.height * size, x + 0.5, yy, z + 0.5)) continue;
      if (DARK_KEYS.has(key) && (this.rawLight(x, yy, z) & 15) > 7) continue;
      const baby = (key === "zombified_piglin" && rng() < ZPIGLIN.BABY_CHANCE) || (key === "piglin" && rng() < PIGLIN.BABY_CHANCE); // (10d1)
      this.mobs.spawn(key, x + 0.5, yy, z + 0.5, { baby, variant: key === "magma_cube" ? size : undefined });
      made++;
    }
  }

  /** Chunk lần đầu tải: có mặt dung nham lộ thiên thì có thể có một đàn kẻ lội dung nham (lưu lại như động vật). */
  populate(cx: number, cz: number): void {
    const k = chunkKey(cx, cz);
    if (this.populated.has(k)) return;
    this.populated.add(k);
    const rng = this.rng;
    for (const [x, y, z, s] of this.bastionMobs(cx * 16, cz * 16)) { // (10d2) người lợn / vệ binh / lợn rừng lửa canh tàn tích (không tự biến mất)
      if (x >> 4 !== cx || z >> 4 !== cz) continue;
      const [key, v] = s.split(":"), m = this.mobs.spawn(key as MobKey, x + 0.5, y, z + 0.5, { variant: v ? Number(v) : 0 });
      Object.assign(m, { persistent: true, huntCdS: 30 + rng() * 90 });
    }
    if (rng() >= STRIDER.CHUNK_CHANCE) return;
    for (let t = 0; t < 8; t++) {
      const x = cx * 16 + randInt(rng, 0, 15), z = cz * 16 + randInt(rng, 0, 15);
      for (let y = 40; y > 20; y--) {
        if (this.id(x, y, z) !== B.LAVA) continue;
        if (this.id(x, y + 1, z) !== B.AIR || this.id(x, y + 2, z) !== B.AIR) break;
        for (let n = randInt(rng, STRIDER.GROUP[0], STRIDER.GROUP[1]); n > 0; n--)
          this.mobs.spawn("strider", x + 0.5 + (rng() - 0.5), y + 1, z + 0.5 + (rng() - 0.5), { baby: rng() < STRIDER.BABY_CHANCE });
        return;
      }
    }
  }
}
