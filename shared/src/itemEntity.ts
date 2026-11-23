// Vật phẩm nằm trên đất (MECHANICS.md 11): trọng lực, va chạm với block, hãm ngang, hút về
// người chơi trong tầm nhặt, gộp chồng khi nằm gần nhau, biến mất sau 5 phút; trôi theo dòng chất lỏng,
// nổi lên trong nước, cháy mất khi chạm dung nham (Giai đoạn 4c).
import { DROPPED, INVENTORY } from "./survivalConstants.js";
import { PLAYER } from "./constants.js";
import { moveBox, type CellReader } from "./collide.js";
import { canMerge, type ItemStack } from "./inventory.js";
import { itemDef } from "./items.js";
import { liquidFlow } from "./liquids.js";
import { LIQUIDS } from "./tickConstants.js";
import { B } from "./blocks.js";
import type { Rng } from "./rng.js";

export interface ItemEntity {
  id: number;
  stack: ItemStack;
  x: number; // giữa đáy
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  pickupDelay: number;
  onGround: boolean;
}

let nextId = 1;

export function createItemEntity(stack: ItemStack, x: number, y: number, z: number, vx = 0, vy = 0, vz = 0, delay: number = DROPPED.PICKUP_DELAY_S): ItemEntity {
  return { id: nextId++, stack, x, y, z, vx, vy, vz, age: 0, pickupDelay: delay, onGround: false };
}

/** Vật phẩm văng ra ngẫu nhiên khi phá block ở ô (bx, by, bz). */
export function popFromBlock(stack: ItemStack, bx: number, by: number, bz: number, rng: Rng): ItemEntity {
  const a = rng() * Math.PI * 2, sp = DROPPED.POP_SPEED * (0.3 + rng() * 0.7);
  return createItemEntity(stack, bx + 0.5, by + 0.25, bz + 0.5, Math.cos(a) * sp * 0.5, DROPPED.POP_SPEED, Math.sin(a) * sp * 0.5);
}

/** Khoảng cách từ vật phẩm tới điểm gần nhất trên thân người chơi (chân ở p). */
export function distToPlayer(e: ItemEntity, p: { x: number; y: number; z: number }): number {
  const hw = PLAYER.WIDTH / 2, cy = e.y + DROPPED.SIZE / 2;
  const dx = Math.max(0, Math.abs(e.x - p.x) - hw), dz = Math.max(0, Math.abs(e.z - p.z) - hw);
  const dy = cy < p.y ? p.y - cy : cy > p.y + PLAYER.HEIGHT ? cy - p.y - PLAYER.HEIGHT : 0;
  return Math.hypot(dx, dy, dz);
}

/** Tiến dt giây. player: chân người chơi (null = không hút); trả về false khi hết hạn. */
export function stepItem(e: ItemEntity, dt: number, cell: CellReader, player: { x: number; y: number; z: number } | null): boolean {
  e.age += dt;
  if (e.age >= DROPPED.LIFETIME_S) return false;
  e.pickupDelay = Math.max(0, e.pickupDelay - dt);
  if (cell(Math.floor(e.x), Math.max(0, Math.floor(e.y)), Math.floor(e.z)) < 0) return true; // chunk chưa tải: đứng yên
  if (player && e.pickupDelay === 0 && distToPlayer(e, player) < DROPPED.PICKUP_RADIUS) {
    const dx = player.x - e.x, dy = player.y + PLAYER.HEIGHT / 2 - e.y, dz = player.z - e.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > 1e-6) {
      // bay thẳng về người chơi (không va chạm, như bị hút)
      const s = Math.min(d, DROPPED.ATTRACT_SPEED * dt) / d;
      e.x += dx * s; e.y += dy * s; e.z += dz * s;
      return true;
    }
  }
  // trong chất lỏng: bị dòng chảy đẩy ngang; trong nước thì nổi dần lên
  const bx = Math.floor(e.x), by = Math.floor(e.y + DROPPED.SIZE / 2), bz = Math.floor(e.z);
  const here = cell(bx, by, bz) & 255;
  if (here === B.LAVA && !itemDef(e.stack.item)?.fireproof) return false; // rơi vào dung nham: cháy mất ((10d2) đồ netherite thì nổi)
  const inWater = here === B.WATER || here === B.LAVA;
  if (here === B.WATER) {
    const [fx, fz] = liquidFlow(cell, bx, by, bz);
    e.vx += fx * LIQUIDS.ITEM_FLOW_ACCEL * dt;
    e.vz += fz * LIQUIDS.ITEM_FLOW_ACCEL * dt;
    const sp = Math.hypot(e.vx, e.vz);
    if (sp > LIQUIDS.ITEM_FLOW_MAX) {
      e.vx *= LIQUIDS.ITEM_FLOW_MAX / sp;
      e.vz *= LIQUIDS.ITEM_FLOW_MAX / sp;
    }
  }
  if (inWater) e.vy += (LIQUIDS.ITEM_FLOAT_SPEED - e.vy) * Math.min(1, 4 * dt);
  else e.vy = Math.max(e.vy - DROPPED.GRAVITY * dt, -PLAYER.TERMINAL_VELOCITY);
  const k = Math.max(0, 1 - DROPPED.DRAG * dt * (e.onGround && !inWater ? 3 : 1));
  e.vx *= k;
  e.vz *= k;
  const h = DROPPED.SIZE / 2;
  const box = [e.x - h, e.y, e.z - h, e.x + h, e.y + DROPPED.SIZE, e.z + h];
  const r = moveBox(cell, box, e.vx * dt, e.vy * dt, e.vz * dt, { step: 0, edgeDrop: 0 });
  e.x = (box[0]! + box[3]!) / 2;
  e.y = box[1]!;
  e.z = (box[2]! + box[5]!) / 2;
  if (r.hitX) e.vx = 0;
  if (r.hitZ) e.vz = 0;
  if (r.landed || r.hitCeiling) e.vy = 0;
  e.onGround = r.landed;
  return true;
}

/** Gộp b vào a nếu cùng loại và nằm gần nhau; trả về true nếu b đã hết. */
export function tryMergeItems(a: ItemEntity, b: ItemEntity): boolean {
  if (!canMerge(a.stack, b.stack)) return false;
  if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > DROPPED.MERGE_RADIUS) return false;
  const max = itemDef(a.stack.item)?.maxStack ?? INVENTORY.MAX_STACK;
  const n = Math.min(b.stack.count, max - a.stack.count);
  if (n <= 0) return false;
  a.stack.count += n;
  b.stack.count -= n;
  a.age = Math.min(a.age, b.age);
  return b.stack.count === 0;
}

/** Người chơi (chân ở p) chạm được vật phẩm để nhặt chưa. */
export function canPickup(e: ItemEntity, p: { x: number; y: number; z: number }): boolean {
  return e.pickupDelay === 0 && distToPlayer(e, p) < 0.3;
}
