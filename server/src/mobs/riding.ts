// Cưỡi thú phía server (Giai đoạn 7d; MECHANICS.md 8.4): ngựa / lừa / la / lạc đà. Chuột phải tay không (hoặc món khác) để cưỡi;
// chưa thuần thì sau 1–3 giây hoặc thuần (xác suất độ_thuần / 100) hoặc hất người xuống (+5 độ thuần). Cho ăn: hồi máu + độ thuần,
// táo vàng cho con đã thuần đủ máu thì muốn phối giống (ngựa + lừa → la). Yên (đã thuần) thì điều khiển được; rương (lừa, la, lạc
// đà đã thuần) mở bằng Shift + chuột phải hoặc phím túi đồ khi đang cưỡi; kéo tháo yên. Thân thú theo người cưỡi mỗi tick.
import {
  BREED, CAMEL, HORSE_ARMOR, HORSE_ARMOR_KEYS, RIDE, STRIDER, dismount, isMount, randInt, stack, type CellReader, type MobKey, type Rng, type Slot,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

const between = (rng: Rng, r: readonly number[]): number => r[0]! + rng() * (r[1]! - r[0]!);

/** Chỉ số cưỡi lúc sinh (ngựa ngẫu nhiên tốc độ / độ nhảy / màu; lừa, la cố định; lạc đà: sức chở). */
export function initMount(m: Mob, rng: Rng): void {
  const k = m.def.key;
  if (k === "horse") {
    m.rideSpeed = between(rng, RIDE.HORSE_SPEED);
    m.jumpH = between(rng, RIDE.HORSE_JUMP);
  } else if (k === "donkey" || k === "mule") {
    m.rideSpeed = RIDE.DONKEY_SPEED;
    m.jumpH = RIDE.DONKEY_JUMP;
  } else if (k === "camel") { // (8a) không cần thuần; Space = lướt
    m.rideSpeed = CAMEL.SPEED;
  } else if (k === "llama" || k === "trader_llama") {
    m.rideSpeed = RIDE.LLAMA_SPEED;
    m.jumpH = RIDE.LLAMA_JUMP;
    m.strength = randInt(rng, RIDE.LLAMA_STRENGTH[0]!, RIDE.LLAMA_STRENGTH[1]!);
  }
}

/** Con non: chỉ số trung bình của bố mẹ, dao động ±10%; ngựa + lừa → la. */
export function initFoal(c: Mob, a: Mob, b: Mob, rng: Rng): void {
  if (c.def.key !== "horse") return;
  const j = (x: number, y: number): number => ((x + y) / 2) * (0.9 + rng() * 0.2);
  c.rideSpeed = Math.min(RIDE.HORSE_SPEED[1]!, Math.max(RIDE.HORSE_SPEED[0]!, j(a.rideSpeed, b.rideSpeed)));
  c.jumpH = Math.min(RIDE.HORSE_JUMP[1]!, Math.max(RIDE.HORSE_JUMP[0]!, j(a.jumpH, b.jumpH)));
}

/** Hai con phối giống được với nhau (cùng loài; ngựa + lừa; la không đẻ). */
export function canMate(a: Mob, b: Mob): boolean {
  const ka = a.def.key, kb = b.def.key;
  if (ka === "mule" || kb === "mule") return false;
  return ka === kb || (ka === "horse" && kb === "donkey") || (ka === "donkey" && kb === "horse");
}

/** Loài con khi phối giống. */
export const foalKind = (a: Mob, b: Mob): MobKey => (a.def.key !== b.def.key ? "mule" : a.def.key);

const chestOk = (k: MobKey): boolean => k === "donkey" || k === "mule" || k === "llama";

export interface RidingHost {
  mobs: Mobs;
  items: ServerItems;
  rng: Rng;
  cell: CellReader;
  fx(m: Mob, kind: "hearts" | "smoke"): void;
  openChest(p: ServerPlayer, m: Mob): void;
}

export class Riding {
  constructor(private readonly h: RidingHost) {}

  private take(p: ServerPlayer): void {
    p.inv.takeHeld(1);
    p.invDirty = true;
  }

  /** Chuột phải vào thú cưỡi; true = đã xử lý. */
  use(p: ServerPlayer, m: Mob): boolean {
    if (!isMount(m.def.key)) return false;
    const item = p.inv.held?.item ?? "", k = m.def.key, feed = RIDE.FEED[item];
    if (k === "camel") return this.camel(p, m, item);
    if (k === "strider") return this.strider(p, m, item);
    if (feed && k === "llama" && m.def.food?.includes(item)) return false; // lạc đà: cho ăn / phối giống như 7c
    if (feed && (m.health < m.maxHealth || !m.owner || (m.owner && item === "golden_apple" && !m.baby && m.breedCdS <= 0 && m.loveS <= 0))) {
      if (m.health < m.maxHealth) m.health = Math.min(m.maxHealth, m.health + feed[0]!);
      else if (m.owner && item === "golden_apple") m.loveS = BREED.LOVE_S; // muốn phối giống
      if (!m.owner) m.temper = Math.min(100, m.temper + feed[1]!);
      this.take(p);
      this.h.fx(m, "hearts"); // (8a) cho biết đã ăn
      return true;
    }
    if (m.baby) return true; // con non không cưỡi được
    if (HORSE_ARMOR[item] && k === "horse" && m.owner && !m.horseArmor) { // (10c) giáp ngựa: chỉ ngựa đã thuần
      m.horseArmor = HORSE_ARMOR_KEYS.indexOf(item as (typeof HORSE_ARMOR_KEYS)[number]);
      this.take(p);
      return true;
    }
    if (item === "shears" && m.horseArmor) { // (10c) kéo: tháo giáp ngựa trước, rồi mới tới yên
      this.h.items.pop(stack(HORSE_ARMOR_KEYS[m.horseArmor]!), Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z));
      m.horseArmor = 0;
      p.inv.damageSlot("main", p.inv.selected, 1);
      p.invDirty = true;
      return true;
    }
    if (item === "saddle" && m.owner && !m.saddled && k !== "llama") {
      m.saddled = true;
      this.take(p);
      return true;
    }
    if (item === "chest" && m.owner && !m.chest && chestOk(k)) {
      m.chest = new Array<Slot>(k === "llama" ? 3 * m.strength : RIDE.CHEST_SLOTS).fill(null);
      this.take(p);
      return true;
    }
    if (item === "shears" && m.saddled) { // tháo yên
      m.saddled = false;
      this.h.items.pop(stack("saddle"), Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z));
      p.inv.damageSlot("main", p.inv.selected, 1);
      p.invDirty = true;
      return true;
    }
    if (p.sneaking && m.owner && m.chest) return this.h.openChest(p, m), true;
    if (m.rider || p.state.rideId || p.flying || p.dead) return true;
    this.mount(p, m);
    return true;
  }

  /** (10b) Kẻ lội dung nham: không cần thuần; nấm cong vênh: cho ăn (chung); yên → cưỡi được (cầm cần câu nấm để điều khiển). */
  private strider(p: ServerPlayer, m: Mob, item: string): boolean {
    if (item === "warped_fungus") return false;
    if (m.baby) return true;
    if (item === "saddle" && !m.saddled) return (m.saddled = true), this.take(p), true;
    if (!m.saddled || m.rider || p.state.rideId || p.flying || p.dead) return true;
    this.mount(p, m);
    return true;
  }

  /** (10b) Chuột phải bằng cần câu nấm khi đang cưỡi kẻ lội: tăng tốc 7–49 giây (mất 1 độ bền). true = đã xử lý. */
  boost(p: ServerPlayer): boolean {
    const s = p.state;
    if (p.inv.held?.item !== "warped_fungus_on_a_stick" || !s.rideId || s.rideDash !== 2) return false;
    if (s.rideBoostLen > 0) return true;
    s.rideBoostT = 0;
    s.rideBoostLen = STRIDER.BOOST_S[0] + this.h.rng() * (STRIDER.BOOST_S[1] - STRIDER.BOOST_S[0]);
    p.inv.damageSlot("main", p.inv.selected, 1);
    p.invDirty = p.stateDirty = true;
    return true;
  }

  /** (8a) Lạc đà: không cần thuần; xương rồng: cho ăn (chung); yên → điều khiển; đã có người lái thì ngồi sau. */
  private camel(p: ServerPlayer, m: Mob, item: string): boolean {
    if (m.def.food?.includes(item) || m.baby) return m.baby;
    if (item === "saddle" && !m.saddled) return (m.saddled = true), this.take(p), true;
    if (item === "shears" && m.saddled) {
      m.saddled = false;
      this.h.items.pop(stack("saddle"), Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z));
      return true;
    }
    if (p.state.rideId || p.flying || p.dead) return true;
    if (!m.rider) return this.mount(p, m), true;
    if (m.passenger) return true;
    const s = p.state;
    Object.assign(s, {
      rideId: m.id, rideSeat: CAMEL.BACK_SEAT, rideW: m.width, rideH: m.height, rideSpeed: 0, rideJump: 0, rideCharge: 0, rideControl: 0,
      rideHurt: 0, rideFall: 0, rideDash: 0, rideDashT: 0, rideDashCd: 0, rideBack: 1, vx: 0, vy: 0, vz: 0, sneaking: false, fallDist: 0,
    });
    m.passenger = p;
    this.seatBack(m);
    return true;
  }

  /** Người ngồi sau theo lạc đà: lùi sau người lái theo hướng lạc đà. */
  private seatBack(m: Mob): void {
    const p = m.passenger!, s = p.state;
    Object.assign(s, { x: m.x + Math.sin(m.yaw) * CAMEL.BACK_OFF, y: m.y + CAMEL.BACK_SEAT, z: m.z + Math.cos(m.yaw) * CAMEL.BACK_OFF, vx: 0, vy: 0, vz: 0, onGround: true });
    p.stateDirty = true;
  }

  private mount(p: ServerPlayer, m: Mob): void {
    const s = p.state, seat = RIDE.SEAT[m.def.key] ?? 0.6, strider = m.def.key === "strider";
    Object.assign(s, {
      rideId: m.id, rideSeat: seat, rideW: m.width, rideH: m.height, rideSpeed: m.rideSpeed, rideJump: m.jumpH, rideCharge: 0,
      rideControl: strider ? 0 : (m.owner || m.def.key === "camel") && m.saddled && m.def.key !== "llama" ? 1 : 0, rideHurt: 0, rideFall: 0,
      rideDash: m.def.key === "camel" ? 1 : strider ? 2 : 0, rideDashT: 0, rideDashCd: 0, rideBack: 0, rideBoostT: 0, rideBoostLen: 0,
      x: m.x, y: m.y + seat, z: m.z, vx: 0, vy: 0, vz: 0, onGround: m.body.onGround, sneaking: false, fallDist: 0,
    });
    p.stateDirty = true;
    m.rider = p;
    m.path = null;
    m.target = null;
    m.leash = null;
    if (!m.owner && m.def.key !== "camel") m.buckS = RIDE.BUCK_MIN_S + this.h.rng() * (RIDE.BUCK_MAX_S - RIDE.BUCK_MIN_S);
  }

  /** Mỗi tick (trước AI): thân thú theo người cưỡi; thú chưa thuần: thuần hoặc hất xuống; thú chết / người rời: thôi cưỡi. */
  tick(online: readonly ServerPlayer[], dt: number): void {
    for (const m of this.h.mobs.list) {
      const p = m.rider;
      if (!p) continue;
      const s = p.state;
      if (m.dead || p.dead || !online.includes(p) || s.rideId !== m.id) {
        m.rider = null;
        if (s.rideId === m.id && !p.dead) {
          dismount(s, this.h.cell, p.lookYaw);
          p.stateDirty = true;
        } else if (p.dead) s.rideId = 0;
        continue;
      }
      Object.assign(m.body, { x: s.x, y: s.y - s.rideSeat, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, onGround: s.onGround, fallDist: 0 });
      m.yaw = p.lookYaw;
      if (s.rideHurt > 0) {
        this.h.mobs.hurt(m, s.rideHurt, "fall");
        s.rideHurt = 0;
      }
      if (m.def.key === "strider") { // (10b) cầm cần câu nấm thì kẻ lội tự đi theo hướng nhìn
        const ctl = p.inv.held?.item === "warped_fungus_on_a_stick" ? 2 : 0;
        if (s.rideControl !== ctl) Object.assign(s, { rideControl: ctl }), (p.stateDirty = true);
        continue;
      }
      if (m.owner || m.def.key === "camel" || (m.buckS -= dt) > 0) continue;
      if (this.h.rng() * 100 < m.temper) { // thuần được
        m.owner = p.name;
        s.rideControl = m.saddled && m.def.key !== "llama" ? 1 : 0;
        p.stateDirty = true;
        this.h.fx(m, "hearts");
      } else { // hất xuống
        m.temper = Math.min(100, m.temper + RIDE.TEMPER_BUCK);
        m.rider = null;
        dismount(s, this.h.cell, p.lookYaw);
        s.vy = 4;
        p.stateDirty = true;
        this.h.fx(m, "smoke");
      }
    }
    this.passengers(online);
  }

  /** (8a) Người ngồi sau lạc đà: theo lạc đà (sau khi thân lạc đà đã theo người lái), hoặc xuống. */
  private passengers(online: readonly ServerPlayer[]): void {
    for (const m of this.h.mobs.list) {
      const b = m.passenger;
      if (!b) continue;
      if (m.dead || b.dead || !online.includes(b) || b.state.rideId !== m.id || !b.state.rideBack) {
        m.passenger = null;
        if (b.state.rideId === m.id && !b.dead) dismount(b.state, this.h.cell, b.lookYaw), (b.stateDirty = true);
        else if (b.dead) b.state.rideId = 0;
      } else this.seatBack(m);
    }
  }

  /** Phím túi đồ khi đang cưỡi thú có rương: mở rương của thú. */
  openRidden(p: ServerPlayer): void {
    const m = this.h.mobs.list.find((o) => o.id === p.state.rideId && o.rider === p);
    if (m?.owner && m.chest) this.h.openChest(p, m);
  }
}
