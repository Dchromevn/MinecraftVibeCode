// Phần dùng chung khi lập kế hoạch hầm mỏ: lớp phủ block, đục, lót sàn/cầu, lát hành lang.
import { MINESHAFT as M } from "../constants.js";
import { B, BLOCKS } from "../blocks.js";
import type { Rng } from "../rng.js";

/** Hướng 0..3: +X, +Z, -X, -Z. */
export const DX = [1, 0, -1, 0] as const;
export const DZ = [0, 1, 0, -1] as const;

export interface Piece {
  kind: "corridor" | "crossing" | "stairs";
  x: number;
  y: number; // mức sàn đi lại
  z: number;
  dir: number;
  depth: number;
}

export interface Ctx {
  rng: Rng;
  cx: number; // tâm hệ thống
  cz: number;
  pieces: number;
  queue: Piece[];
  spawners?: number; // (7b) số lồng sinh quái đã đặt
  /** Block hiện tại (lớp phủ của kế hoạch, nếu chưa có thì là block tự nhiên). */
  get(x: number, y: number, z: number): number;
  set(x: number, y: number, z: number, id: number): void;
  /** Ô có nằm trong vùng cho phép đào hầm không (bán kính, độ sâu, dưới đất khô). */
  inRange(x: number, y: number, z: number): boolean;
}

export function carveAir(ctx: Ctx, x: number, y: number, z: number): void {
  if (ctx.get(x, y, z) !== B.BEDROCK) ctx.set(x, y, z, B.AIR);
}

function isFloor(id: number): boolean {
  const d = BLOCKS[id]!;
  return d.solid && !d.liquid && d.render === "cube";
}

/**
 * Bảo đảm ô dưới chỗ đứng (y-1) là block đặc. Nếu là hang (không khí/chất lỏng)
 * thì bắc cầu ván gỗ. replaceSolid = true thì thay cả block đặc bằng `floor`.
 */
export function ensureFloor(ctx: Ctx, x: number, y: number, z: number, floor: number, replaceSolid: boolean): void {
  const below = ctx.get(x, y - 1, z);
  if (below === B.BEDROCK) return;
  if (!isFloor(below)) ctx.set(x, y - 1, z, B.PLANKS);
  else if (replaceSolid) ctx.set(x, y - 1, z, floor);
}

/** Một lát ngang 3x3 của hành lang tại (x, y, z) theo hướng dir. */
export function putCorridorSlice(ctx: Ctx, x: number, y: number, z: number, dir: number, support: boolean): void {
  const { rng } = ctx;
  const px = DZ[dir]!, pz = DX[dir]!; // vuông góc với hướng đi
  for (let s = -1; s <= 1; s++) {
    for (let h = 0; h < 3; h++) carveAir(ctx, x + px * s, y + h, z + pz * s);
    ensureFloor(ctx, x + px * s, y, z + pz * s, B.PLANKS, false);
  }
  if (support) {
    const torchSide = rng() < M.TORCH_CHANCE ? (rng() < 0.5 ? -1 : 1) : 0;
    for (const s of [-1, 1]) {
      ctx.set(x + px * s, y, z + pz * s, B.FENCE);
      // đuốc cắm trên đầu cột
      ctx.set(x + px * s, y + 1, z + pz * s, s === torchSide ? B.TORCH : B.FENCE);
    }
    for (let s = -1; s <= 1; s++) ctx.set(x + px * s, y + 2, z + pz * s, B.PLANKS);
  } else {
    for (const s of [-1, 1]) if (rng() < M.WEB_CHANCE) ctx.set(x + px * s, y + 2, z + pz * s, B.COBWEB);
  }
  // đường ray (thiếu ngẫu nhiên); hướng ray tự chọn khi vẽ theo ray bên cạnh
  if (rng() < M.RAIL_CHANCE) ctx.set(x, y, z, B.RAIL);
}
