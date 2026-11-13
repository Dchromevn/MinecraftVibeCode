// Toàn bộ văn bản hiển thị trong game gom ở đây để dễ dịch.
export const STR = {
  title: "Voxel Survival",
  stage: "Giai đoạn 4f — 16 màu, đồ sắt",
  clickToControl:
    "Bấm vào màn hình để điều khiển\n" +
    "WASD đi · Space nhảy / bơi lên / leo thang · C ngồi (khi bay: xuống) · Shift hoặc nhấn đúp W chạy nhanh (khi bay: bay nhanh)\n" +
    "F bật/tắt bay · Esc thả chuột · [ ] tầm nhìn · N nhìn đêm\n" +
    "Giữ chuột trái đào · chuột phải đặt / giữ để ăn / cuốc đất / mở bàn, rương, lò, cửa (C: đặt) · 1–9 / lăn chuột chọn ô\n" +
    "E túi đồ · Q vứt (Shift+Q cả chồng)",
  loadingTextures: "Đang nạp texture...",
  loadingWorld: "Đang tải thế giới...",
  joinName: "Tên người chơi",
  joinButton: "Vào game",
  joinHint: "Chữ cái không dấu, số, dấu _ (tối đa 16 ký tự). Thoát rồi vào lại cùng tên thì giữ nguyên túi đồ.",
  joinConnecting: "Đang kết nối...",
  joinErrors: {
    name: "Tên chỉ gồm chữ cái không dấu, số, dấu _.",
    taken: "Tên này đang có người chơi.",
    version: "Phiên bản game khác server — tải lại trang.",
    connect: "Không kết nối được server (đã chạy npm run dev / npm run host chưa?).",
  } as Record<string, string>,
  disconnected: "Mất kết nối tới server. Tải lại trang để vào lại.",
  hudPlayers: "Người chơi",
  hudFps: "FPS",
  hudPos: "Vị trí",
  hudChunk: "Chunk",
  hudBiome: "Biome",
  hudGround: "mặt đất",
  hudLoaded: "Chunk trong bộ nhớ",
  hudMeshed: "có mesh",
  hudModified: "đã sửa",
  hudSections: "đoạn vẽ",
  hudCulling: "Ẩn hang khuất",
  hudNightVision: "Nhìn đêm",
  on: "bật",
  off: "tắt",
  hudJobs: "Đang sinh / dựng",
  hudWorkers: "worker",
  hudViewDistance: "Tầm nhìn",
  hudTriangles: "Tam giác",
  hudDrawCalls: "Lệnh vẽ",
  hudMemory: "Bộ nhớ JS",
  hudSeed: "Seed",
  hudSelected: "Block đặt (1–9, lăn chuột)",
  hudMode: "Chế độ",
  modeWalking: "đi bộ",
  modeFlying: "bay",
  hudHealth: "Máu",
  stateFrozen: "chờ tải chunk",
  stateGround: "trên đất",
  stateAir: "trên không",
  stateWater: "trong nước",
  stateLava: "trong dung nham",
  stateLadder: "trên thang",
  stateWeb: "mạng nhện",
  stateBurning: "đang cháy",
  stateSneaking: "ngồi",
  hudAir: "Dưỡng khí",
  hudDropped: "Rơi ra",
  hudHunger: "Đói",
  inventoryTitle: "Túi đồ",
  craftingTitle: "Chế tạo",
  recipeBook: "Sổ công thức",
  chestLarge: "Rương lớn",
  needWorkbench: "cần bàn chế tạo",
  craftHint: "Sổ công thức: bấm để xếp nguyên liệu vào lưới (Shift: nhiều bộ)\nÔ kết quả: bấm để lấy (Shift: làm liên tục)",
  youDied: "Bạn đã chết",
  respawn: "Hồi sinh",
  durability: "Độ bền",
  items: {
    stick: "Que", coal: "Than", raw_iron: "Sắt thô", iron_ingot: "Thỏi sắt", raw_gold: "Vàng thô",
    gold_ingot: "Thỏi vàng", diamond: "Kim cương", emerald: "Ngọc lục bảo", flint: "Đá lửa", string: "Sợi tơ",
    feather: "Lông gà", leather: "Da", wheat: "Lúa mì", arrow: "Mũi tên", bow: "Cung",
    seeds: "Hạt lúa", door: "Cửa gỗ sồi", apple: "Táo", bread: "Bánh mì", golden_apple: "Táo vàng",
    carrot: "Cà rốt", potato: "Khoai tây", baked_potato: "Khoai tây nướng", beetroot: "Củ cải đường",
    beetroot_seeds: "Hạt củ cải đường", beetroot_soup: "Súp củ cải đường", melon_slice: "Lát dưa hấu",
    melon_seeds: "Hạt dưa hấu", pumpkin_seeds: "Hạt bí ngô", bowl: "Bát gỗ",
    bucket: "Xô", water_bucket: "Xô nước", lava_bucket: "Xô dung nham",
    iron_nugget: "Mảnh sắt", shears: "Kéo", flint_and_steel: "Bật lửa",
    "#planks": "Ván gỗ (loại nào cũng được)", "#log": "Thân gỗ (loại nào cũng được)",
    "#wool": "Len (màu nào cũng được)", "#bed": "Giường (màu nào cũng được)",
  } as Record<string, string>,
  toolKinds: { pickaxe: "Cuốc", axe: "Rìu", shovel: "Xẻng", sword: "Kiếm", hoe: "Cuốc đất" } as Record<string, string>,
  armorPieces: { helmet: "Mũ", chestplate: "Áo giáp", leggings: "Quần giáp", boots: "Giày" } as Record<string, string>,
  tiers: { wood: "gỗ", stone: "đá", iron: "sắt", gold: "vàng", diamond: "kim cương", leather: "da" } as Record<string, string>,
  hudMissingTextures: "Texture vẽ tạm",
  biomes: ["Đồng cỏ", "Rừng", "Sa mạc", "Đồng tuyết", "Núi", "Đại dương"],
  blocks: {
    stone: "Đá",
    dirt: "Đất",
    planks: "Ván gỗ sồi",
    log: "Thân gỗ sồi",
    cobble: "Đá cuội",
    sand: "Cát",
    tallgrass: "Cỏ cao",
    bedrock: "Đá nền",
    gravel: "Sỏi",
    sandstone: "Sa thạch",
    sapling: "Cây sồi non",
    torch: "Đuốc",
    glass: "Kính",
    fence: "Hàng rào gỗ sồi",
    rail: "Đường ray",
    ladder: "Thang",
    cobweb: "Mạng nhện",
    furnace: "Lò nung",
    door: "Cửa gỗ sồi",
    bed: "Giường",
    farmland: "Đất cày",
    wheat: "Lúa mì",
    carrots: "Cà rốt",
    potatoes: "Khoai tây",
    beetroots: "Củ cải đường",
    melon: "Dưa hấu",
    pumpkin: "Bí ngô",
    melon_stem: "Thân dưa hấu",
    pumpkin_stem: "Thân bí ngô",
    obsidian: "Đá vỏ chai",
    mossy_cobble: "Đá cuội rêu",
    deepslate: "Đá sâu",
    ore_coal: "Quặng than",
    ore_iron: "Quặng sắt",
    ore_gold: "Quặng vàng",
    ore_gold_deep: "Quặng vàng đá sâu",
    ore_diamond: "Quặng kim cương",
    ore_emerald: "Quặng ngọc lục bảo",
    snow_layer: "Tuyết phủ",
    water: "Nước",
    lava: "Dung nham",
    workbench: "Bàn chế tạo",
    chest: "Rương",
    leaves: "Lá sồi",
    grass: "Cỏ",
    spruce_log: "Thân gỗ thông", spruce_planks: "Ván gỗ thông", spruce_leaves: "Lá thông", spruce_sapling: "Cây thông non",
    birch_log: "Thân gỗ bạch dương", birch_planks: "Ván gỗ bạch dương", birch_leaves: "Lá bạch dương", birch_sapling: "Cây bạch dương non",
    acacia_log: "Thân gỗ keo", acacia_planks: "Ván gỗ keo", acacia_leaves: "Lá keo", acacia_sapling: "Cây keo non",
    dandelion: "Bồ công anh", poppy: "Anh túc", cornflower: "Hoa ngô xanh", lily_of_the_valley: "Linh lan",
    cactus: "Xương rồng",
    stone_bricks: "Gạch đá",
    wool: "Len", carpet: "Thảm", stained_glass: "Kính màu", glass_pane: "Tấm kính", stained_glass_pane: "Tấm kính màu",
    iron_bars: "Song sắt", fire: "Lửa", coal_block: "Khối than", iron_block: "Khối sắt", gold_block: "Khối vàng",
    diamond_block: "Khối kim cương", emerald_block: "Khối ngọc lục bảo", raw_iron_block: "Khối sắt thô",
    raw_gold_block: "Khối vàng thô", lantern: "Lồng đèn", iron_door: "Cửa sắt", stone_button: "Nút đá",
    oak_button: "Nút gỗ", lever: "Cần gạt",
  } as Record<string, string>,
  serverConnecting: "Server: đang kết nối...",
  serverConnected: "Server: đã kết nối",
  serverDisconnected: "Server: mất kết nối",
} as const;

