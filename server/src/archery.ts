// Cung tên phía server (Giai đoạn 6b): server đo thời gian kéo cung, tạo mũi tên, mô phỏng từng tick (stepArrow dùng
// chung với client), xét trúng người chơi trên đoạn bay giữa hai tick (hộp nới 0.3), cắm vào block thì nằm lại 60
// giây và nhặt lại được, gửi mũi tên cho người chơi ở gần (đang bay: mỗi tick; đã cắm: một lần).
// 7a: tên trúng cả sinh vật; bộ xương bắn tên (không nhặt lại được); trứng ném (vỡ khi chạm, có thể nở gà con).
// 7b: tên bộ xương băng gây chậm; ngọc hư không, bình của phù thủy (vỡ khi chạm: onLand); kẻ hư không né tên (dịch chuyển).
import {
  ANIMALS, ARCHERY, BLAZE, CROSSBOW, GHAST, PILLAGER, SNOWBALL, SPECTRAL, firstArrow, crossbowCharge, applyEffect, ARROW_KEY, BOW_KEY, COMBAT, ARROW_TICK, arrowDamage, bowPower, hasArrow, mobBox, playerHitBox, randInt, rayBox, stack,
  stepArrow, takeArrow, type ArrowState, type EffectKey, type NetArrow, type Rng,
} from "../../shared/src/index.js";
import type { Combat } from "./combat.js";
import type { Mob } from "./mobs/mob.js";
import type { Mobs } from "./mobs/mobs.js";
import type { ServerPlayer } from "./player.js";
import type { ServerWorld } from "./serverWorld.js";

interface Arrow extends ArrowState {
  id: number;
  owner: number;
  shooter: string;
  crit: boolean;
  age: number; // giây
  mobOwner: number; // (7a) id sinh vật bắn (0 = người chơi)
  dmg: number; // sát thương cố định (tên của bộ xương); 0 = theo tốc độ
  pickup: boolean;
  kind: Projectile;
  fx?: { fx: EffectKey; s: number }; // (7b) tên bộ xương băng: chậm
  potion?: string; // (7b) loại bình của phù thủy
  ench?: { mult: number; punch: number; flame: boolean; pierce: number; hit?: number[] }; // (8b2) phù phép cung / nỏ
  spectral?: boolean; // (10d1) mũi tên quang phổ: trúng thì Phát sáng 10 giây
}

/** Đạn: tên; trứng, ngọc hư không, bình (vỡ khi chạm — xử lý ở onLand). */
export type Projectile = "arrow" | "egg" | "pearl" | "potion" | "fireball" // (10b) cầu lửa ma bay
  | "small_fireball" | "snowball"; // (10c) cầu lửa nhỏ của quỷ lửa, bóng tuyết
const KIND_FLAG: Record<Projectile, number> = { arrow: 0, egg: 4, pearl: 8, potion: 16, fireball: 32, small_fireball: 64, snowball: 128 };
const THROW_SPEED: Record<Projectile, number> = {
  arrow: 0, egg: ANIMALS.EGG_SPEED, pearl: ANIMALS.EGG_SPEED, potion: 10, fireball: GHAST.FIREBALL_SPEED, small_fireball: BLAZE.FIREBALL_SPEED, snowball: SNOWBALL.SPEED,
};
const LIFE_S: Partial<Record<Projectile, number>> = { fireball: GHAST.FIREBALL_LIFE_S, small_fireball: BLAZE.FIREBALL_LIFE_S };

/** Đạn ném vỡ / chạm ở (x, y, z) (trúng người / sinh vật nếu có). */
export type LandHandler = (a: Arrow, x: number, y: number, z: number, p: ServerPlayer | null, m: Mob | null) => void;
export type { Arrow };

const SKELETON_ARROW_SPEED = 32; // block/giây (1.6 block/tick như Minecraft)
const SKELETON_INACCURACY = 6; // mức Thường
const SKELETON_DAMAGE = [2, 4] as const;

export class Archery {
  readonly list: Arrow[] = [];
  private nextId = 1;
  /** Đồng hồ (ms) — bài test thay được. */
  clock = (): number => performance.now();

  /** (7a) sinh vật để xét trúng; đạn ném vỡ (Game gắn). */
  mobs: Mobs | null = null;
  onLand: LandHandler = () => undefined;

