// npm test — chạy mọi bộ kiểm tra logic trong /shared (không cần trình duyệt).
//   npm test -- -v        in cả mục đạt
//   npm test -- vật lý    chỉ chạy bộ có tên chứa chuỗi này
import { report, setSuite } from "./harness.js";

const SUITES: [string, () => Promise<unknown>][] = [
  ["vật lý (3a)", () => import("./physics.test.js")],
  ["chỗ bám, đặt, phá (3b)", () => import("./rules.test.js")],
  ["vật phẩm, chế tạo, sinh tồn (4a)", () => import("./items.test.js")],
  ["rương, lò, random tick (4b)", () => import("./containers.test.js")],
  ["cây trồng (4b)", () => import("./crops.test.js")],
  ["chất lỏng (4c)", () => import("./liquids.test.js")],
  ["sinh thế giới", () => import("./worldgen.test.js")],
];

const args = process.argv.slice(2);
const verbose = args.includes("-v");
const filter = args.find((a) => !a.startsWith("-"));
for (const [name, load] of SUITES) {
  if (filter && !name.includes(filter)) continue;
  setSuite(name);
  await load();
}
process.exitCode = report(verbose) > 0 ? 1 : 0;
