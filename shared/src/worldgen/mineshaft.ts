// Hầm mỏ bỏ hoang: phòng trung tâm, hành lang 3x3 rẽ nhánh, ngã tư, cầu thang,
// khung chống gỗ, đường ray đứt đoạn, mạng nhện, đuốc, rương ở nhánh cụt.
import { MINESHAFT as M } from "../constants.js";
import { B } from "../blocks.js";
import { hashInts, mulberry32, randInt } from "../rng.js";
import { MAP_SIZE, World } from "../world.js";
import { carveAir, ensureFloor, putCorridorSlice, type Ctx, type Piece, DX, DZ } from "./mineshaftParts.js";

function inRange(ctx: Ctx, x: number, y: number, z: number): boolean {
  if (x < 3 || z < 3 || x > MAP_SIZE - 4 || z > MAP_SIZE - 4) return false;
  if (y < M.Y_MIN || y + 2 > M.Y_MAX) return false;
  const dx = x - ctx.cx, dz = z - ctx.cz;
  return dx * dx + dz * dz <= M.MAX_RADIUS * M.MAX_RADIUS;
}

function genRoom(ctx: Ctx, x: number, y: number, z: number): void {
  const { world, rng } = ctx;
  const w = randInt(rng, 7, 11), l = randInt(rng, 7, 11), h = randInt(rng, 4, 6);
  const x0 = x - (w >> 1), z0 = z - (l >> 1);
  for (let ix = x0; ix < x0 + w; ix++)
    for (let iz = z0; iz < z0 + l; iz++) {
      for (let iy = y; iy < y + h; iy++) carveAir(world, ix, iy, iz);
      ensureFloor(world, ix, y, iz, rng() < 0.25 ? B.MOSSY_COBBLE : B.DIRT, true);
    }
  ctx.pieces++;
  // lối ra ở 4 phía
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

function genCorridor(ctx: Ctx, p: Piece): void {
  const { world, rng } = ctx;
  const want = randInt(rng, M.CORRIDOR_MIN, M.CORRIDOR_MAX);
  const spacing = randInt(rng, M.SUPPORT_SPACING_MIN, M.SUPPORT_SPACING_MAX);
  let len = 0;
  while (len < want && inRange(ctx, p.x + DX[p.dir]! * len, p.y, p.z + DZ[p.dir]! * len)) len++;
  if (len < 4) return;
  ctx.pieces++;
  for (let t = 0; t < len; t++) {
    const support = (t + 1) % spacing === 0 && t < len - 1;
    putCorridorSlice(ctx, p.x + DX[p.dir]! * t, p.y, p.z + DZ[p.dir]! * t, p.dir, support, M.WEB_CHANCE);
  }
  const ex = p.x + DX[p.dir]! * len, ez = p.z + DZ[p.dir]! * len;
  const lastX = ex - DX[p.dir]!, lastZ = ez - DZ[p.dir]!;
  if (p.depth >= 10 || ctx.pieces >= M.MAX_PIECES) return deadEnd(ctx, lastX, p.y, lastZ);
  const r = rng();
  if (r < 0.45) ctx.queue.push({ kind: "crossing", x: ex, y: p.y, z: ez, dir: p.dir, depth: p.depth + 1 });
  else if (r < 0.65) ctx.queue.push({ kind: "stairs", x: ex, y: p.y, z: ez, dir: p.dir, depth: p.depth + 1 });
  else if (r < 0.8) ctx.queue.push({ kind: "corridor", x: ex, y: p.y, z: ez, dir: p.dir, depth: p.depth + 1 });
  else deadEnd(ctx, lastX, p.y, lastZ);
}

function deadEnd(ctx: Ctx, x: number, y: number, z: number): void {
  if (ctx.rng() >= M.DEAD_END_CHEST_CHANCE) return;
  if (ctx.world.getBlock(x, y - 1, z) === B.AIR) return;
  ctx.world.setBlock(x, y, z, B.CHEST);
  ctx.world.lootChests.push({ x, y, z, tier: "rare" });
}

function genCrossing(ctx: Ctx, p: Piece): void {
  const { world, rng } = ctx;
  const cx = p.x + DX[p.dir]!, cz = p.z + DZ[p.dir]!;
  for (let ox = -1; ox <= 1; ox++)
    for (let oz = -1; oz <= 1; oz++) if (!inRange(ctx, cx + ox, p.y, cz + oz)) return;
  ctx.pieces++;
  const tall = rng() < 0.3 ? 4 : 3;
  for (let ox = -1; ox <= 1; ox++)
    for (let oz = -1; oz <= 1; oz++) {
      for (let h = 0; h < tall; h++) carveAir(world, cx + ox, p.y + h, cz + oz);
      ensureFloor(world, cx + ox, p.y, cz + oz, B.PLANKS, false);
      if (rng() < M.WEB_CHANCE_JUNCTION) world.setBlock(cx + ox, p.y + tall - 1, cz + oz, B.COBWEB);
    }
  const dirs = [p.dir, (p.dir + 1) & 3, (p.dir + 3) & 3];
  let spawned = 0;
  for (const d of dirs) {
    if (rng() > 0.65 || ctx.pieces + ctx.queue.length >= M.MAX_PIECES) continue;
    ctx.queue.push({ kind: "corridor", x: cx + DX[d]! * 2, y: p.y, z: cz + DZ[d]! * 2, dir: d, depth: p.depth + 1 });
    spawned++;
  }
  if (spawned === 0) deadEnd(ctx, cx, p.y, cz);
}

function genStairs(ctx: Ctx, p: Piece): void {
  const { world } = ctx;
  let s = ctx.rng() < 0.5 ? 1 : -1;
  if (p.y + 6 + 2 > M.Y_MAX) s = -1;
  if (p.y - 6 < M.Y_MIN) s = 1;
  const steps = 5;
  for (let t = 0; t < steps; t++) {
    const x = p.x + DX[p.dir]! * t, z = p.z + DZ[p.dir]! * t;
    if (!inRange(ctx, x, p.y + (t + 1) * s, z)) return;
  }
  ctx.pieces++;
  let prev = p.y;
  const px = DZ[p.dir]!, pz = DX[p.dir]!;
  for (let t = 0; t < steps; t++) {
    const level = p.y + (t + 1) * s;
    const x = p.x + DX[p.dir]! * t, z = p.z + DZ[p.dir]! * t;
    for (let side = -1; side <= 1; side++) {
      const sx = x + px * side, sz = z + pz * side;
      for (let y = Math.min(level, prev); y <= Math.max(level, prev) + 2; y++) carveAir(world, sx, y, sz);
      ensureFloor(world, sx, level, sz, B.PLANKS, false);
    }
    prev = level;
  }
  ctx.queue.push({
    kind: "corridor",
    x: p.x + DX[p.dir]! * steps,
    y: prev,
    z: p.z + DZ[p.dir]! * steps,
    dir: p.dir,
    depth: p.depth + 1,
  });
}

export function generateMineshafts(world: World, seed: number): void {
  const rng = mulberry32(hashInts(seed, 41));
  const count = randInt(rng, M.COUNT_MIN, M.COUNT_MAX);
  const centers: { x: number; z: number }[] = [];
  for (let tries = 0; centers.length < count && tries < 60; tries++) {
    const x = randInt(rng, 40, MAP_SIZE - 41);
    const z = randInt(rng, 40, MAP_SIZE - 41);
    if (centers.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < M.MIN_SPACING ** 2)) continue;
    centers.push({ x, z });
  }
  for (const c of centers) {
    const ctx: Ctx = { world, rng: mulberry32(hashInts(seed, 42, c.x, c.z)), cx: c.x, cz: c.z, pieces: 0, queue: [] };
    genRoom(ctx, c.x, randInt(ctx.rng, M.ROOM_Y_MIN, M.ROOM_Y_MAX), c.z);
    // duyệt theo hàng đợi (FIFO) để hệ thống tỏa đều, kết quả xác định
    for (let i = 0; i < ctx.queue.length && ctx.pieces < M.MAX_PIECES; i++) {
      const p = ctx.queue[i]!;
      if (p.kind === "corridor") genCorridor(ctx, p);
      else if (p.kind === "crossing") genCrossing(ctx, p);
      else genStairs(ctx, p);
    }
    world.mineshafts.push({ x: c.x, z: c.z, pieces: ctx.pieces });
  }
}
