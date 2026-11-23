// Lưới phòng của dinh thự rừng (Giai đoạn 8c) — chép theo thuật toán Minecraft (WoodlandMansionPieces.MansionGrid, đối chiếu
// bytecode trong client.jar): lưới 11 × 11 ô (mỗi ô 8 block), hành lang mọc đệ quy từ sảnh vào, quanh hành lang là phòng; gom
// phòng thành 1 × 1, 1 × 2, 2 × 2 cho tầng 1, 2; tầng 3 mọc từ cầu thang của một phòng 1 × 2 tầng 2.
// Hướng: 0 Nam (+y lưới = +z), 1 Tây, 2 Bắc, 3 Đông (như Minecraft from2DDataValue); 4 = lên (phòng bí mật không cửa).
import type { Rng } from "../rng.js";

export const CLEAR = 0, CORRIDOR = 1, ROOM = 2, START = 3, BLOCKED = 5;
export const R1X1 = 0x10000, R1X2 = 0x20000, R2X2 = 0x40000, R_ORIGIN = 0x100000, R_DOOR = 0x200000, R_STAIRS = 0x400000, R_CORRIDOR = 0x800000;
export const R_TYPE = 0xf0000, R_ID = 0xffff;
export const DX = [0, -1, 0, 1, 0], DZ = [1, 0, -1, 0, 0];
export const UP = 4;
export const cw = (d: number): number => (d + 1) & 3;
export const ccw = (d: number): number => (d + 3) & 3;
const opp = (d: number): number => (d + 2) & 3;
/** Thứ tự Direction.Plane.HORIZONTAL: Bắc, Đông, Nam, Tây. */
export const HORIZONTAL = [2, 3, 0, 1] as const;

export class Grid {
  private readonly g: Int32Array;
  constructor(readonly w: number, readonly h: number, private readonly outside: number) {
    this.g = new Int32Array(w * h);
  }
  get(x: number, y: number): number {
    return x >= 0 && x < this.w && y >= 0 && y < this.h ? this.g[y * this.w + x]! : this.outside;
  }
  set(x: number, y: number, v: number): void {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.g[y * this.w + x] = v;
  }
  rect(x0: number, y0: number, x1: number, y1: number, v: number): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, v);
  }
  setIf(x: number, y: number, ifV: number, v: number): void {
    if (this.get(x, y) === ifV) this.set(x, y, v);
  }
  edgesTo(x: number, y: number, v: number): boolean {
    return this.get(x - 1, y) === v || this.get(x + 1, y) === v || this.get(x, y + 1) === v || this.get(x, y - 1) === v;
  }
}

export const isHouse = (g: Grid, x: number, y: number): boolean => {
  const v = g.get(x, y);
  return v === 1 || v === 2 || v === 3 || v === 4;
};

export class MansionGrid {
  readonly entranceX = 7;
  readonly entranceY = 4;
  readonly base = new Grid(11, 11, BLOCKED);
  readonly third = new Grid(11, 11, BLOCKED);
  readonly rooms: [Grid, Grid, Grid] = [new Grid(11, 11, BLOCKED), new Grid(11, 11, BLOCKED), new Grid(11, 11, BLOCKED)];

