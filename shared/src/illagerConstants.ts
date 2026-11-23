// Thông số kẻ cướp (Giai đoạn 8b; MECHANICS.md 8.3 — người dùng chọn 2026-11-15: bỏ điềm xấu / cướp làng, giữ tiền đồn + đội tuần tra),
// tiểu linh, nỏ của người chơi. Theo Minecraft (Wiki) mức độ khó Thường.
/** (8b) Tiền đồn kẻ cướp (structure_set pillager_outposts): vùng 32 × 32 chunk, cách mép ≥ 8, chỉ 20% vùng có; không trong 10 chunk
 *  quanh làng; cùng biome với làng; ghép sâu 7 lớp trong 80 block. Kẻ cướp sinh liên tục trong tiền đồn (cả ban ngày). */
export const OUTPOST = {
  SPACING: 32, SEPARATION: 8, SALT: 165745296, FREQUENCY: 0.2, VILLAGE_EXCLUSION_CHUNKS: 10, MAX_DEPTH: 7,
  SPAWN_R: 48, // người chơi trong tầm này: tiền đồn sinh kẻ cướp
  SPAWN_TRY_S: 4, SPAWN_MAX: 6, // mỗi 4 giây thử một con, tối đa 6 con quanh tiền đồn
};

export const PILLAGER = {
  DAMAGE: [3, 5] as readonly [number, number], // mũi tên nỏ (Thường: 4)
  ARROW_SPEED: 32, // block / giây (1.6 block / tick như Minecraft)
  RANGE: 12, MIN_RANGE: 4, // bắn trong tầm này, gần hơn thì lùi
  CHARGE_S: 1.25, // lên dây trước mỗi phát
};
/** Đội tuần tra: 10–11 phút thử một lần, 20%, chỉ từ ngày thứ 5; 2–5 tên cách người chơi 24–48 block, đội trưởng dẫn đi xa. */
export const PATROL = {
  TRY_S: [600, 660] as readonly [number, number], CHANCE: 0.2, MIN_DAY: 5,
  SIZE: [2, 5] as readonly [number, number], DIST: [24, 48] as readonly [number, number],
  WANDER: 512, // đội trưởng chọn điểm đến cách đó chừng này
  FOLLOW_R: 6, // lính đi theo đội trưởng khi xa hơn
  LIFE_S: 1200, // không ai ở gần 20 phút: tự biến mất (như quái thường, gỡ khi xa)
};
/** Tiểu linh: cầm một món (người đưa) thì nhặt món giống thế quanh 32 block mang về người đưa (thả cách 2 block). */
export const ALLAY = { SEARCH_R: 32, DELIVER_R: 2.5, PICK_R: 1.2, MAX_CARRY: 64, OWNER_R: 64, SCAN_S: 1 };
/** Nỏ của người chơi: giữ chuột phải 1.25 giây để lên dây (tốn 1 mũi tên), chuột phải lần nữa để bắn. */
export const CROSSBOW = { CHARGE_S: 1.25, ARROW_SPEED: 63, DAMAGE: [6, 11] as readonly [number, number], DURABILITY: 465 };

// ---- Giai đoạn 8c (Minecraft Wiki / bytecode Evoker, Vex, EvokerFangs; mức Thường) ----
/** Pháp sư: tránh người chơi trong 8 block; phép nanh mỗi 5 giây (làm phép 2 giây), gọi 3 tiểu quỷ mỗi 17 giây (làm phép 5 giây).
 *  Phép có hiệu lực sau WARMUP_S. Gọi tiểu quỷ khi rng·8 + 1 > số tiểu quỷ trong 16 block. */
export const EVOKER = {
  AVOID_R: 8, WARMUP_S: 1,
  FANGS: { CAST_S: 2, COOLDOWN_S: 5 }, SUMMON: { CAST_S: 5, COOLDOWN_S: 17, COUNT: 3, VEX_R: 16, VEX_MAX: 8 },
};
/** Nanh: gần (< 3 block) thì 2 vòng (5 nanh bán kính 1.5 + 8 nanh bán kính 2.5, trễ 3 tick); xa thì 16 nanh thành hàng cách 1.25,
 *  mỗi nanh trễ thêm 1 tick. Cắn sau trễ + 8 tick: 6 sát thương phép (bỏ qua giáp) cho sinh vật / người trong hộp 0.5 (+0.2). */
export const FANGS = {
  CLOSE_R: 3, LINE: 16, STEP: 1.25, RING1: [5, 1.5] as const, RING2: [8, 2.5] as const, RING2_DELAY: 3, BITE_TICKS: 8, LIFE_TICKS: 22,
  DAMAGE: 6, HALF_W: 0.45, HEIGHT: 0.8,
};
/** Tiểu quỷ: sống 30–119 giây rồi mất 1 máu mỗi giây; bay xuyên block; lao vào mục tiêu (cách > 2 block, ~1/7 mỗi tick khi rảnh). */
export const VEX = { LIFE_S: [30, 119] as readonly [number, number], CHARGE_MIN: 2, CHARGE_CHANCE: 1 / 7, WANDER_R: 7, DECAY_S: 1 };
/** Vật tổ bất tử (cầm ở tay chính hoặc tay phụ): chết thì sống lại với 1 máu, mất mọi hiệu ứng, được Hồi phục II 45 giây,
 *  Hấp thụ II 5 giây (4 tim vàng), Kháng lửa 40 giây; vật tổ mất. */
export const TOTEM = { REGEN_S: 45, REGEN_RATE: 0.8, ABSORB: 8, ABSORB_S: 5, FIRE_RES_S: 40 };
