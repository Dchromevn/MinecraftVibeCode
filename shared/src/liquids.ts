// Chất lỏng chảy (DESIGN.md 2.10; MECHANICS.md 10). Dữ liệu phụ: bit 0–2 mức (0 = nguồn), bit 3 đang rơi.
// "Lượng" 1..8: nguồn và cột đang rơi = 8, ô chảy mức L = 8 − L. Mỗi bước lan ngang mất DROP lượng
// (nước 1 → lan 7 ô, dung nham 2 → lan 3 ô). Cập nhật theo hàng đợi tick (nước 5 tick, dung nham 30 tick).
import { B, BLOCKS } from "./blocks.js";
import { HDX, HDZ, liquidFalling, liquidLevel } from "./blockMeta.js";
import { LIQUIDS } from "./tickConstants.js";

export interface LiquidWorld {
  /** id | dữ liệu phụ << 8; âm = chunk chưa tải (coi như chặn). */
  getCell(x: number, y: number, z: number): number;
  setCell(x: number, y: number, z: number, id: number, meta: number): void;
  /** Block bị chất lỏng cuốn trôi rơi ra vật phẩm. */
  drop(id: number, meta: number, x: number, y: number, z: number): void;
}

interface Fluid {
  id: number;
  drop: number; // lượng mất mỗi ô lan ngang
  delay: number; // tick giữa hai bước chảy
  search: number; // tìm chỗ trũng trong bao nhiêu ô
  infinite: boolean; // hai nguồn kề nhau tạo nguồn mới
}
const FLUIDS = new Map<number, Fluid>([
  [B.WATER, { id: B.WATER, ...LIQUIDS.WATER }],
  [B.LAVA, { id: B.LAVA, ...LIQUIDS.LAVA }],
]);
const FALLING = 8;

/** Block bị chất lỏng cuốn trôi (rơi ra vật phẩm) — MECHANICS.md 10. */
const BREAKS = new Set<number>([
  B.TORCH, B.TALLGRASS, B.RAIL, B.SAPLING, B.WHEAT, B.CARROTS, B.POTATOES, B.BEETROOTS, B.MELON_STEM, B.PUMPKIN_STEM,
]);
export const liquidBreaks = (id: number): boolean => BREAKS.has(id);
export const isLiquidId = (id: number): boolean => FLUIDS.has(id);

const same = (c: number, f: Fluid): boolean => c >= 0 && (c & 255) === f.id;
const isSource = (c: number, f: Fluid): boolean => same(c, f) && ((c >> 8) & 15) === 0;
/** Lượng chất lỏng loại f trong ô (0 = không có). */
function amount(c: number, f: Fluid): number {
  if (!same(c, f)) return 0;
  const m = c >> 8;
  return liquidFalling(m) || liquidLevel(m) === 0 ? 8 : 8 - liquidLevel(m);
}
/** Ô chất lỏng chảy qua được khi tìm đường (trống, bị cuốn, hoặc cùng loại đang chảy). */
function passable(c: number, f: Fluid): boolean {
  if (c < 0) return false;
  const id = c & 255;
  return id === B.AIR || BREAKS.has(id) || (id === f.id && !isSource(c, f));
}

