// Kiểm tra 10a: bộ sinh Vực Lửa (hang khổng lồ, biển dung nham y ≤ 31, đá nền đáy / trần, đá phát sáng, quặng, cát linh hồn), khung
// cổng (2 trục, khung thiếu thì không), cổng vỡ khi khung vỡ, hai cõi chạy song song trên server, đi qua cổng (tỉ lệ 1:8, tạo cổng ở
// bên kia, quay về đúng cổng cũ, phải bước ra mới đi tiếp), nước bốc hơi, lửa trên đá lửa ngục không tắt, chết ở Vực Lửa hồi sinh ở
// thế giới chính, lưu cõi của người chơi.
import {
  B, DIM, NB, NET, NETHER, NetherGenerator, PORTAL, blockIndex, breakAt, findPortal, seedFromString, stack, blockDrops, mulberry32,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { lightPortal } from "../server/src/portals.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

// ---- bộ sinh ----
{
  const g = new NetherGenerator(seedFromString("kiemtra-10a")), cnt = new Map<number, number>();
  let lavaHigh = 0, bedrockOk = true, airBelow = 0;
  for (let cx = -3; cx < 3; cx++)
    for (let cz = -3; cz < 3; cz++) {
      const c = g.generate(cx, cz);
      for (let i = 0; i < c.data.length; i++) {
        const id = c.data[i]!, y = i >> 8;
        cnt.set(id, (cnt.get(id) ?? 0) + 1);
        if (id === B.LAVA && y > NETHER.LAVA_LEVEL && g.biomeAt(cx * 16 + (i & 15), cz * 16 + ((i >> 4) & 15)) !== NB.BASALT) lavaHigh++; // (10b) bazan: vũng dung nham
        if (id === B.AIR && y <= NETHER.LAVA_LEVEL) airBelow++;
      }
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++)
        if (c.data[blockIndex(x, 0, z)] !== B.BEDROCK || c.data[blockIndex(x, 127, z)] !== B.BEDROCK) bedrockOk = false;
    }
  const tot = [...cnt.values()].reduce((a, b) => a + b, 0), pct = (id: number): number => ((cnt.get(id) ?? 0) / tot) * 100;
  check("Vực Lửa: hang khổng lồ (25–60% trống), nhiều đá lửa ngục", pct(B.AIR) > 25 && pct(B.AIR) < 60 && pct(B.NETHERRACK) > 30, `trống ${pct(B.AIR).toFixed(1)}%`);
  check("biển dung nham: dưới y 32 không có ô trống (thành dung nham), trên y 31 chỉ có dòng dung nham lẻ", airBelow === 0 && pct(B.LAVA) > 2 && lavaHigh < 200, `${lavaHigh} ô dung nham cao`);
  check("đá nền ở đáy (y 0) và trần (y 127)", bedrockOk);
  check("có đá phát sáng, quặng thạch anh, quặng vàng Vực Lửa, khối magma, cát linh hồn",
    [B.GLOWSTONE, B.NETHER_QUARTZ_ORE, B.NETHER_GOLD_ORE, B.MAGMA_BLOCK, B.SOUL_SAND].every((id) => (cnt.get(id) ?? 0) > 0));
  const a = g.generate(5, -7), b = new NetherGenerator(seedFromString("kiemtra-10a")).generate(5, -7);
  check("chunk Vực Lửa sinh lại y hệt (cả đá phát sáng vắt qua chunk)", a.data.every((v, i) => v === b.data[i]));
  const r = mulberry32(1);
  const glow = blockDrops(B.GLOWSTONE, 0, null, r).reduce((n, s) => n + s.count, 0), gold = blockDrops(B.NETHER_GOLD_ORE, 0, { kind: "pickaxe", tier: "wood" } as never, r);
  check("đá phát sáng rơi 2–4 bụi, quặng vàng Vực Lửa rơi mảnh vàng", glow >= 2 && glow <= 4 && gold.every((s) => s.item === "gold_nugget") && gold.length > 0);
}

// ---- khung cổng ----
{
  const cells = new Map<string, number>();
  const get = (x: number, y: number, z: number): number => cells.get(`${x},${y},${z}`) ?? 0;
  const frame = (axisX: boolean, w: number, h: number, skip?: [number, number]): void => {
    cells.clear();
    for (let i = -1; i <= w; i++)
      for (let j = -1; j <= h; j++) {
        if ((i === -1 || i === w || j === -1 || j === h) && !(skip && skip[0] === i && skip[1] === j))
          cells.set(axisX ? `${i},${j + 64},0` : `0,${j + 64},${i}`, B.OBSIDIAN);
      }
  };
  frame(true, 2, 3);
  const s1 = findPortal(get, 0, 64, 0);
  frame(false, 4, 5);
  const s2 = findPortal(get, 0, 66, 2);
  frame(true, 2, 3, [0, 3]);
  const s3 = findPortal(get, 0, 64, 0);
  frame(true, 2, 3, [-1, -1]); // thiếu góc vẫn được (như Minecraft)
  const s4 = findPortal(get, 1, 65, 0);
  check("khung đá vỏ chai 4 × 5 (lòng 2 × 3) dọc X, khung 6 × 7 dọc Z, thiếu góc vẫn thành cổng; thiếu một khối cạnh thì không",
    s1?.axis === 0 && s1.cells.length === 6 && s2?.axis === 1 && s2.cells.length === 20 && s3 === null && s4?.cells.length === 6);
}

