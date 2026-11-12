// Các loài gỗ (DESIGN.md 2.13, Giai đoạn 4d): sồi (id cũ), thông, bạch dương, keo. Mỗi loài có
// thân, lá, ván, cây non với id riêng; mọi chỗ kiểm "là thân gỗ / lá / cây non" dùng các hàm ở đây.
import { B, BLOCKS, type BlockId } from "./blocks.js";

export type WoodKind = "oak" | "spruce" | "birch" | "acacia";

export interface Wood {
  kind: WoodKind;
  log: BlockId;
  leaves: BlockId;
  planks: BlockId;
  sapling: BlockId;
}

export const WOODS: readonly Wood[] = [
  { kind: "oak", log: B.LOG, leaves: B.LEAVES, planks: B.PLANKS, sapling: B.SAPLING },
  { kind: "spruce", log: B.SPRUCE_LOG, leaves: B.SPRUCE_LEAVES, planks: B.SPRUCE_PLANKS, sapling: B.SPRUCE_SAPLING },
  { kind: "birch", log: B.BIRCH_LOG, leaves: B.BIRCH_LEAVES, planks: B.BIRCH_PLANKS, sapling: B.BIRCH_SAPLING },
  { kind: "acacia", log: B.ACACIA_LOG, leaves: B.ACACIA_LEAVES, planks: B.ACACIA_PLANKS, sapling: B.ACACIA_SAPLING },
];

const BY_KIND = new Map<WoodKind, Wood>(WOODS.map((w) => [w.kind, w]));
const OF_BLOCK = new Map<number, Wood>();
for (const w of WOODS) for (const id of [w.log, w.leaves, w.planks, w.sapling]) OF_BLOCK.set(id, w);
const LOGS = new Set<number>(WOODS.map((w) => w.log));
const LEAVES = new Set<number>(WOODS.map((w) => w.leaves));
const SAPLINGS = new Set<number>(WOODS.map((w) => w.sapling));
const PLANKS = new Set<number>(WOODS.map((w) => w.planks));

export const wood = (kind: WoodKind): Wood => BY_KIND.get(kind)!;
/** Loài gỗ của block (thân, lá, ván, cây non), hoặc undefined. */
export const woodOf = (id: number): Wood | undefined => OF_BLOCK.get(id);
export const isLog = (id: number): boolean => LOGS.has(id);
export const isLeaves = (id: number): boolean => LEAVES.has(id);
export const isSapling = (id: number): boolean => SAPLINGS.has(id);
export const isPlanks = (id: number): boolean => PLANKS.has(id);

/** Khóa vật phẩm của mọi thân gỗ / ván gỗ (nhóm nguyên liệu "#log", "#planks" trong công thức, nhiên liệu lò). */
export const LOG_ITEMS: readonly string[] = WOODS.map((w) => BLOCKS[w.log]!.key);
export const PLANK_ITEMS: readonly string[] = WOODS.map((w) => BLOCKS[w.planks]!.key);
export const SAPLING_ITEMS: readonly string[] = WOODS.map((w) => BLOCKS[w.sapling]!.key);

/** Hoa (Giai đoạn 4d): mọc như cỏ cao, hái ra chính nó, làm thuốc nhuộm. */
export const FLOWER_BLOCKS: readonly BlockId[] = [B.DANDELION, B.POPPY, B.CORNFLOWER, B.LILY_OF_THE_VALLEY];
const FLOWER_SET = new Set<number>(FLOWER_BLOCKS);
export const isFlower = (id: number): boolean => FLOWER_SET.has(id);
