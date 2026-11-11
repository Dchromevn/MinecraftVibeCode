// Tin nhắn giữa luồng chính và worker thế giới.
import type { SectionMesh, UvTable } from "../mesh/mesher.js";

export type ToWorker =
  | { type: "init"; seed: number; uvt: UvTable }
  | { type: "gen"; id: number; cx: number; cz: number }
  // chunks: 3x3 chunk quanh chunk cần vẽ (thứ tự dz rồi dx, -1..1); null = chưa tải
  | { type: "mesh"; id: number; cx: number; cz: number; chunks: (Uint8Array | null)[] };

export type FromWorker =
  | { type: "gen"; id: number; cx: number; cz: number; data: Uint8Array; ms: number }
  | { type: "mesh"; id: number; cx: number; cz: number; sections: SectionMesh[]; ms: number }
  | { type: "error"; id: number; message: string };