// ---- server: hai cõi, đi qua cổng ----
const game = new Game({ seed: "dat-moi-mbgwo2", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
for (const r of game.realms) r.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
check("server chạy song song hai cõi (thế giới chính + Vực Lửa), người chơi mới ở thế giới chính", game.realms.length === 2 &&
  game.realms[1]!.dim === DIM.NETHER && p.dim === DIM.OVERWORLD && f.msgs.some((m) => m.t === "welcome" && m.dim === 0));
const X = Math.floor(p.x) + 200, Z = Math.floor(p.z) + 40, Y = 100;
standAt(p, X + 0.5, Y, Z + 0.5);
ticks(120);
const w0 = game.w;
for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
  w0.setCell(X + dx, Y - 1, Z + dz, B.STONE, 0);
  for (let y = Y; y < Y + 7; y++) w0.setCell(X + dx, y, Z + dz, 0, 0);
}
// khung 4 × 5 dọc trục X ở (X+2..X+5, Y..Y+4, Z+3)
const PX = X + 2, PZ = Z + 3;
for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) if (i === 0 || i === 3 || j === 0 || j === 4) w0.setCell(PX + i, Y + j, PZ, B.OBSIDIAN, 0);
check("châm lửa trong khung: thành 6 khối cổng (sáng 11)", lightPortal(w0, PX + 1, Y + 1, PZ) &&
  [1, 2].every((i) => [1, 2, 3].every((j) => (w0.getCell(PX + i, Y + j, PZ) & 255) === B.NETHER_PORTAL)));
{
  // dùng bật lửa thật (gói "use") vào khung thứ hai
  const QX = X - 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) if (i === 0 || i === 3 || j === 0 || j === 4) w0.setCell(QX + i, Y + j, Z - 3, B.OBSIDIAN, 0);
  p.inv.main[p.inv.selected] = stack("flint_and_steel");
  standAt(p, QX + 1.5, Y, Z - 1.5);
  game.message(f.conn, JSON.stringify({ t: "use", hit: { x: QX + 1, y: Y, z: Z - 3, nx: 0, ny: 1, nz: 0 }, src: { x: QX + 1.5, y: Y + 1.6, z: Z - 1.5 }, sneaking: false, yaw: 0 }));
  check("bật lửa bấm vào đáy khung: cổng sáng lên", (w0.getCell(QX + 1, Y + 1, Z - 3) & 255) === B.NETHER_PORTAL);
  breakAt(game.ticker.acc, QX, Y + 2, Z - 3, game.ticker.startFalling);
  check("phá một khối khung: cả cổng tắt", [1, 2].every((i) => [1, 2, 3].every((j) => (w0.getCell(QX + i, Y + j, Z - 3) & 255) !== B.NETHER_PORTAL)));
  // bật lửa bấm vào mặt ngoài của khung đủ (mặt trước cột bên, đỉnh khối góc): vẫn thành cổng
  const RX = X - 4, RZ = Z + 3, lit = (): boolean => [1, 2].every((i) => [1, 2, 3].every((j) => (w0.getCell(RX + i, Y + j, RZ) & 255) === B.NETHER_PORTAL));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) if (i === 0 || i === 3 || j === 0 || j === 4) w0.setCell(RX + i, Y + j, RZ, B.OBSIDIAN, 0);
  const use = (x: number, y: number, z: number, n: [number, number, number]): void => {
    p.inv.main[p.inv.selected] = stack("flint_and_steel");
    game.message(f.conn, JSON.stringify({ t: "use", hit: { x, y, z, nx: n[0], ny: n[1], nz: n[2] }, src: { x: RX + 1.5, y: Y + 1.6, z: RZ - 1.5 }, sneaking: false, yaw: 0 }));
  };
  standAt(p, RX + 1.5, Y, RZ - 1.5);
  use(RX, Y + 2, RZ, [0, 0, -1]);
  const side = lit();
  breakAt(game.ticker.acc, RX + 3, Y + 2, RZ, game.ticker.startFalling);
  w0.setCell(RX + 3, Y + 2, RZ, B.OBSIDIAN, 0);
  const off = !lit();
  use(RX, Y + 4, RZ, [0, 1, 0]);
  check("bật lửa bấm vào mặt ngoài khung đủ (mặt trước cột bên, đỉnh khối góc): cổng sáng lên", side && off && lit());
  breakAt(game.ticker.acc, RX, Y + 2, RZ, game.ticker.startFalling);
  w0.setCell(RX + 1, Y + 2, RZ - 2, B.OBSIDIAN, 0);
  use(RX + 1, Y + 2, RZ - 2, [0, 0, 1]);
  check("bấm đá vỏ chai lẻ / khung thiếu cạnh: không thành cổng", !lit() && (w0.getCell(RX + 1, Y + 2, RZ) & 255) !== B.NETHER_PORTAL);
  w0.setCell(RX + 1, Y + 2, RZ - 2, 0, 0);
}
standAt(p, PX + 1.5, Y + 1, PZ + 0.5);
ticks(Math.round((PORTAL.WAIT_S - 1) * NET.SERVER_TICK_RATE));
check("đứng trong cổng chưa đủ 4 giây: chưa sang", p.dim === DIM.OVERWORLD);
const before = f.msgs.length;
ticks(Math.round(1.5 * NET.SERVER_TICK_RATE));
const dimMsg = f.msgs.slice(before).find((m) => m.t === "dim");
check("đủ 4 giây: sang Vực Lửa ở tọa độ ÷ 8, client nhận gói dim", p.dim === DIM.NETHER && !!dimMsg && Math.abs(p.x - (PX + 1.5) / 8) < 18 &&
  Math.abs(p.z - (PZ + 0.5) / 8) < 18, `ở ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}`);
