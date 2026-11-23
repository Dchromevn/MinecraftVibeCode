// Kim tự tháp sa mạc (Giai đoạn 7e; client.jar không có mẫu — Minecraft dựng bằng code nên dựng lại theo Minecraft Wiki): nền
// 21 × 21 đá cát, đại sảnh giữa sàn ô ca rô đất nung cam, ô đất nung xanh dương ở chính giữa; hai tháp hai góc trước có sọc
// đất nung cam; mái bậc thang. Dưới ô xanh (đào xuống ~9 block) là phòng kín 5 × 5 có 4 rương ở bốn hốc, tấm áp lực đá giữa
// sàn và 9 khối TNT (3 × 3) dưới sàn phòng — dẫm lên là nổ.
import { B } from "../blocks.js";
import type { StructTemplate } from "../structures.js";

const W = 21, BASE = 14; // sàn đại sảnh ở y = BASE trong mẫu (phòng kín sâu tới y = 0)
export const PYRAMID_FLOOR_Y = BASE;

let cached: StructTemplate | null = null;

/** Mẫu kim tự tháp (dựng một lần). Ô không khí trong mẫu đục địa hình (lòng tháp, phòng kín). */
export function desertPyramidTemplate(): StructTemplate {
  if (cached) return cached;
  const H = BASE + 16;
  const grid = new Int32Array(W * H * W).fill(-1); // -1 = giữ nguyên địa hình
  const at = (x: number, y: number, z: number): number => (y * W + z) * W + x;
  const set = (x: number, y: number, z: number, c: number): void => {
    if (x >= 0 && x < W && z >= 0 && z < W && y >= 0 && y < H) grid[at(x, y, z)] = c;
  };
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number): void => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, c);
  };
  const S = B.SANDSTONE, CUT = B.CUT_SANDSTONE, CH = B.CHISELED_SANDSTONE, OR = B.ORANGE_TERRACOTTA, F = BASE;
  // móng + khối đá cát bao phòng kín
  box(0, F - 4, 0, W - 1, F, W - 1, S);
  box(6, 0, 6, 14, F - 1, 14, S);
  // thân: tường bao 4 phía cao 4, mái bậc thang (mỗi tầng thu vào 1)
  for (let y = F + 1; y <= F + 4; y++) for (let i = 0; i < W; i++) for (const [x, z] of [[i, 0], [i, W - 1], [0, i], [W - 1, i]]) set(x!, y, z!, y === F + 4 ? CUT : S);
  for (let s = 1; s <= 9; s++) box(s, F + 4 + s, s, W - 1 - s, F + 4 + s, W - 1 - s, S);
  // lòng tháp: hành lang quanh cao 4, đại sảnh giữa cao 8
  box(1, F + 1, 1, W - 2, F + 4, W - 2, 0);
  box(5, F + 1, 5, 15, F + 8, 15, 0);
  for (let s = 1; s <= 4; s++) box(5, F + 4 + s, 5, 15, F + 4 + s, 15, 0);
  // cột chống hành lang (đá cát khắc)
  for (const x of [5, 15]) for (const z of [5, 15]) box(x, F + 1, z, x, F + 4, z, CH);
  // sàn đại sảnh: ca rô hình hoa gió đất nung cam, ô giữa xanh dương
  for (let z = 6; z <= 14; z++)
    for (let x = 6; x <= 14; x++) {
      const dx = Math.abs(x - 10), dz = Math.abs(z - 10);
      if (dx === dz || dx === 0 || dz === 0) set(x, F, z, OR);
    }
  set(10, F, 10, B.BLUE_TERRACOTTA);
  // hai tháp góc trước (5 × 5, cao tới F + 13), lòng rỗng, sọc đất nung cam mặt trước, đỉnh đá cát cắt
  for (const tx of [0, 16]) {
    box(tx, F + 1, 0, tx + 4, F + 13, 4, S);
    box(tx + 1, F + 1, 1, tx + 3, F + 12, 3, 0);
    box(tx, F + 13, 0, tx + 4, F + 13, 4, CUT);
    for (const y of [F + 7, F + 9, F + 11]) for (let x = tx + 1; x <= tx + 3; x++) set(x, y, 0, OR);
    set(tx + 2, F + 8, 0, CH);
    set(tx + 2, F + 10, 0, OR);
    box(tx + 2, F + 1, 4, tx + 2, F + 3, 4, 0); // cửa từ tháp vào hành lang
  }
  // mặt tiền giữa hai tháp + lối vào rộng 3 cao 3
  box(5, F + 1, 0, 15, F + 9, 0, S);
  for (const y of [F + 6, F + 8]) for (let x = 7; x <= 13; x++) set(x, y, 0, OR);
  set(10, F + 7, 0, CH);
  box(9, F + 1, 0, 11, F + 3, 0, 0);
  // phòng kín: 5 × 5 cao 3 (sàn ở y = 3 — dưới sàn sảnh 11 tầng), 4 hốc rương, tấm áp lực giữa, TNT dưới sàn
  const R = 3;
  box(8, R, 8, 12, R + 2, 12, 0);
  set(10, R, 10, B.STONE_PRESSURE_PLATE);
  box(9, 1, 9, 11, 1, 11, B.TNT);
  const loot: [number, number, number, string][] = [];
  for (const [x, z, face] of [[10, 7, 0], [10, 13, 2], [7, 10, 3], [13, 10, 1]] as const) {
    set(x, R, z, B.CHEST | (face << 8)); // mặt rương quay vào giữa phòng
    set(x, R + 1, z, 0);
    loot.push([x, R, z, "desert_pyramid"]);
  }
  for (let x = 8; x <= 12; x++) for (const z of [8, 12]) set(x, R - 1, z, OR); // viền đất nung quanh sàn phòng
  // gom thành mẫu
  const pal: number[] = [], index = new Map<number, number>(), cells: number[] = [];
  for (let y = 0; y < H; y++)
    for (let z = 0; z < W; z++)
      for (let x = 0; x < W; x++) {
        const c = grid[at(x, y, z)]!;
        if (c < 0) continue;
        let i = index.get(c);
        if (i === undefined) index.set(c, (i = pal.push(c) - 1));
        cells.push(x, y, z, i);
      }
  cached = { size: [W, H, W], pal, cells, loot, jig: [] };
  return cached;
}