  constructor(
    private readonly w: ServerWorld, private readonly online: () => ServerPlayer[], private readonly combat: Combat,
    private readonly rng: Rng = Math.random,
  ) {}

  /** (7a) Bộ xương m bắn người chơi t: ngắm bù độ rơi, lệch ngẫu nhiên như mức Thường. */
  shootFrom(m: Mob, t: ServerPlayer): void {
    const x = m.x, y = m.eyeY - 0.1, z = m.z; // ngắm vào 1/3 chiều cao người chơi như Minecraft
    const dx = t.x - x, dz = t.z - z, dy = t.y + 0.6 - y, h = Math.hypot(dx, dz);
    const aim = [dx, dy + h * 0.2, dz], len = Math.hypot(aim[0]!, aim[1]!, aim[2]!) || 1;
    const spread = () => (this.rng() + this.rng() - 1) * 0.0075 * SKELETON_INACCURACY;
    const xbow = m.def.key === "pillager" || m.def.key === "piglin"; // (8b) kẻ cướp, (10d1) người lợn bắn nỏ (sát thương riêng)
    const speed = xbow ? PILLAGER.ARROW_SPEED : SKELETON_ARROW_SPEED;
    const v = [aim[0]! / len + spread(), aim[1]! / len + spread(), aim[2]! / len + spread()].map((c) => c * speed);
    this.add({ x, y, z, vx: v[0]!, vy: v[1]!, vz: v[2]!, owner: 0, shooter: `mob:${m.def.key}`, crit: false,
      mobOwner: m.id, dmg: randInt(this.rng, ...(xbow ? PILLAGER.DAMAGE : SKELETON_DAMAGE)), pickup: false, kind: "arrow", fx: m.def.arrowFx });
  }

  /** (7b) Phù thủy m ném bình loại kind về phía người chơi t (bay vòng cung, vỡ khi chạm). */
  throwPotion(m: Mob, t: ServerPlayer, kind: string): void {
    const x = m.x, y = m.eyeY - 0.1, z = m.z, dx = t.x + t.state.vx * 0.5 - x, dz = t.z + t.state.vz * 0.5 - z;
    const h = Math.hypot(dx, dz), aim = [dx, t.y + 1 - y + h * 0.2, dz], len = Math.hypot(aim[0]!, aim[1]!, aim[2]!) || 1;
    const v = aim.map((c) => (c / len) * THROW_SPEED.potion * Math.max(1, Math.sqrt(h / 6)));
    this.add({ x, y, z, vx: v[0]!, vy: v[1]!, vz: v[2]!, owner: 0, shooter: `mob:${m.def.key}`, crit: false, mobOwner: m.id, dmg: 0,
      pickup: false, kind: "potion", potion: kind });
  }

  /** (10b) Ma bay m bắn cầu lửa vào t: bay thẳng từ trước miệng, lệch nhẹ. */
  ghastFireball(m: Mob, t: ServerPlayer): void {
    const yaw = m.yaw, x = m.x - Math.sin(yaw) * 2.2, y = m.y + m.height * 0.5, z = m.z - Math.cos(yaw) * 2.2;
    const d = [t.x - x, t.y + 0.9 - y, t.z - z].map((c) => c + (this.rng() - 0.5) * 0.5), len = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
    const v = d.map((c) => (c / len) * GHAST.FIREBALL_SPEED);
    this.add({ x, y, z, vx: v[0]!, vy: v[1]!, vz: v[2]!, noGravity: true, owner: 0, shooter: `mob:${m.def.key}`, crit: false, mobOwner: m.id,
      dmg: GHAST.FIREBALL_DAMAGE, pickup: false, kind: "fireball" });
  }

  /** (10c) Quỷ lửa m bắn một cầu lửa nhỏ vào t: lệch theo căn bậc bốn của khoảng cách (như Minecraft), bay thẳng. */
  blazeFireball(m: Mob, t: ServerPlayer): void {
    const x = m.x, y = m.y + m.height / 2 + 0.5, z = m.z, dist = Math.hypot(t.x - x, t.z - z), spread = Math.sqrt(Math.sqrt(dist)) * 0.5;
    const g = (): number => (this.rng() + this.rng() + this.rng() - 1.5) * spread * 0.6; // gần chuẩn: lệch ±spread
    const d = [t.x - x + g(), t.y + 0.9 - y, t.z - z + g()], len = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
    const v = d.map((c) => (c / len) * BLAZE.FIREBALL_SPEED);
    this.add({ x, y, z, vx: v[0]!, vy: v[1]!, vz: v[2]!, noGravity: true, owner: 0, shooter: `mob:${m.def.key}`, crit: false, mobOwner: m.id,
      dmg: BLAZE.FIREBALL_DAMAGE, pickup: false, kind: "small_fireball" });
  }

