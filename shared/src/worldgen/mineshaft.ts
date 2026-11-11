// Hầm mỏ bỏ hoang (2.9): lập kế hoạch cả hệ thống theo vùng MINESHAFT.REGION (seed + tọa độ
// vùng), ghi thay đổi vào lớp phủ, rồi chia theo chunk; mỗi chunk chỉ đặt phần của nó.
import { MINESHAFT as M } from "../constants.js";
import { B } from "../blocks.js";
import { blockIndex, chunkKey } from "../chunk.js";
import { hashInts, mulberry32, randInt } from "../rng.js";
import type { ChunkGenerator } from "./chunkGen.js";
import { mineshaftCenter } from "./mineshaftCenter.js";
import { naturalBlock } from "./natural.js";
import { DX, DZ, carveAir, ensureFloor, putCorridorSlice, type Ctx, type Piece } from "./mineshaftParts.js";

/** Thay đổi theo chunk: mỗi số = chỉ số trong chunk * 256 + id block. */
type Plan = Map<number, number[]>;

function genRoom(ctx: Ctx, x: number, y: number, z: number): void {
  const { rng } = ctx;
  const w = randInt(rng, 7, 11), l = randInt(rng, 7, 11), h = randInt(rng, 4, 6);
  const x0 = x - (w >> 1), z0 = z - (l >> 1);
  for (let ix = x0; ix < x0 + w; ix++)
    for (let iz = z0; iz < z0 + l; iz++) {
      for (let iy = y; iy < y + h; iy++) carveAir(ctx, ix, iy, iz);
      ensureFloor(ctx, ix, y, iz, rng() < 0.25 ? B.MOSSY_COBBLE : B.DIRT, true);
    }
  ctx.pieces++;
  for (let d = 0; d < 4; d++) {
    if (rng() > 0.8) continue;
    let ex: number, ez: number;
    if (d === 0) { ex = x0 + w; ez = randInt(rng, z0 + 1, z0 + l - 2); }
    else if (d === 2) { ex = x0 - 1; ez = randInt(rng, z0 + 1, z0 + l - 2); }
    else if (d === 1) { ez = z0 + l; ex = randInt(rng, x0 + 1, x0 + w - 2); }
    else { ez = z0 - 1; ex = randInt(rng, x0 + 1, x0 + w - 2); }
    ctx.queue.push({ kind: "corridor", x: ex, y, z: ez, dir: d, depth: 1 });
  }
}

function deadEnd(ctx: Ctx, x: number, y: number, z: number): void {
  if (ctx.rng() >= M.DEAD_END_CHEST_CHANCE) return;
  if (ctx.get(x, y - 1, z) === B.AIR) return;
  ctx.set(x, y, z, B.CHEST); // Giai đoạn 4 điền đồ khi chunk được sinh
}

function genCorridor(ctx: Ctx, p: Piece): void {
  const { rng } = ctx;
  const want = randInt(rng, M.CORRIDOR_MIN, M.CORRIDOR_MAX);
  const spacing = randInt(rng, M.SUPPORT_SPACING_MIN, M.SUPPORT_SPACING_MAX);
  let len = 0;
  while (len < want && ctx.inRange(p.x + DX[p.dir]! * len, p.y, p.z + DZ[p.dir]! * len)) len++;
  if (len < 4) return;
  ctx.pieces++;
  for (let t = 0; t < len; t++) {
    const support = (t + 1) % spacing === 0 && t < len - 1;
    putCorridorSlice(ctx, p.x + DX[p.dir]! * t, p.y, p.z + DZ[p.dir]! * t, p.dir, support);
  }
  const ex = p.x + DX[p.dir]! * len, ez = p.z + DZ[p.dir]! * len;
  const lastX = ex - DX[p.dir]!, lastZ = ez - DZ[p.dir]!;
  if (p.depth >= 10 || ctx.pieces >= M.MAX_PIECES) return deadEnd(ctx, lastX, p.y, lastZ);
  const r = rng();
  const next = (kind: Piece["kind"]): void => {
    ctx.queue.push({ kind, x: ex, y: p.y, z: ez, dir: p.dir, depth: p.depth + 1 });
  };
  if (r < 0.45) next("crossing");
  else if (r < 0.65) next("stairs");
  else if (r < 0.8) next("corridor");
  else deadEnd(ctx, lastX, p.y, lastZ);
}

function genCrossing(ctx: Ctx, p: Piece): void {
  const { rng } = ctx;
  const cx = p.x + DX[p.dir]!, cz = p.z + DZ[p.dir]!;
  for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) if (!ctx.inRange(cx + ox, p.y, cz + oz)) return;
  ctx.pieces++;
  const tall = rng() < 0.3 ? 4 : 3;
  for (let ox = -1; ox <= 1; ox++)
    for (let oz = -1; oz <= 1; oz++) {
      for (let h = 0; h < tall; h++) carveAir(ctx, cx + ox, p.y + h, cz + oz);
      ensureFloor(ctx, cx + ox, p.y, cz + oz, B.PLANKS, false);
      if (rng() < M.WEB_CHANCE_JUNCTION) ctx.set(cx + ox, p.y + tall - 1, cz + oz, B.COBWEB);
    }
  // ray ở giữa ngã rẽ để vẽ thành ngã ba / ngã tư
  if (rng() < M.RAIL_CHANCE) ctx.set(cx, p.y, cz, B.RAIL);
  let spawned = 0;
  for (const d of [p.dir, (p.dir + 1) & 3, (p.dir + 3) & 3]) {
    if (rng() > 0.65 || ctx.pieces + ctx.queue.length >= M.MAX_PIECES) continue;
    ctx.queue.push({ kind: "corridor", x: cx + DX[d]! * 2, y: p.y, z: cz + DZ[d]! * 2, dir: d, depth: p.depth + 1 });
    spawned++;
  }
  if (spawned === 0) deadEnd(ctx, cx, p.y, cz);
}

