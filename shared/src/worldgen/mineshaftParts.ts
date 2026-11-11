// Phần dùng chung khi dựng hầm mỏ: đục, lót sàn/cầu, một lát cắt hành lang.
import { MINESHAFT as M } from "../constants.js";
import { B, BLOCKS, type BlockId } from "../blocks.js";
import type { Rng } from "../rng.js";
import type { World } from "../world.js";

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
  world: World;
  rng: Rng;
  cx: number;
  cz: number;
  pieces: number;
  queue: Piece[];
}

export function carveAir(world: World, x: number, y: number, z: number): void {
  const id = world.getBlock(x, y, z);
  if (id === B.BEDROCK) return;
  world.setBlock(x, y, z, B.AIR);
}

/**
 * Bảo đảm ô dưới chỗ đứng (y-1) là block đặc. Nếu đang là hang (không khí/chất lỏng)
 * thì bắc cầu ván gỗ. replaceSolid = true thì thay cả block đặc bằng `floor`.
 */
export function ensureFloor(world: World, x: number, y: number, z: number, floor: BlockId, replaceSolid: boolean): void {
  const below = world.getBlock(x, y - 1, z);
  if (below === B.BEDROCK) return;
  const def = BLOCKS[below]!;
  if (!def.solid || def.liquid || def.render !== "cube") world.setBlock(x, y - 1, z, B.PLANKS);
  else if (replaceSolid) world.setBlock(x, y - 1, z, floor);
}

/** Một lát ngang 3x3 của hành lang tại (x, y, z) theo hướng dir. */
export function putCorridorSlice(
  ctx: Ctx,
  x: number,
  y: number,
  z: number,
  dir: number,
  support: boolean,
  webChance: number,
): void {
  const { world, rng } = ctx;
  const px = DZ[dir]!, pz = DX[dir]!; // vuông góc với hướng đi
  for (let s = -1; s <= 1; s++) {
    for (let h = 0; h < 3; h++) carveAir(world, x + px * s, y + h, z + pz * s);
    ensureFloor(world, x + px * s, y, z + pz * s, B.PLANKS, false);
  }

  if (support) {
    const torchSide = rng() < M.TORCH_CHANCE ? (rng() < 0.5 ? -1 : 1) : 0;
    for (const s of [-1, 1]) {
      world.setBlock(x + px * s, y, z + pz * s, B.FENCE);
      // đuốc cắm trên đầu cột
      world.setBlock(x + px * s, y + 1, z + pz * s, s === torchSide ? B.TORCH : B.FENCE);
    }
    for (let s = -1; s <= 1; s++) world.setBlock(x + px * s, y + 2, z + pz * s, B.PLANKS);
  } else {
    for (const s of [-1, 1]) {
      if (rng() < webChance) world.setBlock(x + px * s, y + 2, z + pz * s, B.COBWEB);
    }
  }

  if (rng() < M.RAIL_CHANCE) world.setBlock(x, y, z, dir === 0 || dir === 2 ? B.RAIL_X : B.RAIL_Z);
}
