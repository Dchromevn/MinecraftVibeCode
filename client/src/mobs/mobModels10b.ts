// Model sinh vật Vực Lửa Giai đoạn 10b: người lợn xác sống, khối nhầy dung nham, kẻ lội dung nham (lớp yên), lợn rừng lửa đọc từ
// client.jar (mobModelsGen.ts); ma bay khai báo tay theo GhastModel (thân 16 × 16 × 16, 9 xúc tu 2 × 2 dài 8–14 — Minecraft dài ngẫu
// nhiên, ở đây cố định theo chỉ số), phóng to 4 lần cho khớp hộp 4 × 4 × 4.
import type { ModelDef, PartDef } from "./mobModelDefs.js";
import { gen, layer } from "./mobGen.js";

const TENTACLE_LEN = [9, 12, 8, 13, 10, 14, 11, 8, 12];
const ghastParts: PartDef[] = [
  { name: "body", uv: [0, 0], box: [-8, 8, -8, 16, 16, 16], pivot: [0, 0, 0] },
  ...TENTACLE_LEN.map((len, i): PartDef => {
    const x = ((i % 3) - ((Math.floor(i / 3) % 2) * 0.5) + 0.25) / 2 * 2 - 1, z = (Math.floor(i / 3) / 2) * 2 - 1;
    return { name: `tentacle${i}`, uv: [0, 0], box: [-1, 0, -1, 2, len, 2], pivot: [x * 5, 24, z * 5] };
  }),
];

export const MODELS_10B: Record<string, ModelDef> = {
  ghast: { tex: [64, 32], scale: 4, parts: ghastParts },
  zombified_piglin: gen("zombified_piglin"),
  magma_cube: gen("magma_cube"),
  strider: gen("strider", { layers: { saddle: layer("strider", "strider_saddle", 0.25) } }),
  hoglin: gen("hoglin"),
  blaze: gen("blaze", { glow: "blaze" }), // (10c) quỷ lửa: luôn sáng (vẽ thêm một lớp không bị tối theo ánh sáng)
  // (10d1) người lợn, vệ binh: cùng hình người lợn xác sống (PiglinModel); lợn rừng xác sống: hình lợn rừng lửa
  piglin: gen("zombified_piglin"), piglin_brute: gen("zombified_piglin"), zoglin: gen("hoglin"),
};
