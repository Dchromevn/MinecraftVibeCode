// Thông số làng (Giai đoạn 8a) — theo Minecraft (structure_set "villages", structure village_* trong client.jar; Minecraft Wiki).
// Thế giới chia vùng SPACING × SPACING chunk (34 × 16 = 544 block); mỗi vùng thử một chunk ngẫu nhiên cách mép xa ≥ SEPARATION;
// biome ở đó hợp thì dựng làng bằng khối ghép (jigsaw) từ quảng trường, sâu tối đa MAX_DEPTH lớp, không quá MAX_DIST block từ tâm.

export const VILLAGE_TYPES = ["plains", "desert", "savanna", "snowy", "taiga"] as const;
export type VillageType = (typeof VILLAGE_TYPES)[number];

export const VILLAGE = {
  SPACING: 34, SEPARATION: 8, SALT: 10387312,
  MAX_DEPTH: 6,
  MAX_DIST: 80,
  MIN_HOUSES: 3, // ghép xong ít nhà hơn thế thì bỏ làng
  /** Dò 9 điểm quanh tâm (bán kính SLOPE_R): ít nhất MIN_DRY điểm trên cạn, chênh cao ≤ MAX_SLOPE (núi dốc thì không đặt làng). */
  MAX_SLOPE: 12, SLOPE_R: 24, MIN_DRY: 6,
  /** Nhà người chơi tự lưu (/structure save): trọng số mỗi nhà trong nhóm nhà của mọi loại làng (nhà Minecraft: 1–3). */
  CUSTOM_WEIGHT: 6,
  MOSSY: { mossify_10_percent: 0.1, mossify_20_percent: 0.2, mossify_70_percent: 0.7 } as Readonly<Record<string, number>>,
  STREET_GRASS: 0.1, // đường đất → cỏ 10% (street_plains)
  WET_STREET: 0.4, // đoạn đường có hơn 40% mặt đường trên nước thì bỏ
} as const;

/** Bàn nghề → nghề của dân làng (Minecraft: dân làng thất nghiệp nhận bàn nghề gần nhất). */
export const PROFESSIONS = [
  "farmer", "fisherman", "shepherd", "fletcher", "librarian", "cartographer", "cleric", "armorer", "weaponsmith", "toolsmith",
  "butcher", "leatherworker", "mason",
] as const;
export type Profession = (typeof PROFESSIONS)[number] | "nitwit" | "none";

/** Dân làng, người sắt, mèo, dân làng xác sống, thương nhân lang thang, lạc đà (MECHANICS.md 8.3–8.4, mục 8a). */
export const VILLAGERS = {
  HOME_R: 40, // ban ngày đi lang thang trong chừng này block quanh chỗ sinh (giữa làng)
  FLEE_R: 8, // xác sống trong tầm này: chạy
  TRADE_R: 6, // xa hơn thì đóng bảng đổi đồ
  RESTOCK_S: 600, // bổ sung hàng (Minecraft: 2 lần mỗi ngày)
  GROW_S: 1200, // dân làng con lớn sau 20 phút
  JOB_R: 24, // bàn nghề trong tầm này quyết định nghề lúc sinh
};
export const GOLEM = {
  DAMAGE: [7, 21] as readonly [number, number], // sát thương ngẫu nhiên
  TOSS_V: 8, // hất lên (block / giây)
  TARGET_R: 16,
  HOME_R: 24, // tuần tra quanh giữa làng
  ANGRY_S: 60, // giận người đánh mình / dân làng
  WITNESS_R: 16, // người đánh dân làng trong tầm này thì người sắt giận
};
export const CATS = {
  TAME_CHANCE: 1 / 3, // mỗi con cá
  CREEPER_AVOID_R: 6, // quái nổ tránh mèo
  PHANTOM_AVOID_R: 16, // bóng ma đêm không lao xuống người có mèo gần
  FLEE_R: 6, // mèo hoang chạy khi người lại gần (trừ khi đang cầm cá và rón rén)
  FOLLOW_R: 10, TELEPORT_R: 24, // mèo thuần đi theo chủ / dịch chuyển tới chủ
};
export const ZOMBIE_VILLAGER = {
  CONVERT_CHANCE: 0.5, // dân làng bị xác sống giết → dân làng xác sống (độ khó thường)
  CURE_S: [120, 300] as readonly [number, number], // cho táo vàng: chừng này giây thì thành dân làng
  HUNT_R: 32, // xác sống thấy dân làng trong tầm này thì đuổi (khi không có người chơi)
};
export const TRADER = {
  TRY_S: 1200, // 20 phút thử một lần
  CHANCE: [0.25, 0.5, 0.75] as readonly number[], // xác suất lần thử 1, 2, 3+ (thành công thì về lại 25%)
  DIST: [24, 48] as readonly [number, number], // xuất hiện cách người chơi
  LIFE_S: [2400, 3600] as readonly [number, number], // đi sau 40–60 phút
  COMMON: 5, RARE: 1,
  LLAMAS: 2,
};
export const CAMEL = {
  SPEED: 3.9, // block / giây khi cưỡi
  DASH_SPEED: 11, DASH_S: 0.4, DASH_CD_S: 2.75, DASH_JUMP: 1.2, // Space: lướt ~4 block, chờ 2.75 giây
  BACK_SEAT: 1.75, BACK_OFF: 0.55, // người ngồi sau: chân cao hơn chân lạc đà / lùi sau người lái
};