const w1 = game.realms[1]!.w;
const at = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
check("bên Vực Lửa có cổng mới (khung đá vỏ chai) ngay chỗ đứng", (w1.cellLoading(at.x, at.y, at.z) & 255) === B.NETHER_PORTAL &&
  (w1.cellLoading(at.x, at.y - 1, at.z) & 255) === B.OBSIDIAN);
ticks(Math.round((PORTAL.WAIT_S + 2) * NET.SERVER_TICK_RATE));
check("đứng yên trong cổng vừa tới: không bị đưa về", p.dim === DIM.NETHER);
{
  // bước ra rồi vào lại: về thế giới chính, ở đúng cổng cũ
  standAt(p, at.x + 0.5, at.y, at.z + 3.5);
  ticks(5);
  standAt(p, at.x + 0.5, at.y, at.z + 0.5);
  ticks(Math.round((PORTAL.WAIT_S + 0.5) * NET.SERVER_TICK_RATE));
  check("đi ngược: về thế giới chính ngay cổng cũ (không tạo cổng mới)", p.dim === DIM.OVERWORLD && Math.abs(p.x - (PX + 1.5)) < 2.5 && Math.abs(p.z - (PZ + 0.5)) < 1.5,
    `ở ${p.x.toFixed(1)} ${p.z.toFixed(1)}`);
}
{
  // Vực Lửa: nước bốc hơi; lửa trên đá lửa ngục không tắt; chết ở Vực Lửa thì hồi sinh ở thế giới chính
  game.portals.travel(p);
  const r1 = game.realms[1]!, nx = Math.floor(p.x) + 2, ny = Math.floor(p.y), nz = Math.floor(p.z) + 2;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { w1.setCell(nx + dx, ny - 1, nz + dz, B.NETHERRACK, 0); w1.setCell(nx + dx, ny, nz + dz, 0, 0); }
  p.inv.main[p.inv.selected] = stack("water_bucket");
  r1.actions.use(p, { x: nx, y: ny - 1, z: nz, nx: 0, ny: 1, nz: 0 }, { x: p.x, y: p.y + 1.6, z: p.z }, false, 0);
  check("đổ nước ở Vực Lửa: nước bốc hơi, còn lại xô rỗng", (w1.getCell(nx, ny, nz) & 255) !== B.WATER && p.inv.held?.item === "bucket");
  p.inv.main[p.inv.selected] = stack("flint_and_steel");
  r1.actions.use(p, { x: nx, y: ny - 1, z: nz, nx: 0, ny: 1, nz: 0 }, { x: p.x, y: p.y + 1.6, z: p.z }, false, 0);
  ticks(200);
  check("lửa trên đá lửa ngục cháy mãi (không tắt sau 10 giây)", (w1.getCell(nx, ny, nz) & 255) === B.FIRE);
  check("người chơi lưu kèm cõi đang ở", p.toSave().dim === DIM.NETHER);
  Object.assign(p.state, { health: 0, dead: true });
  p.deathHandled = true;
  game.realmOf(p).movement.input(p, { firstSeq: p.lastSeq + 1, frames: [{ forward: 0, strafe: 0, jump: false, sneak: false, sprint: false, yaw: 0, respawn: true, eat: false }], pitch: 0, yaw: 0, swing: 0, fly: null });
  check("chết ở Vực Lửa: hồi sinh ở thế giới chính", p.dim === DIM.OVERWORLD && !p.state.dead);
}
