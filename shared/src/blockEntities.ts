// Dữ liệu riêng của rương và lò nung theo vị trí block (DESIGN.md 2.2, Giai đoạn 4b). Giữ trong
// bộ nhớ cả khi chunk bị gỡ; Giai đoạn 5 server lưu xuống đĩa. Rương sinh sẵn (hầm mỏ) chưa có dữ
// liệu thì lần đầu mở / phá sẽ sinh đồ theo seed + vị trí.
import { CONTAINERS, FURNACE, INVENTORY, MINESHAFT_LOOT } from "./constants.js";
import { B } from "./blocks.js";
import { hashInts, mulberry32, randInt } from "./rng.js";
import { itemDef } from "./items.js";
import type { ItemStack, Slot } from "./inventory.js";
import { fuelValue, smeltResult } from "./smelting.js";

export interface ChestEntity {
  kind: "chest";
  x: number; y: number; z: number;
  slots: Slot[];
}

export interface FurnaceEntity {
  kind: "furnace";
  x: number; y: number; z: number;
  slots: Slot[]; // 0 nguyên liệu, 1 nhiên liệu, 2 thành phẩm
  burnLeft: number; // giây cháy còn lại
  burnMax: number;
  cook: number; // giây đã nung món hiện tại
}

export type BlockEntity = ChestEntity | FurnaceEntity;

const maxOf = (item: string): number => itemDef(item)?.maxStack ?? INVENTORY.MAX_STACK;

/** Đồ rương hầm mỏ, xác định theo seed + vị trí. */
export function mineshaftLoot(seed: number, x: number, y: number, z: number): Slot[] {
  const slots: Slot[] = new Array<Slot>(CONTAINERS.CHEST_SLOTS).fill(null);
  const rng = mulberry32(hashInts(seed, x, y, z, CONTAINERS.LOOT_SALT));
  const total = MINESHAFT_LOOT.ENTRIES.reduce((n, e) => n + e.weight, 0);
  const rolls = randInt(rng, MINESHAFT_LOOT.ROLLS_MIN, MINESHAFT_LOOT.ROLLS_MAX);
  for (let r = 0; r < rolls; r++) {
    let pick = rng() * total;
    const e = MINESHAFT_LOOT.ENTRIES.find((en) => (pick -= en.weight) < 0) ?? MINESHAFT_LOOT.ENTRIES[0]!;
    const count = randInt(rng, e.min, e.max);
    let i = randInt(rng, 0, slots.length - 1);
    for (let k = 0; k < slots.length && slots[i]; k++) i = (i + 1) % slots.length;
    if (!slots[i]) slots[i] = { item: e.item, count, damage: 0 };
  }
  return slots;
}

export class BlockEntities {
  private readonly map = new Map<string, BlockEntity>();

  constructor(private readonly seed: number) {}

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  get(x: number, y: number, z: number): BlockEntity | undefined {
    return this.map.get(this.key(x, y, z));
  }

  /** Người chơi vừa đặt rương / lò: tạo dữ liệu trống (rương đặt tay không có đồ hầm mỏ). */
  placed(x: number, y: number, z: number, id: number): void {
    if (id === B.CHEST) this.map.set(this.key(x, y, z), { kind: "chest", x, y, z, slots: new Array<Slot>(CONTAINERS.CHEST_SLOTS).fill(null) });
    else if (id === B.FURNACE)
      this.map.set(this.key(x, y, z), { kind: "furnace", x, y, z, slots: [null, null, null], burnLeft: 0, burnMax: 0, cook: 0 });
  }

  /** Dữ liệu của rương / lò tại ô (tạo nếu chưa có; rương sinh sẵn thì sinh đồ hầm mỏ). */
  obtain(x: number, y: number, z: number, id: number): BlockEntity | null {
    const k = this.key(x, y, z);
    let e = this.map.get(k);
    if (e) return e;
    if (id === B.CHEST) e = { kind: "chest", x, y, z, slots: mineshaftLoot(this.seed, x, y, z) };
    else if (id === B.FURNACE) e = { kind: "furnace", x, y, z, slots: [null, null, null], burnLeft: 0, burnMax: 0, cook: 0 };
    else return null;
    this.map.set(k, e);
    return e;
  }

  /** Block bị phá: lấy hết đồ bên trong ra (để rơi) và xóa dữ liệu. */
  remove(x: number, y: number, z: number, id: number): ItemStack[] {
    const e = this.obtain(x, y, z, id);
    this.map.delete(this.key(x, y, z));
    return e ? (e.slots.filter(Boolean) as ItemStack[]) : [];
  }

  /** Chạy mọi lò nung dt giây; báo khi trạng thái cháy đổi (để đổi dữ liệu phụ / ánh sáng). */
  tickFurnaces(dt: number, onLit: (e: FurnaceEntity, lit: boolean) => void): void {
    for (const e of this.map.values()) {
      if (e.kind !== "furnace") continue;
      const was = e.burnLeft > 0;
      stepFurnace(e, dt);
      const lit = e.burnLeft > 0;
      if (lit !== was) onLit(e, lit);
    }
  }
}

/** Một bước lò nung: đốt nhiên liệu khi cần, tiến độ nung, ra thành phẩm. */
export function stepFurnace(e: FurnaceEntity, dt: number): void {
  const [input, fuel] = e.slots;
  const out = e.slots[2];
  const res = input ? smeltResult(input.item) : null;
  const canSmelt = !!res && (!out || (out.item === res && out.count < maxOf(res)));
  if (e.burnLeft <= 0 && canSmelt && fuel && fuelValue(fuel.item) > 0) {
    e.burnMax = e.burnLeft = fuelValue(fuel.item) * FURNACE.SMELT_TIME_S;
    fuel.count--;
    if (fuel.count === 0) e.slots[1] = null;
  }
  const lit = e.burnLeft > 0;
  if (lit) e.burnLeft = Math.max(0, e.burnLeft - dt);
  if (lit && canSmelt) {
    e.cook += dt;
    if (e.cook >= FURNACE.SMELT_TIME_S) {
      e.cook -= FURNACE.SMELT_TIME_S;
      input!.count--;
      if (input!.count === 0) e.slots[0] = null;
      if (out) out.count++;
      else e.slots[2] = { item: res!, count: 1, damage: 0 };
    }
  } else if (!canSmelt) e.cook = 0;
  else e.cook = Math.max(0, e.cook - 2 * dt); // tắt lửa giữa chừng: tiến độ lùi dần
}
