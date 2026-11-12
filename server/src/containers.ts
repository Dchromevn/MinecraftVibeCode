// Rương / lò đang mở trên server. Nhiều người mở cùng một rương thì dùng chung một mảng ô
// (rương đôi: mảng 54 ô ghép, tách lại về hai nửa khi người cuối cùng đóng); mọi thay đổi gửi
// lại cho tất cả người đang mở.
import {
  B, FURNACE_RULES, NET, chestHalf, chestPartner, chestRules, joinChest, splitChest,
  type BlockEntities, type ChestEntity, type FurnaceEntity, type Slot,
} from "../../shared/src/index.js";
import type { ServerPlayer } from "./player.js";
import type { ServerWorld } from "./serverWorld.js";

export interface ContainerSession {
  key: string;
  kind: "chest" | "furnace";
  slots: Slot[];
  positions: { x: number; y: number; z: number }[];
  viewers: Set<ServerPlayer>;
  furnace?: FurnaceEntity;
  finish: () => void; // người cuối cùng đóng
}

const keyOf = (x: number, y: number, z: number): string => `${x},${y},${z}`;

export class Containers {
  private readonly sessions = new Map<string, ContainerSession>();

  constructor(private readonly w: ServerWorld, private readonly entities: BlockEntities) {}

  /** Mở rương / lò ở ô (x, y, z) cho người chơi p. */
  open(p: ServerPlayer, x: number, y: number, z: number): void {
    this.close(p);
    const cell = this.w.getCell(x, y, z), id = cell & 255;
    let s: ContainerSession | undefined;
    if (id === B.FURNACE) {
      const k = keyOf(x, y, z);
      s = this.sessions.get(k);
      if (!s) {
        const e = this.entities.obtain(x, y, z, B.FURNACE) as FurnaceEntity;
        s = { key: k, kind: "furnace", slots: e.slots, positions: [{ x, y, z }], viewers: new Set(), furnace: e, finish: () => undefined };
      }
    } else if (id === B.CHEST) {
      const part = chestPartner(cell, x, y, z);
      const double = part && (this.w.getCell(part.x, part.y, part.z) & 255) === B.CHEST ? part : null;
      // khóa phiên theo nửa A (để hai người bấm hai nửa khác nhau vẫn dùng chung)
      const a = double && chestHalf(cell >> 8) !== 1 ? double : { x, y, z };
      const k = keyOf(a.x, a.y, a.z);
      s = this.sessions.get(k);
      if (!s) {
        const e = this.entities.obtain(x, y, z, B.CHEST) as ChestEntity;
        if (double) {
          const pe = this.entities.obtain(double.x, double.y, double.z, B.CHEST) as ChestEntity;
          const [ea, eb] = chestHalf(cell >> 8) === 1 ? [e, pe] : [pe, e];
          const all = joinChest(ea.slots, eb.slots);
          s = { key: k, kind: "chest", slots: all, positions: [{ x, y, z }, double], viewers: new Set(), finish: () => splitChest(all, ea.slots, eb.slots) };
        } else s = { key: k, kind: "chest", slots: e.slots, positions: [{ x, y, z }], viewers: new Set(), finish: () => undefined };
      }
    } else return;
    this.sessions.set(s.key, s);
    s.viewers.add(p);
    p.container = s;
    p.inv.ext = s.slots;
    p.inv.extRules = s.kind === "furnace" ? FURNACE_RULES : chestRules(s.slots.length);
    p.invDirty = true;
    p.send({ t: "open", kind: s.kind, size: s.slots.length });
    if (s.furnace) this.sendFurnace(s);
  }

  /** p đóng giao diện (hoặc rời game / chết). */
  close(p: ServerPlayer): void {
    const s = p.container;
    if (!s) return;
    p.container = null;
    p.inv.ext = [];
    p.inv.extRules = null;
    p.invDirty = true;
    s.viewers.delete(p);
    if (s.viewers.size === 0) {
      s.finish();
      this.sessions.delete(s.key);
    }
  }

  /** Rương / lò ở ô này sắp bị phá: đóng giao diện của mọi người đang mở (gộp đồ về chỗ cũ trước). */
  closeAt(x: number, y: number, z: number): void {
    for (const s of [...this.sessions.values()])
      if (s.positions.some((q) => q.x === x && q.y === y && q.z === z))
        for (const v of [...s.viewers]) {
          this.close(v);
          v.send({ t: "close" });
        }
  }

  /** Túi đồ của p vừa đổi: người khác đang mở cùng rương / lò cũng cần trạng thái mới. */
  changed(p: ServerPlayer): void {
    if (p.container) for (const v of p.container.viewers) v.invDirty = true;
  }

  /** Mỗi tick: đóng khi đi quá xa; định kỳ gửi tiến độ lò. */
  tick(tickNo: number): void {
    for (const s of [...this.sessions.values()]) {
      for (const v of [...s.viewers]) {
        const far = s.positions.every((q) => v.distTo(q.x, q.y, q.z) > NET.CONTAINER_RANGE);
        if (far || v.dead) {
          this.close(v);
          v.send({ t: "close" });
        }
      }
      if (s.furnace && tickNo % NET.FURNACE_SYNC_TICKS === 0 && this.sessions.has(s.key)) {
        this.sendFurnace(s);
        for (const v of s.viewers) v.invDirty = true;
      }
    }
  }

  private sendFurnace(s: ContainerSession): void {
    const f = s.furnace!;
    for (const v of s.viewers) v.send({ t: "furnace", burnLeft: f.burnLeft, burnMax: f.burnMax, cook: f.cook });
  }
}
