// Model các loài Giai đoạn 8a (hình học đọc từ client.jar — mobModelsGen.ts): dân làng (cả thương nhân lang thang), dân làng xác
// sống, người sắt, mèo (tỉ lệ 0.8 như Minecraft, lớp vòng cổ tô màu), lạc đà (lớp yên), lạc đà không bướu của thương nhân (lớp
// khăn phủ lưng).
import type { ModelDef, PartDef } from "./mobModelDefs.js";
import { gen, layer } from "./mobGen.js";
import { MODELS_10B } from "./mobModels10b.js";

/** Cờ trên đầu đội trưởng kẻ cướp: lá cờ 20 × 40 (UV như cờ Minecraft) sau đầu, thu nhỏ một nửa (mobPose8a). */
const BANNER: PartDef[] = [
  { name: "head", uv: [0, 0], box: [0, 0, 0, 0, 0, 0], pivot: [0, 0, 0], cubes: [] },
  { name: "banner", uv: [0, 0], box: [-10, -62, 4, 20, 40, 1], pivot: [0, 0, 0], parent: "head" },
  { name: "pole", uv: [44, 0], box: [-1, -64, 5, 2, 44, 2], pivot: [0, 0, 0], parent: "head" },
];

export const MODELS_8A: Record<string, ModelDef> = {
  villager: gen("villager"),
  wandering_trader: gen("villager"),
  zombie_villager: gen("zombie_villager"),
  iron_golem: gen("iron_golem"),
  cat: gen("cat", { scale: 0.8, layers: { collar: layer("cat", "cat_collar", 0.01, true) } }),
  camel: gen("camel", { layers: { saddle: layer("camel_saddle", "camel_saddle") } }),
  trader_llama: gen("llama", { layers: { decor: layer("llama", "trader_llama", 0.5) } }),
  // 8b: kẻ cướp (đội trưởng: cờ điềm xấu dựng trên đầu), tiểu linh
  pillager: gen("illager", { layers: { banner: { skin: "ominous_banner", tex: [64, 64], parts: BANNER } } }),
  allay: gen("allay"),
  // 8c: đao phủ, pháp sư (model kẻ cướp, ảnh riêng), tiểu quỷ; nanh pháp sư (hiệu ứng fx/fangs.ts)
  vindicator: gen("illager"), evoker: gen("illager"), vex: gen("vex"), evoker_fangs: gen("evoker_fangs"),
  ...MODELS_10B, // 10b: Vực Lửa
};
