// Gom hệ thống sinh vật (Giai đoạn 7a–7b): danh sách + AI (mobs.ts), sinh / gỡ (spawner.ts), người chơi tương tác
// (mobInteract.ts), lồng sinh quái + đá nhiễm (cages.ts); nối với chiến đấu (sinh vật đánh người chơi, hiệu ứng khi trúng),
// cung tên (bộ xương bắn, tên trúng sinh vật, đạn ném vỡ: trứng / ngọc hư không / bình), vụ nổ (quái nổ), chunk tải, lưu / nạp.
import {
  B, BLAZE, DAY, DIM, GHAST, GOLEM, MAGMA, MOB_AI, PIGLIN_GOLD_BLOCKS, POTION, type EffectKey, NetherBiomes, FortressLocator, BastionLocator, isFullSolid, TerrainSampler, MOB_KEYS, applyEffect, inSafeZone, netherSeed, skyDarken, type MobKey, type Rng,
} from "../../../shared/src/index.js";
import type { Archery, Arrow } from "../archery.js";
import type { Combat } from "../combat.js";
import type { Containers } from "../containers.js";
import { CREEPER_POWER, type Explosions } from "../explosions.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { ServerWorld } from "../serverWorld.js";
import type { SavedEntities } from "../storage.js";
import type { PotionKind } from "./brainSpecial.js";
import { Cages } from "./cages.js";
import type { Mob } from "./mob.js";
import { MobInteract } from "./mobInteract.js";
import { Mobs } from "./mobs.js";
import { Spawner } from "./spawner.js";
import { Leashes } from "./leashes.js";
import { Riding } from "./riding.js";
import { animalBiome, wildVariant } from "./spawnerWild.js";
import { Villagers } from "./villagers.js";
import { Illagers, spawnPatrol } from "./illagers.js";
import { mobXp } from "./mobDrops.js";
import { Spells } from "./spells.js";
import { NetherSpawner } from "./netherSpawn.js";
import { feedHoglin } from "./brainNether.js";
import { alarmPiglins, giveGold } from "./brainPiglin.js";
import { piglinLife } from "./piglinLife.js";

export interface MobSystemDeps {
  dim?: number; // (10a) cõi; (10b) Vực Lửa: sinh quái theo biome Vực Lửa (netherSpawn.ts)
  w: ServerWorld;
  items: ServerItems;
  combat: Combat;
  archery: Archery;
  explosions: Explosions;
  rng: Rng;
  seed: number;
  safe: { x: number; z: number; r: number };
  online(): ServerPlayer[];
  time(): number;
  containers: Containers; // (7d) rương trên lưng thú
}

/** Bình của phù thủy (MECHANICS.md 15): hiệu ứng, thời gian, màu hạt khi vỡ. */
const POTIONS: Record<PotionKind, { fx?: EffectKey; s: number; color: number }> = {
  harm: { s: 0, color: 0x430a09 },
  poison: { fx: "poison", s: 45, color: 0x4e9331 },
  slowness: { fx: "slowness", s: 90, color: 0x5a6c81 },
  weakness: { fx: "weakness", s: 90, color: 0x484d48 },
  fire_resistance: { fx: "fire_resistance", s: POTION.SPLASH_FIRE_RES_S, color: POTION.FIRE_RES_COLOR }, // (10d1) người chơi ném
};
const SPLASH_R = 4;
const HARM_DAMAGE = 6;
const ENDERMITE_CHANCE = 0.05;

export class MobSystem {
  readonly mobs: Mobs;
  readonly spawner: Spawner;
  readonly interact: MobInteract;
  readonly cages: Cages;
  readonly riding: Riding;
  readonly leashes: Leashes;
  readonly villagers: Villagers;
  readonly illagers: Illagers;
  readonly spells: Spells; // (8c) nanh, tiểu quỷ của pháp sư
  readonly nether: NetherSpawner | null = null; // (10b) chỉ ở Vực Lửa
  /** Tắt sinh quái (bài kiểm tra). */
  spawning = true;

