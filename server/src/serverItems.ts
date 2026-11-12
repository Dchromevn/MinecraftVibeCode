// Vật phẩm rơi phía server (logic /shared/itemEntity.ts): rơi, trôi theo nước, cháy trong dung nham,
// gộp chồng, hút về người chơi gần nhất còn chỗ trong túi, nhặt vào túi. Gửi cho từng người chơi
// chỉ những vật phẩm mới / đã đổi chỗ trong tầm nhìn.
import {
  DROPPED, INVENTORY, NET, canMerge, canPickup, createItemEntity, distToPlayer, itemDef, popFromBlock, stepItem, tryMergeItems,
  type Inventory, type ItemEntity, type ItemStack, type NetItem, type Rng,
} from "../../shared/src/index.js";
import type { ServerPlayer } from "./player.js";
import type { ServerWorld } from "./serverWorld.js";

function hasRoom(inv: Inventory, s: ItemStack): boolean {
  const max = itemDef(s.item)?.maxStack ?? INVENTORY.MAX_STACK;
  return inv.main.some((m) => !m || (canMerge(m, s) && m.count < max));
}

const round = (v: number): number => Math.round(v * 100) / 100;

export class ServerItems {
  readonly list: ItemEntity[] = [];

  constructor(private readonly w: ServerWorld, private readonly rng: Rng) {}

  /** Văng ra từ block bị phá ở ô (x, y, z). */
  pop(s: ItemStack, x: number, y: number, z: number): void {
    this.list.push(popFromBlock(s, x, y, z, this.rng));
  }

  /** Người chơi vứt ra theo hướng nhìn. */
  throwFrom(s: ItemStack, p: ServerPlayer): void {
    const [ex, ey, ez] = p.eye(), d = p.lookDir(), v = DROPPED.THROW_SPEED;
    this.list.push(createItemEntity(s, ex + d.x * 0.3, ey - 0.3, ez + d.z * 0.3, d.x * v, d.y * v + 2, d.z * v, DROPPED.THROW_PICKUP_DELAY_S));
  }

  /** Rải quanh một điểm (chết). */
  scatter(list: ItemStack[], x: number, y: number, z: number): void {
    for (const s of list) {
      const a = this.rng() * Math.PI * 2, sp = DROPPED.DEATH_SCATTER * this.rng();
      this.list.push(createItemEntity(s, x, y + 0.5, z, Math.cos(a) * sp, 3, Math.sin(a) * sp, DROPPED.THROW_PICKUP_DELAY_S));
    }
  }

  step(dt: number, players: readonly ServerPlayer[]): void {
    const cell = (x: number, y: number, z: number): number => this.w.getCell(x, y, z);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i]!;
      // người chơi gần nhất còn sống, còn chỗ cho món này
      let target: ServerPlayer | null = null, best = Infinity;
      for (const p of players) {
        if (p.dead || !hasRoom(p.inv, e.stack)) continue;
        const d = distToPlayer(e, p);
        if (d < best) {
          best = d;
          target = p;
        }
      }
      if (!stepItem(e, dt, cell, target)) {
        this.list.splice(i, 1);
        continue;
      }
      if (target && canPickup(e, target)) {
        const left = target.inv.add(e.stack);
        target.invDirty = true;
        if (!left) this.list.splice(i, 1);
        else e.stack = left;
      }
    }
    for (let i = 0; i < this.list.length; i++)
      for (let j = this.list.length - 1; j > i; j--) if (tryMergeItems(this.list[i]!, this.list[j]!)) this.list.splice(j, 1);
  }

  /** Gửi cho p các vật phẩm mới / đổi trong tầm nhìn và các vật phẩm đã biến mất. */
  sync(p: ServerPlayer): void {
    const up: NetItem[] = [], gone: number[] = [];
    const seen = new Set<number>();
    for (const e of this.list) {
      if (Math.hypot(e.x - p.x, e.z - p.z) > NET.ITEM_VIEW) continue;
      seen.add(e.id);
      const it: NetItem = [e.id, e.stack.item, e.stack.count, round(e.x), round(e.y), round(e.z)];
      const sig = it.slice(2).join(",");
      if (p.knownItems.get(e.id) === sig) continue;
      p.knownItems.set(e.id, sig);
      up.push(it);
    }
    for (const id of p.knownItems.keys())
      if (!seen.has(id)) {
        p.knownItems.delete(id);
        gone.push(id);
      }
    if (up.length || gone.length) p.send({ t: "items", up, gone });
  }
}