// khóa số cho tọa độ (|x|, |z| < 2^20, y < 128)
const OFF = 1 << 20, ZS = 1 << 21;
const keyOf = (x: number, y: number, z: number): number => ((x + OFF) * ZS + (z + OFF)) * 128 + y;
function unkey(k: number): [number, number, number] {
  const y = k % 128, r = (k - y) / 128, zz = r % ZS;
  return [(r - zz) / ZS - OFF, y, zz - OFF];
}
const AROUND: readonly (readonly [number, number, number])[] = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export class LiquidSim {
  private now = 0;
  private readonly due = new Map<number, number[]>(); // tick → các ô đến hạn
  private readonly at = new Map<number, number>(); // ô → tick đến hạn

  constructor(private readonly w: LiquidWorld) {}

  /** Số ô đang chờ cập nhật. */
  get pending(): number {
    return this.at.size;
  }

  private schedule(x: number, y: number, z: number, delay: number): void {
    const k = keyOf(x, y, z), t = this.now + delay;
    const cur = this.at.get(k);
    if (cur !== undefined && cur <= t) return;
    this.at.set(k, t);
    const list = this.due.get(t);
    if (list) list.push(k);
    else this.due.set(t, [k]);
  }

  /** Ô (x, y, z) vừa đổi (đặt / phá block, chất lỏng đổi mức): hẹn cập nhật chất lỏng ở đó và xung quanh. */
  notify(x: number, y: number, z: number): void {
    for (const [dx, dy, dz] of AROUND) {
      const c = this.w.getCell(x + dx, y + dy, z + dz);
      const f = c > 0 ? FLUIDS.get(c & 255) : undefined;
      if (!f) continue;
      if (f.id === B.LAVA && this.lavaMeetsWater(x + dx, y + dy, z + dz, c)) continue;
      this.schedule(x + dx, y + dy, z + dz, f.delay);
    }
  }

  /** Chunk vừa tải: ô chất lỏng có ô kề ngang / bên dưới còn chỗ chảy thì cho chảy (mạch nước sinh sẵn). */
  scanChunk(cx: number, cz: number, data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      const f = FLUIDS.get(data[i]!);
      if (!f) continue;
      const x = cx * 16 + (i & 15), z = cz * 16 + ((i >> 4) & 15), y = i >> 8;
      const open = (dx: number, dy: number, dz: number): boolean => {
        const c = this.w.getCell(x + dx, y + dy, z + dz);
        return c >= 0 && ((c & 255) === B.AIR || BREAKS.has(c & 255) || (f.id === B.LAVA && (c & 255) === B.WATER));
      };
      if ((y > 0 && open(0, -1, 0)) || open(1, 0, 0) || open(-1, 0, 0) || open(0, 0, 1) || open(0, 0, -1)) this.schedule(x, y, z, f.delay);
    }
  }

  /** Một tick: xử lý các ô đến hạn (tối đa max ô, phần còn lại dời sang tick sau). */
  step(max: number): number {
    this.now++;
    const list = this.due.get(this.now);
    if (!list) return 0;
    this.due.delete(this.now);
    let n = 0;
    for (const k of list) {
      if (this.at.get(k) !== this.now) continue;
      this.at.delete(k);
      const [x, y, z] = unkey(k);
      if (n >= max) {
        this.schedule(x, y, z, 1);
        continue;
      }
      this.update(x, y, z);
      n++;
    }
    return n;
  }

  private set(x: number, y: number, z: number, cell: number): void {
    this.w.setCell(x, y, z, cell & 255, cell >> 8);
    this.notify(x, y, z);
  }

  /** Dung nham chạm nước (trừ bên dưới): nguồn → đá vỏ chai, đang chảy → đá cuội. */
  private lavaMeetsWater(x: number, y: number, z: number, c: number): boolean {
    for (const [dx, dy, dz] of AROUND) {
      if (dy < 0 || !(dx || dy || dz)) continue;
      const n = this.w.getCell(x + dx, y + dy, z + dz);
      if (n < 0 || (n & 255) !== B.WATER) continue;
      this.set(x, y, z, isSource(c, FLUIDS.get(B.LAVA)!) ? B.OBSIDIAN : B.COBBLE);
      return true;
    }
    return false;
  }

  private update(x: number, y: number, z: number): void {
    const c = this.w.getCell(x, y, z);
    const f = c > 0 ? FLUIDS.get(c & 255) : undefined;
    if (!f) return;
    if (f.id === B.LAVA && this.lavaMeetsWater(x, y, z, c)) return;
    let cur = c;
    if (!isSource(c, f)) {
      const next = this.newState(x, y, z, f);
      if (next !== c) {
        this.set(x, y, z, next);
        if (next === B.AIR) return;
        cur = next;
      }
    }
    this.spread(x, y, z, f, cur);
  }

  /** Trạng thái mới của ô đang chảy theo các ô xung quanh (0 = cạn). */
  private newState(x: number, y: number, z: number, f: Fluid): number {
    if (same(this.w.getCell(x, y + 1, z), f)) return f.id | (FALLING << 8);
    let best = 0, sources = 0;
    for (let d = 0; d < 4; d++) {
      const n = this.w.getCell(x + HDX[d]!, y, z + HDZ[d]!);
      if (isSource(n, f)) sources++;
      best = Math.max(best, amount(n, f));
    }
    if (f.infinite && sources >= 2) {
      const below = this.w.getCell(x, y - 1, z);
      if (isSource(below, f) || (below > 0 && BLOCKS[below & 255]!.solid && !BLOCKS[below & 255]!.liquid)) return f.id;
    }
    const a = best - f.drop;
    return a > 0 ? f.id | ((8 - a) << 8) : B.AIR;
  }

  /** Chảy vào ô (nx, ny, nz) với ô mới cell được không. */
  private canEnter(n: number, f: Fluid, cell: number, down: boolean): boolean {
    if (n < 0) return false;
    const id = n & 255;
    if (id === B.AIR || BREAKS.has(id)) return true;
    if (down && f.id === B.LAVA && id === B.WATER) return true; // dung nham chảy xuống nước → đá
    return id === f.id && !isSource(n, f) && (amount(cell, f) > amount(n, f) || (down && !liquidFalling(n >> 8)));
  }

  private flowInto(x: number, y: number, z: number, f: Fluid, cell: number, old: number): void {
    const id = old & 255;
    if (f.id === B.LAVA && id === B.WATER) return this.set(x, y, z, B.STONE);
    if (BREAKS.has(id)) this.w.drop(id, old >> 8, x, y, z);
    this.set(x, y, z, cell);
  }

  private isHole(x: number, y: number, z: number, f: Fluid): boolean {
    if (y <= 0) return false;
    const below = this.w.getCell(x, y - 1, z);
    return passable(below, f) || same(below, f);
  }

  private spread(x: number, y: number, z: number, f: Fluid, cell: number): void {
    const below = y > 0 ? this.w.getCell(x, y - 1, z) : -1;
    const fall = f.id | (FALLING << 8);
    if (this.canEnter(below, f, fall, true)) return this.flowInto(x, y - 1, z, f, fall, below);
    // ô đang chảy nằm trên chất lỏng / chỗ trống thì không lan ngang (chỉ nguồn mới lan)
    if (!isSource(cell, f) && this.isHole(x, y, z, f)) return;
    const a = amount(cell, f) - f.drop;
    if (a <= 0) return;
    const next = f.id | ((8 - a) << 8);
    for (const d of this.directions(x, y, z, f)) {
      const nx = x + HDX[d]!, nz = z + HDZ[d]!;
      const n = this.w.getCell(nx, y, nz);
      if (this.canEnter(n, f, next, false)) this.flowInto(nx, y, nz, f, next, n);
    }
  }

  /**
   * Các hướng sẽ chảy: chỉ về chỗ trũng gần nhất trong phạm vi tìm; không có thì mọi hướng.
   * Ô cùng loại đang chảy cũng được tính khi chọn hướng (để không loang sang bên khi phía trước đã có nước).
   */
  private directions(x: number, y: number, z: number, f: Fluid): number[] {
    let best = Infinity;
    const out: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + HDX[d]!, nz = z + HDZ[d]!;
      if (!passable(this.w.getCell(nx, y, nz), f)) continue;
      const dist = this.isHole(nx, y, nz, f) ? 0 : this.slope(nx, y, nz, f, 1, d);
      if (dist < best) {
        best = dist;
        out.length = 0;
      }
      if (dist === best) out.push(d);
    }
    return out;
  }

  private slope(x: number, y: number, z: number, f: Fluid, depth: number, from: number): number {
    let best = 1000;
    for (let d = 0; d < 4; d++) {
      if (d === ((from + 2) & 3)) continue;
      const nx = x + HDX[d]!, nz = z + HDZ[d]!;
      if (!passable(this.w.getCell(nx, y, nz), f)) continue;
      if (this.isHole(nx, y, nz, f)) return depth;
      if (depth < f.search) best = Math.min(best, this.slope(nx, y, nz, f, depth + 1, d));
    }
    return best;
  }
}

/** Hướng dòng chảy ngang tại ô (x, y, z) (vectơ đơn vị hoặc 0): vật phẩm trôi theo. */
export function liquidFlow(getCell: (x: number, y: number, z: number) => number, x: number, y: number, z: number): [number, number] {
  const c = getCell(x, y, z);
  const f = c > 0 ? FLUIDS.get(c & 255) : undefined;
  if (!f) return [0, 0];
  const h = amount(c, f) / 9;
  let vx = 0, vz = 0;
  for (let d = 0; d < 4; d++) {
    const nx = x + HDX[d]!, nz = z + HDZ[d]!;
    const n = getCell(nx, y, nz);
    let diff = 0;
    if (same(n, f)) diff = h - amount(n, f) / 9;
    else if (n >= 0 && !BLOCKS[n & 255]!.solid) {
      const below = getCell(nx, y - 1, nz);
      if (same(below, f)) diff = h - (amount(below, f) / 9 - 8 / 9);
    }
    vx += HDX[d]! * diff;
    vz += HDZ[d]! * diff;
  }
  const len = Math.hypot(vx, vz);
  return len > 1e-6 ? [vx / len, vz / len] : [0, 0];
}