// Giai đoạn 4e: tên bậc / tấm / tường ghép theo vật liệu; hàng rào, cửa theo loài gỗ.
const MATERIAL_NAMES: Record<string, string> = {
  stone: "đá", cobble: "đá cuội", mossy_cobble: "đá cuội rêu", sandstone: "sa thạch", deepslate: "đá sâu",
  stone_brick: "gạch đá", oak: "gỗ sồi", spruce: "gỗ thông", birch: "gỗ bạch dương", acacia: "gỗ keo",
};
for (const [m, n] of Object.entries(MATERIAL_NAMES)) {
  STR.blocks[`${m}_stairs`] = `Bậc ${n}`;
  STR.blocks[`${m}_slab`] = `Tấm ${n}`;
  STR.blocks[`${m}_wall`] = `Tường ${n}`;
}
for (const w of ["spruce", "birch", "acacia"]) {
  STR.blocks[`${w}_fence`] = `Hàng rào ${MATERIAL_NAMES[w]}`;
  STR.blocks[`${w}_door`] = `Cửa ${MATERIAL_NAMES[w]}`;
}

// Giai đoạn 4f: tên đồ 16 màu.
const COLOR_NAMES: Record<string, string> = {
  white: "trắng", orange: "cam", magenta: "đỏ tía", light_blue: "xanh nhạt", yellow: "vàng", lime: "vàng chanh",
  pink: "hồng", gray: "xám", light_gray: "xám nhạt", cyan: "lục lam", purple: "tím", blue: "xanh dương",
  brown: "nâu", green: "xanh lá", red: "đỏ", black: "đen",
};
for (const [c, n] of Object.entries(COLOR_NAMES)) {
  STR.items[`${c}_dye`] = `Thuốc nhuộm ${n}`;
  STR.items[`${c}_wool`] = `Len ${n}`;
  STR.items[`${c}_carpet`] = `Thảm ${n}`;
  STR.items[`${c}_stained_glass`] = `Kính màu ${n}`;
  STR.items[`${c}_stained_glass_pane`] = `Tấm kính màu ${n}`;
  STR.items[`${c}_bed`] = `Giường ${n}`;
}
