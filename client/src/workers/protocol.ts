// Tin nhắn giữa luồng chính và worker thế giới.
import type { ChunkMesh, UvTable } from "../mesh/mesher.js";

export type ToWorker =
  | { type: "init"; seed: number; uvt: UvTable }
  | { type: "gen"; id: number; cx: number; cz: number }
  | { type: "mesh"; id: number; cx: number; cz: number; pad: Uint8Array };

export type FromWorker =
  | { type: "gen"; id: number; cx: number; cz: number; data: Uint8Array; ms: number }
  | { type: "mesh"; id: number; cx: number; cz: number; mesh: ChunkMesh; ms: number }
  | { type: "error"; id: number; message: string };