  constructor(private readonly d: MobSystemDeps) {
    const canGrief = (x: number, z: number): boolean => d.explosions.mobGriefing && !inSafeZone(x + 0.5, z + 0.5, d.safe);
    this.mobs = new Mobs({
      w: d.w, items: d.items, rng: d.rng, online: d.online, time: d.time, canGrief,
      meleeHit: (m, p) => this.meleeHit(m, p),
      shoot: (m, p) => d.archery.shootFrom(m, p),
      potion: (m, p, k) => d.archery.throwPotion(m, p, k),
      explode: (m) => {
        this.mobs.remove(m); // quái nổ biến mất, không rơi đồ
        d.explosions.explode(m.x, m.y + 0.5, m.z, CREEPER_POWER, { by: `mob:${m.def.key}`, grief: canGrief(Math.floor(m.x), Math.floor(m.z)), source: m });
      },
      silverfishHurt: (m) => this.cages.wakeFriends(m),
      hitPlayer: (m, p, dmg, kb) => void d.combat.mobHit(p, dmg, m.x, m.z, `mob:${m.def.key}`, "mob", true, kb),
      leashPull: (m) => this.leashes.pull(m),
      effect: (p, fx, s) => {
        applyEffect(p.state, fx, s);
        p.stateDirty = true;
      },
      // (8a) người sắt hất người chơi lên; đánh dân làng thì người sắt quanh đó giận; dân làng bị xác sống giết
      strike: (m, p, dmg) => {
        if (!d.combat.mobHit(p, dmg, m.x, m.z, `mob:${m.def.key}`, "mob", true, 1)) return;
        p.state.vy = GOLEM.TOSS_V;
        p.stateDirty = true;
      },
      hurtBy: (m, by) => {
        if (by) m.playerHitAt = performance.now(); // (8b2) chết sau đó thì rơi kinh nghiệm
        if (!by || (m.def.key !== "villager" && m.def.key !== "wandering_trader")) return;
        for (const g of this.mobs.list)
          if (g.def.key === "iron_golem" && !g.dead && Math.hypot(g.x - m.x, g.z - m.z) <= GOLEM.WITNESS_R) Object.assign(g, { target: by, angryS: GOLEM.ANGRY_S });
      },
      died: (m, by) => {
        this.villagers.killed(m, by);
        const xp = mobXp(m, d.rng); // (8b2) bị người chơi đánh trong 5 giây trước khi chết: rơi kinh nghiệm
        if (xp > 0 && performance.now() - m.playerHitAt < 5000) d.items.xp(xp, m.x, m.y + 0.5, m.z);
      },
      fangs: (m, p) => this.spells.fangsAt(m, p),
      summonVex: (m) => this.spells.summon(m),
      fireball: (m, p) => d.archery.ghastFireball(m, p), // (10b)
      blazeFire: (m, p) => d.archery.blazeFireball(m, p), // (10c)
      toss: (m, p, dmg, vy) => {
        if (!d.combat.mobHit(p, dmg, m.x, m.z, `mob:${m.def.key}`, "mob", true, 1)) return;
        p.state.vy = vy;
        p.stateDirty = true;
      },
    });
    this.spells = new Spells({
      mobs: this.mobs, rng: d.rng, cell: (x, y, z) => d.w.getCell(x, y, z), online: d.online,
      bite: (p, dmg, m) => void d.combat.mobHit(p, dmg, m.x, m.z, `mob:${m.def.key}`, "magic", false),
    });
    const cell = (x: number, y: number, z: number): number => d.w.getCell(x, y, z);
    this.spawner = new Spawner(this.mobs, d.seed, cell, (x, y, z) => d.w.world.lightRaw(x, y, z), d.rng);
    this.interact = new MobInteract(d.w, this.mobs, d.items, d.rng, d.online);
    this.cages = new Cages(d.w, this.mobs, d.rng);
    // (7d) cưỡi thú, dây dắt
    this.leashes = new Leashes(d.w, this.mobs, d.items);
    this.riding = new Riding({
      mobs: this.mobs, items: d.items, rng: d.rng, cell: (x, y, z) => d.w.getCell(x, y, z),
      fx: (m, kind) => {
        for (const o of d.online()) if (Math.hypot(o.x - m.x, o.z - m.z) <= MOB_AI.VIEW) o.send({ t: "fx", kind, x: m.x, y: m.y + m.height, z: m.z });
      },
      openChest: (p, m) => d.containers.openMob(p, `mob:${m.id}`, m.chest!, () => (m.dead || !this.mobs.list.includes(m) ? null : m)),
    });
    /** Ô đứng được trên cùng của cột (không trên nước / dung nham), null nếu chưa tải. */
    const groundAt = (x: number, z: number): number | null => {
      for (let y = 120; y > 1; y--) {
        const c = d.w.getCell(x, y, z);
        if (c < 0) return null;
        if (c !== 0) return (c & 255) === B.WATER || (c & 255) === B.LAVA ? null : d.w.getCell(x, y + 1, z) === 0 && d.w.getCell(x, y + 2, z) === 0 ? y + 1 : null;
      }
      return null;
    };
    const fx = (m: Mob, kind: "hearts" | "smoke"): void => {
      for (const o of d.online()) if (Math.hypot(o.x - m.x, o.z - m.z) <= MOB_AI.VIEW) o.send({ t: "fx", kind, x: m.x, y: m.y + m.height, z: m.z });
    };
    this.villagers = new Villagers({
      mobs: this.mobs, items: d.items, rng: d.rng, online: d.online, fx,
      groundAt,
    });
    this.illagers = new Illagers({ // (8b)
      mobs: this.mobs, items: d.items, rng: d.rng, sampler: new TerrainSampler(d.seed), groundAt, day: () => Math.floor(d.time() / DAY.TICKS),
      fx,
    });
    this.interact.hooks.push(feedHoglin, giveGold, (p, m) => this.villagers.use(p, m), (p, m) => this.illagers.use(p, m), (p, m) => this.leashes.use(p, m),
      (p, m) => this.riding.use(p, m));
    this.canGrief = canGrief;
    if (d.dim === DIM.NETHER) { // (10b) Vực Lửa: quái theo biome, kẻ lội dung nham; không làng / kẻ cướp / bóng ma đêm
      const biomes = new NetherBiomes(netherSeed(d.seed));
      const forts = new FortressLocator(netherSeed(d.seed)); // (10c) quái riêng trong pháo đài
      const bastions = new BastionLocator(netherSeed(d.seed), (x, z) => biomes.at(x, z)); // (10d2) sinh vật đặt sẵn trong tàn tích
      this.nether = new NetherSpawner(this.mobs, cell, (x, y, z) => d.w.world.lightRaw(x, y, z), (x, z) => biomes.at(x, z), d.rng, this.spawner.populated,
        (x, y, z) => forts.pieceAt(x, y, z) !== null, (x0, z0) => bastions.near(x0, z0, x0 + 15, z0 + 15).flatMap((b) => b.mobs));
    }
    d.w.onChunkLoad = (cx, cz) => {
      this.mobs.chunkLoaded(cx, cz);
      this.cages.scan(cx, cz);
      if (!this.spawning) return;
      if (this.nether) return this.nether.populate(cx, cz);
      this.spawner.populate(cx, cz);
      this.spawner.residentWitch(cx, cz);
      this.spawner.structureMobs(cx, cz); // (7f) xác đuối canh tàn tích
    };
    d.archery.mobs = this.mobs;
    d.archery.onLand = (a, x, y, z, p, m) => this.landed(a, x, y, z, p, m);
  }

