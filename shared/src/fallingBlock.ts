// Block chịu trọng lực đang rơi (cát, sỏi): rơi theo cột, chạm block có va chạm thì
// nằm xuống ô đó. Block không va chạm ở ô đáp (đuốc, cỏ cao...) bị đè thì rơi ra.
import { B } from "./blocks.js";
import { PLAYER } from "./constants.js";
import { canFallInto, type BlockAccess, type Dropped } from "./blockRules.js";

export interface FallingBlock {
  x: number; // cột (số nguyên)
  z: number;
  y: number; // đáy khối (số thực)
  vy: number;
  id: number;
  meta: number;
}

export function createFalling(x: number, y: number, z: number, id: number, meta: number): FallingBlock {
  return { x, y, z, vy: 0, id, meta };
}

export type FallResult =
  | { kind: "falling" }
  | { kind: "landed"; y: number; dropped: Dropped[] }
  | { kind: "lost" }; // ra ngoài thế giới / chunk chưa tải

/** Tiến dt giây. Khi đáp: ghi block vào ô đáp (đè block không va chạm ở đó). */
export function stepFalling(f: FallingBlock, dt: number, acc: BlockAccess): FallResult {
  const idAt = (y: number): number => {
    const c = acc.getCell(f.x, y, f.z);
    return c < 0 ? -1 : c & 255;
  };
  f.vy = Math.max(f.vy - PLAYER.GRAVITY * dt, -PLAYER.TERMINAL_VELOCITY);
  const target = f.y + f.vy * dt;
  // đi xuống từng ô: dừng ở ô đầu tiên mà bên dưới có va chạm
  const land = (cy: number): FallResult => {
    const here = idAt(cy);
    if (here < 0 || !canFallInto(here)) return { kind: "lost" };
    const dropped: Dropped[] = [];
    if (here > 0 && here !== B.WATER && here !== B.LAVA) dropped.push({ id: here, x: f.x, y: cy, z: f.z });
    acc.setCell(f.x, cy, f.z, f.id, f.meta);
    f.y = cy;
    return { kind: "landed", y: cy, dropped };
  };
  for (let cy = Math.floor(f.y); cy >= Math.floor(target); cy--) {
    if (cy < 1) return { kind: "lost" };
    // ô hiện tại đã bị lấp (khối khác vừa đáp): nằm lên trên nó
    const cur = idAt(cy);
    if (cur < 0) return { kind: "lost" };
    if (!canFallInto(cur)) return land(cy + 1);
    const below = idAt(cy - 1);
    if (below < 0) return { kind: "lost" };
    if (canFallInto(below) || target >= cy) continue;
    return land(cy);
  }
  f.y = target;
  return { kind: "falling" };
}
