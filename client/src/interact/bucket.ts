// Xô (Giai đoạn 4c): xô rỗng múc nguồn nước / dung nham đang nhắm; xô đầy đổ một nguồn vào ô cạnh
// mặt nhắm (hoặc chính ô nhắm nếu thay được: không khí, chất lỏng, cỏ cao, tuyết phủ).
import * as THREE from "three";
import {
  B, isLiquidId, isReplaceable, itemDef, raycast, stack, type BlockAccess, type Dropped, type RayHit, type World,
} from "../../../shared/src/index.js";
import type { InteractView } from "./interaction.js";

export interface BucketContext {
  world: World;
  acc: BlockAccess;
  view: InteractView;
  dir: THREE.Vector3; // hướng nhìn (đã chuẩn hóa)
  target: RayHit | null; // block đang nhắm (không tính chất lỏng)
  reach: number;
  spawnDrops: (d: Dropped[]) => void;
}

/** Dùng xô đang cầm; trả về true nếu đã múc / đổ. */
export function useBucket(item: string, c: BucketContext): boolean {
  const p = c.view.camera.position;
  if (item === "bucket") {
    const t = raycast((x, y, z) => c.world.getCell(x, y, z), p.x, p.y, p.z, c.dir.x, c.dir.y, c.dir.z, c.reach, true);
    const id = t ? t.cell & 255 : 0;
    if (!t || !isLiquidId(id) || ((t.cell >> 8) & 15) !== 0) return false;
    c.acc.setCell(t.x, t.y, t.z, B.AIR, 0);
    swapHeld(c, id === B.WATER ? "water_bucket" : "lava_bucket");
    return true;
  }
  const t = c.target;
  const liquid = itemDef(item)?.liquid;
  if (!t || liquid === undefined) return false;
  const into = isReplaceable(t.cell & 255);
  const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
  const cur = c.world.getCell(x, y, z);
  if (cur < 0 || y < 1 || y > 127 || !isReplaceable(cur & 255)) return false;
  // cỏ cao / tuyết phủ bị thay: rơi đồ như bị phá
  if (cur > 0 && !isLiquidId(cur & 255)) c.spawnDrops([{ id: cur & 255, meta: cur >> 8, forced: true, x, y, z }]);
  c.acc.setCell(x, y, z, liquid, 0);
  swapHeld(c, "bucket");
  return true;
}

/** Đổi 1 xô đang cầm thành món khác (chồng chỉ có 1 thì đổi tại chỗ; không thì cho vào túi, đầy thì vứt ra). */
function swapHeld(c: BucketContext, key: string): void {
  const inv = c.view.inv;
  if ((inv.held?.count ?? 0) <= 1) {
    inv.main[inv.selected] = stack(key);
    return;
  }
  inv.takeHeld(1);
  const left = inv.add(stack(key));
  if (left) c.view.items.throw(left, c.view.camera.position, c.dir);
}
