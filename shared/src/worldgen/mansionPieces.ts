// Đặt mảnh mẫu của dinh thự rừng (Giai đoạn 8c) theo lưới phòng — chép theo Minecraft (WoodlandMansionPieces.MansionPiecePlacer,
// đối chiếu bytecode trong client.jar). Tính trong hệ cục bộ (dinh thự không xoay, gốc (0, 0, 0)); mansionPlan.ts xoay cả cụm.
// Mảnh kiểu Minecraft: vị trí điểm gốc mẫu, số lần xoay 90° theo chiều kim đồng hồ (0..3), lật (0 không, 1 trục Z, 2 trục X).
import type { Rng } from "../rng.js";
import { DX, DZ, HORIZONTAL, MansionGrid, UP, cw, isHouse, type Grid, R1X1, R1X2, R2X2, R_CORRIDOR, R_DOOR, R_ID, R_ORIGIN, R_STAIRS, R_TYPE } from "./mansionGrid.js";

export interface McPiece { name: string; x: number; y: number; z: number; rot: number; mir: number }

const S = 0, W = 1, N = 2, E = 3;
/** Hướng d xoay theo r (Rotation.rotate). */
const rd = (r: number, d: number): number => (d + r) & 3;
type V = [number, number, number];
const rel = (p: V, d: number, n: number): V => [p[0] + DX[d]! * n, p[1], p[2] + DZ[d]! * n];
const up = (p: V, n: number): V => [p[0], p[1] + n, p[2]];

interface Floor {
  a1x1(): string; s1x1(): string; side1x2(stairs: boolean): string; front1x2(stairs: boolean): string; s1x2(): string; a2x2(): string;
}

function floors(rng: Rng): Floor[] {
  const n = (k: number): number => 1 + Math.floor(rng() * k);
  const first: Floor = {
    a1x1: () => `1x1_a${n(5)}`, s1x1: () => `1x1_as${n(4)}`, side1x2: () => `1x2_a${n(9)}`, front1x2: () => `1x2_b${n(5)}`,
    s1x2: () => `1x2_s${n(2)}`, a2x2: () => `2x2_a${n(4)}`,
  };
  const upper: Floor = {
    a1x1: () => `1x1_b${n(5)}`, s1x1: () => `1x1_as${n(4)}`, side1x2: (st) => (st ? "1x2_c_stairs" : `1x2_c${n(4)}`),
    front1x2: (st) => (st ? "1x2_d_stairs" : `1x2_d${n(5)}`), s1x2: () => `1x2_se${n(1)}`, a2x2: () => `2x2_b${n(5)}`,
  };
  return [first, upper, upper];
}

