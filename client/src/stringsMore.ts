// Văn bản tiếng Việt (phần 2 của strings.ts — tách vì giới hạn 300 dòng mỗi file; strings.ts gộp vào STR). Giai đoạn 8b2: phù phép,
// kinh nghiệm, mía, sách, lưu ly.
export const STR_MORE = {
  ench: {
    protection: "Bảo vệ", fire_protection: "Chống lửa", feather_falling: "Rơi nhẹ", blast_protection: "Chống nổ",
    projectile_protection: "Chống đạn", respiration: "Hô hấp", aqua_affinity: "Thích nghi nước", thorns: "Gai",
    depth_strider: "Sải chân dưới nước", frost_walker: "Đi trên băng", soul_speed: "Tốc độ linh hồn", sharpness: "Sắc bén", smite: "Phán xét",
    bane_of_arthropods: "Khắc tinh chân đốt", knockback: "Đẩy lùi", fire_aspect: "Lưỡi lửa", looting: "Cướp bóc", sweeping_edge: "Quét",
    efficiency: "Hiệu suất", silk_touch: "Cảm ứng tơ", unbreaking: "Không phá vỡ", fortune: "May mắn", power: "Sức mạnh",
    punch: "Đấm", flame: "Mũi tên lửa", infinity: "Vô hạn", multishot: "Bắn ba", quick_charge: "Nạp nhanh", piercing: "Xuyên", mending: "Vá",
  } as Record<string, string>,
  enchantHint: "Cần cấp {0} · tốn {1} lưu ly và {1} cấp",
  anvilName: "Đặt tên…", anvilCost: "Giá: {0} cấp", anvilTooExpensive: "Quá đắt!", grindXp: "Gỡ phù phép: nhận lại một ít kinh nghiệm",
  xpLevel: "Cấp",
  items: {
    paper: "Giấy", book: "Sách", lapis_lazuli: "Lưu ly", sugar_cane: "Mía", enchanted_book: "Sách phù phép", xp_orb: "Quả cầu kinh nghiệm",
    totem_of_undying: "Vật tổ bất tử", // 8c
  } as Record<string, string>,
  blocks: {
    anvil: "Đe", chipped_anvil: "Đe sứt", damaged_anvil: "Đe hỏng nặng",
    sugar_cane: "Mía", ore_lapis: "Quặng lưu ly", ore_lapis_deep: "Quặng lưu ly đá sâu", lapis_block: "Khối lưu ly", enchanting_table: "Bàn phù phép",
    // 8c: gỗ sồi tối (bậc / tấm / hàng rào / cửa ghép tên ở strings.ts)
    dark_oak_log: "Thân gỗ sồi tối", dark_oak_planks: "Ván gỗ sồi tối", dark_oak_leaves: "Lá sồi tối", dark_oak_sapling: "Cây sồi tối non",
  } as Record<string, string>,
  // 8c: đao phủ, pháp sư, tiểu quỷ; hiệu ứng kháng lửa (vật tổ bất tử); rừng sồi tối
  mobs: { vindicator: "Đao phủ", evoker: "Pháp sư", vex: "Tiểu quỷ" } as Record<string, string>,
  effects: { fire_resistance: "Kháng lửa" } as Record<string, string>,
  darkForest: "Rừng sồi tối",
  // 10a: Vực Lửa
  netherWastes: "Hoang mạc Vực Lửa",
  netherItems: { glowstone_dust: "Bụi đá phát sáng", quartz: "Thạch anh Vực Lửa", gold_nugget: "Mảnh vàng" } as Record<string, string>,
  netherBlocks: {
    soul_sand: "Cát linh hồn", glowstone: "Đá phát sáng", nether_quartz_ore: "Quặng thạch anh Vực Lửa", nether_gold_ore: "Quặng vàng Vực Lửa",
    quartz_block: "Khối thạch anh", nether_portal: "Cổng Vực Lửa",
  } as Record<string, string>,
};