  private readonly canGrief: (x: number, z: number) => boolean;

  /** Sinh vật đánh trúng người chơi: sát thương + hiệu ứng (xác khô: đói, nhện hang: độc). */
  private meleeHit(m: Mob, p: ServerPlayer): void {
    const dmg = m.def.key === "magma_cube" ? MAGMA.DAMAGE[m.variant] ?? 3 : m.def.sized ? (m.variant >= 2 ? m.variant : 0) : m.def.damage;
    if (!this.d.combat.mobHit(p, dmg, m.x, m.z, `mob:${m.def.key}`, "mob")) return;
    if (p.state.encThorns > 0 && this.d.rng() < 0.15 * p.state.encThorns) this.mobs.hurt(m, 1 + Math.floor(this.d.rng() * 4), "other", { by: p }); // (8b2) Gai
    this.mobs.rally(p, m); // (7c) sói của người bị đánh lao vào
    if (!m.def.hitFx) return;
    applyEffect(p.state, m.def.hitFx.fx, m.def.hitFx.s);
    p.stateDirty = true;
  }

  /** Đạn ném vỡ ở (x, y, z): trứng nở gà con, ngọc hư không dịch chuyển người ném, bình của phù thủy văng hiệu ứng. */
  private landed(a: Arrow, x: number, y: number, z: number, hit: ServerPlayer | null, mob: Mob | null): void {
    const d = this.d;
    if (a.kind === "egg") return this.interact.eggLanded(x, y, z);
    if (a.kind === "fireball") { // (10b) cầu lửa ma bay: trúng thẳng 6, rồi nổ (sức 1) có lửa; bị đánh bật trúng ma bay: chết ngay
      if (hit) d.combat.mobHit(hit, GHAST.FIREBALL_DAMAGE, x - a.vx * 0.05, z - a.vz * 0.05, a.shooter, "mob");
      if (mob) this.mobs.hurt(mob, mob.def.key === "ghast" && !a.mobOwner ? GHAST.DEFLECT_KILL : GHAST.FIREBALL_DAMAGE, "explosion",
        { by: d.online().find((o) => o.id === a.owner) ?? null });
      d.explosions.explode(x, y, z, GHAST.FIREBALL_POWER, { by: a.shooter, grief: this.canGrief(Math.floor(x), Math.floor(z)), fire: true });
      return;
    }
    if (a.kind === "small_fireball") { // (10c) cầu lửa nhỏ của quỷ lửa: 5 sát thương + cháy 5 giây; trúng block thì đốt ô trước mặt
      if (hit && d.combat.mobHit(hit, BLAZE.FIREBALL_DAMAGE, x - a.vx * 0.05, z - a.vz * 0.05, a.shooter, "fire")) {
        hit.state.burnS = Math.max(hit.state.burnS, BLAZE.FIREBALL_BURN_S);
        hit.stateDirty = true;
      }
      if (mob && mob.id !== a.mobOwner && !mob.def.fireproof && this.mobs.hurt(mob, BLAZE.FIREBALL_DAMAGE, "fire")) mob.burnS = Math.max(mob.burnS, BLAZE.FIREBALL_BURN_S);
      const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
      if (!hit && !mob && this.canGrief(fx, fz) && (d.w.getCell(fx, fy, fz) & 255) === B.AIR && isFullSolid(d.w.getCell(fx, fy - 1, fz) & 255))
        d.w.setCell(fx, fy, fz, B.FIRE, 0);
      return;
    }
    if (a.kind === "snowball") { // (10c) bóng tuyết: quỷ lửa mất 3 máu; sinh vật khác chỉ bị đẩy nhẹ (và nhắm người ném)
      const by = d.online().find((o) => o.id === a.owner) ?? null;
      if (mob) this.mobs.hurt(mob, mob.def.key === "blaze" ? BLAZE.SNOWBALL_DAMAGE : 0.0001, "other", { by, from: { x: x - a.vx, z: z - a.vz }, kb: 1 });
      for (const o of d.online()) if (Math.hypot(o.x - x, o.z - z) <= MOB_AI.VIEW) o.send({ t: "fx", kind: "snowball", x, y, z });
      return;
    }
    if (a.kind === "pearl") {
      const p = d.online().find((o) => o.id === a.owner);
      if (p && !p.dead) {
        Object.assign(p.state, { x, y: Math.max(y, Math.floor(y) + 0.01), z, vx: 0, vy: 0, vz: 0, fallDist: 0 }); // không mất máu (người dùng chọn)
        p.stateDirty = true;
        p.send({ t: "tp", x: p.x, y: p.y, z: p.z });
      }
      for (const o of d.online()) if (Math.hypot(o.x - x, o.z - z) <= MOB_AI.VIEW) o.send({ t: "fx", kind: "portal", x, y, z });
      if (d.rng() < ENDERMITE_CHANCE) this.mobs.spawn("endermite", x, y, z);
      return;
    }
    // bình: người chơi trong 4 block, càng gần càng mạnh (trúng thẳng: đủ)
    const kind = (a.potion ?? "harm") as PotionKind, pot = POTIONS[kind];
    for (const p of d.online()) {
      const dist = p === hit ? 0 : Math.hypot(p.x - x, p.y + 0.9 - y, p.z - z);
      if (p.dead || p.flying || dist > SPLASH_R) continue;
      const k = 1 - dist / SPLASH_R;
      if (!pot.fx) d.combat.mobHit(p, HARM_DAMAGE * k, x, z, a.shooter, "magic", false);
      else {
        applyEffect(p.state, pot.fx, Math.max(1, pot.s * k));
        p.stateDirty = true;
      }
    }
    for (const o of d.online()) if (Math.hypot(o.x - x, o.z - z) <= MOB_AI.VIEW) o.send({ t: "fx", kind: "splash", x, y, z, n: pot.color });
  }

