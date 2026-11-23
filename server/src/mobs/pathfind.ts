// Tìm đường A* trên lưới block (Giai đoạn 7a; PLAN Giai đoạn 7 "HỆ THỐNG THỰC THỂ"): đi ngang 8 hướng, bước / nhảy lên
// 1 block, nhảy xuống tối đa MOB_AI.PATH_MAX_DROP block, tránh dung nham / lửa / xương rồng, nước đi được nhưng tốn hơn.
// Giới hạn số nút mỗi lần tìm; không tới được đích thì trả đường tới nút gần đích nhất (đuổi theo vẫn tiến lại gần).
import { B, MOB_AI, collisionBoxes, type CellReader } from "../../../shared/src/index.js";
import type { PathNode } from "./mob.js";

const DANGER = new Set<number>([B.LAVA, B.FIRE, B.CACTUS, B.SOUL_FIRE]);

/** Ô đi xuyên qua được: không có hộp va chạm (hoặc chỉ thấp như thảm), không nguy hiểm. */
function passable(cell: CellReader, x: number, y: number, z: number): boolean {
  const c = cell(x, y, z);
  if (c < 0 || DANGER.has(c & 255)) return false;
  if (c === 0) return true;
  const idAt = (a: number, b: number, d: number): number => Math.max(0, cell(a, b, d)) & 255;
  return collisionBoxes(c, x, y, z, idAt).every((b) => b[4]! <= 0.2); // thảm, tuyết mỏng
}

/** Có thể đứng ở ô (x, y, z): bên dưới có chỗ đặt chân (không phải rào / tường cao 1.5) hoặc là nước. */
function floor(cell: CellReader, x: number, y: number, z: number): boolean {
  const here = cell(x, y, z);
  if (here >= 0 && (here & 255) === B.WATER) return true;
  const c = cell(x, y - 1, z);
  if (c <= 0) return false;
  const id = c & 255;
  if (id === B.WATER) return true;
  if (DANGER.has(id)) return false;
  const idAt = (a: number, b: number, d: number): number => Math.max(0, cell(a, b, d)) & 255;
  const boxes = collisionBoxes(c, x, y - 1, z, idAt);
  return boxes.length > 0 && boxes.every((b) => b[4]! <= 1);
}

/** Hàng đợi ưu tiên (heap nhỏ nhất theo f). */
class Heap {
  private readonly k: number[] = [];
  private readonly f: number[] = [];
  get size(): number { return this.k.length; }
  push(key: number, f: number): void {
    const k = this.k, fs = this.f;
    let i = k.length;
    k.push(key);
    fs.push(f);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fs[p]! <= f) break;
      k[i] = k[p]!;
      fs[i] = fs[p]!;
      i = p;
    }
    k[i] = key;
    fs[i] = f;
  }
  pop(): number {
    const k = this.k, fs = this.f, top = k[0]!, lk = k.pop()!, lf = fs.pop()!;
    if (!k.length) return top;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i, mf = lf;
      if (l < k.length && fs[l]! < mf) { m = l; mf = fs[l]!; }
      if (r < k.length && fs[r]! < mf) { m = r; mf = fs[r]!; }
      if (m === i) break;
      k[i] = k[m]!;
      fs[i] = fs[m]!;
      i = m;
    }
    k[i] = lk;
    fs[i] = lf;
    return top;
  }
}

const key = (x: number, y: number, z: number): number => ((x & 0x3ff) << 20) | ((y & 0xff) << 12) | (z & 0xfff);

export class PathFinder {
  /** Số nút còn được duyệt trong tick này (chia cho mọi sinh vật). */
  budget: number = MOB_AI.PATH_BUDGET_PER_TICK;

  constructor(private readonly cell: CellReader) {}

  newTick(): void {
    this.budget = MOB_AI.PATH_BUDGET_PER_TICK;
  }

  /** Ô (x, y, z) đủ chỗ cho sinh vật cao `cells` ô đứng không. */
  standable(x: number, y: number, z: number, cells: number): boolean {
    for (let i = 0; i < cells; i++) if (!passable(this.cell, x, y + i, z)) return false;
    return floor(this.cell, x, y, z);
  }