function genStairs(ctx: Ctx, p: Piece): void {
  let s = ctx.rng() < 0.5 ? 1 : -1;
  if (p.y + 8 > M.Y_MAX) s = -1;
  if (p.y - 6 < M.Y_MIN) s = 1;
  const steps = 5;
  for (let t = 0; t < steps; t++) {
    if (!ctx.inRange(p.x + DX[p.dir]! * t, p.y + (t + 1) * s, p.z + DZ[p.dir]! * t)) return;
  }
  ctx.pieces++;
  let prev = p.y;
  const px = DZ[p.dir]!, pz = DX[p.dir]!;
  for (let t = 0; t < steps; t++) {
    const level = p.y + (t + 1) * s;
    const x = p.x + DX[p.dir]! * t, z = p.z + DZ[p.dir]! * t;
    for (let side = -1; side <= 1; side++) {
      const sx = x + px * side, sz = z + pz * side;
      for (let y = Math.min(level, prev); y <= Math.max(level, prev) + 2; y++) carveAir(ctx, sx, y, sz);
      ensureFloor(ctx, sx, level, sz, B.PLANKS, false);
    }
    prev = level;
  }
  ctx.queue.push({ kind: "corridor", x: p.x + DX[p.dir]! * steps, y: prev, z: p.z + DZ[p.dir]! * steps, dir: p.dir, depth: p.depth + 1 });
}

export class MineshaftPlanner {
  private readonly cache = new Map<string, Plan>();

  constructor(private readonly gen: ChunkGenerator) {}

  /** Đặt các block hầm mỏ thuộc chunk (cx, cz) vào data. */
  apply(data: Uint8Array, cx: number, cz: number): void {
    const R = M.REGION, reach = M.MAX_RADIUS + 8;
    const key = chunkKey(cx, cz);
    for (let rz = Math.floor((cz * 16 - reach) / R); rz <= Math.floor((cz * 16 + 16 + reach) / R); rz++)
      for (let rx = Math.floor((cx * 16 - reach) / R); rx <= Math.floor((cx * 16 + 16 + reach) / R); rx++) {
        const ops = this.plan(rx, rz).get(key);
        if (!ops) continue;
        for (const op of ops) data[op >> 8] = op & 255;
      }
  }

  plan(rx: number, rz: number): Plan {
    const k = `${rx},${rz}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const plan = this.build(rx, rz);
    if (this.cache.size > 64) this.cache.clear();
    this.cache.set(k, plan);
    return plan;
  }

  private build(rx: number, rz: number): Plan {
    const plan: Plan = new Map();
    const c = mineshaftCenter(this.gen.sampler, this.gen.rules, rx, rz);
    if (!c) return plan;
    const overlay = new Map<string, number>();
    const gen = this.gen;
    const ctx: Ctx = {
      rng: mulberry32(hashInts(gen.seed, rx, rz, 42)),
      cx: c.x,
      cz: c.z,
      pieces: 0,
      queue: [],
      get: (x, y, z) => overlay.get(`${x},${y},${z}`) ?? naturalBlock(gen, x, y, z),
      set: (x, y, z, id) => void overlay.set(`${x},${y},${z}`, id),
      inRange: (x, y, z) => {
        if (y < M.Y_MIN || y + 2 > M.Y_MAX) return false;
        if ((x - c.x) ** 2 + (z - c.z) ** 2 > M.MAX_RADIUS ** 2) return false;
        const lake = gen.rules.lakeLevel(x, z);
        if (lake > 0 && y <= lake) return false; // không đục cạnh / dưới mặt hồ ngầm
        const col = gen.sampler.column(x, z);
        return col.height > col.waterTop && y + 3 + M.MIN_COVER <= col.height; // dưới đất khô, đủ sâu
      },
    };
    genRoom(ctx, c.x, c.y, c.z);
    // duyệt theo hàng đợi (FIFO) để hệ thống tỏa đều, kết quả xác định
    for (let i = 0; i < ctx.queue.length && ctx.pieces < M.MAX_PIECES; i++) {
      const p = ctx.queue[i]!;
      if (p.kind === "corridor") genCorridor(ctx, p);
      else if (p.kind === "crossing") genCrossing(ctx, p);
      else genStairs(ctx, p);
    }
    for (const [k, id] of overlay) {
      const [x, y, z] = k.split(",").map(Number) as [number, number, number];
      if (y < 0 || y > 127) continue;
      const ck = chunkKey(x >> 4, z >> 4);
      let list = plan.get(ck);
      if (!list) plan.set(ck, (list = []));
      list.push((blockIndex(x & 15, y, z & 15) << 8) | id);
    }
    return plan;
  }
}
