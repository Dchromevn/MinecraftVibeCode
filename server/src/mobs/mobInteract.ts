// Người chơi với sinh vật (Giai đoạn 7a): đánh (server kiểm tầm, tường chắn, hồi đòn, chí mạng, đẩy lùi, quét kiếm, bù
// trễ bằng vị trí 1 giây gần nhất), chuột phải (cho ăn → phối giống / con non lớn nhanh, tỉa lông cừu bằng kéo, vắt sữa
// bò bằng xô), trứng ném trúng thì 1/8 nở gà con.
import {
  ANIMALS, BREED, COMBAT, HUNGER, addExhaustion, attackStrength, isCrit, itemDef, lineBlocked, mobBox, randInt, rayBox, stack,
  weaponStats, COLORS, meleeBonus, type Rng,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { ServerWorld } from "../serverWorld.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";
import { MobTame } from "./mobTame.js";

const SWEEP_RANGE = 1.0; // quét kiếm: sinh vật cách mục tiêu dưới mức này (ngang)
const USE_RANGE = 5;
const CREEPER_FUSE_NOW = 99; // chuột phải vào sinh vật: trong tầm này (có dung sai)

export class MobInteract {
  clock = (): number => performance.now();
  private readonly tame: MobTame;
  /** (7d) Xử lý chuột phải trước phần thuần / cho ăn chung: dây dắt, cưỡi thú. */
  readonly hooks: ((p: ServerPlayer, m: Mob) => boolean)[] = [];

  constructor(
    private readonly w: ServerWorld,
    private readonly mobs: Mobs,
    private readonly items: ServerItems,
    private readonly rng: Rng,
    online: () => ServerPlayer[],
  ) {
    this.tame = new MobTame(mobs, items, rng, online);
  }

  private find(id: number): Mob | null {
    return this.mobs.list.find((m) => m.id === id && !m.dead) ?? null;
  }

  /** Vị trí của m lúc t (ms). */
  private posAt(m: Mob, t: number): { x: number; y: number; z: number } {
    const h = m.hist;
    if (!h.length || t >= h[h.length - 1]!.t) return m;
    if (t <= h[0]!.t) return h[0]!;
    let i = h.length - 1;
    while (i > 0 && h[i - 1]!.t > t) i--;
    const a = h[i - 1]!, b = h[i]!, k = (t - a.t) / (b.t - a.t || 1);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
  }

  /** Tia nhìn của p trúng hộp sinh vật (vị trí lúc `at` hoặc hiện tại) trong tầm `range`, không bị tường chắn. */
  private reaches(p: ServerPlayer, m: Mob, at: number, range: number): boolean {
    const eye = p.eye(), d = p.lookDir(), dir = [d.x, d.y, d.z];
    let best = Infinity;
    for (const c of [this.posAt(m, at), m]) {
      const t = rayBox(eye, dir, mobBox(m.def, c.x, c.y, c.z, m.scale, COMBAT.HIT_BOX_PAD));
      if (t !== null && t <= range) best = Math.min(best, t);
    }
    return best < Infinity && !lineBlocked((x, y, z) => this.w.getCell(x, y, z), eye, dir, best);
  }

  /** Người chơi p đánh sinh vật id; lag = độ trễ hình sinh vật trên máy người đánh (ms). */
  attack(p: ServerPlayer, id: number, lag: number): void {
    const now = this.clock(), m = this.find(id);
    if (!m || p.dead) return;
    const held = p.inv.held?.item, stats = weaponStats(held);
    const strength = attackStrength((now - p.lastAttackAt) / 1000 + COMBAT.ATTACK_TIMING_SLACK_S, stats.speed);
    p.lastAttackAt = now;
    if (!this.reaches(p, m, now - Math.max(0, Math.min(COMBAT.LAG_COMP_MAX_MS, lag)), COMBAT.MELEE_RANGE_SERVER)) return;
    if (this.ignite(p, m)) return; // đánh quái nổ bằng bật lửa: nổ luôn (người dùng yêu cầu 2026-11-15)
    const crit = isCrit(p.state, strength, p.sprinting), ench = p.inv.held?.ench; // (8b2) phù phép vũ khí
    const strong = strength >= COMBAT.CRIT_MIN_STRENGTH;
    const damage = stats.damage * strength * (crit ? COMBAT.CRIT_MULTIPLIER : 1) + meleeBonus(ench, m.def.key) * strength;
    const kb = (p.sprinting && strong ? COMBAT.SPRINT_KNOCKBACK_MULT : 1) + (ench?.knockback ?? 0);
    m.looting = ench?.looting ?? 0;
    if (!this.mobs.hurt(m, damage, "player", { by: p, from: { x: p.x, z: p.z }, kb, crit })) return;
    if (ench?.fire_aspect && !m.dead) m.burnS = Math.max(m.burnS, 4 * ench.fire_aspect); // Lửa: cháy 4 giây mỗi cấp
    if (stats.wear > 0) p.inv.damageSlot("main", p.inv.selected, stats.wear);
    p.invDirty = true;
    addExhaustion(p.state, HUNGER.ATTACK);
    p.stateDirty = true;
    // quét kiếm: sinh vật đứng sát mục tiêu mất 1 máu
    const sword = !!held && itemDef(held)?.tool?.kind === "sword";
    if (!sword || !strong || !p.state.onGround || p.sprinting || crit) return;
    for (const o of this.mobs.list) {
      if (o === m || o.dead || Math.hypot(o.x - m.x, o.z - m.z) > (o.width + m.width) / 2 + SWEEP_RANGE || Math.abs(o.y - m.y) > 1.5) continue;
      if (Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z) >= COMBAT.MELEE_RANGE) continue;
      const sw = ench?.sweeping_edge ?? 0; // Quét: 1 + sát thương × cấp / (cấp + 1)
      this.mobs.hurt(o, COMBAT.SWEEP_DAMAGE + (sw ? damage * (sw / (sw + 1)) : 0), "player", { by: p, from: { x: p.x, z: p.z }, kb: 0.5 });
    }
  }

  /** Bật lửa vào quái nổ (đánh hoặc chuột phải): nổ ngay tick sau (người dùng yêu cầu 2026-11-15), bật lửa mất 1 độ bền. */
  private ignite(p: ServerPlayer, m: Mob): boolean {
    if (m.def.key !== "creeper" || p.inv.held?.item !== "flint_and_steel" || m.ignited) return false;
    m.ignited = true;
    m.fuseS = CREEPER_FUSE_NOW; // ≥ thời gian xì: tick AI kế tiếp nổ luôn
    p.inv.damageSlot("main", p.inv.selected, 1);
    p.invDirty = true;
    return true;
  }

  /** Chuột phải vào sinh vật id với món đang cầm. */
  use(p: ServerPlayer, id: number): void {
    const m = this.find(id), held = p.inv.held;
    if (!m || p.dead) return;
    if (!this.reaches(p, m, this.clock(), USE_RANGE) && p.state.rideId !== m.id) return; // (8a) đang cưỡi: cho chính con thú ăn
    if (this.ignite(p, m) || this.hooks.some((h) => h(p, m)) || m.def.hostile || this.tame.use(p, m) || !held) return;
    const item = held.item;
    if (m.def.key === "sheep" && item === "shears" && !m.sheared && !m.baby) {
      m.sheared = true;
      const n = randInt(this.rng, ANIMALS.SHEAR_MIN, ANIMALS.SHEAR_MAX);
      this.items.pop(stack(`${COLORS[m.variant] ?? "white"}_wool`, n), Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z));
      p.inv.damageSlot("main", p.inv.selected, 1);
      p.invDirty = true;
      return;
    }
    if (m.def.key === "cow" && item === "bucket" && !m.baby) {
      if (held.count <= 1) p.inv.main[p.inv.selected] = stack("milk_bucket");
      else {
        p.inv.takeHeld(1);
        const left = p.inv.add(stack("milk_bucket"));
        if (left) this.items.throwFrom(left, p);
      }
      p.invDirty = true;
      return;
    }
    if (!m.def.food?.includes(item)) return;
    if (m.baby) m.growS -= m.growS * BREED.FEED_GROW_FRACTION;
    else if (m.breedCdS <= 0 && m.loveS <= 0) m.loveS = BREED.LOVE_S;
    else return; // đang chờ / đang muốn phối giống: không ăn
    m.health = Math.min(m.maxHealth, m.health + 1);
    p.inv.takeHeld(1);
    p.invDirty = true;
  }

  /** Trứng vỡ ở (x, y, z): 1/8 nở gà con (trong đó 1/32 nở 4 con). */
  eggLanded(x: number, y: number, z: number): void {
    if (this.rng() >= ANIMALS.EGG_HATCH_CHANCE) return;
    const n = this.rng() < ANIMALS.EGG_FOUR_CHANCE ? 4 : 1;
    for (let i = 0; i < n; i++) this.mobs.spawn("chicken", x, y, z, { baby: true });
  }
}