  load(e: SavedEntities): void {
    this.mobs.load(e.mobs ?? []);
    for (const k of e.populated ?? []) this.spawner.populated.add(k);
    for (const k of e.hutWitches ?? []) this.spawner.hutWitches.add(k);
    for (const k of e.structMobs ?? []) this.spawner.structMobs.add(k);
  }

  save(): Pick<SavedEntities, "mobs" | "populated" | "hutWitches" | "structMobs"> {
    return { mobs: this.mobs.saves(), populated: [...this.spawner.populated], hutWitches: [...this.spawner.hutWitches], structMobs: [...this.spawner.structMobs] };
  }

  /** Lệnh /summon: n con loài key, cách người chơi 3 block về phía trước (khối nhầy: cỡ ngẫu nhiên). */
  summon(p: ServerPlayer, key: string, n: number): boolean {
    const d = p.lookDir(), len = Math.hypot(d.x, d.z) || 1;
    if (key === "patrol") return !!spawnPatrol(this.illagers.host, Math.floor(p.x + (d.x / len) * 8), Math.floor(p.z + (d.z / len) * 8)); // (8b) thử đội tuần tra
    if (!MOB_KEYS.includes(key as MobKey)) return false;
    for (let i = 0; i < n; i++) {
      const x = p.x + (d.x / len) * 3 + (this.d.rng() - 0.5), z = p.z + (d.z / len) * 3 + (this.d.rng() - 0.5);
      const k = key as MobKey;
      const biome = animalBiome(this.spawner.wild.column(Math.floor(x), Math.floor(z))) ?? "";
      const variant = k === "slime" || k === "magma_cube" ? [1, 2, 4][Math.floor(this.d.rng() * 3)] : wildVariant(this.spawner.wild, k, biome, x, z);
      this.mobs.spawn(k, x, p.y + 0.5, z, { variant });
    }
    return true;
  }

