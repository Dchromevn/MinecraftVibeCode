// Luồng phụ của server (sửa ping 2026-11-14): sinh chunk theo seed và tính ánh sáng vùng 3x3 chunk, để luồng chính không đứng
// hình 100–250 ms khi chunk đầu tiên của một vùng phải lên kế hoạch hầm mỏ / cửa hang. Kết quả trả về bằng chuyển bộ nhớ (không chép).
import { parentPort, workerData } from "node:worker_threads";
import { centerLight, computeRegionLight, makeGenerator, setCustomStructures, setVillageCuts, type WorldGenerator } from "../../shared/src/index.js";
import type { GenJob, GenResult } from "./genPool.js";
import { loadStructures } from "./structFile.js";

loadStructures(); // (7e) mẫu công trình — phải giống luồng chính
const gens = new Map<number, WorldGenerator>(); // (10a) bộ sinh theo cõi
const gen = (dim: number): WorldGenerator => gens.get(dim) ?? gens.set(dim, makeGenerator(workerData.seed as number, dim)).get(dim)!;

parentPort!.on("message", (j: GenJob) => {
  if (j.t === "customs") { // (8a)
    setCustomStructures(j.list);
    setVillageCuts(j.cuts);
  } else if (j.t === "gen") {
    const c = gen(j.dim ?? 0).generate(j.cx, j.cz);
    const r: GenResult = { id: j.id, data: c.data, meta: c.meta };
    parentPort!.postMessage(r, [c.data.buffer as ArrayBuffer, c.meta.buffer as ArrayBuffer]);
  } else {
    const light = centerLight(computeRegionLight({ blocks: j.blocks, meta: j.meta }));
    const r: GenResult = { id: j.id, light };
    parentPort!.postMessage(r, [light.buffer as ArrayBuffer]);
  }
});
