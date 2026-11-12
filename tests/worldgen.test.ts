// Sinh thế giới: xác định theo seed, sinh từng chunk độc lập (thứ tự khác vẫn ra cùng kết quả),
// có hang, dung nham, nước ngầm, hầm mỏ; bí ngô và cỏ chỉ mọc trên cỏ.
import { B, ChunkGenerator, mineshaftCenter, seedFromString } from "../shared/src/index.js";
import { check } from "./harness.js";

const seed = seedFromString("voxel");
const N = 8;
const keys: [number, number][] = [];
for (let cz = -N / 2; cz < N / 2; cz++) for (let cx = -N / 2; cx < N / 2; cx++) keys.push([cx, cz]);

const a = new ChunkGenerator(seed);
const t0 = performance.now();
const first = new Map(keys.map(([cx, cz]) => [`${cx},${cz}`, a.generate(cx, cz)]));
const ms = (performance.now() - t0) / keys.length;

const b = new ChunkGenerator(seed);
let same = true;
for (const [cx, cz] of [...keys].reverse()) {
  const g = b.generate(cx, cz), f = first.get(`${cx},${cz}`)!;
  if (!g.data.every((v, i) => v === f.data[i]) || !g.meta.every((v, i) => v === f.meta[i])) same = false;
}
check("cùng seed, sinh theo thứ tự ngược vẫn ra đúng từng block và dữ liệu phụ", same, `${ms.toFixed(1)} ms / chunk`);

const other = new ChunkGenerator(seedFromString("khac")).generate(0, 0).data;
check("seed khác ra thế giới khác", !other.every((v, i) => v === first.get("0,0")!.data[i]));

const count = new Map<number, number>();
let badPlant = 0;
for (const { data } of first.values())
  for (let i = 0; i < data.length; i++) {
    const id = data[i]!;
    count.set(id, (count.get(id) ?? 0) + 1);
    if ((id === B.PUMPKIN || id === B.TALLGRASS) && i >= 256 && data[i - 256] !== B.GRASS) badPlant++;
  }
const n = (id: number): number => count.get(id) ?? 0;
check("có đá, quặng than / sắt, đá nền, hang (không khí dưới mặt đất)", n(B.STONE) > 0 && n(B.ORE_COAL) > 0 && n(B.ORE_IRON) > 0 && n(B.BEDROCK) > 0,
  `than ${n(B.ORE_COAL)}, sắt ${n(B.ORE_IRON)}, dung nham ${n(B.LAVA)}`);
check("cỏ cao / bí ngô chỉ mọc trên cỏ", badPlant === 0, `sai ${badPlant}`);

let mines = 0;
for (let rx = -2; rx <= 2; rx++) for (let rz = -2; rz <= 2; rz++) if (mineshaftCenter(a.sampler, a.rules, rx, rz)) mines++;
check("có tâm hầm mỏ trong vùng 5x5 ô lưới", mines > 0, `${mines} hầm`);
