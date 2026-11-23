// Giai đoạn 10d2 (Minecraft Java): mỏ neo hồi sinh — chuột phải bằng khối đá phát sáng thì nạp (tối đa 4); đã nạp mà chuột phải ở Vực
// Lửa thì đặt điểm hồi sinh ở đó, ở thế giới chính thì nổ (sức 5, có lửa); chết thì hồi sinh cạnh mỏ neo ở Vực Lửa và mất 1 lần nạp (hết
// nạp / mỏ neo mất: về điểm của thế giới). Đá nam châm — chuột phải bằng la bàn: thành la bàn đá nam châm chỉ về đá đó.
import { B, DIM, PLAYER, mobFits, playerHeight, stack, type ItemStack } from "../../shared/src/index.js";
import type { Explosions } from "./explosions.js";
import type { ServerPlayer } from "./player.js";
import type { ServerWorld } from "./serverWorld.js";

export const ANCHOR = { MAX_CHARGE: 4, POWER: 5 } as const;

/** Chuột phải mỏ neo hồi sinh / đá nam châm (cầm la bàn) ở (x, y, z) của cõi dim. */
export function useSpecialBlock(p: ServerPlayer, x: number, y: number, z: number, cell: number, dim: number, w: ServerWorld, ex: Explosions,
  drop: (s: ItemStack) => void): void {
  const id = cell & 255, held = p.inv.held, charge = (cell >> 8) & 7;
  if (id === B.LODESTONE) {
    if (held?.item !== "compass" && held?.item !== "lodestone_compass") return;
    const lc: ItemStack = { ...stack("lodestone_compass"), lode: [x, y, z, dim] };
    if (held.item === "lodestone_compass" || held.count === 1) p.inv.main[p.inv.selected] = lc;
    else {
      held.count--;
      const left = p.inv.add(lc);
      if (left) drop(left); // túi đầy: rơi ra đất
    }
    p.invDirty = true;
    return;
  }
  if (id !== B.RESPAWN_ANCHOR) return;
  if (held?.item === "glowstone" && charge < ANCHOR.MAX_CHARGE) {
    w.setCell(x, y, z, B.RESPAWN_ANCHOR, charge + 1);
    if (!(p.admin && p.flying)) p.inv.takeHeld(1);
    p.invDirty = true;
    return;
  }
  if (charge === 0) return;
  if (dim !== DIM.NETHER) { // ngoài Vực Lửa: nổ
    w.setCell(x, y, z, 0, 0);
    ex.explode(x + 0.5, y + 0.5, z + 0.5, ANCHOR.POWER, { by: "respawn_anchor", grief: true, fire: true });
    return;
  }
  const s = p.spawnPoint;
  if (s && s.x === x && s.y === y && s.z === z && s.dim === DIM.NETHER) return;
  p.spawnPoint = { x, y, z, dim: DIM.NETHER };
  p.send({ t: "chat", kind: "info", key: "anchorSet", args: [] });
}

/** Chỗ hồi sinh cạnh mỏ neo của p ở Vực Lửa (w); consume: mất 1 lần nạp. null = không có / hết nạp / mỏ neo mất (báo người chơi). */
export function anchorSpawn(p: ServerPlayer, w: ServerWorld, consume: boolean): { x: number; y: number; z: number } | null {
  const b = p.spawnPoint;
  if (!b || b.dim !== DIM.NETHER) return null;
  const c = w.cellLoading(b.x, b.y, b.z);
  if ((c & 255) !== B.RESPAWN_ANCHOR) {
    p.spawnPoint = null;
    if (consume) p.send({ t: "chat", kind: "error", key: "anchorMissing", args: [] });
    return null;
  }
  const charge = (c >> 8) & 7;
  if (charge === 0) {
    if (consume) p.send({ t: "chat", kind: "error", key: "anchorEmpty", args: [] });
    return null;
  }
  const cell = (x: number, y: number, z: number): number => w.getCell(x, y, z), h = playerHeight({ sneaking: false });
  let at: { x: number; y: number; z: number } | null = null;
  for (let r = 1; r <= 2 && !at; r++)
    for (let dz = -r; dz <= r && !at; dz++)
      for (let dx = -r; dx <= r && !at; dx++)
        for (const dy of [0, 1, -1]) {
          const x = b.x + dx, y = b.y + dy, z = b.z + dz, below = cell(x, y - 1, z);
          if (below <= 0 || (below & 255) === B.LAVA || (below & 255) === B.WATER) continue;
          if (mobFits(cell, PLAYER.WIDTH, h, x + 0.5, y, z + 0.5)) {
            at = { x: x + 0.5, y, z: z + 0.5 };
            break;
          }
        }
  at ??= { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5 }; // không có chỗ trống: đứng trên mỏ neo
  if (consume) w.setCell(b.x, b.y, b.z, B.RESPAWN_ANCHOR, charge - 1);
  return at;
}
