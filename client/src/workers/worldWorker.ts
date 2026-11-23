// Web Worker: sinh chunk; tính ánh sáng vùng 3x3 chunk rồi dựng mesh chunk giữa.
import { makeGenerator, setCustomStructures, setStructureData, setVillageCuts, type WorldGenerator } from "../../../shared/src/index.js";
import { meshRegion, type UvTable } from "../mesh/mesher.js";
import { meshTransferables } from "../mesh/geomBuilder.js";
import { buildRegion, centerLight, computeRegionLight } from "../../../shared/src/index.js";
import type { FromWorker, ToWorker } from "./protocol.js";

interface WorkerScope {
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
  postMessage(msg: FromWorker, transfer?: Transferable[]): void;
}
const ctx = self as unknown as WorkerScope;

let gen: WorldGenerator | null = null;
let seed = 0;
let uvt: UvTable | null = null;

ctx.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      setStructureData(msg.structures); // (7e) trước khi sinh chunk: giống hệt server
      setCustomStructures(msg.customs.list); // (8a) nhà tự lưu + mốc vùng làng
      setVillageCuts(msg.customs.cuts);
      seed = msg.seed;
      gen = makeGenerator(seed, msg.dim); // (10a) theo cõi

      uvt = msg.uvt;
      return;
    }
    if (msg.type === "dim") {
      gen = makeGenerator(seed, msg.dim);
      return;
    }
    if (msg.type === "customs") {
      setCustomStructures(msg.list);
      setVillageCuts(msg.cuts);
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
      for (const s of sections) transfer.push(...meshTransferables(s.solid), ...meshTransferables(s.water), ...meshTransferables(s.glass));
      for (const c of msg.chunks) if (c) transfer.push(c.data.buffer as ArrayBuffer, c.meta.buffer as ArrayBuffer);
      ctx.postMessage(
        { type: "mesh", id: msg.id, cx: msg.cx, cz: msg.cz, sections, light: center, chunks: msg.chunks, ms: performance.now() - t0 },
        transfer,
      );
    }
  } catch (err) {
    ctx.postMessage({ type: "error", id: "id" in msg ? msg.id : -1, message: String(err) });
  }
};
