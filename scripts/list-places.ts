// Tạo DIA-DIEM.md: tọa độ các địa điểm trong thế giới đang chơi (tính lại từ seed bằng đúng bộ sinh của game — không đọc / ghi
// server/data ngoài world.json để lấy seed và điểm hồi sinh): làng, tiền đồn kẻ cướp, nhà phù thủy, kim tự tháp, lều tuyết, trại bỏ hoang,
// cổng đổ nát, tàu đắm, tàn tích đại dương, dinh thự rừng; pháo đài Vực Lửa, (10d2) tàn tích pháo đài lợn (tọa độ Vực Lửa + thế giới chính × 8).
//   npm run list-places                 (thế giới trong server/config.json, bán kính 3000 block quanh điểm hồi sinh)
//   npm run list-places -- 5000         (bán kính khác)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  BastionLocator, FORTRESS, FortressLocator, NetherBiomes, TerrainSampler, hutsIn, netherSeed, outpostsIn, seedFromString, setStructureData, structuresIn,
  uniquePlacements, villagesIn, type StructureData,
} from "../shared/src/index.js";

const root = process.cwd(), R = Math.max(500, Number(process.argv[2]) || 3000);
const cfg = JSON.parse(readFileSync(join(root, "server/config.json"), "utf8")) as { seed: string; world?: string };
const metaFile = join(root, "server/data", cfg.world ?? "world", "world.json");
const meta = existsSync(metaFile) ? (JSON.parse(readFileSync(metaFile, "utf8")) as { seed?: string; spawn?: { x: number; y: number; z: number } }) : {};
const seedText = meta.seed ?? cfg.seed, spawn = meta.spawn ?? { x: 0, y: 64, z: 0 };
const sdFile = join(root, "client/public_mc/structures.json");
if (existsSync(sdFile)) setStructureData(JSON.parse(readFileSync(sdFile, "utf8")) as StructureData);
else console.warn("[list-places] thiếu client/public_mc/structures.json (npm run import-textures) — chỉ có kim tự tháp, pháo đài");

const seed = seedFromString(seedText), s = new TerrainSampler(seed);
const SX = Math.floor(spawn.x), SZ = Math.floor(spawn.z), x0 = SX - R, x1 = SX + R, z0 = SZ - R, z1 = SZ + R;
interface Row { x: number; y: number; z: number; note?: string }
const sections: [string, Row[]][] = [];
const ground = (x: number, z: number): number => s.column(x, z).height + 1;
const dist = (r: Row): number => Math.round(Math.hypot(r.x - SX, r.z - SZ));
const DIRS = ["Nam", "Tây Nam", "Tây", "Tây Bắc", "Bắc", "Đông Bắc", "Đông", "Đông Nam"]; // +Z là Nam
const dir = (r: Row): string => DIRS[(Math.round(Math.atan2(-(r.x - SX), r.z - SZ) / (Math.PI / 4)) + 8) % 8]!;
const t0 = performance.now();

const VILLAGE: Record<string, string> = { plains: "đồng cỏ", desert: "sa mạc", savanna: "xavan", snowy: "tuyết", taiga: "rừng thông" };
sections.push(["Làng", villagesIn(s, x0, z0, x1, z1).map((v) => ({ x: v.x, y: ground(v.x, v.z), z: v.z, note: `làng ${VILLAGE[v.type] ?? v.type}` }))]);
sections.push(["Tiền đồn kẻ cướp", outpostsIn(s, x0, z0, x1, z1).map((v) => ({ x: v.x, y: ground(v.x, v.z), z: v.z }))]);
sections.push(["Nhà phù thủy (đầm lầy)", hutsIn(s, x0, z0, x1, z1).map((h) => ({ x: h.x + 3, y: h.floor, z: h.z + 3 }))]);
const NAMES: Record<string, string> = {
  desert_pyramid: "Kim tự tháp sa mạc", igloo: "Lều tuyết", camp: "Trại bỏ hoang", shipwreck: "Tàu đắm", ocean_ruin: "Tàn tích đại dương",
  mansion: "Dinh thự rừng",
};
for (const kind of ["mansion", "desert_pyramid", "igloo", "camp", "shipwreck", "ocean_ruin"] as const) {
  const rows = uniquePlacements(s, kind).map((p): Row => {
    const b = p.box, a = p.pieces[0]!;
    return b ? { x: (b.x0 + b.x1) >> 1, y: a.y, z: (b.z0 + b.z1) >> 1 } : { x: a.x, y: a.y, z: a.z, note: kind === "shipwreck" || kind === "ocean_ruin" ? "đáy biển" : undefined };
  });
  sections.push([`${NAMES[kind]} (cả thế giới chỉ 1–2 cái)`, rows]);
}
const portals = new Map<string, Row>();
for (const p of structuresIn(s, x0, z0, x1, z1)) {
  if (p.kind !== "ruined_portal") continue;
  const a = p.pieces[0]!, k = `${a.x},${a.z}`;
  if (!portals.has(k)) portals.set(k, { x: a.x, y: a.y, z: a.z, note: a.y < ground(a.x, a.z) - 3 ? "chôn dưới đất" : undefined });
}
sections.push(["Cổng đổ nát", [...portals.values()].filter((r) => Math.abs(r.x - SX) <= R && Math.abs(r.z - SZ) <= R)]);

