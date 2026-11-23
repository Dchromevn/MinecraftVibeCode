// Kinh nghiệm (Giai đoạn 8b2; MECHANICS.md mục 12): tổng điểm → cấp + tiến độ trong cấp. Người dùng chọn: chết không mất XP.
// Điểm để lên cấp kế: cấp 0–15: 2L + 7; 16–30: 5L − 38; 31+: 9L − 158.

export const XP = {
  ORE: { ore_coal: [0, 2], ore_diamond: [3, 7], ore_emerald: [3, 7], ore_lapis: [2, 5], ore_lapis_deep: [2, 5], nether_quartz_ore: [2, 5], nether_gold_ore: [0, 1] } as Readonly<Record<string, readonly [number, number]>>,
  HOSTILE: 5, ANIMAL: [1, 3] as readonly [number, number], BREED: [1, 7] as readonly [number, number], TRADE: [3, 6] as readonly [number, number],
  /** Nung: điểm mỗi món lấy ra (Minecraft: sắt 0.7, vàng 1, đồ ăn 0.35, cát → kính 0.1...). */
  SMELT: { netherite_scrap: 2, iron_ingot: 0.7, gold_ingot: 1, glass: 0.1, stone: 0.1, cooked_beef: 0.35, cooked_porkchop: 0.35, cooked_chicken: 0.35,
    cooked_mutton: 0.35, cooked_rabbit: 0.35, cooked_cod: 0.35, cooked_salmon: 0.35, baked_potato: 0.35, charcoal: 0.15 } as Readonly<Record<string, number>>,
  ORB_KEY: "xp_orb", // vật phẩm rơi đặc biệt: số lượng = điểm XP, nhặt thì cộng XP
  ATTRACT_R: 7.5, ATTRACT_SPEED: 8, // quả cầu bay về người chơi trong tầm này
  MOB_XP: { blaze: 10, zombie_villager: 5, pillager: 5, iron_golem: 0, villager: 0, wandering_trader: 0, bat: 0, allay: 0, trader_llama: 1, evoker: 10, vex: 3, ghast: 5, zombified_piglin: 5, hoglin: 5, piglin_brute: 20 } as Readonly<Record<string, number>>,
  /** Lệnh /xp (quản trị viên, để thử): cấp cao nhất cho phép. */
  CMD_MAX_LEVEL: 1000,
};

/** Điểm để đi từ cấp L lên L + 1. */
export const xpToNext = (l: number): number => (l <= 15 ? 2 * l + 7 : l <= 30 ? 5 * l - 38 : 9 * l - 158);

/** Tổng điểm của cấp L (bắt đầu cấp). */
export function xpTotalAt(l: number): number {
  let t = 0;
  for (let i = 0; i < l; i++) t += xpToNext(i);
  return t;
}

/** Tổng điểm → cấp + tiến độ (0..1). */
export function xpLevel(total: number): { level: number; progress: number } {
  let l = 0, left = Math.max(0, Math.floor(total));
  while (left >= xpToNext(l)) left -= xpToNext(l++);
  return { level: l, progress: left / xpToNext(l) };
}

/** Bớt n cấp (bàn phù phép): giữ tỉ lệ tiến độ trong cấp như Minecraft (gần đúng: về đầu cấp mới + phần dư). */
export function spendLevels(total: number, n: number): number {
  const { level, progress } = xpLevel(total), to = Math.max(0, level - n);
  return xpTotalAt(to) + Math.floor(progress * xpToNext(to));
}

/** Lệnh /xp: đổi tổng điểm theo "<số>" (điểm) hoặc "<số>L" (cấp); set = đặt đúng giá trị thay vì cộng. Kết quả trong [0, cấp tối đa]; null nếu sai cú pháp. */
export function xpCommand(total: number, arg: string, set: boolean): number | null {
  const m = /^(-?\d{1,9})(l?)$/i.exec(arg);
  if (!m) return null;
  const n = Number(m[1]), max = xpTotalAt(XP.CMD_MAX_LEVEL);
  if (m[2]) { // theo cấp: giữ tiến độ trong cấp
    const { level, progress } = xpLevel(total), to = Math.max(0, Math.min(XP.CMD_MAX_LEVEL, set ? n : level + n));
    return set ? xpTotalAt(to) : Math.min(max, xpTotalAt(to) + Math.floor(progress * xpToNext(to)));
  }
  return Math.max(0, Math.min(max, set ? n : total + n));
}