/** Các mảnh của một dinh thự (hệ cục bộ). */
export function mansionPieces(rng: Rng): McPiece[] {
  const grid = new MansionGrid(rng), out: McPiece[] = [], fl = floors(rng);
  const add = (name: string, p: V, rot: number, mir = 0): void => void out.push({ name, x: p[0], y: p[1], z: p[2], rot: rot & 3, mir });
  const startX = grid.entranceX + 1, startY = grid.entranceY + 1;
  const cellPos = (base: V, gx: number, gy: number, dx = 0): V => rel(rel(base, S, 8 + (gy - startY) * 8), E, dx + (gx - startX) * 8);

  // ---- tường ngoài: đi vòng theo mép lưới ----
  interface Data { pos: V; rot: number; wall: string }
  const wallPiece = (d: Data): void => {
    add(d.wall, rel(d.pos, rd(d.rot, E), 7), d.rot);
    d.pos = rel(d.pos, rd(d.rot, S), 8);
  };
  const turn = (d: Data): void => {
    d.pos = rel(d.pos, rd(d.rot, S), -1);
    add("wall_corner", d.pos, d.rot);
    d.pos = rel(rel(d.pos, rd(d.rot, S), -7), rd(d.rot, W), -6);
    d.rot = (d.rot + 1) & 3;
  };
  const innerTurn = (d: Data): void => {
    d.pos = rel(rel(d.pos, rd(d.rot, S), 6), rd(d.rot, E), 8);
    d.rot = (d.rot + 3) & 3;
  };
  const outerWalls = (d: Data, g: Grid, dir0: number, sx: number, sy: number, ex: number, ey: number): void => {
    let i = sx, j = sy, dir = dir0;
    do {
      if (!isHouse(g, i + DX[dir]!, j + DZ[dir]!)) {
        turn(d);
        dir = cw(dir);
        if (i !== ex || j !== ey || dir0 !== dir) wallPiece(d);
      } else if (isHouse(g, i + DX[dir]! + DX[(dir + 3) & 3]!, j + DZ[dir]! + DZ[(dir + 3) & 3]!)) {
        innerTurn(d);
        i += DX[dir]!;
        j += DZ[dir]!;
        dir = (dir + 3) & 3;
      } else {
        i += DX[dir]!;
        j += DZ[dir]!;
        if (i !== ex || j !== ey || dir0 !== dir) wallPiece(d);
      }
    } while (i !== ex || j !== ey || dir0 !== dir);
  };

  const origin: V = [0, 0, 0];
  const d0: Data = { pos: origin, rot: 0, wall: "wall_flat" };
  add("entrance", rel(d0.pos, W, 9), 0);
  d0.pos = rel(d0.pos, S, 16);
  const d1: Data = { pos: up(d0.pos, 8), rot: 0, wall: "wall_window" };
  outerWalls(d0, grid.base, S, startX, startY, grid.entranceX + 1, grid.entranceY);
  outerWalls(d1, grid.base, S, startX, startY, grid.entranceX + 1, grid.entranceY);
  const d2: Data = { pos: up(d0.pos, 19), rot: d0.rot, wall: "wall_window" };
  find: for (let k = 0; k < grid.third.h; k++)
    for (let l = grid.third.w - 1; l >= 0; l--)
      if (isHouse(grid.third, l, k)) {
        d2.pos = rel(rel(d2.pos, S, 8 + (k - startY) * 8), E, (l - startX) * 8);
        wallPiece(d2);
        outerWalls(d2, grid.third, S, l, k, l, k);
        break find;
      }
  roof(add, cellPos, up(origin, 16), grid.base, grid.third);
  roof(add, cellPos, up(origin, 27), grid.third, null);

  // ---- sàn hành lang, thảm, tường trong / cửa trong, phòng ----
  for (let f = 0; f < 3; f++) {
    const base = up(origin, 8 * f + (f === 2 ? 3 : 0)), rooms = grid.rooms[f]!, g = f === 2 ? grid.third : grid.base;
    const cs = f === 0 ? "carpet_south_1" : "carpet_south_2", cwst = f === 0 ? "carpet_west_1" : "carpet_west_2";
    const corr = (x: number, y: number): boolean => g.get(x, y) === 1 || (rooms.get(x, y) & R_CORRIDOR) === R_CORRIDOR;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (g.get(x, y) !== 1) continue;
        const p = cellPos(base, x, y);
        add("corridor_floor", p, 0);
        if (corr(x, y - 1)) add("carpet_north", up(rel(p, E, 1), 1), 0);
        if (corr(x + 1, y)) add("carpet_east", up(rel(rel(p, S, 1), E, 5), 1), 0);
        if (corr(x, y + 1)) add(cs, rel(rel(p, S, 5), W, 1), 0);
        if (corr(x - 1, y)) add(cwst, rel(rel(p, W, 1), N, 1), 0);
      }
    const wall = f === 0 ? "indoors_wall_1" : "indoors_wall_2", door = f === 0 ? "indoors_door_1" : "indoors_door_2";
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        let stairTop = f === 2 && g.get(x, y) === 3;
        if (g.get(x, y) !== 2 && !stairTop) continue;
        const v = rooms.get(x, y), type = v & R_TYPE, id = v & R_ID;
        stairTop = stairTop && (v & R_CORRIDOR) === R_CORRIDOR;
        const doors: number[] = [];
        if ((v & R_DOOR) === R_DOOR) for (const h of HORIZONTAL) if (g.get(x + DX[h]!, y + DZ[h]!) === 1) doors.push(h);
        let dd: number | null = null;
        if (doors.length) dd = doors[Math.floor(rng() * doors.length)]!;
        else if ((v & R_ORIGIN) === R_ORIGIN) dd = UP;
        const p = cellPos(base, x, y, -1);
        if (isHouse(g, x - 1, y) && !grid.isRoomId(x - 1, y, f, id)) add(dd === W ? door : wall, p, 0);
        if (g.get(x + 1, y) === 1 && !stairTop) add(dd === E ? door : wall, rel(p, E, 8), 0);
        if (isHouse(g, x, y + 1) && !grid.isRoomId(x, y + 1, f, id)) add(dd === S ? door : wall, rel(rel(p, S, 7), E, 7), 1);
        if (g.get(x, y - 1) === 1 && !stairTop) add(dd === N ? door : wall, rel(rel(p, N, 1), E, 7), 1);
        if (type === R1X1) room1x1(add, p, dd, fl[f]!);
        else if (type === R1X2 && dd !== null) room1x2(add, p, grid.roomDir1x2(x, y, f, id)!, dd, fl[f]!, (v & R_STAIRS) === R_STAIRS);
        else if (type === R2X2 && dd !== null && dd !== UP) {
          let rdir = cw(dd);
          if (!grid.isRoomId(x + DX[rdir]!, y + DZ[rdir]!, f, id)) rdir = (rdir + 2) & 3;
          room2x2(add, p, rdir, dd, fl[f]!);
        } else if (type === R2X2 && dd === UP) add("2x2_s1", rel(p, E, 1), 0);
      }
  }
  return out;
}

