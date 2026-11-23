// Model các loài Giai đoạn 7c: hình học đọc từ client.jar (mobModelsGen.ts, sinh bởi scripts/gen-mob-models.ts) đổi sang
// khai báo phần của mobModelDefs.ts. Sói có thêm lớp vòng cổ (tô màu) và giáp sói; cá nóc gộp 3 dáng (xẹp / vừa / phồng) để
// bật tắt theo độ phồng; cá nhiệt đới có 2 dáng (a / b) + lớp hoa văn tô màu.
import type { ModelDef, PartDef } from "./mobModelDefs.js";
import { gen, genParts, layer } from "./mobGen.js";
import { MODELS_8A } from "./mobModels8a.js";

/** Nhóm rỗng chứa một dáng (bật / tắt cả dáng). */
const group = (name: string): PartDef => ({ name, uv: [0, 0], box: [0, 0, 0, 0, 0, 0], pivot: [0, 0, 0], cubes: [] });

/** Cá nóc: 3 dáng trong một model (nhóm s / m / b). */
const PUFFER: ModelDef = {
  tex: [32, 32], scale: 1, parts: [
    group("s"), ...genParts("pufferfish_small", "s:", 0, "s"),
    group("m"), ...genParts("pufferfish_mid", "m:", 0, "m"),
    group("b"), ...genParts("pufferfish_big", "b:", 0, "b"),
  ],
};

export const MODELS_7C: Record<string, ModelDef> = {
  rabbit: gen("rabbit"),
  wolf: gen("wolf", {
    layers: { collar: layer("wolf", "wolf_collar", 0.01, true), armor: layer("wolf", "wolf_armor", 0.2) },
  }),
  fox: gen("fox"),
  goat: gen("goat"),
  polar_bear: gen("polar_bear"),
  llama: gen("llama"),
  armadillo: gen("armadillo"),
  bat: gen("bat"),
  squid: gen("squid"),
  glow_squid: gen("squid"),
  dolphin: gen("dolphin"),
  cod: gen("cod"),
  salmon: gen("salmon"),
  pufferfish: PUFFER,
  tropical_fish: gen("tropical_a", { layers: { pattern: layer("tropical_a", "tropical_a_pattern_1", 0.008, true) } }),
  tropical_fish_b: gen("tropical_b", { layers: { pattern: layer("tropical_b", "tropical_b_pattern_1", 0.008, true) } }),
  // 7d: ngựa (lớp vết lông theo biến thể, lớp yên), lừa / la (rương hai bên; tỉ lệ 0.87 / 0.92 như Minecraft)
  horse: gen("horse", { layers: { markings: layer("horse", "horse_markings_white", 0.01), saddle: layer("horse_saddle", "horse_saddle"),
    // (10c) giáp ngựa sắt / vàng / kim cương (bật theo byte riêng loài)
    armor1: layer("horse", "horse_armor_iron", 0.1), armor2: layer("horse", "horse_armor_gold", 0.1), armor3: layer("horse", "horse_armor_diamond", 0.1) } }),
  donkey: gen("donkey", { scale: 0.87, layers: { saddle: layer("horse_saddle", "donkey_saddle") } }),
  mule: gen("donkey", { scale: 0.92, layers: { saddle: layer("horse_saddle", "mule_saddle") } }),
  ...MODELS_8A,
};
