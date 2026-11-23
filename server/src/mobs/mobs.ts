// Sinh vật phía server (Giai đoạn 7a): danh sách sinh vật đang hoạt động trong chunk đã tải, mỗi tick chạy AI (brain.ts)
// + vật lý (mobPhysics) + môi trường (rơi, dung nham, lửa, xương rồng, nắng đốt); nhận sát thương, chết thì rơi đồ;
// động vật ở chunk vừa gỡ được "cất" lại theo chunk, chunk tải lại thì hoạt động tiếp; gửi sinh vật cho từng người chơi.
import {
  B, BLOCKS, COLORS, MOB_AI, TAME, armorReduce, itemDef, chunkKey, lavaSolid, maxDurability, mobDef, randInt, stack, stepMobBody, sunBurnsAt,
  type MobKey, type Rng, type ServerMsg,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { ServerWorld } from "../serverWorld.js";
import { BABY_GROW_S, Brain, firstEggS, type BrainCtx } from "./brain.js";
import { brainContext } from "./mobCtx.js";
import { Mob, type MobSave } from "./mob.js";
import { DOLPHIN_AIR_S } from "./brainWater.js";
import { FISH_AIR_S, environment, lodStep, separate, teleportSpot, type EnvHost } from "./mobEnv.js";
import { syncMobs } from "./mobSync.js";
import { dropLoot } from "./mobDrops.js";
import { foalKind, initFoal, initMount } from "./riding.js";
import type { PotionKind } from "./brainSpecial.js";
import { PathFinder } from "./pathfind.js";
import { netherHurt } from "./netherSpawn.js";

export type MobDamage = "player" | "arrow" | "fall" | "lava" | "fire" | "cactus" | "explosion" | "magic" | "other";

export interface HurtOpts {
  by?: ServerPlayer | null;
  from?: { x: number; z: number };
  kb?: number; // hệ số đẩy lùi (0 = không)
  crit?: boolean;
  byMob?: Mob | null; // (8a) sinh vật gây sát thương (xác sống giết dân làng)
}

export interface MobHost {
  w: ServerWorld;
  items: ServerItems;
  rng: Rng;
  online(): ServerPlayer[];
  time(): number;
  /** Sinh vật đánh / bắn người chơi (Combat.mobHit, Archery). */
  meleeHit(m: Mob, p: ServerPlayer): void;
  shoot(m: Mob, p: ServerPlayer): void;
  // (7b) quái nổ nổ, phù thủy ném bình, quái được sửa block ở cột (x, z) không, mọt đá bị đánh gọi bạn
  explode(m: Mob): void;
  potion(m: Mob, p: ServerPlayer, kind: PotionKind): void;
  canGrief(x: number, z: number): boolean;
  silverfishHurt(m: Mob): void;
  // (7c) sinh vật đánh người chơi với sát thương / hệ số đẩy riêng (lạc đà nhổ, dê húc); hiệu ứng (cá nóc, cá heo)
  hitPlayer(m: Mob, p: ServerPlayer, dmg: number, kb: number): void;
  effect(p: ServerPlayer, fx: "poison" | "grace", s: number): void;
  /** (7d) Sinh vật bị dắt ở xa đầu dây: chỗ cần đi tới. */
  leashPull(m: Mob): { x: number; y: number; z: number } | null;
  // (8a) người sắt đánh người chơi; sinh vật bị đánh / chết (người sắt giận, dân làng thành xác sống)
  strike(m: Mob, p: ServerPlayer, dmg: number): void;
  hurtBy(m: Mob, by: ServerPlayer | null): void;
  died(m: Mob, by: Mob | null): void;
  fangs(m: Mob, p: ServerPlayer): void; summonVex(m: Mob): void; // (8c) phép của pháp sư: nanh, gọi tiểu quỷ
  fireball(m: Mob, p: ServerPlayer): void; toss(m: Mob, p: ServerPlayer, dmg: number, vy: number): void; blazeFire(m: Mob, p: ServerPlayer): void; // (10b, 10c)
}

const REST_EVERY = 10, ENV_SOURCES: ReadonlySet<MobDamage> = new Set<MobDamage>(["fall", "lava", "fire", "cactus", "magic", "other"]);

export class Mobs {
  readonly list: Mob[] = [];
  /** Động vật ở chunk chưa tải: khóa chunk → dữ liệu lưu. */
  readonly parked = new Map<number, MobSave[]>();
  readonly paths: PathFinder;
  private readonly brain: Brain;
  private readonly ctx: BrainCtx;
  private readonly env: EnvHost;
  /** Số mức ánh sáng trời bị trừ theo giờ (dayTime.skyDarken), đặt mỗi tick. */
  private darkenNow = 0;
  get darken(): number { return this.darkenNow; }
  private nextId = 1;
  private tickNo = 0;
  private readonly dt = 1 / 20;

  constructor(private readonly host: MobHost) {
    const cell = (x: number, y: number, z: number): number => host.w.getCell(x, y, z);
    this.paths = new PathFinder(cell);
    this.ctx = brainContext(this, host, this.paths, this.dt);
    this.brain = new Brain(this.ctx);
    this.env = {
      dt: this.dt, rng: host.rng, hurt: (m, a, s) => this.hurt(m, a, s), teleport: (m) => this.teleport(m),
      lightRaw: (x, y, z) => host.w.world.lightRaw(x, y, z),
      isWater: (x, y, z) => (host.w.getCell(x, y, z) & 255) === B.WATER,
    };
  }

  /** Ánh sáng thực tế ở ô (trời trừ theo giờ, max với block); −1 nếu chưa có bảng ánh sáng. */
  brightness(x: number, y: number, z: number): number {
    const v = this.host.w.world.lightRaw(x, y, z);
    if (v < 0) return -1;
    return Math.max((v >> 4) - this.darkenNow, v & 15);
  }

  /** Tạo sinh vật mới. */
  spawn(key: MobKey, x: number, y: number, z: number, opt: { baby?: boolean; variant?: number } = {}): Mob {
    const m = new Mob(this.nextId++, key, x, y, z);
    m.yaw = this.host.rng() * Math.PI * 2;
    m.variant = opt.variant ?? (m.def.sized ? 1 : 0);
    if (m.def.sized) m.health = m.maxHealth = m.def.health * m.variant * m.variant; // khối nhầy: máu 1 / 4 / 16
    if (opt.baby) m.growS = m.def.hostile && !m.def.food ? 1e12 : BABY_GROW_S; // xác sống con không lớn (lợn rừng lửa con thì lớn)
    if (key === "chicken" || key === "armadillo") m.eggS = m.scuteS = firstEggS(this.host.rng);
    const mh = m.def.maxHealth, rng = this.host.rng;
    if (mh) m.health = m.maxHealth = Math.round(mh[0] + rng() * (mh[1] - mh[0]));
    m.airS = key === "dolphin" ? DOLPHIN_AIR_S : FISH_AIR_S;
    m.ramS = 30 + rng() * 270;
    initMount(m, rng); // (7d) ngựa / lừa / la / lạc đà
    m.idleS = this.host.rng() * 3;
    this.list.push(m);
    return m;
  }

  /** Nạp động vật đã lưu: cất theo chunk, chunk tải thì hoạt động. */
  load(saved: readonly MobSave[]): void {
    for (const s of saved) this.park(s);
  }

  private park(s: MobSave): void {
    const k = chunkKey(Math.floor(s.x) >> 4, Math.floor(s.z) >> 4);
    let l = this.parked.get(k);
    if (!l) this.parked.set(k, (l = []));
    l.push(s);
  }

  /** Chunk vừa tải: động vật đã cất ở đó hoạt động lại. */
  chunkLoaded(cx: number, cz: number): void {
    const k = chunkKey(cx, cz), l = this.parked.get(k);
    if (!l) return;
    this.parked.delete(k);
    for (const s of l) {
      if (!mobDef(s.key)) continue;
      const m = this.spawn(s.key, s.x, s.y, s.z, { variant: s.variant });
      Object.assign(m, { yaw: s.yaw, health: s.health, growS: s.growS, sheared: s.sheared, breedCdS: s.breedCdS, eggS: s.eggS,
        maxHealth: s.maxHealth ?? m.maxHealth, owner: s.owner ?? null, sitting: !!s.sitting, collar: s.collar ?? 14, armorDur: s.armorDur ?? 0, held: s.held ?? null, persistent: m.persistent || !!s.kept });
      if (s.rideSpeed) Object.assign(m, { temper: s.temper ?? 0, saddled: !!s.saddled, chest: s.chest ?? null, rideSpeed: s.rideSpeed, jumpH: s.jumpH ?? 0, strength: s.strength ?? 0, horseArmor: s.horseArmor ?? 0 });
      if (s.leashAt) m.leash = { x: s.leashAt[0], y: s.leashAt[1], z: s.leashAt[2] };
      if (s.vill) Object.assign(m, { vill: s.vill, cureS: s.cureS ?? 0, lifeS: s.lifeS ?? 0 }); // (8a)
      if (s.home) m.home = s.home;
      if (s.bag) m.bag = s.bag;
    }
  }

  /** Mọi động vật cần lưu (đang hoạt động + đã cất). */
  saves(): MobSave[] {
    const out = this.list.filter((m) => m.persistent && !m.dead).map((m) => m.toSave());
    for (const l of this.parked.values()) out.push(...l);
    return out;
  }

  /** Dịch chuyển sinh vật tới chỗ đứng ngẫu nhiên (gần near nếu có). */
  teleport(m: Mob, near?: { x: number; y: number; z: number }, r?: number): boolean {
    const s = teleportSpot(this.paths, (x, y, z) => this.host.w.getCell(x, y, z), m, this.host.rng, near, r);
    if (!s) return false;
    this.broadcast(m, { t: "fx", kind: "portal", x: m.x, y: m.y, z: m.z });
    Object.assign(m.body, { x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, fallDist: 0 });
    this.broadcast(m, { t: "fx", kind: "portal", x: m.x, y: m.y, z: m.z });
    m.path = null;
    return true;
  }

  /** (7c) Sói thuần của owner đánh foe. */
  rally(owner: ServerPlayer, foe: Mob | ServerPlayer): void { this.brain.animals.rally(owner, foe, this.list); }
  remove(m: Mob): void { const i = this.list.indexOf(m); if (i >= 0) this.list.splice(i, 1); }

  /** Gây sát thương. Trả về true nếu trúng (không đang miễn sát thương). */
  hurt(m: Mob, amount: number, src: MobDamage, o: HurtOpts = {}): boolean {
    if (m.dead || amount <= 0) return false;
    if (m.armorDur > 0 && src !== "fall") { // (7c) giáp sói chịu thay tới khi hỏng
      if (m.invulnS > 0) return false;
      m.invulnS = MOB_AI.HURT_INVULN_S;
      m.armorDur = Math.max(0, m.armorDur - Math.ceil(amount));
      this.broadcast(m, { t: "mobHurt", id: m.id, crit: !!o.crit });
      return true;
    }
    if (m.def.fireproof && (src === "fire" || src === "lava")) return false; // (10b) sinh vật Vực Lửa
    const armor = m.armorPoints(); // (10b) khối nhầy dung nham: giáp theo cỡ; (10c) giáp ngựa
    if (!ENV_SOURCES.has(src) && armor > 0) amount = armorReduce(amount, armor, 0);
    if (m.invulnS > 0) {
      if (amount <= m.lastHurt) return false;
      m.health -= amount - m.lastHurt;
    } else {
      m.health -= amount;
      m.invulnS = MOB_AI.HURT_INVULN_S;
    }
    m.lastHurt = amount;
    m.sinceHurtS = 0;
    if (o.from && (o.kb ?? 0) > 0) {
      const dx = m.x - o.from.x, dz = m.z - o.from.z, len = Math.hypot(dx, dz) || 1, h = MOB_AI.KNOCKBACK_H * o.kb! * (1 - (m.def.kbResist ?? 0));
      m.body.vx = m.body.vx / 2 + (dx / len) * h;
      m.body.vz = m.body.vz / 2 + (dz / len) * h;
      if (m.body.onGround) m.body.vy = Math.min(MOB_AI.KNOCKBACK_V, m.body.vy / 2 + MOB_AI.KNOCKBACK_V);
    }
    const by = o.by && !o.by.flying ? o.by : null;
    if (by) this.rally(by, m);
    this.host.hurtBy(m, by);
    if (m.def.hostile && by) Object.assign(m, { target: by, angryS: 30 });
    netherHurt(this.list, m, by, o.byMob ?? null, this.host.rng); // (10b) người lợn xác sống cả bầy tức; (10d1) người lợn tức / đánh trả
    if (!m.def.hostile && !this.brain.onHurt(m, by)) {
      m.panicS = MOB_AI.PANIC_S;
      m.panicFrom = o.from ?? (by ? { x: by.x, z: by.z } : null);
      m.path = null;
    }
    this.broadcast(m, { t: "mobHurt", id: m.id, crit: !!o.crit });
    if (m.health <= 0) this.die(m, o.byMob ?? null);
    else if (m.def.key === "silverfish" && by) this.host.silverfishHurt(m);
    return true;
  }

  private die(m: Mob, by: Mob | null): void {
    m.health = 0;
    m.dyingS = MOB_AI.DEATH_ANIM_S;
    m.target = null;
    m.path = null;
    this.host.died(m, by);
    if (m.baby) return; // con non không rơi đồ
    const at = [Math.floor(m.x), Math.floor(m.y + 0.3), Math.floor(m.z)] as const;
    dropLoot(m, this.host.rng, (st) => this.host.items.pop(st, ...at), (k, x, y, z, variant) => void this.spawn(k, x, y, z, { variant }));
  }

  /** Hai con trưởng thành đang muốn phối giống gặp nhau: sinh một con non. */
  breed(a: Mob, b: Mob): void {
    a.loveS = b.loveS = 0;
    a.breedCdS = b.breedCdS = 300;
    const variant = a.def.key === "sheep" || a.def.key === "horse" ? (this.host.rng() < 0.5 ? a.variant : b.variant) : a.variant;
    const c = this.spawn(foalKind(a, b), (a.x + b.x) / 2, Math.max(a.y, b.y), (a.z + b.z) / 2, { baby: true, variant }); // (7d) ngựa + lừa → la
    initFoal(c, a, b, this.host.rng);
    if (a.owner) Object.assign(c, { owner: a.owner, maxHealth: TAME.WOLF_HEALTH, health: TAME.WOLF_HEALTH }); // sói con: của chủ bố mẹ
  }

  /** Cừu đã tỉa ăn cỏ dưới chân: cỏ thành đất, lông mọc lại. */
  eatGrass(m: Mob): void {
    const x = Math.floor(m.x), y = Math.floor(m.y - 0.01), z = Math.floor(m.z);
    if ((this.host.w.getCell(x, y, z) & 255) !== B.GRASS) return;
    this.host.w.setCell(x, y, z, B.DIRT, 0);
    m.sheared = false;
  }

  /** Gửi gói cho người chơi ở gần sinh vật. */
  broadcast(m: Mob, msg: ServerMsg): void {
    for (const p of this.host.online()) if (Math.hypot(p.x - m.x, p.z - m.z) <= MOB_AI.VIEW) p.send(msg);
  }

  /** Một tick server. */
  tick(darken: number): void {
    const host = this.host, dt = this.dt, now = performance.now();
    this.tickNo++;
    this.darkenNow = darken;
    this.paths.newTick();
    this.ctx.players = host.online().filter((p) => !p.dead && !p.flying);
    const burnTime = sunBurnsAt(host.time()), all = host.online();
    const cell = (x: number, y: number, z: number): number => host.w.getCell(x, y, z), lavaCell = lavaSolid(cell);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i]!;
      if (m.dead) {
        m.dyingS -= dt;
        if (m.dyingS <= 0) this.list.splice(i, 1);
        continue;
      }
      if (!host.w.world.getChunk(Math.floor(m.x) >> 4, Math.floor(m.z) >> 4)) {
        // chunk đã gỡ: động vật cất lại, quái thì bỏ
        this.list.splice(i, 1);
        if (m.persistent) this.park(m.toSave());
        continue;
      }
      m.invulnS = Math.max(0, m.invulnS - dt);
      m.sinceHurtS += dt;
      m.ageS += dt;
      if (m.def.lifeS && m.ageS > m.def.lifeS) {
        this.list.splice(i, 1); // mọt hư không tự biến mất
        continue;
      }
      if (m.growS > 0 && m.growS < 1e11) m.growS = Math.max(0, m.growS - dt);
      const lod = m.rider ? 0 : lodStep(m, all, this.tickNo); // (7c) dơi / cá ở xa: vài tick mới tính; (7d) đang bị cưỡi: theo người cưỡi
      if (!lod) continue;
      const mv = this.brain.think(m), b = m.body;
      // đứng yên trên đất, không muốn đi, không cháy: chỉ chạy vật lý / môi trường mỗi REST_EVERY tick (đỡ tốn server)
      const rest = !mv.vx && !mv.vz && !mv.jump && !mv.fly && b.onGround && !b.vy && Math.abs(b.vx) + Math.abs(b.vz) < 0.01 && m.burnS <= 0;
      if (!rest || (this.tickNo + m.id) % REST_EVERY === 0) {
        const fall = stepMobBody(b, m.width, m.height, m.def.eye * m.scale, mv, m.def.lavaWalk ? lavaCell : cell, (rest ? dt * REST_EVERY : dt) * lod);
        if (fall > 0) this.hurt(m, fall, "fall");
        environment(this.env, m, burnTime, (rest ? REST_EVERY : 1) * lod);
      }
      m.hist.push({ t: now, x: m.x, y: m.y, z: m.z });
      while (m.hist.length > 2 && m.hist[1]!.t <= now - MOB_AI.POS_HISTORY_S * 1000) m.hist.shift();
    }
    separate(this.list);
  }

  /** Gửi cho p sinh vật mới / đổi trong tầm nhìn và sinh vật đã mất (mobSync.ts). */
  sync(p: ServerPlayer): void {
    syncMobs(this.list, p);
  }

  /** Quái thù địch (còn sống) quanh một điểm — kiểm tra giường. */
  monstersNear(x: number, y: number, z: number, h: number, v: number): boolean {
    return this.list.some((m) => m.def.hostile && !m.dead && Math.abs(m.x - x) <= h && Math.abs(m.z - z) <= h && Math.abs(m.y - y) <= v);
  }
}
