// Khai báo hình dạng model từng loài (Giai đoạn 7a–7b), theo bố cục UV skin trong client.jar. Mỗi phần như Minecraft:
// hộp (ox, oy, oz, rộng, cao, sâu) quanh điểm xoay (px, py, pz), trục y hướng xuống, mặt đất ở y = 24, mặt hướng −Z.
// Phần có `parent`: điểm xoay tính từ điểm xoay của phần cha. mat = 1: lớp trong suốt (vỏ khối nhầy).
import type { MobKey } from "../../../shared/src/index.js";
import { MODELS_7C } from "./mobModels7c.js";

export interface PartDef {
  name: string;
  uv: [number, number];
  box: [number, number, number, number, number, number];
  pivot: [number, number, number];
  rot?: [number, number, number];
  inflate?: number;
  mirror?: boolean;
  parent?: string;
  mat?: number;
  /** (7c) Model đọc từ client.jar: nhiều hộp trong một phần (thay cho uv / box), xoay theo thứ tự Z → Y → X như Minecraft. */
  cubes?: { uv: [number, number]; box: number[]; inflate: number; mirror: boolean }[];
  zyx?: boolean;
}

export interface LayerDef {
  skin: string;
  tex: [number, number];
  parts: PartDef[];
  tint?: boolean;
}

export interface ModelDef {
  tex: [number, number];
  scale: number;
  parts: PartDef[];
  /** Lớp phủ (lông cừu, áo xác đuối, lớp ngoài bộ xương băng): ảnh riêng, cùng cử động. */
  overlay?: LayerDef;
  /** (7c) Các lớp phủ thêm (vòng cổ + giáp sói, hoa văn cá nhiệt đới), bật / tắt và tô màu riêng. */
  layers?: Record<string, LayerDef>;
  /** Mắt phát sáng: vẽ lại các phần với ảnh này, không bị tối theo ánh sáng. */
  glow?: string;
}

const HALF_PI = Math.PI / 2;

const humanoid = (thin: boolean, tall: boolean, inflate = 0): PartDef[] => {
  const lw = thin ? 2 : 4, lo = -lw / 2, i = inflate || undefined;
  return [
    { name: "head", uv: [0, 0], box: [-4, -8, -4, 8, 8, 8], pivot: [0, 0, 0], inflate: i },
    { name: "hat", uv: [32, 0], box: [-4, -8, -4, 8, 8, 8], pivot: [0, 0, 0], inflate: (inflate || 0) + 0.5, parent: "head" },
    { name: "body", uv: [16, 16], box: [-4, 0, -2, 8, 12, 4], pivot: [0, 0, 0], inflate: i },
    { name: "rArm", uv: [40, 16], box: [thin ? -1 : -3, -2, lo, lw, 12, lw], pivot: [-5, 2, 0], inflate: i },
    tall ? { name: "lArm", uv: [32, 48], box: [-1, -2, -2, 4, 12, 4], pivot: [5, 2, 0], inflate: i }
      : { name: "lArm", uv: [40, 16], box: [-1, -2, lo, lw, 12, lw], pivot: [5, 2, 0], mirror: true, inflate: i },
    { name: "rLeg", uv: [0, 16], box: [lo, 0, lo, lw, 12, lw], pivot: [-1.9, 12, 0], inflate: i },
    tall ? { name: "lLeg", uv: [16, 48], box: [-2, 0, -2, 4, 12, 4], pivot: [1.9, 12, 0], inflate: i }
      : { name: "lLeg", uv: [0, 16], box: [lo, 0, lo, lw, 12, lw], pivot: [1.9, 12, 0], mirror: true, inflate: i },
  ];
};

const quad = (uv: [number, number], box: PartDef["box"], y: number, zf: number, zb: number, x: number, inflate?: number): PartDef[] => [
  { name: "rLegB", uv, box, pivot: [-x, y, zb], inflate }, { name: "lLegB", uv, box, pivot: [x, y, zb], inflate, mirror: true },
  { name: "rLegF", uv, box, pivot: [-x, y, zf], inflate }, { name: "lLegF", uv, box, pivot: [x, y, zf], inflate, mirror: true },
];