  /** (10b) Người chơi vung tay: cầu lửa trong tầm (trước mặt) bị đánh bật theo hướng nhìn, thành của người đó. */
  deflect(p: ServerPlayer): void {
    if (p.dead) return;
    const eye = p.eye(), d = p.lookDir(), dir = [d.x, d.y, d.z];
    for (const a of this.list) {
      if (a.kind !== "fireball" || a.stuck || Math.hypot(a.x - eye[0], a.y - eye[1], a.z - eye[2]) > GHAST.DEFLECT_RANGE + 1) continue;
      const t = rayBox(eye, dir, [a.x - 0.75, a.y - 0.75, a.z - 0.75, a.x + 0.75, a.y + 0.75, a.z + 0.75]);
      if (t === null || t > GHAST.DEFLECT_RANGE) continue;
      Object.assign(a, { vx: d.x * GHAST.FIREBALL_SPEED, vy: d.y * GHAST.FIREBALL_SPEED, vz: d.z * GHAST.FIREBALL_SPEED, owner: p.id, mobOwner: 0,
        shooter: p.name, age: 0 });
      return;
    }
  }

  /** (7a) Người chơi ném trứng / (7b) ngọc hư không đang cầm (ngọc: chờ 1 giây giữa hai lần ném). */
  throwHeld(p: ServerPlayer): void {
    const item = p.inv.held?.item, kind: Projectile | null = item === "egg" ? "egg" : item === "ender_pearl" ? "pearl" : item === "snowball" ? "snowball"
      : item === "fire_resistance_splash_potion" ? "potion" : null; // (10d1) thuốc kháng lửa ném
    if (p.dead || !kind) return;
    if (kind === "pearl") {
      if (this.clock() < p.pearlReadyAt) return;
      p.pearlReadyAt = this.clock() + 1000;
    }
    p.inv.takeHeld(1);
    p.invDirty = true;
    const [x, y, z] = p.eye(), d = p.lookDir(), v = THROW_SPEED[kind];
    this.add({ x, y, z, vx: d.x * v, vy: d.y * v, vz: d.z * v, owner: p.id, shooter: p.name, crit: false, mobOwner: 0, dmg: 0, pickup: false, kind,
      ...(kind === "potion" ? { potion: "fire_resistance" } : {}) });
  }

  private add(a: Omit<Arrow, "id" | "age" | "stuck">): void {
    this.list.push({ ...a, id: this.nextId++, age: 0, stuck: false });
    if (this.list.length > ARCHERY.MAX_ARROWS) this.list.shift();
  }

  /** Bắt đầu kéo cung (cầm cung tay phải, còn mũi tên). */
  draw(p: ServerPlayer): void {
    const it = p.inv.held?.item;
    if (p.dead || (it !== BOW_KEY && it !== "crossbow") || !hasArrow(p.inv)) return; // (8b) nỏ: bắt đầu lên dây
    p.drawing = true;
    p.drawAt = this.clock();
  }

  /** Thôi kéo (đổi đồ, chết). */
  cancel(p: ServerPlayer): void {
    p.drawing = false;
  }

