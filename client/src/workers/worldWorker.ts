// Web Worker: sinh chunk và dựng mesh, để luồng chính không bị khựng.
import { ChunkGenerator } from "../../../shared/src/index.js";
import { meshChunk, type UvTable } from "../mesh/mesher.js";
import { meshTransferables } from "../mesh/geomBuilder.js";
import type { FromWorker, ToWorker } from "./protocol.js";

interface WorkerScope {
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
  postMessage(msg: FromWorker, transfer?: Transferable[]): void;
}
const ctx = self as unknown as WorkerScope;

let gen: ChunkGenerator | null = null;
let uvt: UvTable | null = null;

ctx.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      gen = new ChunkGenerator(msg.seed);
      uvt = msg.uvt;
      return;
    }
    const t0 = performance.now();
    if (msg.type === "gen") {
      const data = gen!.generate(msg.cx, msg.cz);
      ctx.postMessage({ type: "gen", id: msg.id, cx: msg.cx, cz: msg.cz, data, ms: performance.now() - t0 }, [
        data.buffer,
      ]);
    } else {
      const mesh = meshChunk(msg.pad, uvt!);
      ctx.postMessage(
        { type: "mesh", id: msg.id, cx: msg.cx, cz: msg.cz, mesh, ms: performance.now() - t0 },
        [...meshTransferables(mesh.solid), ...meshTransferables(mesh.water)],
      );
    }
  } catch (err) {
    ctx.postMessage({ type: "error", id: "id" in msg ? msg.id : -1, message: String(err) });
  }
};
