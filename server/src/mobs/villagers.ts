// Dân làng phía server (Giai đoạn 8a; PLAN 2.11, MECHANICS.md 8.3–8.4): nghề + vùng (biến thể), bảng đổi đồ dùng chung cho mọi
// người chơi (số lần đã dùng lưu ở dân làng → đồng bộ), bổ sung hàng; dân làng bị xác sống giết 50% thành dân làng xác sống, cho
// dân làng xác sống ăn táo vàng thì vài phút sau thành dân làng (giữ nghề); thương nhân lang thang thỉnh thoảng xuất hiện gần người
// chơi kèm 2 lạc đà không bướu, bán đồ hiếm, 40–60 phút sau thì đi.
import {
  PROFESSIONS, TRADER, randomBookEnch, TRADES, VILLAGERS, VILLAGER_PROFS, VILLAGER_TYPES, WANDER_RARE, WANDER_TRADES, ZOMBIE_VILLAGER, canAfford,
  XP, randInt, stack, type Profession, type Rng, type Trade, type TradeView,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

/** Dữ liệu riêng dân làng / dân làng xác sống / thương nhân (lưu cùng sinh vật). */
export interface VillagerData {
  type: number; // chỉ số VILLAGER_TYPES
  prof: number; // chỉ số VILLAGER_PROFS
  uses: number[]; // số lần đã dùng từng giao dịch
  restockS: number;
  offers?: number[]; // thương nhân: chỉ số hàng (≥ 1000: hàng hiếm)
  book?: { ench: Record<string, number>; price: number }; // (8b3) thủ thư: sách phù phép đang bán
}

const ZOMBIES = new Set(["zombie", "husk", "drowned", "zombie_villager"]);
export const isZombie = (m: Mob): boolean => ZOMBIES.has(m.def.key);

/** Gán vùng + nghề (variant = vùng × 16 + nghề để client chọn skin). */
export function setVillager(m: Mob, type: number, prof: number): void {
  m.vill = { type, prof, uses: [], restockS: VILLAGERS.RESTOCK_S };
  m.variant = type * 16 + prof;
}

/** Khóa "villager:<nghề>:<vùng>" trong mẫu làng → (vùng, nghề). nghề "none": chọn theo bàn nghề gần nhất / ngẫu nhiên. */
export function parseVillagerKey(key: string, job: Profession | null, rng: Rng): { type: number; prof: number; baby: boolean } {
  const [, p = "none", t = "plains"] = key.split(":");
  const type = Math.max(0, VILLAGER_TYPES.indexOf(t as (typeof VILLAGER_TYPES)[number]));
  if (p === "baby") return { type, prof: 0, baby: true };
  if (p === "nitwit") return { type, prof: 1, baby: false };
  const prof = job ?? PROFESSIONS[randInt(rng, 0, PROFESSIONS.length - 1)]!;
  return { type, prof: VILLAGER_PROFS.indexOf(prof), baby: false };
}

/** Bảng giao dịch của sinh vật (dân làng theo nghề; thương nhân theo hàng đã chọn). */
export function tradesOf(m: Mob): readonly Trade[] {
  const v = m.vill;
  if (!v || m.baby) return [];
  if (m.def.key === "wandering_trader") return (v.offers ?? []).map((i) => (i >= 1000 ? WANDER_RARE[i - 1000]! : WANDER_TRADES[i]!));
  if (m.def.key !== "villager") return [];
  const base = TRADES[VILLAGER_PROFS[v.prof] ?? "none"];
  if (VILLAGER_PROFS[v.prof] !== "librarian") return base;
  if (!v.book) { // (8b3) như Minecraft: giá 2 + 3 × cấp + ngẫu nhiên (0..5 + 10 × cấp), phù phép kho báu ×2, tối đa 64
    const ench = randomBookEnch(Math.random), [k, l] = Object.entries(ench)[0]!;
    const price = Math.min(64, (2 + 3 * l + Math.floor(Math.random() * (6 + 10 * l))) * (k === "mending" ? 2 : 1));
    v.book = { ench, price };
  }
  return [...base, { buy: ["emerald", v.book.price], buy2: ["book", 1], sell: ["enchanted_book", 1], max: 12, ench: v.book.ench }];
}

export interface VillagersHost {
  mobs: Mobs;
  items: ServerItems;
  rng: Rng;
  online(): ServerPlayer[];
  fx(m: Mob, kind: "hearts" | "smoke"): void;
  /** Chỗ đứng trên mặt đất gần (x, z) (thương nhân xuất hiện), hoặc null. */
  groundAt(x: number, z: number): number | null;
}

export class Villagers {
  private traderS = TRADER.TRY_S;
  private traderTries = 0;

  constructor(private readonly h: VillagersHost) {}

  /** Chuột phải; true = đã xử lý. */
  use(p: ServerPlayer, m: Mob): boolean {
    const k = m.def.key, item = p.inv.held?.item ?? "";
    if (k === "zombie_villager") {
      if (item !== "golden_apple" || m.cureS > 0) return false;
      p.inv.takeHeld(1);
      p.invDirty = true;
      const [a, b] = ZOMBIE_VILLAGER.CURE_S;
      m.cureS = a + this.h.rng() * (b - a);
      m.persistent = true;
      this.h.fx(m, "hearts");
      return true;
    }
    if (k !== "villager" && k !== "wandering_trader") return false;
    if (!tradesOf(m).length) return this.h.fx(m, "smoke"), true; // con nít / người ngốc / thất nghiệp: lắc đầu
    p.trading = m.id;
    m.path = null;
    this.send(p, m);
    return true;
  }

  private view(m: Mob): TradeView[] {
    return tradesOf(m).map((t, i) => [t.buy, t.buy2 ?? null, t.sell, m.vill!.uses[i] ?? 0, t.max, t.ench ?? null]);
  }

  private send(p: ServerPlayer, m: Mob): void {
    p.send({ t: "trades", mob: m.id, key: m.def.key, prof: m.vill?.prof ?? 0, list: this.view(m) });
  }

  /** Người chơi bấm giao dịch i (all: làm tới khi hết đồ / hết hàng). */
  trade(p: ServerPlayer, mobId: number, i: number, all: boolean): void {
    const m = this.h.mobs.list.find((o) => o.id === mobId && !o.dead);
    if (!m || p.trading !== mobId || !m.vill || Math.hypot(m.x - p.x, m.y - p.y, m.z - p.z) > VILLAGERS.TRADE_R) return;
    const tr = tradesOf(m)[i];
    if (!tr) return;
    let n = 0;
    while ((m.vill.uses[i] ?? 0) < tr.max && canAfford(p.inv, tr) && (n === 0 || all)) {
      p.inv.remove(tr.buy[0], tr.buy[1]);
      if (tr.buy2) p.inv.remove(tr.buy2[0], tr.buy2[1]);
      const left = p.inv.add({ ...stack(tr.sell[0], tr.sell[1]), ...(tr.ench ? { ench: { ...tr.ench } } : {}) });
      if (left) this.h.items.throwFrom(left, p);
      m.vill.uses[i] = (m.vill.uses[i] ?? 0) + 1;
      n++;
      if (n >= 64) break;
    }
    if (!n) return;
    p.invDirty = true;
    let xp = 0; // (8b2) mỗi lần đổi: 3–6 kinh nghiệm
    for (let k = 0; k < n; k++) xp += randInt(this.h.rng, XP.TRADE[0], XP.TRADE[1]);
    this.h.items.xp(xp, p.x, p.y + 0.5, p.z);
    this.h.fx(m, "hearts");
    for (const o of this.h.online()) if (o.trading === m.id) this.send(o, m); // mọi người đang đổi với con này thấy số còn lại
  }

  /** Dân làng / thương nhân bị giết bởi `by` (sinh vật) — xác sống giết: 50% thành dân làng xác sống. */
  killed(m: Mob, by: Mob | null): void {
    if (m.def.key !== "villager" || !by || !isZombie(by) || !m.vill || this.h.rng() >= ZOMBIE_VILLAGER.CONVERT_CHANCE) return;
    m.dyingS = 0.05; // biến mất ngay, thay bằng dân làng xác sống
    const z = this.h.mobs.spawn("zombie_villager", m.x, m.y, m.z, { baby: m.baby, variant: m.variant });
    z.vill = { ...m.vill, uses: [] };
    z.persistent = true;
    z.yaw = m.yaw;
  }

  /** Mỗi tick: bổ sung hàng, đóng bảng khi đi xa, chữa xác sống, dân làng con lớn, thương nhân đi / tới. */
  tick(online: readonly ServerPlayer[], dt: number, spawn = true): void {
    for (const p of online) {
      if (!p.trading) continue;
      const m = this.h.mobs.list.find((o) => o.id === p.trading);
      if (!m || m.dead || p.dead || Math.hypot(m.x - p.x, m.y - p.y, m.z - p.z) > VILLAGERS.TRADE_R + 1) {
        p.trading = 0;
        p.send({ t: "tradeEnd" });
      }
    }
    for (const m of [...this.h.mobs.list]) {
      if (m.dead || !m.vill) continue;
      const k = m.def.key;
      if (k === "villager") {
        if ((m.vill.restockS -= dt) <= 0) {
          m.vill.restockS = VILLAGERS.RESTOCK_S;
          if (m.vill.uses.some((u) => u > 0)) {
            m.vill.uses = [];
            for (const o of online) if (o.trading === m.id) this.send(o, m);
          }
        }
        if (m.vill.prof === 0 && !m.baby) setVillager(m, m.vill.type, VILLAGER_PROFS.indexOf(PROFESSIONS[randInt(this.h.rng, 0, PROFESSIONS.length - 1)]!)); // con vừa lớn: có nghề
      } else if (k === "zombie_villager" && m.cureS > 0 && (m.cureS -= dt) <= 0) {
        const v = this.h.mobs.spawn("villager", m.x, m.y, m.z, { baby: m.baby });
        setVillager(v, m.vill.type, m.vill.prof <= 1 && !m.baby ? VILLAGER_PROFS.indexOf("farmer") : m.vill.prof);
        if (m.baby) v.vill!.prof = 0;
        v.yaw = m.yaw;
        v.home = { x: m.x, y: m.y, z: m.z };
        this.h.mobs.remove(m);
        this.h.fx(v, "hearts");
      } else if (k === "wandering_trader" && (m.lifeS -= dt) <= 0) this.leave(m);
    }
    if (spawn) this.trader(online, dt);
  }

  /** Thương nhân đi (cùng lạc đà đang dắt). */
  private leave(m: Mob): void {
    for (const l of this.h.mobs.list.filter((o) => o.leash && "m" in o.leash && o.leash.m === m)) this.h.mobs.remove(l);
    this.h.mobs.remove(m);
  }

  /** Thử cho thương nhân lang thang xuất hiện (cả thế giới chỉ một người). */
  private trader(online: readonly ServerPlayer[], dt: number): void {
    if ((this.traderS -= dt) > 0) return;
    this.traderS = TRADER.TRY_S;
    const live = online.filter((p) => !p.dead);
    if (!live.length || this.h.mobs.list.some((m) => m.def.key === "wandering_trader")) return;
    const rng = this.h.rng, chance = TRADER.CHANCE[Math.min(this.traderTries, TRADER.CHANCE.length - 1)]!;
    if (rng() >= chance) return void this.traderTries++;
    this.traderTries = 0;
    const p = live[randInt(rng, 0, live.length - 1)]!;
    for (let i = 0; i < 10; i++) {
      const a = rng() * Math.PI * 2, r = TRADER.DIST[0] + rng() * (TRADER.DIST[1] - TRADER.DIST[0]);
      const x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r), y = this.h.groundAt(x, z);
      if (y === null) continue;
      this.spawnTrader(x + 0.5, y, z + 0.5);
      return;
    }
  }

  /** Thương nhân + 2 lạc đà dắt theo ở (x, y, z). */
  spawnTrader(x: number, y: number, z: number): Mob {
    const rng = this.h.rng, m = this.h.mobs.spawn("wandering_trader", x, y, z);
    const pick = (n: number, len: number): number[] => {
      const all = Array.from({ length: len }, (_, i) => i);
      for (let i = len - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [all[i], all[j]] = [all[j]!, all[i]!];
      }
      return all.slice(0, n);
    };
    m.vill = { type: 0, prof: 0, uses: [], restockS: 0, offers: [...pick(TRADER.COMMON, WANDER_TRADES.length), ...pick(TRADER.RARE, WANDER_RARE.length).map((i) => i + 1000)] };
    m.lifeS = TRADER.LIFE_S[0] + rng() * (TRADER.LIFE_S[1] - TRADER.LIFE_S[0]);
    m.home = { x, y, z };
    for (let i = 0; i < TRADER.LLAMAS; i++) {
      const l = this.h.mobs.spawn("trader_llama", x + (rng() - 0.5) * 3, y, z + (rng() - 0.5) * 3, { variant: randInt(rng, 0, 3) });
      l.leash = { m };
      l.persistent = false;
    }
    return m;
  }
}