  /** Thả cung với lực client tính; server lấy lực nhỏ hơn giữa client và đồng hồ server (chặn bắn nhanh). */
  shoot(p: ServerPlayer, clientPower: number): void {
    if (p.inv.held?.item === "crossbow" || p.inv.held?.item === "crossbow_loaded") return this.crossbow(p);
    if (!p.drawing || p.dead || p.inv.held?.item !== BOW_KEY) return;
    p.drawing = false;
    const power = Math.min(clientPower, bowPower((this.clock() - p.drawAt) / 1000 + ARCHERY.DRAW_SLACK_S));
    const e = p.inv.held!.ench ?? {}, ak = firstArrow(p.inv), inf = (e.infinity ?? 0) > 0 && ak === ARROW_KEY; // (8b2) Vô hạn: không tốn tên thường
    if (!(power >= ARCHERY.MIN_POWER) || !ak || (!inf && !takeArrow(p.inv))) return;
    p.inv.damageSlot("main", p.inv.selected, 1);
    p.invDirty = true;
    const [x, y, z] = p.eye(), d = p.lookDir(), v = power * COMBAT.ARROW_MAX_SPEED;
    this.add({ x, y, z, vx: d.x * v, vy: d.y * v, vz: d.z * v, owner: p.id, shooter: p.name, crit: power >= 1, mobOwner: 0, dmg: 0, pickup: !inf, kind: "arrow",
      ench: { mult: e.power ? 1 + 0.25 * (e.power + 1) : 1, punch: e.punch ?? 0, flame: !!e.flame, pierce: 0 }, spectral: ak !== ARROW_KEY });
  }

  /** (8b) Nỏ: đang lên dây đủ 1.25 giây → lấy 1 mũi tên, thành nỏ đã lên dây; nỏ đã lên dây → bắn (tên nhanh, 6–11 sát thương). */
  private crossbow(p: ServerPlayer): void {
    const held = p.inv.held!, slot = p.inv.selected;
    if (p.dead) return;
    if (held.item === "crossbow") {
      if (!p.drawing || (this.clock() - p.drawAt) / 1000 + ARCHERY.DRAW_SLACK_S < crossbowCharge(held) || !takeArrow(p.inv)) return;
      p.drawing = false;
      p.inv.main[slot] = { ...held, item: "crossbow_loaded" };
    } else {
      const [x, y, z] = p.eye(), d = p.lookDir(), v = CROSSBOW.ARROW_SPEED, e = held.ench ?? {};
      for (const turn of e.multishot ? [0, -0.17, 0.17] : [0]) { // (8b2) Bắn ba: 3 mũi lệch ±10° (2 mũi bên không nhặt được); Xuyên
        const c = Math.cos(turn), s = Math.sin(turn), dx = d.x * c - d.z * s, dz = d.x * s + d.z * c;
        this.add({ x, y, z, vx: dx * v, vy: d.y * v, vz: dz * v, owner: p.id, shooter: p.name, crit: false, mobOwner: 0,
          dmg: randInt(this.rng, ...CROSSBOW.DAMAGE), pickup: turn === 0, kind: "arrow", ench: { mult: 1, punch: 0, flame: false, pierce: e.piercing ?? 0 } });
      }
      p.inv.main[slot] = { ...held, item: "crossbow" };
      p.inv.damageSlot("main", slot, 1);
    }
    p.invDirty = true;
  }