type Add = (name: string, p: V, rot: number, mir?: number) => void;

function room1x1(add: Add, p: V, dd: number | null, f: Floor): void {
  let rot = 0, name = f.a1x1();
  if (dd !== E) {
    if (dd === N) rot = 3;
    else if (dd === W) rot = 2;
    else if (dd === S) rot = 1;
    else name = f.s1x1();
  }
  // Minecraft: điểm gốc = (1, 0, 0) + bù để hộp 7 × 7 sau khi xoay vẫn bắt đầu ở đó
  const off = rot === 1 ? [6, 0] : rot === 2 ? [6, 6] : rot === 3 ? [0, 6] : [0, 0];
  add(name, [p[0] + 1 + off[0]!, p[1], p[2] + off[1]!], rot);
}

function room1x2(add: Add, p: V, rdir: number, dd: number, f: Floor, stairs: boolean): void {
  const at = (e: number, s: number): V => rel(rel(p, E, e), S, s);
  if (dd === E && rdir === S) add(f.side1x2(stairs), at(1, 0), 0);
  else if (dd === E && rdir === N) add(f.side1x2(stairs), at(1, 6), 0, 1);
  else if (dd === W && rdir === N) add(f.side1x2(stairs), at(7, 6), 2);
  else if (dd === W && rdir === S) add(f.side1x2(stairs), at(7, 0), 0, 2);
  else if (dd === S && rdir === E) add(f.side1x2(stairs), at(1, 0), 1, 1);
  else if (dd === S && rdir === W) add(f.side1x2(stairs), at(7, 0), 1);
  else if (dd === N && rdir === W) add(f.side1x2(stairs), at(7, 6), 1, 2);
  else if (dd === N && rdir === E) add(f.side1x2(stairs), at(1, 6), 3);
  else if (dd === S && rdir === N) add(f.front1x2(stairs), at(1, -8), 0);
  else if (dd === N && rdir === S) add(f.front1x2(stairs), at(7, 14), 2);
  else if (dd === W && rdir === E) add(f.front1x2(stairs), at(15, 0), 1);
  else if (dd === E && rdir === W) add(f.front1x2(stairs), at(-7, 6), 3);
  else if (dd === UP && rdir === E) add(f.s1x2(), at(15, 0), 1);
  else if (dd === UP && rdir === S) add(f.s1x2(), at(1, 0), 0);
}

