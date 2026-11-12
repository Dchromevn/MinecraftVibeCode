// Web Worker: sinh chunk; tính ánh sáng vùng 3x3 chunk rồi dựng mesh chunk giữa.
import { ChunkGenerator } from "../../../shared/src/index.js";
import { meshRegion, type UvTable } from "../mesh/mesher.js";
import { meshTransferables } from "../mesh/geomBuilder.js";
import { buildRegion, centerLight, computeRegionLight } from "../../../shared/src/index.js";
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
      const chunk = gen!.generate(msg.cx, msg.cz);
      ctx.postMessage({ type: "gen", id: msg.id, cx: msg.cx, cz: msg.cz, chunk, ms: performance.now() - t0 }, [
        chunk.data.buffer,
        chunk.meta.buffer,
      ]);
    } else {
      const region = buildRegion(msg.chunks);
      const light = computeRegionLight(region);
      const sections = meshRegion(region, light, uvt!);
      const center = centerLight(light); // ánh sáng chunk giữa cho random tick ở luồng chính
      const transfer: ArrayBuffer[] = [center.buffer as ArrayBuffer];
      for (const s of sections) transfer.push(...meshTransferables(s.solid), ...meshTransferables(s.water));
      ctx.postMessage({ type: "mesh", id: msg.id, cx: msg.cx, cz: msg.cz, sections, light: center, ms: performance.now() - t0 }, transfer);
    }
  } catch (err) {
    ctx.postMessage({ type: "error", id: "id" in msg ? msg.id : -1, message: String(err) });
  }
};