// Vực Lửa: pháo đài quanh điểm tương ứng (÷ 8), bán kính R / 8 nhưng ít nhất 800 block Vực Lửa
const loc = new FortressLocator(netherSeed(seed)), NR = Math.max(800, R / 8), NX = Math.floor(SX / 8), NZ = Math.floor(SZ / 8);
const forts = loc.near(NX - NR, NZ - NR, NX + NR, NZ + NR).map((f): Row => {
  const b = f.pieces[0]!.box, x = (b.x0 + b.x1) >> 1, z = (b.z0 + b.z1) >> 1;
  return { x, y: b.y0 + 5, z, note: `Vực Lửa (${x}, ${b.y0 + 5}, ${z}); cách điểm Vực Lửa ứng với chỗ hồi sinh ${Math.round(Math.hypot(x - NX, z - NZ))} block; ${f.spawners.length} lồng quỷ lửa, ${f.chests.length} rương` };
});

// (10d2) tàn tích pháo đài lợn (cùng lưới ô với pháo đài, 3/5 số ô, trừ đồng bằng bazan)
const nbio = new NetherBiomes(netherSeed(seed)), bloc = new BastionLocator(netherSeed(seed), (x, z) => nbio.at(x, z));
const KIND: Record<string, string> = { bastion_treasure: "kho báu", bastion_hoglin_stable: "chuồng lợn rừng", bastion_bridge: "cầu" };
const bastions = bloc.near(NX - NR, NZ - NR, NX + NR, NZ + NR).map((b): Row => {
  const kind = KIND[b.chests.find((c) => KIND[c[3]])?.[3] ?? ""] ?? "khu nhà ở";
  return { x: b.x, y: 33, z: b.z, note: `${kind}; cách ${Math.round(Math.hypot(b.x - NX, b.z - NZ))} block; ${b.chests.length} rương, ${b.mobs.length} sinh vật canh` };
}).sort((a, b) => Math.hypot(a.x - NX, a.z - NZ) - Math.hypot(b.x - NX, b.z - NZ));

const fmt = (r: Row): string => `| ${r.x} | ${r.y} | ${r.z} | ${dist(r)} | ${dir(r)} | ${r.note ?? ""} |`;
let md = `# DIA-DIEM.md — Tọa độ các địa điểm\n\nTạo tự động bằng \`npm run list-places\` (đừng sửa tay; chạy lại khi đổi thế giới / seed). Tính từ seed ` +
  `\`${seedText}\` bằng đúng bộ sinh thế giới của game. Khoảng cách và hướng tính từ điểm hồi sinh **(${SX}, ${Math.floor(spawn.y)}, ${SZ})**; ` +
  `+Z là hướng Nam, +X là hướng Đông. Công trình theo lưới (làng, tiền đồn, nhà phù thủy, cổng đổ nát): trong ±${R} block quanh điểm hồi sinh. ` +
  `y là mặt đất / sàn (gần đúng). Dịch chuyển nhanh (quản trị viên): \`/tp x y z\` hoặc \`/tp x z\` (đứng trên mặt đất).\n\n` +
  "Các khối người chơi đã sửa không ảnh hưởng tọa độ ở đây; hầm mỏ, hầm quái (rất nhiều, dưới đất) không liệt kê.\n";
for (const [title, rows] of sections) {
  rows.sort((a, b) => dist(a) - dist(b));
  md += `\n## ${title} (${rows.length})\n\n`;
  md += rows.length ? `| x | y | z | Cách (block) | Hướng | Ghi chú |\n|---|---|---|---|---|---|\n${rows.map(fmt).join("\n")}\n` : "Không có trong vùng này.\n";
}
forts.sort((a, b) => Math.hypot(a.x - NX, a.z - NZ) - Math.hypot(b.x - NX, b.z - NZ));
md += `\n## Pháo đài Vực Lửa (${forts.length})\n\nTọa độ trong Vực Lửa (đi qua cổng: tọa độ thế giới chính ÷ 8). Cột "thế giới chính" = × 8 — xây cổng ở đó ` +
  `rồi đi qua thì ra gần pháo đài. Trong game: \`/locate fortress\`. Pháo đài nằm trong ô lưới ${FORTRESS.SPACING} × ${FORTRESS.SPACING} chunk ` +
  `(2/5 số ô); vùng dò ±${Math.round(NR)} block Vực Lửa quanh (${NX}, ${NZ}).\n\n` +
  "| x (Vực Lửa) | y | z (Vực Lửa) | x thế giới chính | z thế giới chính | Ghi chú |\n|---|---|---|---|---|---|\n" +
  forts.map((r) => `| ${r.x} | ${r.y} | ${r.z} | ${r.x * 8} | ${r.z * 8} | ${r.note!.replace(/^Vực Lửa \([^)]*\); /, "")} |`).join("\n") + "\n";
md += `\n## Tàn tích pháo đài lợn (${bastions.length})\n\nTọa độ Vực Lửa của điểm đầu (y 33 — tàn tích cao tới ~y 95). Trong game: \`/locate bastion\`. ` +
  "Cùng lưới ô với pháo đài (3/5 số ô, không ở đồng bằng bazan).\n\n" +
  "| x (Vực Lửa) | y | z (Vực Lửa) | x thế giới chính | z thế giới chính | Ghi chú |\n|---|---|---|---|---|---|\n" +
  bastions.map((r) => `| ${r.x} | ${r.y} | ${r.z} | ${r.x * 8} | ${r.z * 8} | ${r.note} |`).join("\n") + "\n";
writeFileSync(join(root, "docs", "DIA-DIEM.md"), md);
console.log(`[list-places] seed "${seedText}", bán kính ${R}: ${sections.map(([t, r]) => `${t.split(" (")[0]} ${r.length}`).join(", ")}, pháo đài ${forts.length}, tàn tích ${bastions.length} ` +
  `(${Math.round(performance.now() - t0)} ms) → docs/DIA-DIEM.md`);
