// Tin nhắn giữa luồng chính và worker thế giới.
import type { ChunkData } from "../../../shared/src/index.js";
import type { SectionMesh, UvTable } from "../mesh/mesher.js";

export type ToWorker =
  | { type: "init"; seed: number; uvt: UvTable }
  | { type: "gen"; id: number; cx: number; cz: number }
  // chunks: 3x3 chunk quanh chunk cần vẽ (thứ tự dz rồi dx, -1..1); null = chưa tải
  | { type: "mesh"; id: number; cx: number; cz: number; chunks: (ChunkData | null)[] };

export type FromWorker =
  | { type: "gen"; id: number; cx: number; cz: number; chunk: ChunkData; ms: number }
  // chunks: trả lại đúng các mảng đã nhận để luồng chính dùng lại (không cấp mới mỗi lần → ít dọn rác)
  | { type: "mesh"; id: number; cx: number; cz: number; sections: SectionMesh[]; light: Uint8Array; chunks: (ChunkData | null)[]; ms: number }
  | { type: "error"; id: number; message: string };