  /** Ô đứng gần nhất theo chiều dọc quanh (x, y, z) (tìm lên 1, xuống tới 4), hoặc null. */
  ground(x: number, y: number, z: number, cells: number): number | null {
    for (const dy of [0, 1, -1, -2, -3, -4]) if (this.standable(x, y + dy, z, cells)) return y + dy;
    return null;
  }

  /** Đường từ ô `from` tới ô `to` (không gồm ô xuất phát); null nếu hết ngân sách trước khi đi được bước nào. */
  find(from: PathNode, to: PathNode, cells: number, maxNodes: number = MOB_AI.PATH_MAX_NODES): PathNode[] | null {
    if (this.budget <= 0) return null;
    const open = new Heap(), closed = new Set<number>();
    const g = new Map<number, number>(), prev = new Map<number, number>(), pos = new Map<number, PathNode>();
    const h = (n: PathNode): number => Math.hypot(n.x - to.x, (n.y - to.y) * 1.5, n.z - to.z);
    const k0 = key(from.x, from.y, from.z);
    g.set(k0, 0);
    pos.set(k0, from);
    open.push(k0, h(from));
    let best = k0, bestH = h(from), n = 0;
    const limit = Math.min(maxNodes, this.budget);
    while (open.size && n < limit) {
      const ck = open.pop();
      if (closed.has(ck)) continue; // bản cũ trong hàng đợi (đã có đường ngắn hơn)
      closed.add(ck);
      const p = pos.get(ck)!, gc = g.get(ck)!;
      n++;
      const hc = h(p);
      if (hc < bestH) {
        bestH = hc;
        best = ck;
      }
      if (p.x === to.x && p.z === to.z && Math.abs(p.y - to.y) <= 1) {
        best = ck;
        break;
      }
      for (const nb of this.neighbors(p, cells)) {
        const nk = key(nb.x, nb.y, nb.z);
        const ng = gc + nb.cost;
        if (ng >= (g.get(nk) ?? Infinity)) continue;
        g.set(nk, ng);
        prev.set(nk, ck);
        pos.set(nk, nb);
        open.push(nk, ng + h(nb));
      }
    }
    this.budget -= n;
    if (best === k0) return [];
    const out: PathNode[] = [];
    for (let k: number | undefined = best; k !== undefined && k !== k0; k = prev.get(k)) out.push(pos.get(k)!);
    return out.reverse();
  }

  private neighbors(p: PathNode, cells: number): (PathNode & { cost: number })[] {
    const out: (PathNode & { cost: number })[] = [];
    const water = (x: number, y: number, z: number): boolean => (this.cell(x, y, z) & 255) === B.WATER;
    const straight: boolean[] = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
    dirs.forEach(([dx, dz], i) => {
      const x = p.x + dx, z = p.z + dz;
      if (i >= 4) {
        // đi chéo: hai ô thẳng bên cạnh phải đi được (không cắt góc tường)
        const a = [0, 1, 2, 3].find((j) => dirs[j]![0] === dx && dirs[j]![1] === 0)!;
        const b = [0, 1, 2, 3].find((j) => dirs[j]![0] === 0 && dirs[j]![1] === dz)!;
        if (!straight[a] || !straight[b]) return;
        if (this.standable(x, p.y, z, cells)) out.push({ x, y: p.y, z, cost: Math.SQRT2 * (water(x, p.y, z) ? 3 : 1) });
        return;
      }
      if (this.standable(x, p.y, z, cells)) {
        straight[i] = true;
        out.push({ x, y: p.y, z, cost: water(x, p.y, z) ? 3 : 1 });
        return;
      }
      // nhảy lên 1 block: cần chỗ trống trên đầu ở ô hiện tại
      if (passable(this.cell, p.x, p.y + cells, p.z) && this.standable(x, p.y + 1, z, cells)) {
        out.push({ x, y: p.y + 1, z, cost: 2 });
        return;
      }
      // nhảy xuống: đi ngang ra mép (cột bên cạnh trống đủ cao) rồi rơi tới chỗ đứng đầu tiên
      for (let i = 0; i < cells; i++) if (!passable(this.cell, x, p.y + i, z)) return;
      for (let d = 1; d <= MOB_AI.PATH_MAX_DROP; d++) {
        if (this.standable(x, p.y - d, z, cells)) {
          out.push({ x, y: p.y - d, z, cost: 1 + d * 0.5 });
          break;
        }
        if (!passable(this.cell, x, p.y - d, z)) break;
      }
    });
    return out;
  }
}
