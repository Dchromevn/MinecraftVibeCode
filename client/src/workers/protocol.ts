// Tin nhắn giữa luồng chính và worker thế giới.
import type { ChunkData, CustomStructure, StructureData } from "../../../shared/src/index.js";
import type { SectionMesh, UvTable } from "../mesh/mesher.js";

export type ToWorker =
  | { type: "init"; seed: number; dim: number; uvt: UvTable; structures: StructureData | null; customs: { list: CustomStructure[]; cuts: number[] } } // (7e) mẫu công trình (null: chưa nhập); (8a) nhà tự lưu
  | { type: "customs"; list: CustomStructure[]; cuts: number[] }
  | { type: "dim"; dim: number } // (10a) đổi cõi: sinh chunk bằng bộ sinh của cõi đó
  | { type: "gen"; id: number; cx: number; cz: number }
  // chunks: 3x3 chunk quanh chunk cần vẽ (thứ tự dz rồi dx, -1..1); null = chưa tải
  | { type: "mesh"; id: number; cx: number; cz: number; chunks: (ChunkData | null)[] };

export type FromWorker =
  | { type: "gen"; id: number; cx: number; cz: number; chunk: ChunkData; ms: number }
  // chunks: trả lại đúng các mảng đã nhận để luồng chính dùng lại (không cấp mới mỗi lần → ít dọn rác)
  | { type: "mesh"; id: number; cx: number; cz: number; sections: SectionMesh[]; light: Uint8Array; chunks: (ChunkData | null)[]; ms: number }
  | { type: "error"; id: number; message: string };
