// Độ thông của một đoạn 16x16x16: đi từ mặt a tới được mặt b qua các ô không che
// khuất hay không. Dùng để ẩn đoạn khuất (hang dưới lòng đất không thấy từ mặt đất).
import { BLOCKS } from "../../../shared/src/index.js";
import { regionIndex } from "../light/regionLight.js";

// Mặt: 0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z
const OPEN = new Uint8Array(256);
for (const b of BLOCKS) OPEN[b.id] = b.opaque ? 0 : 1;
const VOL = 16 * 16 * 16;
const visited = new Uint8Array(VOL);
const stack = new Int32Array(VOL);

/** conn[a] = bitmask các mặt b đi tới được từ mặt a. Ô trong đoạn: i = (y*16 + z)*16 + x. */
export function sectionConnectivity(region: Uint8Array, sy: number, sh: number): Uint8Array {
  const conn = new Uint8Array(6);
  const y0 = sy * sh;
  const open = (i: number): boolean => OPEN[region[regionIndex(16 + (i & 15), y0 + (i >> 8), 16 + ((i >> 4) & 15))]!] === 1;
  let openCount = 0;
  for (let i = 0; i < VOL; i++) if (open(i)) openCount++;
  if (openCount === 0) return conn;
  if (openCount === VOL) return conn.fill(63);

  visited.fill(0);
  for (let start = 0; start < VOL; start++) {
    if (visited[start] || !open(start)) continue;
    let sp = 0, faces = 0;
    stack[sp++] = start;
    visited[start] = 1;
    while (sp) {
      const i = stack[--sp]!;
      const x = i & 15, z = (i >> 4) & 15, y = i >> 8;
      if (x === 15) faces |= 1;
      if (x === 0) faces |= 2;
      if (y === 15) faces |= 4;
      if (y === 0) faces |= 8;
      if (z === 15) faces |= 16;
      if (z === 0) faces |= 32;
      if (x < 15) visit(i + 1);
      if (x > 0) visit(i - 1);
      if (z < 15) visit(i + 16);
      if (z > 0) visit(i - 16);
      if (y < 15) visit(i + 256);
      if (y > 0) visit(i - 256);
    }
    for (let a = 0; a < 6; a++) if (faces & (1 << a)) conn[a]! |= faces;

    function visit(n: number): void {
      if (visited[n] || !open(n)) return;
      visited[n] = 1;
      stack[sp++] = n;
    }
  }
  return conn;
}
