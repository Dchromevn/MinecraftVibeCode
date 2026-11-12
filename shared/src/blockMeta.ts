// Mã hóa / giải mã dữ liệu phụ của block (ý nghĩa từng kiểu xem MetaKind trong blocks.ts).
// "Ô" (cell) = id | dữ liệu phụ << 8: một số nguyên mang cả hai, dùng cho get/set.
import { B, BLOCKS, META_MASK } from "./blocks.js";
import { FURNACE } from "./constants.js";

// ---- ô = id + dữ liệu phụ ----
export const makeCell = (id: number, meta = 0): number => id | (meta << 8);
export const cellId = (cell: number): number => cell & 255;
export const cellMeta = (cell: number): number => (cell >> 8) & 255;

/** Bỏ các bit không dùng; block không có dữ liệu phụ luôn trả 0. */
export function sanitizeMeta(id: number, meta: number): number {
  const kind = BLOCKS[id]?.meta ?? "none";
  const m = meta & META_MASK[kind];
  if (kind === "torch" && m > 4) return 0;
  return m;
}

// ---- hướng ngang: 0 Nam (+Z), 1 Tây (−X), 2 Bắc (−Z), 3 Đông (+X) ----
export const HDX = [0, -1, 0, 1] as const;
export const HDZ = [1, 0, -1, 0] as const;
export const opposite = (d: number): number => (d + 2) & 3;

/** Hướng của vectơ ngang (theo trục trội); null nếu vectơ bằng 0. */
export function dirOf(x: number, z: number): number | null {
  if (x === 0 && z === 0) return null;
  if (Math.abs(x) > Math.abs(z)) return x > 0 ? 3 : 1;
  return z > 0 ? 0 : 2;
}

/** Hướng người chơi đang nhìn (yaw như camera: nhìn về −Z khi yaw = 0). */
export function dirFromYaw(yaw: number): number {
  return dirOf(-Math.sin(yaw), -Math.cos(yaw))!;
}

/** Xoay điểm (x, z) trong ô quanh tâm theo hướng d (hình gốc vẽ cho hướng 0 = Nam). */
export function rotXZ(x: number, z: number, d: number): [number, number] {
  for (let i = 0; i < (d & 3); i++) [x, z] = [1 - z, x];
  return [x, z];
}

// ---- từng kiểu ----
/** Đuốc: null = cắm trên sàn, ngược lại là hướng bức tường. */
export const torchMeta = (wallDir: number | null): number => (wallDir === null ? 0 : wallDir + 1);
export const torchWall = (meta: number): number | null => (meta === 0 ? null : (meta - 1) & 3);

export const doorMeta = (facing: number, open: boolean, upper: boolean): number =>
  (facing & 3) | (open ? 4 : 0) | (upper ? 8 : 0);
export const doorFacing = (m: number): number => m & 3;
export const doorOpen = (m: number): boolean => (m & 4) !== 0;
export const doorUpper = (m: number): boolean => (m & 8) !== 0;
/** Cạnh của ô mà tấm cửa đang nằm sát (mở thì xoay sang cạnh kế bên). */
export const doorSide = (m: number): number => (doorOpen(m) ? (doorFacing(m) + 1) & 3 : doorFacing(m));

export const liquidLevel = (m: number): number => m & 7;
export const liquidFalling = (m: number): boolean => (m & 8) !== 0;

export const facingDir = (m: number): number => m & 3;
export const furnaceLit = (m: number): boolean => (m & 4) !== 0;

export const bedMeta = (dir: number, head: boolean): number => (dir & 3) | (head ? 4 : 0);
export const bedDir = (m: number): number => m & 3;
export const bedHead = (m: number): boolean => (m & 4) !== 0;

/** Ánh sáng phát ra theo id + dữ liệu phụ (lò nung chỉ sáng khi đang cháy). */
export function lightEmitOf(id: number, meta: number): number {
  if (id === B.FURNACE) return furnaceLit(meta) ? FURNACE.LIGHT_WHEN_LIT : 0;
  return BLOCKS[id]?.lightEmit ?? 0;
}

// ---- đường ray ----
export type RailKind = "straight" | "curve" | "t" | "cross";
const RAIL_KINDS: readonly RailKind[] = ["straight", "curve", "t", "cross"];
export const railMeta = (kind: RailKind, rot: number): number => (rot & 3) | (RAIL_KINDS.indexOf(kind) << 2);
export const railKind = (m: number): RailKind => RAIL_KINDS[(m >> 2) & 3]!;
export const railRot = (m: number): number => m & 3;

// mask: bit 1 Bắc (−Z), 2 Đông (+X), 4 Nam (+Z), 8 Tây (−X). Hình gốc (rot 0):
// thẳng = Bắc+Nam, cong = Nam+Đông, ngã ba = Bắc+Nam+Đông. Xoay 90° theo chiều kim đồng hồ.
const rotMask = (m: number): number => ((m << 1) | (m >> 3)) & 15;
export function railShape(mask: number): { kind: RailKind; rot: number } {
  const n = [1, 2, 4, 8].filter((b) => mask & b).length;
  if (n >= 4) return { kind: "cross", rot: 0 };
  if (n <= 1) return { kind: "straight", rot: mask & (2 | 8) ? 1 : 0 };
  const bases: [RailKind, number][] = n === 3 ? [["t", 1 | 4 | 2]] : [["straight", 1 | 4], ["curve", 4 | 2]];
  for (const [kind, base] of bases) {
    let m = base;
    for (let rot = 0; rot < 4; rot++) {
      if (m === mask) return { kind, rot };
      m = rotMask(m);
    }
  }
  return { kind: "straight", rot: 0 };
}

/** Dữ liệu phụ của ray tại một ô, theo các ray kề cùng độ cao. */
export function railMetaFromNeighbors(isRail: (dx: number, dz: number) => boolean): number {
  const mask = (isRail(0, -1) ? 1 : 0) | (isRail(1, 0) ? 2 : 0) | (isRail(0, 1) ? 4 : 0) | (isRail(-1, 0) ? 8 : 0);
  const s = railShape(mask);
  return railMeta(s.kind, s.rot);
}
