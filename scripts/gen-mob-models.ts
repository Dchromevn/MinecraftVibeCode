// Sinh client/src/mobs/mobModelsGen.ts: hình học model sinh vật đọc từ client.jar (scripts/mc-model-dump.ts). Chạy lại khi
// thêm loài mới (cần client.jar trong assets-src/minecraft và JDK có javap). File sinh ra chỉ chứa số (hộp, điểm xoay, UV).
//   npx tsx scripts/gen-mob-models.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { dumpModel } from "./mc-model-dump.js";

const M = "net.minecraft.client.model.";
/** loài → [class, hàm, có tham số CubeDeformation, cỡ ảnh nếu hàm không trả về]. */
const LIST: Record<string, [string, string, boolean | number, [number, number]?, string?]> = {
  rabbit: ["animal.rabbit.AdultRabbitModel", "createBodyLayer", false],
  wolf: ["animal.wolf.AdultWolfModel", "createBodyLayer", true, [64, 32]],
  fox: ["animal.fox.AdultFoxModel", "createBodyLayer", false],
  goat: ["animal.goat.GoatModel", "createBodyLayer", false],
  polar_bear: ["animal.polarbear.PolarBearModel", "createBodyLayer", false],
  llama: ["animal.llama.LlamaModel", "createBodyLayer", true],
  armadillo: ["animal.armadillo.AdultArmadilloModel", "createBodyLayer", false],
  bat: ["ambient.BatModel", "createBodyLayer", false],
  squid: ["animal.squid.SquidModel", "createBodyLayer", false],
  dolphin: ["animal.dolphin.DolphinModel", "createBodyLayer", false],
  cod: ["animal.fish.CodModel", "createBodyLayer", false],
  salmon: ["animal.fish.SalmonModel", "createBodyLayer", false],
  pufferfish_small: ["animal.fish.PufferfishSmallModel", "createBodyLayer", false],
  pufferfish_mid: ["animal.fish.PufferfishMidModel", "createBodyLayer", false],
  pufferfish_big: ["animal.fish.PufferfishBigModel", "createBodyLayer", false],
  tropical_a: ["animal.fish.TropicalFishSmallModel", "createBodyLayer", true],
  tropical_b: ["animal.fish.TropicalFishLargeModel", "createBodyLayer", true],
  // 7d: ngựa (thân dùng chung AbstractEquineModel), yên, lừa / la (thêm rương hai bên, tai dài; tỉ lệ đặt ở client)
  horse: ["animal.equine.AbstractEquineModel", "createBodyMesh", true, [64, 64]],
  horse_saddle: ["animal.equine.EquineSaddleModel", "createSaddleLayer", false],
  donkey: ["animal.equine.DonkeyModel", "createBodyLayer", 1, undefined, "modifyMesh"],
  // 8a: dân làng (cả thương nhân lang thang), dân làng xác sống, người sắt, mèo (tỉ lệ 0.8 đặt ở client), lạc đà + yên
  villager: ["npc.VillagerModel", "createBodyModel", false, [64, 64]],
  zombie_villager: ["monster.zombie.ZombieVillagerModel", "createBodyLayer", false],
  iron_golem: ["animal.golem.IronGolemModel", "createBodyLayer", false],
  cat: ["animal.feline.AdultFelineModel", "createBodyMesh", true, [64, 32]],
  camel: ["animal.camel.AdultCamelModel", "createBodyLayer", false],
  camel_saddle: ["animal.camel.CamelSaddleModel", "createSaddleLayer", false],
  // 8b: kẻ cướp (thân dân làng + tay rời), tiểu linh
  illager: ["monster.illager.IllagerModel", "createBodyLayer", false],
  allay: ["animal.allay.AllayModel", "createBodyLayer", false],
  // 8c: tiểu quỷ, nanh pháp sư (đao phủ, pháp sư dùng chung model kẻ cướp)
  vex: ["monster.vex.VexModel", "createBodyLayer", false],
  evoker_fangs: ["effects.EvokerFangsModel", "createBodyLayer", false],
  // 10b: người lợn xác sống, khối nhầy dung nham, kẻ lội dung nham, lợn rừng lửa (ma bay: xúc tu dài ngẫu nhiên — khai báo tay ở client)
  zombified_piglin: ["monster.piglin.AdultZombifiedPiglinModel", "createBodyLayer", false],
  magma_cube: ["monster.slime.MagmaCubeModel", "createBodyLayer", false],
  strider: ["monster.strider.AdultStriderModel", "createBodyLayer", false],
  hoglin: ["monster.hoglin.HoglinModel", "createBodyLayer", false],
  // 10c: quỷ lửa (bộ xương héo: model bộ xương phóng to 1.2 — khai báo ở client)
  blaze: ["monster.blaze.BlazeModel", "createBodyLayer", false],
};

const r = (v: number): number => Math.round(v * 10000) / 10000;
let out = "// Tự sinh bởi scripts/gen-mob-models.ts từ client.jar (đừng sửa tay). Hệ Minecraft: y xuống, mặt đất y = 24, mặt hướng −Z.\n" +
  "export interface GenCube { uv: [number, number]; box: number[]; inflate: number; mirror: boolean }\n" +
  "export interface GenPart { name: string; parent: string | null; pivot: number[]; rot: number[]; cubes: GenCube[] }\n" +
  "export const GEN_MODELS: Record<string, { tex: [number, number]; scale: number; parts: GenPart[] }> = {\n";
for (const [key, [cls, fn, deform, tex, post]] of Object.entries(LIST)) {
  const d = dumpModel(M + cls, fn, deform, post);
  const parts = d.parts.map((p) => ({
    name: p.name, parent: p.parent, pivot: [p.pose.x, p.pose.y, p.pose.z].map(r), rot: [p.pose.rx, p.pose.ry, p.pose.rz].map(r),
    cubes: p.cubes.map((c) => ({ uv: c.uv, box: c.box.map(r), inflate: r(c.inflate), mirror: c.mirror })),
  }));
  out += `  ${key}: ${JSON.stringify({ tex: d.tex ?? tex, scale: d.scale, parts })},\n`;
  console.log(`[gen-mob-models] ${key}: ${parts.length} phần`);
}
out += "};\n";
writeFileSync(join(process.cwd(), "client/src/mobs/mobModelsGen.ts"), out);
