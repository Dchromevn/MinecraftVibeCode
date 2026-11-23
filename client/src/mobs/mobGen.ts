// Đổi hình học model sinh từ client.jar (mobModelsGen.ts) sang khai báo phần của mobModelDefs.ts (dùng chung 7c, 7d, 8a).
import type { LayerDef, ModelDef, PartDef } from "./mobModelDefs.js";
import { GEN_MODELS } from "./mobModelsGen.js";

type V3 = [number, number, number];

/** Các phần của model sinh `key`; prefix: tên riêng khi gộp nhiều dáng; root: phần gốc treo vào nhóm này. */
export function genParts(key: string, prefix = "", inflate = 0, root?: string): PartDef[] {
  return GEN_MODELS[key]!.parts.map((p) => ({
    name: prefix + p.name, uv: [0, 0], box: [0, 0, 0, 0, 0, 0], pivot: p.pivot as V3, rot: p.rot as V3, zyx: true,
    parent: p.parent ? prefix + p.parent : root,
    cubes: p.cubes.map((c) => ({ ...c, inflate: c.inflate + inflate })),
  }));
}

export const gen = (key: string, extra: Partial<ModelDef> = {}): ModelDef =>
  ({ tex: GEN_MODELS[key]!.tex, scale: GEN_MODELS[key]!.scale, parts: genParts(key), ...extra });

export const layer = (key: string, skin: string, inflate = 0, tint = false): LayerDef =>
  ({ skin, tex: GEN_MODELS[key]!.tex, parts: genParts(key, "", inflate), tint });

