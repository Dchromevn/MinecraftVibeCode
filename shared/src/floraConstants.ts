// Loài cây, hoa, xương rồng (DESIGN.md 2.13, Giai đoạn 4d). Mọi con số sinh thế giới / lớn lên ở đây.

/** Phiên bản bộ sinh thế giới: tăng khi đổi cách sinh (5b ghi vào file lưu). */
export const WORLDGEN_VERSION = 12; // 1: tới 4c; 2: 4d (loài cây, hoa, xương rồng); 3: 7b (đá nhiễm, lồng sinh quái); 4: 7b (loài lồng, hầm quái); 5: 7b (nhà phù thủy); 6: 7b (đầm lầy); 7: 7e (công trình); 8: 8a (làng); 9: 8b (tiền đồn kẻ cướp); 10: 8b2 (mía, lưu ly); 11: 8c (rừng sồi tối, dinh thự rừng); 12: 10b (4 biome Vực Lửa)

/** Chiều cao thân (số khúc gỗ) theo loài; sồi giữ như WORLD.TREE_TRUNK_MIN/MAX. */
export const TREE_SPECIES = {
  oak: { trunkMin: 4, trunkMax: 6 },
  birch: { trunkMin: 5, trunkMax: 7 },
  spruce: { trunkMin: 6, trunkMax: 9 },
  acacia: { trunkMin: 5, trunkMax: 7 },
  dark_oak: { trunkMin: 6, trunkMax: 8 }, // (8c) thân 2 × 2
  /** Tầm xa nhất của lá / thân tính từ gốc (để biết cây ở chunk kề có chạm chunk này không). */
  MAX_REACH: 5,
  SPRUCE_MAX_RADIUS: 3,
  ACACIA_CANOPY_RADIUS: 3,
  ACACIA_BRANCH_CHANCE: 0.5,
  DARK_OAK_CANOPY_RADIUS: 3,
} as const;

/** Loài cây theo biome (tỉ lệ trong số cây mọc ở đó). */
export const TREE_MIX = {
  FOREST_BIRCH: 0.3, // rừng: 30% bạch dương, còn lại sồi
  PLAINS_BIRCH: 0.1, // đồng cỏ thường: 10% bạch dương
  MOUNTAIN_SPRUCE: 0.7, // chân núi: 70% thông
  // đồng cỏ "nóng và khô" (gần sa mạc): cây keo
  ACACIA_TEMP: 0.1,
  ACACIA_HUMID: 0.05,
  DARK_FOREST_OAK: 0.8, // (8c) rừng sồi tối: 80% sồi tối, 10% bạch dương, 10% sồi
  DARK_FOREST_BIRCH: 0.9,
} as const;

export type FlowerKey = "dandelion" | "poppy" | "cornflower" | "lily_of_the_valley";

/** Hoa mọc theo đám: mỗi ô lưới FLOWER_CELL có thể có một đám (một loại hoa) quanh một tâm. */
export const FLOWERS = {
  CELL: 12,
  RADIUS: 3, // bán kính đám
  DENSITY: 0.45, // xác suất mỗi ô cỏ trong đám có hoa
  PATCH_CHANCE: { plains: 0.55, forest: 0.4, mountains: 0.15, dark_forest: 0.15 } as Readonly<Record<string, number>>,
  TYPES: {
    plains: ["dandelion", "poppy", "cornflower"],
    forest: ["dandelion", "poppy", "lily_of_the_valley"],
    dark_forest: ["dandelion", "poppy", "lily_of_the_valley"],
    mountains: ["dandelion", "poppy"],
  } as Readonly<Record<string, readonly FlowerKey[]>>,
} as const;

/** Xương rồng: sinh ở sa mạc theo lưới (hai cây không bao giờ sát nhau), lớn theo random tick. */
export const CACTUS = {
  CELL: 4, // vị trí trong ô 0..2 nên hai ô kề cách nhau ≥ 2 block
  CHANCE: 0.08, // xác suất mỗi ô lưới có cây
  HEIGHT_MIN: 1,
  HEIGHT_MAX: 3, // cả khi sinh lẫn khi tự lớn
  GROW_AGE: 15, // random tick tăng tuổi; đủ tuổi thì mọc thêm một khúc
  DAMAGE: 1, // chạm vào (miễn sát thương 0.5 giây giữa các lần)
} as const;

/** Rơi ra từ lá: cây non đúng loài, que, táo (chỉ lá sồi). */
export const LEAF_DROPS = { SAPLING: 0.05, STICK: 0.02, APPLE: 0.05 } as const;