  /** Một tick server: mũi tên bay / trúng người / cắm vào block, nhặt lại, hết hạn. */
  tick(): void {
    const cell = (x: number, y: number, z: number): number => this.w.getCell(x, y, z);
    const all = this.online();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i]!;
      a.age += ARROW_TICK;
      if (a.stuck) {
        if (a.age > ARCHERY.STUCK_DESPAWN_S || a.kind !== "arrow") {
          if (a.kind !== "arrow") this.onLand(a, a.x, a.y, a.z, null, null); // trứng / ngọc / bình vỡ khi chạm block
          this.list.splice(i, 1);
          continue;
        }
        if (!a.pickup) continue;
        const p = all.find((o) => !o.dead && Math.hypot(o.x - a.x, o.z - a.z) <= ARCHERY.PICKUP_RANGE && a.y >= o.y - 0.5 && a.y <= o.y + 2);
        if (p && !p.inv.add(stack(a.spectral ? "spectral_arrow" : ARROW_KEY))) {
          p.invDirty = true; // nhặt lại được (túi đầy thì để nằm đó)
          this.list.splice(i, 1);
        }
        continue;
      }
      const speed = Math.hypot(a.vx, a.vy, a.vz), vx = a.vx, vz = a.vz;
      const seg = stepArrow(a, cell);
      // người chơi trên đoạn vừa bay (trước chỗ cắm vào block nếu có)
      let best: { p: ServerPlayer | null; m: Mob | null; t: number } | null = null;
      for (const o of all) {
        if (o.dead || o.flying || (o.id === a.owner && !a.mobOwner && a.age < ARCHERY.OWNER_IMMUNE_S)) continue;
        const t = rayBox(seg.from, seg.dir, playerHitBox(o.x, o.y, o.z, o.sneaking, ARCHERY.HIT_PAD));
        if (t !== null && t <= seg.len && (!best || t < best.t)) best = { p: o, m: null, t };
      }
      for (const m of this.mobs?.list ?? []) {
        if (m.dead || m.id === a.mobOwner || a.ench?.hit?.includes(m.id) || Math.abs(m.x - a.x) > 8 || Math.abs(m.z - a.z) > 8) continue;
        const t = rayBox(seg.from, seg.dir, mobBox(m.def, m.x, m.y, m.z, m.scale, ARCHERY.HIT_PAD));
        if (t !== null && t <= seg.len && (!best || t < best.t)) best = { p: null, m, t };
      }
      if (best?.m?.def.key === "enderman" && a.kind !== "potion") {
        this.mobs!.teleport(best.m); // kẻ hư không né đạn: dịch chuyển đi, đạn bay tiếp
        best = null;
      }
      if (best) {
        const hx = seg.from[0]! + seg.dir[0]! * best.t, hz = seg.from[2]! + seg.dir[2]! * best.t;
        const owner = all.find((o) => o.id === a.owner) ?? null, dmg = (a.dmg || arrowDamage(speed, a.crit)) * (a.ench?.mult ?? 1);
        if (a.kind !== "arrow") this.onLand(a, hx, seg.from[1]! + seg.dir[1]! * best.t, hz, best.p, best.m);
        else if (best.m) {
          this.mobs!.hurt(best.m, dmg, "arrow", { by: owner, from: { x: hx - vx, z: hz - vz }, kb: 1 + (a.ench?.punch ?? 0), crit: a.crit });
          if (a.ench?.flame) best.m.burnS = Math.max(best.m.burnS, 5); // Lửa: cháy 5 giây
          if (a.spectral) best.m.glowS = Math.max(best.m.glowS, SPECTRAL.GLOW_S); // (10d1) Phát sáng
          if (a.ench && a.ench.pierce > (a.ench.hit?.length ?? 0)) { // Xuyên: bay tiếp qua sinh vật
            (a.ench.hit ??= []).push(best.m.id);
            continue;
          }
        }
        else if (a.mobOwner) {
          const hit = this.combat.mobHit(best.p!, dmg, hx - vx * 0.05, hz - vz * 0.05, a.shooter, "arrow");
          if (hit && a.fx) {
            applyEffect(best.p!.state, a.fx.fx, a.fx.s); // tên bộ xương băng: chậm 30 giây
            best.p!.stateDirty = true;
          }
        }
        else {
          this.combat.arrowHit(owner, a.shooter, best.p!, hx, hz, vx, vz, dmg, a.crit);
          if (a.spectral) (applyEffect(best.p!.state, "glowing", SPECTRAL.GLOW_S), (best.p!.stateDirty = true)); // (10d1)
        }
        this.list.splice(i, 1);
      } else if (a.y < -10 || a.age > (LIFE_S[a.kind] ?? ARCHERY.FLY_DESPAWN_S)) this.list.splice(i, 1);
    }
  }

  /** Gửi mũi tên trong tầm nhìn cho p: đang bay thì mỗi tick, đã cắm thì một lần; mất thì báo. */
  sync(p: ServerPlayer): void {
    const up: NetArrow[] = [], seen = new Set<number>();
    for (const a of this.list) {
      if (Math.hypot(a.x - p.x, a.z - p.z) > ARCHERY.VIEW) continue;
      seen.add(a.id);
      const sig = a.stuck ? "s" : "f";
      if (a.stuck && p.knownArrows.get(a.id) === sig) continue;
      p.knownArrows.set(a.id, sig);
      up.push([a.id, a.x, a.y, a.z, a.vx, a.vy, a.vz, (a.stuck ? 1 : 0) | (a.crit ? 2 : 0) | KIND_FLAG[a.kind]]);
    }
    const gone: number[] = [];
    for (const id of p.knownArrows.keys())
      if (!seen.has(id)) {
        gone.push(id);
        p.knownArrows.delete(id);
      }
    if (up.length || gone.length) p.send({ t: "arrows", up, gone });
  }
}
