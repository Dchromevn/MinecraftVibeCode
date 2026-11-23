// Kiểm tra đầm lầy (7b, người dùng chọn 2026-11-14; bỏ giới hạn xa gốc khi làm lại thế giới): có gần gốc, đất sát mực nước, có vũng, không bãi cát;
// cây sồi có dây leo, lá súng trên vũng; nhà phù thủy trong đầm lầy có rương với đồ riêng; dây leo leo được.
import {
  B, BIOME, BlockEntities, ChunkGenerator, DUNGEON_LOOT, TerrainSampler, WITCH_HUT_LOOT, createPlayer, hasSupport, hutInside, hutsIn, stepPlayer,
  type InputFrame,
} from "../shared/src/index.js";
import { check } from "./harness.js";
import { frame } from "./netHelpers.js";

const seed = 12345, s = new TerrainSampler(seed), gen = new ChunkGenerator(seed);
// tìm đầm lầy: quét vòng tròn
let swamp: { x: number; z: number } | null = null;
for (let r = 0; r < 6000 && !swamp; r += 48)
  for (let a = 0; a < 96 && !swamp; a++) {
    const x = Math.round(Math.cos((a / 96) * Math.PI * 2) * r), z = Math.round(Math.sin((a / 96) * Math.PI * 2) * r);
    // giữa đầm lầy (cả vòng 64 block quanh cũng là đầm lầy), không phải rìa chuyển tiếp
    if ([[0, 0], [64, 0], [-64, 0], [0, 64], [0, -64]].every(([dx, dz]) => s.column(x + dx!, z + dz!).biome === BIOME.SWAMP)) swamp = { x, z };
  }
check("có đầm lầy trong vòng 1600 block quanh gốc (đã bỏ giới hạn xa gốc)", !!swamp && Math.hypot(swamp.x, swamp.z) < 1600, JSON.stringify(swamp));
// thống kê vùng 6 × 6 chunk quanh điểm đầm lầy
let cols = 0, low = 0, sand = 0, water = 0, vines = 0, lilies = 0;
const cx0 = swamp!.x >> 4, cz0 = swamp!.z >> 4;
for (let cx = cx0 - 3; cx < cx0 + 3; cx++)
  for (let cz = cz0 - 3; cz < cz0 + 3; cz++) {
    const d = gen.generate(cx, cz).data;
    for (let i = 0; i < d.length; i++) {
      if (d[i] === B.VINE) vines++;
      else if (d[i] === B.LILY_PAD) lilies++;
    }
    for (let lz = 0; lz < 16; lz++)
      for (let lx = 0; lx < 16; lx++) {
        const col = s.column(cx * 16 + lx, cz * 16 + lz);
        if (col.biome !== BIOME.SWAMP) continue;
        cols++;
        if (Math.abs(col.height - col.waterTop) <= 3) low++;
        if (col.height < col.waterTop) water++;
        if (d[col.height * 256 + lz * 16 + lx] === B.SAND) sand++;
      }
  }
check("đầm lầy: đất sát mực nước, có vũng, không bãi cát", cols > 500 && low / cols > 0.9 && water / cols > 0.05 && sand === 0,
  `${cols} cột, ${(low / cols * 100).toFixed(0)}% thấp, ${(water / cols * 100).toFixed(0)}% nước, cát ${sand}`);
check("đầm lầy: cây có dây leo, vũng có lá súng", vines > 10 && lilies > 3, `${vines} dây leo, ${lilies} lá súng`);

// nhà phù thủy trong đầm lầy, có rương với đồ riêng
const huts = hutsIn(s, -6000, -6000, 6000, 6000);
const h = huts[0];
check("nhà phù thủy chỉ ở đầm lầy", huts.length > 0 && huts.every((hh) => s.column(hh.x + 3, hh.z + 5).biome === BIOME.SWAMP), `${huts.length} nhà`);
if (h) {
  const d = gen.generate((h.x + 4) >> 4, (h.z + 7) >> 4).data;
  const lx = (h.x + 4) & 15, lz = (h.z + 7) & 15;
  check("nhà phù thủy có rương bên trong", d[(h.floor + 1) * 256 + lz * 16 + lx] === B.CHEST);
  const ents = new BlockEntities(seed);
  ents.lootAt = (x, _y, z) => (hutsIn(s, x, z, x, z).length ? WITCH_HUT_LOOT : DUNGEON_LOOT);
  const chest = ents.obtain(h.x + 4, h.floor + 1, h.z + 7, B.CHEST);
  const items = chest?.slots.filter(Boolean).map((x) => x!.item) ?? [];
  check("rương nhà phù thủy có đồ của bảng phù thủy", items.length > 0 && items.every((k) => WITCH_HUT_LOOT.ENTRIES.some((e) => e.item === k)), items.join(", "));
}

// dây leo: cần chỗ bám, leo được như thang
const cell = (x: number, y: number, z: number): number => (y < 70 ? B.STONE : x === 1 && y < 80 ? B.LEAVES : x === 0 && y < 80 ? B.VINE | (3 << 8) : 0);
check("dây leo bám lá bên cạnh", hasSupport(B.VINE | (3 << 8), 0, 75, 0, (x, y, z) => cell(x, y, z) & 255));
const p = createPlayer(0.5, 70, 0.5);
for (let i = 0; i < 60; i++) stepPlayer(p, frame({ jump: true }) as InputFrame, cell);
check("đứng trong dây leo, nhảy: leo lên", p.y > 71.5, `y ${p.y.toFixed(2)}`);

// ---- nhà phù thủy có sẵn một phù thủy ở nhà (người dùng báo 2026-11-14) ----
{
  const { Game } = await import("../server/src/game.js");
  const game = new Game({ seed: "nhaphuthuy", port: 0, spawn: "fixed", debug: true, world: "h", admins: [], adminAll: true, dataDir: null });
  const ts = new TerrainSampler(game.seed);
  const hut = hutsIn(ts, -6000, -6000, 6000, 6000)[0];
  if (!hut) check("tìm được nhà phù thủy để thử", false);
  else {
    const a = hutInside(hut);
    game.w.cellLoading(a.x0 + 1, a.y, a.z0 + 1); // tải chunk giữa nhà
    const w = game.life.mobs.list.filter((m) => m.def.key === "witch");
    check("tải chunk nhà phù thủy: có sẵn 1 phù thủy trong nhà, không tự biến mất", w.length === 1 && w[0]!.persistent &&
      Math.abs(w[0]!.x - a.x0 - 1.5) < 0.01 && w[0]!.y === a.y, `${w.length} con`);
    game.life.mobs.list.splice(0);
    game.w.world.removeChunk((a.x0 + 1) >> 4, (a.z0 + 1) >> 4);
    game.w.cellLoading(a.x0 + 1, a.y, a.z0 + 1);
    const saved = game.life.save();
    check("tải lại chunk: không sinh thêm phù thủy ở nhà; lưu danh sách nhà đã có", !game.life.mobs.list.some((m) => m.def.key === "witch") &&
      (saved.hutWitches ?? []).includes(`${hut.x},${hut.z}`));
  }
}