  constructor(private readonly rng: Rng) {
    const b = this.base, ex = this.entranceX, ey = this.entranceY;
    b.rect(ex, ey, ex + 1, ey + 1, START);
    b.rect(ex - 1, ey, ex - 1, ey + 1, ROOM);
    b.rect(ex + 2, ey - 2, ex + 3, ey + 3, BLOCKED);
    b.rect(ex + 1, ey - 2, ex + 1, ey - 1, CORRIDOR);
    b.rect(ex + 1, ey + 2, ex + 1, ey + 3, CORRIDOR);
    b.set(ex - 1, ey - 1, CORRIDOR);
    b.set(ex - 1, ey + 2, CORRIDOR);
    b.rect(0, 0, 11, 1, BLOCKED);
    b.rect(0, 9, 11, 11, BLOCKED);
    this.corridor(b, ex, ey - 2, 1, 6);
    this.corridor(b, ex, ey + 3, 1, 6);
    this.corridor(b, ex - 2, ey - 1, 1, 3);
    this.corridor(b, ex - 2, ey + 2, 1, 3);
    while (this.cleanEdges(b));
    this.identifyRooms(b, this.rooms[0]);
    this.identifyRooms(b, this.rooms[1]);
    this.rooms[0].rect(ex + 1, ey, ex + 1, ey + 1, R_CORRIDOR);
    this.rooms[1].rect(ex + 1, ey, ex + 1, ey + 1, R_CORRIDOR);
    this.setupThirdFloor();
    this.identifyRooms(this.third, this.rooms[2]);
  }

  private bool(): boolean {
    return this.rng() < 0.5;
  }

  private int(n: number): number {
    return Math.floor(this.rng() * n);
  }

  isRoomId(x: number, y: number, floor: number, id: number): boolean {
    return (this.rooms[floor]!.get(x, y) & R_ID) === id;
  }

  /** Hướng sang ô còn lại của phòng 1 × 2. */
  roomDir1x2(x: number, y: number, floor: number, id: number): number | null {
    for (const d of HORIZONTAL) if (this.isRoomId(x + DX[d]!, y + DZ[d]!, floor, id)) return d;
    return null;
  }

  private corridor(g: Grid, x: number, y: number, dir: number, depth: number): void {
    if (depth <= 0) return;
    g.set(x, y, CORRIDOR);
    g.setIf(x + DX[dir]!, y + DZ[dir]!, CLEAR, CORRIDOR);
    for (let i = 0; i < 8; i++) {
      const d = this.int(4);
      if (d === opp(dir) || (d === 3 && this.bool())) continue;
      const j = x + DX[dir]!, k = y + DZ[dir]!;
      if (g.get(j + DX[d]!, k + DZ[d]!) === CLEAR && g.get(j + DX[d]! * 2, k + DZ[d]! * 2) === CLEAR) {
        this.corridor(g, j + DX[d]!, k + DZ[d]!, d, depth - 1);
        break;
      }
    }
    const a = cw(dir), c = ccw(dir);
    g.setIf(x + DX[a]!, y + DZ[a]!, CLEAR, ROOM);
    g.setIf(x + DX[c]!, y + DZ[c]!, CLEAR, ROOM);
    g.setIf(x + DX[dir]! + DX[a]!, y + DZ[dir]! + DZ[a]!, CLEAR, ROOM);
    g.setIf(x + DX[dir]! + DX[c]!, y + DZ[dir]! + DZ[c]!, CLEAR, ROOM);
    g.setIf(x + DX[dir]! * 2, y + DZ[dir]! * 2, CLEAR, ROOM);
    g.setIf(x + DX[a]! * 2, y + DZ[a]! * 2, CLEAR, ROOM);
    g.setIf(x + DX[c]! * 2, y + DZ[c]! * 2, CLEAR, ROOM);
  }

