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
  ["server (5a)", () => import("./server.test.js")],
  ["sinh thế giới", () => import("./worldgen.test.js")],
  ["loài cây, hoa, xương rồng (4d)", () => import("./flora.test.js")],
  ["bậc, tấm, tường, gỗ theo loài (4e)", () => import("./building.test.js")],
  ["16 màu, đồ sắt (4f)", () => import("./decor.test.js")],
  ["lưu thế giới, đăng nhập (5b)", () => import("./storage.test.js")],
  ["mạng, chống gian lận (5c)", () => import("./net.test.js")],
  ["đánh nhau, chat (6a)", () => import("./combat.test.js")],
  ["khiên, quét kiếm, tay trái (6a)", () => import("./shield.test.js")],
  ["cung tên (6b)", () => import("./archery.test.js")],
  ["sinh vật, ngày đêm, giường (7a)", () => import("./mobs.test.js")],
  ["quái thêm, hiệu ứng, vụ nổ (7b)", () => import("./mobs7b.test.js")],
  ["đầm lầy, nhà phù thủy (7b)", () => import("./swamp.test.js")],
  ["động vật, sinh vật nước (7c)", () => import("./mobs7c.test.js")],
  ["công trình (7e–7f)", () => import("./structures.test.js")],
  ["cưỡi thú, dây dắt (7d)", () => import("./riding.test.js")],
  ["làng (8a)", () => import("./village.test.js")],
  ["dân làng, người sắt, mèo (8a)", () => import("./villagers.test.js")],
  ["kẻ cướp, tiền đồn, tiểu linh, nỏ (8b)", () => import("./illagers.test.js")],
  ["kinh nghiệm, phù phép (8b2)", () => import("./enchant.test.js")],
  ["đe, đá mài, sách phù phép (8b3)", () => import("./anvil.test.js")],
  ["rừng sồi tối, dinh thự, pháp sư, vật tổ (8c)", () => import("./mansion.test.js")],
  ["Vực Lửa: cõi thứ hai, cổng (10a)", () => import("./nether.test.js")],
  ["Vực Lửa: 4 biome, sinh vật (10b)", () => import("./nether10b.test.js")],
  ["Vực Lửa: pháo đài, quỷ lửa, bộ xương héo (10c)", () => import("./fortress10c.test.js")],
  ["Vực Lửa: người lợn, đổi vàng, lợn rừng xác sống (10d1)", () => import("./piglin10d.test.js")],
  ["Vực Lửa: tàn tích pháo đài lợn, netherite, mỏ neo (10d2)", () => import("./bastion10d.test.js")],
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
