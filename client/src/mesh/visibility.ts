// Ẩn hang khuất: mỗi đoạn biết những mặt nào thông nhau qua ô không đặc;
// mỗi khung duyệt BFS từ đoạn chứa camera, chỉ đi qua mặt thông và trong khối nhìn.
import * as THREE from "three";
import { BLOCKS, CHUNK_HEIGHT, type World } from "../../../shared/src/index.js";
import { MAP_CHUNKS, SECTIONS_Y, SECTION_H, sectionKey } from "../light/lightMap.js";

// Mặt: 0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z; mặt đối diện = f ^ 1
const FDX = [1, -1, 0, 0, 0, 0];
const FDY = [0, 0, 1, -1, 0, 0];
const FDZ = [0, 0, 0, 0, 1, -1];
const SECTION_COUNT = MAP_CHUNKS * MAP_CHUNKS * SECTIONS_Y;
const VOL = 16 * 16 * SECTION_H;

const OPEN = new Uint8Array(256);
for (const b of BLOCKS) OPEN[b.id] = b.opaque ? 0 : 1;

const visitedCells = new Uint8Array(VOL);
const stack = new Int32Array(VOL);

/** conn[a] = bitmask các mặt b mà đi từ mặt a tới được mặt b bên trong đoạn. */
export function computeConnectivity(world: World, cx: number, sy: number, cz: number, cutY: number | null): Uint8Array {
  const conn = new Uint8Array(6);
  const data = world.chunkAt(cx, cz)!.data;
  const oy = sy * SECTION_H;
  const maxY = cutY ?? CHUNK_HEIGHT - 1;
  const open = (i: number): boolean => {
    const y = oy + (i >> 8);
    return y > maxY || OPEN[data[(y << 8) | (i & 255)]!] === 1;
  };
  let openCount = 0;
  for (let i = 0; i < VOL; i++) if (open(i)) openCount++;
  if (openCount === 0) return conn;
  if (openCount === VOL) return conn.fill(63);

  visitedCells.fill(0);
  for (let start = 0; start < VOL; start++) {
    if (visitedCells[start] || !open(start)) continue;
    let sp = 0, faces = 0;
    stack[sp++] = start;
    visitedCells[start] = 1;
    while (sp) {
      const i = stack[--sp]!;
      const x = i & 15, z = (i >> 4) & 15, y = i >> 8;
      if (x === 15) faces |= 1; if (x === 0) faces |= 2;
      if (y === SECTION_H - 1) faces |= 4; if (y === 0) faces |= 8;
      if (z === 15) faces |= 16; if (z === 0) faces |= 32;
      const nb = [x < 15 ? i + 1 : -1, x > 0 ? i - 1 : -1, z < 15 ? i + 16 : -1, z > 0 ? i - 16 : -1,
        y < SECTION_H - 1 ? i + 256 : -1, y > 0 ? i - 256 : -1];
      for (const n of nb) {
        if (n < 0 || visitedCells[n] || !open(n)) continue;
        visitedCells[n] = 1;
        stack[sp++] = n;
      }
    }
    for (let a = 0; a < 6; a++) if (faces & (1 << a)) conn[a]! |= faces;
  }
  return conn;
}

export class SectionCuller {
  readonly visible = new Uint8Array(SECTION_COUNT);
  private readonly queue = new Int32Array(SECTION_COUNT);
  private readonly entered = new Int8Array(SECTION_COUNT);
  private readonly dirs = new Uint8Array(SECTION_COUNT);
  private readonly frustum = new THREE.Frustum();
  private readonly mat = new THREE.Matrix4();
  private readonly box = new THREE.Box3();

  /** getConn(key) trả về connectivity đã tính, hoặc null nếu đoạn chưa dựng (coi như thông hết). */
  update(camera: THREE.Camera, getConn: (key: number) => Uint8Array | null): void {
    this.mat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.mat);
    const vis = this.visible;
    vis.fill(0);
    const p = camera.position;
    const ccx = Math.floor(p.x / 16), ccz = Math.floor(p.z / 16);
    if (ccx < 0 || ccz < 0 || ccx >= MAP_CHUNKS || ccz >= MAP_CHUNKS || p.y < 0) {
      vis.fill(1); // ngoài bản đồ: không ẩn gì, để khối nhìn của three.js lo
      return;
    }
    let head = 0, tail = 0;
    const csy = Math.floor(p.y / SECTION_H);
    if (csy >= SECTIONS_Y) {
      // trên đỉnh thế giới: đi vào mọi đoạn trên cùng từ mặt trên
      for (let cz = 0; cz < MAP_CHUNKS; cz++)
        for (let cx = 0; cx < MAP_CHUNKS; cx++) {
          const k = sectionKey(cx, SECTIONS_Y - 1, cz);
          if (!this.inFrustum(cx, SECTIONS_Y - 1, cz)) continue;
          vis[k] = 1; this.entered[k] = 2; this.dirs[k] = 1 << 3; this.queue[tail++] = k;
        }
    } else {
      const k = sectionKey(ccx, csy, ccz);
      vis[k] = 1; this.entered[k] = -1; this.dirs[k] = 0; this.queue[tail++] = k;
    }

    while (head < tail) {
      const k = this.queue[head++]!;
      const cx = k % MAP_CHUNKS, cz = Math.floor(k / MAP_CHUNKS) % MAP_CHUNKS, sy = Math.floor(k / (MAP_CHUNKS * MAP_CHUNKS));
      const from = this.entered[k]!;
      const conn = from >= 0 ? getConn(k) : null;
      for (let f = 0; f < 6; f++) {
        if (this.dirs[k]! & (1 << (f ^ 1))) continue; // không quay ngược hướng
        if (from >= 0 && conn && !(conn[from]! & (1 << f))) continue;
        const nx = cx + FDX[f]!, ny = sy + FDY[f]!, nz = cz + FDZ[f]!;
        if (nx < 0 || nz < 0 || ny < 0 || nx >= MAP_CHUNKS || nz >= MAP_CHUNKS || ny >= SECTIONS_Y) continue;
        const nk = sectionKey(nx, ny, nz);
        if (vis[nk] || !this.inFrustum(nx, ny, nz)) continue;
        vis[nk] = 1;
        this.entered[nk] = f ^ 1;
        this.dirs[nk] = this.dirs[k]! | (1 << f);
        this.queue[tail++] = nk;
      }
    }
  }

  private inFrustum(cx: number, sy: number, cz: number): boolean {
    this.box.min.set(cx * 16, sy * SECTION_H, cz * 16);
    this.box.max.set(cx * 16 + 16, sy * SECTION_H + SECTION_H, cz * 16 + 16);
    return this.frustum.intersectsBox(this.box);
  }
}
