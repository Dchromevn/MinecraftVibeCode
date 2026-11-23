// Văn bản tiếng Việt Giai đoạn 10b (4 biome Vực Lửa, sinh vật Vực Lửa), 10c (pháo đài Vực Lửa, quỷ lửa, bộ xương héo, bóng tuyết, giáp
// ngựa, /locate) — strings.ts gộp vào STR.
export const STR_NETHER = {
  /** Tên biome theo chỉ số NB (hoang mạc, thung lũng cát linh hồn, rừng đỏ thẫm, rừng cong vênh, đồng bằng bazan). */
  biomes: ["Hoang mạc Vực Lửa", "Thung lũng cát linh hồn", "Rừng đỏ thẫm", "Rừng cong vênh", "Đồng bằng bazan"],
  mobs: {
    ghast: "Ma bay", zombified_piglin: "Người lợn xác sống", magma_cube: "Khối nhầy dung nham", strider: "Kẻ lội dung nham",
    hoglin: "Lợn rừng lửa", blaze: "Quỷ lửa", wither_skeleton: "Bộ xương héo",
    piglin: "Người lợn", piglin_brute: "Người lợn vệ binh", zoglin: "Lợn rừng xác sống", // 10d1
  } as Record<string, string>,
  items: {
    ghast_tear: "Nước mắt ma bay", magma_cream: "Kem dung nham", nether_wart: "Mụn cóc Vực Lửa",
    warped_fungus_on_a_stick: "Cần câu nấm cong vênh", gold_sword: "Kiếm vàng",
    nether_brick: "Viên gạch Vực Lửa", blaze_rod: "Que quỷ lửa", blaze_powder: "Bột quỷ lửa", fire_charge: "Cầu lửa nhỏ", snowball: "Bóng tuyết",
    snow_layer: "Lớp tuyết", iron_horse_armor: "Giáp ngựa sắt", golden_horse_armor: "Giáp ngựa vàng", diamond_horse_armor: "Giáp ngựa kim cương",
    wither_skeleton_skull: "Sọ bộ xương héo",
    glass_bottle: "Chai thủy tinh", water_bottle: "Chai nước", fire_resistance_potion: "Thuốc kháng lửa", // 10d1
    fire_resistance_splash_potion: "Thuốc kháng lửa (ném)", spectral_arrow: "Mũi tên quang phổ",
    netherite_scrap: "Mảnh netherite", netherite_ingot: "Thỏi netherite", netherite_upgrade_smithing_template: "Khuôn nâng cấp netherite", // 10d2
    compass: "La bàn", lodestone_compass: "La bàn đá nam châm", chain: "Xích",
  } as Record<string, string>,
  blocks: {
    soul_soil: "Đất linh hồn", basalt: "Bazan", polished_basalt: "Bazan mài", smooth_basalt: "Bazan nhẵn", blackstone: "Đá đen",
    polished_blackstone: "Đá đen mài", polished_blackstone_bricks: "Gạch đá đen mài", crimson_nylium: "Nylium đỏ thẫm",
    warped_nylium: "Nylium cong vênh", crimson_stem: "Thân nấm đỏ thẫm", warped_stem: "Thân nấm cong vênh",
    crimson_planks: "Ván nấm đỏ thẫm", warped_planks: "Ván nấm cong vênh", nether_wart_block: "Khối mụn cóc Vực Lửa",
    warped_wart_block: "Khối mụn cong vênh", shroomlight: "Đèn nấm", crimson_fungus: "Nấm đỏ thẫm", warped_fungus: "Nấm cong vênh",
    crimson_roots: "Rễ đỏ thẫm", warped_roots: "Rễ cong vênh", nether_sprouts: "Mầm Vực Lửa", weeping_vines: "Dây leo rủ",
    twisting_vines: "Dây leo xoắn", bone_block: "Khối xương", soul_fire: "Lửa linh hồn", nether_wart: "Mụn cóc Vực Lửa",
    soul_torch: "Đuốc linh hồn", crimson_stairs: "Bậc nấm đỏ thẫm", warped_stairs: "Bậc nấm cong vênh", crimson_slab: "Tấm nấm đỏ thẫm",
    warped_slab: "Tấm nấm cong vênh", crimson_fence: "Hàng rào nấm đỏ thẫm", warped_fence: "Hàng rào nấm cong vênh",
    crimson_door: "Cửa nấm đỏ thẫm", warped_door: "Cửa nấm cong vênh",
    nether_bricks: "Gạch Vực Lửa", cracked_nether_bricks: "Gạch Vực Lửa nứt", chiseled_nether_bricks: "Gạch Vực Lửa khắc",
    red_nether_bricks: "Gạch Vực Lửa đỏ", nether_brick_fence: "Hàng rào gạch Vực Lửa", nether_brick_stairs: "Bậc gạch Vực Lửa",
    red_nether_brick_stairs: "Bậc gạch Vực Lửa đỏ", nether_brick_slab: "Tấm gạch Vực Lửa", red_nether_brick_slab: "Tấm gạch Vực Lửa đỏ",
    nether_brick_wall: "Tường gạch Vực Lửa", red_nether_brick_wall: "Tường gạch Vực Lửa đỏ", wither_skeleton_skull: "Sọ bộ xương héo",
    // 10d2
    cracked_polished_blackstone_bricks: "Gạch đá đen mài nứt", chiseled_polished_blackstone: "Đá đen mài khắc", gilded_blackstone: "Đá đen mạ vàng",
    blackstone_stairs: "Bậc đá đen", polished_blackstone_stairs: "Bậc đá đen mài", polished_blackstone_brick_stairs: "Bậc gạch đá đen mài",
    blackstone_slab: "Tấm đá đen", polished_blackstone_slab: "Tấm đá đen mài", polished_blackstone_brick_slab: "Tấm gạch đá đen mài",
    blackstone_wall: "Tường đá đen", polished_blackstone_wall: "Tường đá đen mài", polished_blackstone_brick_wall: "Tường gạch đá đen mài",
    chain: "Xích", ancient_debris: "Phế tích cổ", netherite_block: "Khối netherite", lodestone: "Đá nam châm", respawn_anchor: "Mỏ neo hồi sinh",
  } as Record<string, string>,
  chat: {
    dieWither: "{0} héo mòn đến chết",
    locateFortress: "Pháo đài Vực Lửa gần nhất: x {0}, y {1}, z {2} (cách {3} block)",
    locateFortressOw: "Pháo đài Vực Lửa gần nhất ở tọa độ Vực Lửa x {0}, y {1}, z {2} (ứng với x {3}, z {4} ở thế giới chính)",
    locateNone: "Không tìm thấy pháo đài Vực Lửa nào trong vùng dò",
    locateBastion: "Tàn tích pháo đài lợn gần nhất: x {0}, y {1}, z {2} (cách {3} block)", // 10d2
    locateBastionOw: "Tàn tích pháo đài lợn gần nhất ở tọa độ Vực Lửa x {0}, y {1}, z {2} (ứng với x {3}, z {4} ở thế giới chính)",
    locateBastionNone: "Không tìm thấy tàn tích pháo đài lợn nào trong vùng dò",
    anchorSet: "Đã đặt điểm hồi sinh ở mỏ neo hồi sinh",
    locateFound: "{0} gần nhất: x {1}, y {2}, z {3} (cách {4} block)",
    locateFoundNether: "{0} gần nhất ở thế giới chính: x {1}, y {2}, z {3} (ứng với x {4}, z {5} ở Vực Lửa)",
    locateNotFound: "Không tìm thấy {0} nào trong 8192 block",
    anchorMissing: "Mỏ neo hồi sinh đã mất — hồi sinh ở điểm của thế giới",
    anchorEmpty: "Mỏ neo hồi sinh hết nạp — hồi sinh ở điểm của thế giới",
  } as Record<string, string>,
  /** Tên công trình cho /locate (tham số "place:<loại>"). */
  places: {
    village: "Làng", outpost: "Tiền đồn kẻ cướp", witch_hut: "Nhà phù thủy", mansion: "Dinh thự rừng", desert_pyramid: "Kim tự tháp sa mạc",
    igloo: "Lều tuyết", camp: "Trại bỏ hoang", shipwreck: "Tàu đắm", ocean_ruin: "Tàn tích đại dương", ruined_portal: "Cổng đổ nát",
  } as Record<string, string>,
  effects: { wither: "Héo", glowing: "Phát sáng", fire_resistance: "Kháng lửa" } as Record<string, string>,
  rideHintStrider: "Shift: xuống · cầm cần câu nấm cong vênh: tự đi theo hướng nhìn, chuột phải: tăng tốc",
};