const spider: PartDef[] = [
  { name: "head", uv: [32, 4], box: [-4, -4, -8, 8, 8, 8], pivot: [0, 15, -3] },
  { name: "neck", uv: [0, 0], box: [-3, -3, -3, 6, 6, 6], pivot: [0, 15, 0] },
  { name: "body", uv: [0, 12], box: [-5, -4, -6, 10, 8, 12], pivot: [0, 15, 9] },
];
[[2, 0.785, 0.785], [1, 0.39, 0.58], [0, -0.39, 0.58], [-1, -0.785, 0.785]].forEach(([z, ry, rz], i) => {
  spider.push({ name: `rLeg${i}`, uv: [18, 0], box: [-15, -1, -1, 16, 2, 2], pivot: [-4, 15, z!], rot: [0, ry!, -rz!] });
  spider.push({ name: `lLeg${i}`, uv: [18, 0], box: [-1, -1, -1, 16, 2, 2], pivot: [4, 15, z!], rot: [0, -ry!, rz!], mirror: true });
});

/** Thân nhiều đốt (mọt đá, mọt hư không): kích thước + UV từng đốt, xếp nối tiếp theo trục z. */
function segments(sizes: number[][], uvs: number[][]): PartDef[] {
  const out: PartDef[] = [];
  let z = -3.5;
  sizes.forEach((s, i) => {
    out.push({ name: `seg${i}`, uv: [uvs[i]![0]!, uvs[i]![1]!], box: [s[0]! * -0.5, 0, s[2]! * -0.5, s[0]!, s[1]!, s[2]!], pivot: [0, 24 - s[1]!, z] });
    if (i < sizes.length - 1) z += (s[2]! + sizes[i + 1]![2]!) * 0.5;
  });
  return out;
}
const SILVER_SIZES = [[3, 2, 2], [4, 3, 2], [6, 4, 3], [3, 3, 3], [2, 2, 3], [2, 1, 2], [1, 1, 2]];
const silverfish = segments(SILVER_SIZES, [[0, 0], [0, 4], [0, 9], [0, 16], [0, 22], [11, 0], [13, 4]]);
silverfish.push(
  { name: "fur0", uv: [20, 0], box: [-5, 0, -1.5, 10, 8, 3], pivot: [0, 16, silverfish[2]!.pivot[2]] },
  { name: "fur1", uv: [20, 11], box: [-3, 0, -1.5, 6, 4, 3], pivot: [0, 20, silverfish[4]!.pivot[2]] },
  { name: "fur2", uv: [20, 18], box: [-3, 0, -1, 6, 5, 2], pivot: [0, 19, silverfish[1]!.pivot[2]] },
);