function room2x2(add: Add, p: V, rdir: number, dd: number, f: Floor): void {
  let i = 0, j = 0, rot = 0, mir = 0;
  if (dd === E && rdir === S) i = -7;
  else if (dd === E && rdir === N) [i, j, mir] = [-7, 6, 1];
  else if (dd === N && rdir === E) [i, j, rot] = [1, 14, 3];
  else if (dd === N && rdir === W) [i, j, rot, mir] = [7, 14, 3, 1];
  else if (dd === S && rdir === W) [i, j, rot] = [7, -8, 1];
  else if (dd === S && rdir === E) [i, j, rot, mir] = [1, -8, 1, 1];
  else if (dd === W && rdir === N) [i, j, rot] = [15, 6, 2];
  else if (dd === W && rdir === S) [i, mir] = [15, 2];
  add(f.a2x2(), rel(rel(p, E, i), S, j), rot, mir);
}

/** Mái (và tường thấp quanh tầng trên đặt lùi vào). */
function roof(add: Add, cellPos: (b: V, x: number, y: number) => V, pos: V, g: Grid, above: Grid | null): void {
  const h = (x: number, y: number): boolean => isHouse(g, x, y);
  for (let i = 0; i < g.h; i++)
    for (let j = 0; j < g.w; j++) {
      const b = cellPos(pos, j, i), covered = above !== null && isHouse(above, j, i);
      if (!h(j, i) || covered) continue;
      add("roof", up(b, 3), 0);
      if (!h(j + 1, i)) add("roof_front", rel(b, E, 6), 0);
      if (!h(j - 1, i)) add("roof_front", rel(b, S, 7), 2);
      if (!h(j, i - 1)) add("roof_front", rel(b, W, 1), 3);
      if (!h(j, i + 1)) add("roof_front", rel(rel(b, E, 6), S, 6), 1);
    }
  if (above)
    for (let k = 0; k < g.h; k++)
      for (let i1 = 0; i1 < g.w; i1++) {
        const b = cellPos(pos, i1, k);
        if (!h(i1, k) || !isHouse(above, i1, k)) continue;
        if (!h(i1 + 1, k)) add("small_wall", rel(b, E, 7), 0);
        if (!h(i1 - 1, k)) add("small_wall", rel(rel(b, W, 1), S, 6), 2);
        if (!h(i1, k - 1)) add("small_wall", rel(b, N, 1), 3);
        if (!h(i1, k + 1)) add("small_wall", rel(rel(b, E, 6), S, 7), 1);
        if (!h(i1 + 1, k)) {
          if (!h(i1, k - 1)) add("small_wall_corner", rel(rel(b, E, 7), N, 2), 0);
          if (!h(i1, k + 1)) add("small_wall_corner", rel(rel(b, E, 8), S, 7), 1);
        }
        if (!h(i1 - 1, k)) {
          if (!h(i1, k - 1)) add("small_wall_corner", rel(rel(b, W, 2), N, 1), 3);
          if (!h(i1, k + 1)) add("small_wall_corner", rel(rel(b, W, 1), S, 8), 2);
        }
      }
  for (let l = 0; l < g.h; l++)
    for (let j1 = 0; j1 < g.w; j1++) {
      const b = cellPos(pos, j1, l), covered = above !== null && isHouse(above, j1, l);
      if (!h(j1, l) || covered) continue;
      if (!h(j1 + 1, l)) {
        const e6 = rel(b, E, 6);
        if (!h(j1, l + 1)) add("roof_corner", rel(e6, S, 6), 0);
        else if (h(j1 + 1, l + 1)) add("roof_inner_corner", rel(e6, S, 5), 0);
        if (!h(j1, l - 1)) add("roof_corner", e6, 3);
        else if (h(j1 + 1, l - 1)) add("roof_inner_corner", rel(rel(b, E, 9), N, 2), 1);
      }
      if (!h(j1 - 1, l)) {
        if (!h(j1, l + 1)) add("roof_corner", rel(b, S, 6), 1);
        else if (h(j1 - 1, l + 1)) add("roof_inner_corner", rel(rel(b, S, 8), W, 3), 3);
        if (!h(j1, l - 1)) add("roof_corner", b, 2);
        else if (h(j1 - 1, l - 1)) add("roof_inner_corner", rel(b, S, 1), 2);
      }
    }
}
