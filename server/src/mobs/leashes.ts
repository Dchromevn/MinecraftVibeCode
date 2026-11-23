// Dây dắt (Giai đoạn 7d; MECHANICS.md / DESIGN): cầm dây chuột phải vào động vật → dắt (tốn 1 dây); con vật xa hơn 4 block thì đi
// theo, xa hơn 10 block thì đứt (rơi dây). Đang dắt mà chuột phải vào hàng rào / tường: buộc mọi con đang dắt vào cọc; chuột phải
// lại cọc đó thì lấy về tay. Chuột phải con mình đang dắt: tháo (lấy lại dây). Dắt một lạc đà thì lạc đà quanh đó nối đuôi thành
// đoàn (mỗi con theo con trước, tối đa 10). Gửi cho người chơi gần đó danh sách dây để vẽ.
import { B, MOB_AI, RIDE, stack, type ServerMsg } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { ServerItems } from "../serverItems.js";
import type { ServerWorld } from "../serverWorld.js";
import type { LeashTo, Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

const SYNC_S = 1; // gửi lại danh sách dây mỗi giây
const FENCES = new Set<number>([B.FENCE, B.SPRUCE_FENCE, B.BIRCH_FENCE, B.ACACIA_FENCE, B.DARK_OAK_FENCE, B.COBBLE_WALL, B.MOSSY_COBBLE_WALL, B.SANDSTONE_WALL, B.DEEPSLATE_WALL, B.STONE_BRICK_WALL]);

export const isFencePost = (id: number): boolean => FENCES.has(id);

/** Con này dắt được không (động vật trên cạn, không bị cưỡi). */
const leashable = (m: Mob): boolean => !m.def.hostile && !m.def.aquatic && !m.def.flies && !m.rider && !m.dead;

export class Leashes {
  private syncT = 0;

  constructor(private readonly w: ServerWorld, private readonly mobs: Mobs, private readonly items: ServerItems) {}

  /** Vị trí đầu dây (tay người, con dẫn đầu, cọc). */
  holderPos(to: LeashTo): { x: number; y: number; z: number } {
    if ("p" in to) return to.p;
    if ("m" in to) return to.m;
    return { x: to.x + 0.5, y: to.y, z: to.z + 0.5 };
  }

  /** (cho AI) Con bị dắt ở xa đầu dây: chỗ cần đi tới. */
  pull(m: Mob): { x: number; y: number; z: number } | null {
    if (!m.leash) return null;
    const h = this.holderPos(m.leash), gap = "m" in m.leash ? RIDE.CARAVAN_GAP : "p" in m.leash ? RIDE.LEASH_PULL : 1.5;
    return Math.hypot(h.x - m.x, h.z - m.z) > gap ? h : null;
  }

  private dropLead(m: Mob): void {
    this.items.pop(stack("lead"), Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z));
  }

  /** Chuột phải vào sinh vật m; true = đã xử lý. */
  use(p: ServerPlayer, m: Mob): boolean {
    if (m.leash && "p" in m.leash && m.leash.p === p) { // tháo, lấy lại dây
      m.leash = null;
      const left = p.inv.add(stack("lead"));
      if (left) this.items.throwFrom(left, p);
      p.invDirty = true;
      return true;
    }
    if (p.inv.held?.item !== "lead" || !leashable(m) || (m.leash && !("m" in m.leash))) return false;
    m.leash = { p };
    p.inv.takeHeld(1);
    p.invDirty = true;
    return true;
  }

  /** Chuột phải vào hàng rào / tường (x, y, z): buộc các con đang dắt vào cọc, hoặc lấy các con đang buộc ở cọc về tay. */
  useFence(p: ServerPlayer, x: number, y: number, z: number): boolean {
    const mine = this.mobs.list.filter((m) => m.leash && "p" in m.leash && m.leash.p === p);
    const atPost = this.mobs.list.filter((m) => m.leash && "x" in m.leash && m.leash.x === x && m.leash.y === y && m.leash.z === z);
    if (mine.length) for (const m of mine) m.leash = { x, y, z };
    else if (atPost.length) for (const m of atPost) m.leash = { p };
    else return false;
    this.syncT = 0;
    return true;
  }

  /** Mỗi tick: đứt dây (xa, người rời, cọc mất), nối đoàn lạc đà, gửi danh sách dây. */
  tick(online: readonly ServerPlayer[], dt: number): void {
    for (const m of this.mobs.list) {
      const l = m.leash;
      if (!l) continue;
      if (m.dead || m.rider) {
        if (!("m" in l) && m.dead) this.dropLead(m);
        m.leash = null;
      } else if ("p" in l) {
        if (!online.includes(l.p) || l.p.dead || Math.hypot(l.p.x - m.x, l.p.y - m.y, l.p.z - m.z) > RIDE.LEASH_BREAK) {
          this.dropLead(m);
          m.leash = null;
        }
      } else if ("m" in l) {
        if (!this.caravanRoot(m)) m.leash = null; // đoàn mất người dẫn
      } else if (!isFencePost(this.w.getCell(l.x, l.y, l.z) & 255) && this.w.getCell(l.x, l.y, l.z) >= 0) {
        this.dropLead(m); // cọc bị phá
        m.leash = null;
      }
    }
    this.caravans();
    if ((this.syncT -= dt) <= 0) {
      this.syncT = SYNC_S;
      this.sync(online);
    }
  }

  /** Lạc đà trong đoàn: còn nối tới con đang được người dắt không. */
  private caravanRoot(m: Mob): boolean {
    let cur: Mob = m;
    for (let i = 0; i <= RIDE.CARAVAN_MAX && cur.leash && "m" in cur.leash; i++) cur = cur.leash.m;
    if (cur.def.key === "wandering_trader") return !cur.dead; // (8a) lạc đà của thương nhân
    return !!cur.leash && "p" in cur.leash && !cur.dead;
  }

  /** Lạc đà đang được người dắt: lạc đà gần đó (không bị dắt) nối đuôi. */
  private caravans(): void {
    for (const head of this.mobs.list) {
      if (head.def.key !== "llama" || !head.leash || !("p" in head.leash)) continue;
      let tail = head;
      for (let n = 0; n < RIDE.CARAVAN_MAX; n++) {
        const next = this.mobs.list.find((o) => o.leash && "m" in o.leash && o.leash.m === tail) ??
          this.mobs.list.find((o) => o !== tail && o.def.key === "llama" && !o.leash && !o.baby && leashable(o) &&
            Math.hypot(o.x - tail.x, o.y - tail.y, o.z - tail.z) <= RIDE.CARAVAN_R);
        if (!next) break;
        next.leash = { m: tail };
        tail = next;
      }
    }
  }

  /** Gửi cho từng người chơi các dây trong tầm nhìn. */
  private sync(online: readonly ServerPlayer[]): void {
    const leashed = this.mobs.list.filter((m) => m.leash);
    for (const p of online) {
      const list: Extract<ServerMsg, { t: "leashes" }>["list"] = [];
      for (const m of leashed) {
        if (Math.hypot(m.x - p.x, m.z - p.z) > MOB_AI.VIEW) continue;
        const l = m.leash!;
        list.push("p" in l ? [m.id, 0, l.p.id, 0, 0] : "m" in l ? [m.id, 1, l.m.id, 0, 0] : [m.id, 2, l.x, l.y, l.z]);
      }
      if (list.length || p.hadLeashes) p.send({ t: "leashes", list });
      p.hadLeashes = list.length > 0;
    }
  }
}
