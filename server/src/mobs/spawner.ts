// Sinh và gỡ sinh vật (Giai đoạn 7a; MECHANICS.md 8.1–8.2): quái thù địch sinh quanh người chơi (24–128 block) ở chỗ
// ánh sáng block = 0 và ánh sáng trời (đã trừ theo giờ) ≤ số ngẫu nhiên 0..7, theo đàn tối đa 4, giới hạn 30 quanh mỗi
// người; gỡ quái quá xa hoặc lâu không bị đánh. Động vật sinh theo đàn khi chunk được tạo lần đầu (lưu danh sách chunk
// đã sinh), biến thể theo nhiệt độ biome, màu len tự nhiên.
import {
  ANIMALS, B, BIOME, MOB_KEYS, structuresIn, worldOf, SPAWN_RULES, TERRAIN, TREE_MIX, TerrainSampler, canSleepAt, hash01, hutInside, hutsIn, chunkKey, collisionBoxes, hasTemperatureVariant, mobDef, mobFits, randInt,
  type CellReader, type MobKey, type Rng,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { Mobs } from "./mobs.js";
import { pick, populateChunk, spawnAmbient, type WildHost } from "./spawnerWild.js";
import { spawnVillageMobs } from "./villageSpawn.js";

/** Ô (x, y, z) có mặt trên đặc (đặt chân được) không. */
function solidTop(cell: CellReader, x: number, y: number, z: number): boolean {
  const c = cell(x, y, z);
  if (c <= 0) return false;
  const idAt = (a: number, b: number, d: number): number => Math.max(0, cell(a, b, d)) & 255;
  const boxes = collisionBoxes(c, x, y, z, idAt);
  return boxes.some((b) => b[4]! >= 1 && b[0]! <= 0.01 && b[3]! >= 0.99 && b[2]! <= 0.01 && b[5]! >= 0.99);
}

export class Spawner {
  /** Chunk đã sinh động vật (lưu cùng thế giới) — mỗi chunk chỉ sinh một lần. */
  readonly populated = new Set<number>();
  private readonly sampler: TerrainSampler;
  readonly wild: WildHost;

  constructor(
    private readonly mobs: Mobs,
    seed: number,
    private readonly cell: CellReader,
    private readonly rawLight: (x: number, y: number, z: number) => number,
    private readonly rng: Rng,
  ) {
    this.sampler = new TerrainSampler(seed);
    this.wild = {
      mobs, cell, rng, rawLight, column: (x, z) => this.sampler.column(x, z), surface: (x, z) => this.surface(x, z),
      woolColor: () => this.woolColor(), variantAt: (x, z) => this.variantAt(x, z),
    };
  }

  /** Biến thể nhiệt độ ở cột (x, z): 0 ôn hòa, 1 lạnh (đồng tuyết, núi), 2 ấm (sa mạc, đồng cỏ khô có keo). */
  variantAt(x: number, z: number): number {
    const c = this.sampler.column(x, z);
    if (c.biome === BIOME.SNOWY || c.biome === BIOME.MOUNTAINS) return 1;
    if (c.biome === BIOME.DESERT || (c.biome === BIOME.PLAINS && c.temp > TREE_MIX.ACACIA_TEMP && c.humid < TREE_MIX.ACACIA_HUMID)) return 2;
    return 0;
  }

  /** Màu len tự nhiên (MECHANICS.md 8.4). */
  woolColor(): number {
    let r = this.rng();
    for (const [c, p] of ANIMALS.WOOL_COLORS) if ((r -= p) < 0) return c;
    return 0;
  }

  /** Chunk vừa tải: lần đầu thì có thể sinh một đàn động vật theo biome (spawnerWild.ts). */
  populate(cx: number, cz: number): void {
    const k = chunkKey(cx, cz);
    if (this.populated.has(k)) return;
    this.populated.add(k);
    populateChunk(this.wild, cx, cz);
  }

  /** Ô trống đầu tiên phía trên mặt đất của cột (chân đứng ở đây; lớp tuyết mỏng: ô trên nó), hoặc null. */
  surface(x: number, z: number): number | null {
    for (let y = 126; y > 1; y--) {
      const c = this.cell(x, y, z);
      if (c < 0) return null;
      if (c === 0) continue;
      if ((c & 255) === B.SNOW_LAYER) return solidTop(this.cell, x, y - 1, z) ? y + 1 : null;
      return solidTop(this.cell, x, y, z) ? y + 1 : null;
    }
    return null;
  }

  /** Mỗi tick: thử sinh quái quanh từng người chơi; gỡ quái xa / lâu không bị đánh. */
  tick(players: readonly ServerPlayer[], darken: number, dt: number): void {
    const live = players.filter((p) => !p.dead);
    this.despawn(live, dt);
    for (const p of live) {
      const near = this.mobs.list.filter((m) => m.def.hostile && Math.hypot(m.x - p.x, m.z - p.z) <= SPAWN_RULES.CAP_RADIUS).length;
      if (near >= SPAWN_RULES.CAP) continue;
      for (let t = 0; t < SPAWN_RULES.TRIES_PER_TICK; t++) this.tryMonster(p, live, darken);
    }
    this.witchHuts(live, darken, dt);
    spawnAmbient(this.wild, live);
  }

  /** Nhà phù thủy đã có phù thủy "ở nhà" (lưu cùng thế giới, mỗi nhà một lần). */
  readonly hutWitches = new Set<string>();

  /**
   * (người dùng báo 2026-11-14) Như Minecraft: lần đầu tải chunk giữa nhà phù thủy thì trong nhà có sẵn một phù thủy, con này
   * không tự biến mất (ban ngày, đứng gần vẫn thấy). Bị giết thì không có lại theo cách này (ban đêm vẫn sinh thêm như cũ).
   */
  residentWitch(cx: number, cz: number): void {
    for (const h of hutsIn(this.sampler, cx * 16, cz * 16, cx * 16 + 15, cz * 16 + 15)) {
      const a = hutInside(h), x = a.x0 + 1, z = a.z0 + 1, k = `${h.x},${h.z}`;
      if (x >> 4 !== cx || z >> 4 !== cz || this.hutWitches.has(k)) continue;
      this.hutWitches.add(k);
      this.mobs.spawn("witch", x + 0.5, a.y, z + 0.5).persistent = true;
    }
  }

  /** (7f) Sinh vật canh công trình đã sinh (vị trí "x,y,z"; lưu cùng thế giới, mỗi chỗ một lần). */
  readonly structMobs = new Set<string>();

  /** (7f) Lần đầu tải chunk: sinh vật canh sẵn của công trình nằm trong chunk (xác đuối ở tàn tích đại dương), không tự biến mất. */
  structureMobs(cx: number, cz: number): void {
    spawnVillageMobs(this.mobs, this.sampler, cx, cz, this.structMobs, this.rng); // (8a) dân làng, người sắt, mèo, vật nuôi
    for (const p of structuresIn(this.sampler, cx * 16, cz * 16, cx * 16 + 15, cz * 16 + 15))
      for (const piece of p.pieces)
        for (const [mx, my, mz, key] of piece.t.mobs ?? []) {
          const [x, y, z] = worldOf(piece, mx, my, mz), k = `${x},${y},${z}`;
          const group = key === "allay_group"; // (8c) dinh thự: phòng giam 1–3 tiểu linh
          if (x >> 4 !== cx || z >> 4 !== cz || this.structMobs.has(k) || (!group && !MOB_KEYS.includes(key as MobKey))) continue;
          this.structMobs.add(k);
          for (let n = group ? randInt(this.rng, 1, 3) : 1; n > 0; n--) this.mobs.spawn(group ? "allay" : key as MobKey, x + 0.5, y, z + 0.5).persistent = true;
        }
  }

  /** Phù thủy chỉ sinh trong nhà phù thủy (người dùng chọn): nhà gần người chơi, trong nhà đủ tối, tối đa 2 con quanh nhà. */
  private witchHuts(live: readonly ServerPlayer[], darken: number, dt: number): void {
    const done = new Set<string>(), R = SPAWN_RULES.HUT_RANGE;
    for (const p of live)
      for (const h of hutsIn(this.sampler, p.x - R, p.z - R, p.x + R, p.z + R)) {
        const k = `${h.x},${h.z}`;
        if (done.has(k)) continue;
        done.add(k);
        if (this.rng() >= dt / SPAWN_RULES.HUT_TRY_S) continue;
        const a = hutInside(h);
        const near = this.mobs.list.filter((m) => m.def.key === "witch" && Math.abs(m.x - a.x0 - 1) < 12 && Math.abs(m.z - a.z0 - 2) < 12).length;
        if (near >= SPAWN_RULES.HUT_WITCH_MAX) continue;
        const x = randInt(this.rng, a.x0, a.x1), z = randInt(this.rng, a.z0, a.z1), y = a.y;
        if (this.cell(x, y, z) !== 0 || !solidTop(this.cell, x, y - 1, z) || !this.dark(x, y, z, darken)) continue;
        if (live.some((o) => Math.hypot(o.x - x - 0.5, o.y - y, o.z - z - 0.5) < SPAWN_RULES.MIN_DIST)) continue;
        this.mobs.spawn("witch", x + 0.5, y, z + 0.5);
      }
  }

  /** Chỗ quái sinh được: chân ở ô (x, y, z) trống, ô dưới mặt trên đặc, không phải chất lỏng, đủ tối. */
  private dark(x: number, y: number, z: number, darken: number): boolean {
    const v = this.rawLight(x, y, z);
    if (v < 0 || (v & 15) > 0) return false;
    return Math.max(0, (v >> 4) - darken) <= randInt(this.rng, 0, SPAWN_RULES.SKY_RANDOM_MAX);
  }

  /** Trọng số quái trên cạn theo biome (MECHANICS.md 8.2): sa mạc xác khô 80 + xác sống 19; vùng tuyết bộ xương băng 80 + bộ xương 20. */
  private weights(x: number, z: number): Record<string, number> {
    const w: Record<string, number> = { ...SPAWN_RULES.MONSTER_WEIGHTS }, col = this.sampler.column(x, z);
    if (col.biome === BIOME.DESERT) Object.assign(w, { zombie: 19, husk: 80 });
    if (col.biome === BIOME.SNOWY || (col.biome === BIOME.MOUNTAINS && col.height >= TERRAIN.SNOW_LINE_Y)) Object.assign(w, { skeleton: 20, stray: 80 });
    return w;
  }

  /** Chunk nhầy: 1/10 số chunk theo seed (khối nhầy sinh dưới y = 40 bất kể ánh sáng). */
  slimeChunk(cx: number, cz: number): boolean {
    return hash01(this.sampler.seed, cx, cz, 71) < SPAWN_RULES.SLIME_CHUNK_CHANCE;
  }

  private tryMonster(p: ServerPlayer, live: readonly ServerPlayer[], darken: number): void {
    const rng = this.rng, a = rng() * Math.PI * 2;
    const d = SPAWN_RULES.MIN_DIST + rng() * (SPAWN_RULES.MAX_DIST - SPAWN_RULES.MIN_DIST);
    const x0 = Math.floor(p.x + Math.cos(a) * d), z0 = Math.floor(p.z + Math.sin(a) * d);
    const top = this.surface(x0, z0);
    if (top === null && this.cell(x0, 64, z0) < 0) return; // chunk chưa tải
    const y0 = randInt(rng, 1, Math.min(126, (top ?? 120) + 1));
    const w = this.weights(x0, z0), sum = Object.values(w).reduce((s, v) => s + v, 0);
    const water = (this.cell(x0, y0, z0) & 255) === B.WATER;
    let key: MobKey;
    if (water) {
      // dưới nước chỉ có xác đuối (sông / hồ trọng số 100, đại dương 5)
      const dw = this.sampler.column(x0, z0).biome === BIOME.OCEAN ? SPAWN_RULES.DROWNED_OCEAN : SPAWN_RULES.DROWNED_RIVER;
      if (rng() >= dw / (sum + dw)) return;
      key = "drowned";
    } else key = pick(w, rng) as MobKey;
    const def = mobDef(key);
    // khối nhầy: chunk nhầy dưới y = 40 (bất kể ánh sáng), hoặc mặt đầm lầy y 51–69 (cần tối như quái khác)
    const swampSlime = key === "slime" && this.sampler.column(x0, z0).biome === BIOME.SWAMP &&
      y0 >= SPAWN_RULES.SWAMP_SLIME_Y[0]! && y0 <= SPAWN_RULES.SWAMP_SLIME_Y[1]!;
    if (key === "slime" && !swampSlime && (y0 >= SPAWN_RULES.SLIME_MAX_Y || !this.slimeChunk(x0 >> 4, z0 >> 4))) return;
    const river = key === "drowned" && this.sampler.column(x0, z0).biome !== BIOME.OCEAN; // sông: từng con một
    const group = river ? 1 : randInt(rng, 1, SPAWN_RULES.GROUP_MAX);
    for (let i = 0, made = 0; i < group * 3 && made < group; i++) {
      const s = SPAWN_RULES.GROUP_SPREAD;
      const x = x0 + (i ? randInt(rng, -s, s) : 0), z = z0 + (i ? randInt(rng, -s, s) : 0), y = y0;
      if (live.some((o) => Math.hypot(o.x - (x + 0.5), o.y - y, o.z - (z + 0.5)) < SPAWN_RULES.MIN_DIST)) continue;
      const inWater = (this.cell(x, y, z) & 255) === B.WATER;
      if (key === "drowned" ? !inWater || (this.cell(x, y + 1, z) & 255) !== B.WATER : !solidTop(this.cell, x, y - 1, z) || inWater) continue;
      const size = key === "slime" ? SPAWN_RULES.SLIME_SIZES[randInt(rng, 0, 2)]! : 1;
      if (key !== "drowned" && !mobFits(this.cell, def.width * size, def.height * size, x + 0.5, y, z + 0.5)) continue;
      if ((key !== "slime" || swampSlime) && !this.dark(x, y, z, darken)) continue;
      if (key === "enderman" && this.rawLight(x, y, z) >> 4 !== 15) continue; // kẻ hư không: chỉ nơi thấy trời (đêm trên mặt đất)
      const baby = (key === "zombie" || key === "husk" || key === "drowned") && rng() < SPAWN_RULES.BABY_ZOMBIE_CHANCE;
      this.mobs.spawn(key, x + 0.5, y, z + 0.5, { baby, variant: key === "slime" ? size : undefined });
      made++;
    }
  }

  /** Bóng ma đêm (MECHANICS.md 8.4): người chơi thức ≥ 3 ngày, ban đêm, đứng chỗ thấy trời, y ≥ 62 → mỗi 60–119 giây 1–3 con trên cao. */
  phantoms(players: readonly ServerPlayer[], time: number, dt: number): void {
    const R = SPAWN_RULES, rng = this.rng;
    for (const p of players) {
      if (p.dead || p.flying) continue;
      p.awakeS += dt;
      p.phantomS -= dt;
      if (p.phantomS > 0) continue;
      p.phantomS = R.PHANTOM_TRY_MIN_S + rng() * (R.PHANTOM_TRY_MAX_S - R.PHANTOM_TRY_MIN_S);
      if (p.awakeS < R.PHANTOM_AWAKE_S || !canSleepAt(time) || p.y < R.PHANTOM_MIN_Y) continue;
      if (this.rawLight(Math.floor(p.x), Math.floor(p.y + 1.6), Math.floor(p.z)) >> 4 !== 15) continue; // phải thấy trời
      for (let i = randInt(rng, 1, R.PHANTOM_GROUP_MAX); i > 0; i--)
        this.mobs.spawn("phantom", p.x + randInt(rng, -10, 10), Math.min(125, p.y + randInt(rng, 20, 34)), p.z + randInt(rng, -10, 10));
    }
  }

  /** Gỡ quái xa mọi người chơi > 128 block ngay; từ 32 block, không bị đánh 30 giây: mỗi giây 1/800. */
  despawn(live: readonly ServerPlayer[], dt: number): void {
    for (const m of [...this.mobs.list]) {
      if (m.persistent || m.dead) continue;
      let near = Infinity;
      for (const p of live) near = Math.min(near, Math.hypot(p.x - m.x, p.y - m.y, p.z - m.z));
      if (near > SPAWN_RULES.DESPAWN_FAR) this.mobs.remove(m);
      else if (m.def.ambient && near > SPAWN_RULES.AMBIENT_MAX_DIST && this.rng() < SPAWN_RULES.AMBIENT_DESPAWN_CHANCE * dt) this.mobs.remove(m);
      else if (near > SPAWN_RULES.DESPAWN_NEAR && m.sinceHurtS > SPAWN_RULES.DESPAWN_IDLE_S && this.rng() < SPAWN_RULES.DESPAWN_CHANCE * dt)
        this.mobs.remove(m);
    }
  }
}
