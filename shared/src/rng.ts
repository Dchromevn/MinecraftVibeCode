// Bộ sinh số ngẫu nhiên có seed. Không dùng Math.random ở bất kỳ đâu trong /shared.

/** FNV-1a 32 bit cho chuỗi. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Chuỗi seed người dùng nhập → số 32 bit. Chuỗi toàn số thì dùng trực tiếp. */
export function seedFromString(s: string): number {
  const t = s.trim();
  if (t !== "" && /^-?\d+$/.test(t)) return Number(t) >>> 0;
  return hashString(t === "" ? "voxel" : t);
}

/** Trộn nhiều số nguyên thành một seed con (ví dụ seed + tọa độ chunk). */
export function hashInts(...nums: number[]): number {
  let h = 0x9e3779b9;
  for (const n of nums) {
    h ^= n >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

export type Rng = () => number; // trả về [0, 1)

/** mulberry32: nhanh, đủ tốt cho sinh thế giới. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Số nguyên trong [min, max]. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