  /** (10d1) Người chơi mở rương / phá block id ở (x, y, z): khối vàng / rương thì người lợn thấy p quanh đó tức. */
  piglinAlarm(p: ServerPlayer, x: number, y: number, z: number, id: number): void {
    if (id === B.CHEST || PIGLIN_GOLD_BLOCKS.has(id)) alarmPiglins(this.mobs.list, p, x + 0.5, y + 0.5, z + 0.5, (a, b, c) => this.d.w.getCell(a, b, c));
  }

  /** Ô đá nhiễm vừa bị người chơi phá. */
  infestedBroken(x: number, y: number, z: number): void {
    this.cages.infestedBroken(x, y, z);
  }

  tick(): void {
    const time = this.d.time(), darken = skyDarken(time), dt = 1 / 20, players = this.d.online();
    this.riding.tick(players, dt); // (7d) thân thú theo người cưỡi trước khi AI chạy
    this.mobs.tick(darken);
    piglinLife(this.mobs, dt, this.d.dim === DIM.NETHER, (s, x, y, z) => this.d.items.pop(s, x, y, z)); // (10d1) thành xác sống ngoài Vực Lửa
    this.leashes.tick(players, dt);
    this.villagers.tick(players, dt, this.spawning && !this.nether); // (8a) đổi đồ, chữa xác sống, thương nhân (không ở Vực Lửa)
    for (const m of [...this.mobs.list]) if (m.def.key === "silverfish") this.cages.tryHide(m, dt, this.canGrief);
    this.cages.tick(players, dt);
    this.spells.tick(); // (8c) nanh cắn
    if (!this.spawning) return;
    if (this.nether) return void (this.spawner.despawn(players.filter((p) => !p.dead), dt), this.nether.tick(players)); // (10b)
    this.spawner.tick(players, darken, dt);
    this.spawner.phantoms(players, time, dt);
    this.illagers.tick(players, dt); // (8b) kẻ cướp ở tiền đồn, đội tuần tra
  }
}