export const MOB_MODELS: Record<string, ModelDef> = {
  ...MODELS_7C,
  zombie: { tex: [64, 64], scale: 0.9375, parts: humanoid(false, true) },
  husk: { tex: [64, 64], scale: 0.9375 * 1.0625, parts: humanoid(false, true) },
  drowned: {
    tex: [64, 64], scale: 0.9375, parts: humanoid(false, true),
    overlay: { skin: "drowned_outer", tex: [64, 64], parts: humanoid(false, true, 0.25) },
  },
  skeleton: { tex: [64, 32], scale: 0.9375, parts: humanoid(true, false) },
  wither_skeleton: { tex: [64, 32], scale: 0.9375 * 1.2, parts: humanoid(true, false) }, // (10c) bộ xương héo: to hơn 1.2 lần
  stray: {
    tex: [64, 32], scale: 0.9375, parts: humanoid(true, false),
    overlay: { skin: "stray_overlay", tex: [64, 32], parts: humanoid(false, false, 0.25) },
  },
  spider: { tex: [64, 32], scale: 1, parts: spider, glow: "spider_eyes" },
  cave_spider: { tex: [64, 32], scale: 0.7, parts: spider, glow: "spider_eyes" },
  pig: {
    tex: [64, 64], scale: 1, parts: [
      { name: "head", uv: [0, 0], box: [-4, -4, -8, 8, 8, 8], pivot: [0, 12, -6] },
      { name: "snout", uv: [16, 16], box: [-2, 0, -9, 4, 3, 1], pivot: [0, 0, 0], parent: "head" },
      { name: "body", uv: [28, 8], box: [-5, -10, -7, 10, 16, 8], pivot: [0, 11, 2], rot: [HALF_PI, 0, 0] },
      ...quad([0, 16], [-2, 0, -2, 4, 6, 4], 18, -5, 7, 3),
    ],
  },
  cow: {
    tex: [64, 64], scale: 1, parts: [
      { name: "head", uv: [0, 0], box: [-4, -4, -6, 8, 8, 6], pivot: [0, 4, -8] },
      { name: "hornR", uv: [22, 0], box: [-5, -5, -4, 1, 3, 1], pivot: [0, 0, 0], parent: "head" },
      { name: "hornL", uv: [22, 0], box: [4, -5, -4, 1, 3, 1], pivot: [0, 0, 0], parent: "head" },
      { name: "body", uv: [18, 4], box: [-6, -10, -7, 12, 18, 10], pivot: [0, 5, 2], rot: [HALF_PI, 0, 0] },
      { name: "udder", uv: [52, 0], box: [-2, 2, -8, 4, 6, 1], pivot: [0, 5, 2], rot: [HALF_PI, 0, 0] },
      ...quad([0, 16], [-2, 0, -2, 4, 12, 4], 12, -6, 7, 4),
    ],
  },
  sheep: {
    tex: [64, 32], scale: 1, parts: [
      { name: "head", uv: [0, 0], box: [-3, -4, -6, 6, 6, 8], pivot: [0, 6, -8] },
      { name: "body", uv: [28, 8], box: [-4, -10, -7, 8, 16, 6], pivot: [0, 5, 2], rot: [HALF_PI, 0, 0] },
      ...quad([0, 16], [-2, 0, -2, 4, 12, 4], 12, -5, 7, 3),
    ],
    overlay: {
      skin: "sheep_wool", tex: [64, 32], tint: true, parts: [
        { name: "head", uv: [0, 0], box: [-3, -4, -4, 6, 6, 6], pivot: [0, 6, -8], inflate: 0.6 },
        { name: "body", uv: [28, 8], box: [-4, -10, -7, 8, 16, 6], pivot: [0, 5, 2], rot: [HALF_PI, 0, 0], inflate: 1.75 },
        ...quad([0, 16], [-2, 0, -2, 4, 6, 4], 12, -5, 7, 3, 0.5),
      ],
    },
  },
  chicken: {
    tex: [64, 32], scale: 1, parts: [
      { name: "head", uv: [0, 0], box: [-2, -6, -2, 4, 6, 3], pivot: [0, 15, -4] },
      { name: "beak", uv: [14, 0], box: [-2, -4, -4, 4, 2, 2], pivot: [0, 0, 0], parent: "head" },
      { name: "wattle", uv: [14, 4], box: [-1, -2, -3, 2, 2, 2], pivot: [0, 0, 0], parent: "head" },
      { name: "body", uv: [0, 9], box: [-3, -4, -3, 6, 8, 6], pivot: [0, 16, 0], rot: [HALF_PI, 0, 0] },
      { name: "rLegB", uv: [26, 0], box: [-1, 0, -3, 3, 5, 3], pivot: [-2, 19, 1] },
      { name: "lLegB", uv: [26, 0], box: [-1, 0, -3, 3, 5, 3], pivot: [1, 19, 1], mirror: true },
      { name: "rWing", uv: [24, 13], box: [0, 0, -3, 1, 4, 6], pivot: [-4, 13, 0] },
      { name: "lWing", uv: [24, 13], box: [-1, 0, -3, 1, 4, 6], pivot: [4, 13, 0], mirror: true },
    ],
  },
  // ---- 7b ----
  creeper: {
    tex: [64, 32], scale: 1, parts: [
      { name: "head", uv: [0, 0], box: [-4, -8, -4, 8, 8, 8], pivot: [0, 6, 0] },
      { name: "body", uv: [16, 16], box: [-4, 0, -2, 8, 12, 4], pivot: [0, 6, 0] },
      ...quad([0, 16], [-2, 0, -2, 4, 6, 4], 18, -4, 4, 2),
    ],
  },
  enderman: {
    tex: [64, 32], scale: 1, glow: "enderman_eyes", parts: [
      { name: "head", uv: [0, 0], box: [-4, -8, -4, 8, 8, 8], pivot: [0, -13, 0], inflate: -0.5 },
      { name: "hat", uv: [0, 16], box: [-4, -8, -4, 8, 8, 8], pivot: [0, 0, 0], inflate: -0.5, parent: "head" },
      { name: "body", uv: [32, 16], box: [-4, 0, -2, 8, 12, 4], pivot: [0, -14, 0] },
      { name: "rArm", uv: [56, 0], box: [-1, -2, -1, 2, 30, 2], pivot: [-5, -12, 0] },
      { name: "lArm", uv: [56, 0], box: [-1, -2, -1, 2, 30, 2], pivot: [5, -12, 0], mirror: true },
      { name: "rLeg", uv: [56, 0], box: [-1, 0, -1, 2, 30, 2], pivot: [-2, -5, 0] },
      { name: "lLeg", uv: [56, 0], box: [-1, 0, -1, 2, 30, 2], pivot: [2, -5, 0], mirror: true },
    ],
  },
  endermite: { tex: [64, 32], scale: 1, parts: segments([[4, 3, 2], [6, 4, 5], [3, 3, 1], [1, 2, 1]], [[0, 0], [0, 5], [0, 14], [0, 18]]) },
  silverfish: { tex: [64, 32], scale: 1, parts: silverfish },
  slime: {
    tex: [64, 32], scale: 1, parts: [
      { name: "inner", uv: [0, 16], box: [-3, 17, -3, 6, 6, 6], pivot: [0, 0, 0] },
      { name: "rEye", uv: [32, 0], box: [-3.25, 18, -3.5, 2, 2, 2], pivot: [0, 0, 0] },
      { name: "lEye", uv: [32, 4], box: [1.25, 18, -3.5, 2, 2, 2], pivot: [0, 0, 0] },
      { name: "mouth", uv: [32, 8], box: [0, 21, -3.5, 1, 1, 1], pivot: [0, 0, 0] },
      { name: "outer", uv: [0, 0], box: [-4, 16, -4, 8, 8, 8], pivot: [0, 0, 0], mat: 1 },
    ],
  },
  phantom: {
    tex: [64, 64], scale: 1, glow: "phantom_eyes", parts: [
      { name: "body", uv: [0, 8], box: [-3, -2, -8, 5, 3, 9], pivot: [0, 20, 0], rot: [-0.1, 0, 0] },
      { name: "tail", uv: [3, 20], box: [-2, 0, 0, 3, 2, 6], pivot: [0, -2, 1], parent: "body" },
      { name: "tailTip", uv: [4, 29], box: [-1, 0, 0, 1, 1, 6], pivot: [0, 0.5, 6], parent: "tail" },
      { name: "lWing", uv: [23, 12], box: [0, 0, 0, 6, 2, 9], pivot: [2, -2, -8], parent: "body" },
      { name: "lWingTip", uv: [16, 24], box: [0, 0, 0, 13, 1, 9], pivot: [6, 0, 0], parent: "lWing" },
      { name: "rWing", uv: [23, 12], box: [-6, 0, 0, 6, 2, 9], pivot: [-3, -2, -8], parent: "body", mirror: true },
      { name: "rWingTip", uv: [16, 24], box: [-13, 0, 0, 13, 1, 9], pivot: [-6, 0, 0], parent: "rWing", mirror: true },
      { name: "head", uv: [0, 0], box: [-4, -2, -5, 7, 3, 5], pivot: [0, 1, -7], rot: [0.2, 0, 0], parent: "body" },
    ],
  },
  witch: {
    tex: [64, 128], scale: 0.9375, parts: [
      { name: "head", uv: [0, 0], box: [-4, -10, -4, 8, 10, 8], pivot: [0, 0, 0] },
      { name: "nose", uv: [24, 0], box: [-1, -1, -6, 2, 4, 2], pivot: [0, -2, 0], parent: "head" },
      { name: "hat", uv: [0, 64], box: [0, 0, 0, 10, 2, 10], pivot: [-5, -10.03, -5], parent: "head" },
      { name: "hat2", uv: [0, 76], box: [0, 0, 0, 7, 4, 7], pivot: [1.75, -4, 2], rot: [-0.052, 0, 0.026], parent: "hat" },
      { name: "hat3", uv: [0, 87], box: [0, 0, 0, 4, 4, 4], pivot: [1.75, -4, 2], rot: [-0.105, 0, 0.052], parent: "hat2" },
      { name: "hat4", uv: [0, 95], box: [0, 0, 0, 1, 2, 1], pivot: [1.75, -2, 2], rot: [-0.209, 0, 0.105], parent: "hat3", inflate: 0.25 },
      { name: "body", uv: [16, 20], box: [-4, 0, -3, 8, 12, 6], pivot: [0, 0, 0] },
      { name: "robe", uv: [0, 38], box: [-4, 0, -3, 8, 20, 6], pivot: [0, 0, 0], inflate: 0.5 },
      { name: "arms", uv: [44, 22], box: [-8, -2, -2, 4, 8, 4], pivot: [0, 3, -1], rot: [-0.75, 0, 0] },
      { name: "armsL", uv: [44, 22], box: [4, -2, -2, 4, 8, 4], pivot: [0, 0, 0], parent: "arms", mirror: true },
      { name: "armsX", uv: [40, 38], box: [-4, 2, -2, 8, 4, 4], pivot: [0, 0, 0], parent: "arms" },
      { name: "rLeg", uv: [0, 22], box: [-2, 0, -2, 4, 12, 4], pivot: [-2, 12, 0] },
      { name: "lLeg", uv: [0, 22], box: [-2, 0, -2, 4, 12, 4], pivot: [2, 12, 0], mirror: true },
    ],
  },
};