  private cleanEdges(g: Grid): boolean {
    let changed = false;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (g.get(x, y) !== CLEAR) continue;
        const n = +isHouse(g, x + 1, y) + +isHouse(g, x - 1, y) + +isHouse(g, x, y + 1) + +isHouse(g, x, y - 1);
        if (n >= 3) {
          g.set(x, y, ROOM);
          changed = true;
        } else if (n === 2) {
          const c = +isHouse(g, x + 1, y + 1) + +isHouse(g, x - 1, y + 1) + +isHouse(g, x + 1, y - 1) + +isHouse(g, x - 1, y - 1);
          if (c <= 1) {
            g.set(x, y, ROOM);
            changed = true;
          }
        }
      }
    return changed;
  }

  private setupThirdFloor(): void {
    const second = this.rooms[1], t = this.third, list: [number, number][] = [];
    for (let y = 0; y < t.h; y++)
      for (let x = 0; x < t.w; x++) {
        const v = second.get(x, y);
        if ((v & R_TYPE) === R1X2 && (v & R_DOOR) === R_DOOR) list.push([x, y]);
      }
    if (!list.length) return t.rect(0, 0, t.w, t.h, BLOCKED);
    const [sx, sy] = list[this.int(list.length)]!, old = second.get(sx, sy);
    second.set(sx, sy, old | R_STAIRS);
    const d = this.roomDir1x2(sx, sy, 1, old & R_ID)!, ox = sx + DX[d]!, oy = sy + DZ[d]!;
    for (let y = 0; y < t.h; y++)
      for (let x = 0; x < t.w; x++) {
        if (!isHouse(this.base, x, y)) t.set(x, y, BLOCKED);
        else if (x === sx && y === sy) t.set(x, y, START);
        else if (x === ox && y === oy) {
          t.set(x, y, START);
          this.rooms[2].set(x, y, R_CORRIDOR);
        }
      }
    const dirs = HORIZONTAL.filter((h) => t.get(ox + DX[h]!, oy + DZ[h]!) === CLEAR);
    if (!dirs.length) {
      t.rect(0, 0, t.w, t.h, BLOCKED);
      second.set(sx, sy, old);
      return;
    }
    const nd = dirs[this.int(dirs.length)]!;
    this.corridor(t, ox + DX[nd]!, oy + DZ[nd]!, nd, 4);
    while (this.cleanEdges(t));
  }

  private identifyRooms(g: Grid, rooms: Grid): void {
    const list: [number, number][] = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) === ROOM) list.push([x, y]);
    for (let i = list.length - 1; i > 0; i--) { // trộn như Util.shuffle
      const j = this.int(i + 1);
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    let id = 10;
    for (const [k, l] of list) {
      if (rooms.get(k, l) !== CLEAR) continue;
      let x0 = k, x1 = k, y0 = l, y1 = l, type = R1X1;
      const free = (x: number, y: number): boolean => rooms.get(x, y) === CLEAR && g.get(x, y) === ROOM;
      if (free(k + 1, l) && free(k, l + 1) && free(k + 1, l + 1)) [x1, y1, type] = [k + 1, l + 1, R2X2];
      else if (free(k - 1, l) && free(k, l + 1) && free(k - 1, l + 1)) [x0, y1, type] = [k - 1, l + 1, R2X2];
      else if (free(k - 1, l) && free(k, l - 1) && free(k - 1, l - 1)) [x0, y0, type] = [k - 1, l - 1, R2X2];
      else if (free(k + 1, l)) [x1, type] = [k + 1, R1X2];
      else if (free(k, l + 1)) [y1, type] = [l + 1, R1X2];
      else if (free(k - 1, l)) [x0, type] = [k - 1, R1X2];
      else if (free(k, l - 1)) [y0, type] = [l - 1, R1X2];
      // ô gốc (có cửa ra hành lang nếu được): thử lần lượt các góc của phòng
      let ox = this.bool() ? x0 : x1, oy = this.bool() ? y0 : y1, door = R_DOOR;
      if (!g.edgesTo(ox, oy, CORRIDOR)) {
        ox = ox === x0 ? x1 : x0;
        oy = oy === y0 ? y1 : y0;
        if (!g.edgesTo(ox, oy, CORRIDOR)) {
          oy = oy === y0 ? y1 : y0;
          if (!g.edgesTo(ox, oy, CORRIDOR)) {
            ox = ox === x0 ? x1 : x0;
            oy = oy === y0 ? y1 : y0;
            if (!g.edgesTo(ox, oy, CORRIDOR)) [door, ox, oy] = [0, x0, y0];
          }
        }
      }
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) rooms.set(x, y, x === ox && y === oy ? R_ORIGIN | door | type | id : type | id);
      id++;
    }
  }
}
