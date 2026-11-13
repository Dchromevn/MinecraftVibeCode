// Kiểm tra 4e: bậc (hướng, lật ngược, góc tự nối), tấm (nửa trên / dưới, ghép tấm đôi, rơi 2), đi lên
// cầu thang không cần nhảy, tường (nối, cao 1.5), hàng rào / cửa theo loài gỗ, công thức.
import {
  B, BLOCKS, SLAB_BOTTOM, SLAB_DOUBLE, SLAB_TOP, blockDrops, breakAt, canPlace, collisionBoxes, createPlayer, makeCell,
  doorSide, matchGrid, mulberry32, placeCells, planPlace, stairsDir, stairsShape, stairsUpside, stepPlayer, wallBoxes,
  type BlockAccess, type PlaceHit,
} from "../shared/src/index.js";
import { check } from "./harness.js";

function mkWorld() {
  const m = new Map<string, number>();
  const w: BlockAccess = {
    getCell: (x, y, z) => m.get(`${x},${y},${z}`) ?? 0,
    setCell: (x, y, z, id, meta) => { if (id === 0) m.delete(`${x},${y},${z}`); else m.set(`${x},${y},${z}`, makeCell(id, meta)); },
  };
  for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) w.setCell(x, 9, z, B.STONE, 0);
  const cell = (x: number, y: number, z: number) => m.get(`${x},${y},${z}`) ?? 0;
  /** Đặt như người chơi: bấm (hit) với yaw, đi qua planPlace → canPlace → placeCells. */
  const place = (id: number, hit: PlaceHit, yaw = 0): boolean => {
    const cells = planPlace(id, hit, yaw, w.getCell);
    if (!cells || !canPlace(cells, w.getCell, null)) return false;
    placeCells(w, cells, () => undefined);
    return true;
  };
  return { w, cell, place };
}
// yaw như camera: 0 nhìn về −Z (hướng 2, Bắc); π/2 nhìn về −X (hướng 1, Tây)
const YAW_N = 0, YAW_W = Math.PI / 2;
const floor = (x: number, z: number): PlaceHit => ({ x, y: 9, z, nx: 0, ny: 1, nz: 0, fy: 1 });

{ // 1. bậc: hướng theo hướng nhìn, lật ngược khi bấm nửa trên mặt bên / mặt dưới
  const { cell, place } = mkWorld();
  place(B.COBBLE_STAIRS, floor(0, 0), YAW_N);
  const m = cell(0, 10, 0) >> 8;
  check("bậc đặt trên sàn: phía cao theo hướng nhìn (Bắc), không lật", (cell(0, 10, 0) & 255) === B.COBBLE_STAIRS && stairsDir(m) === 2 && !stairsUpside(m));
  // tường đá ở (3, 10, 0); bấm mặt −X của nó ở nửa trên → bậc lật ngược ở (2, 10, 0)
  const { w: w2, cell: c2, place: p2 } = mkWorld();
  w2.setCell(3, 10, 0, B.STONE, 0);
  p2(B.COBBLE_STAIRS, { x: 3, y: 10, z: 0, nx: -1, ny: 0, nz: 0, fy: 0.8 }, YAW_W);
  p2(B.COBBLE_STAIRS, { x: 3, y: 10, z: 0, nx: 0, ny: 0, nz: 1, fy: 0.2 }, YAW_W); // nửa dưới: không lật
  check("bấm nửa trên mặt bên → bậc lật ngược; nửa dưới → bậc thường", stairsUpside(c2(2, 10, 0) >> 8) && !stairsUpside(c2(3, 10, 1) >> 8));
}

{ // 2. góc tự nối: bậc hướng Bắc có bậc hướng Tây ở phía cao → góc ngoài trái; ở phía thấp → góc trong trái
  const a = mkWorld();
  a.place(B.STONE_STAIRS, floor(0, -1), YAW_W); // bậc hướng Tây ở phía Bắc
  a.place(B.STONE_STAIRS, floor(0, 0), YAW_N); // bậc hướng Bắc
  const b = mkWorld();
  b.place(B.STONE_STAIRS, floor(0, 1), YAW_W); // bậc hướng Tây ở phía Nam (phía thấp)
  b.place(B.STONE_STAIRS, floor(0, 0), YAW_N);
  const c = mkWorld();
  c.place(B.STONE_STAIRS, floor(0, 0), YAW_N); // đặt trước, rồi đặt bậc kề: dạng tự tính lại
  c.place(B.STONE_STAIRS, floor(0, -1), YAW_W);
  check("góc ngoài trái / góc trong trái; đặt bậc kề sau vẫn tự nối",
    stairsShape(a.cell(0, 10, 0) >> 8) === "outer_left" && stairsShape(b.cell(0, 10, 0) >> 8) === "inner_left"
    && stairsShape(c.cell(0, 10, 0) >> 8) === "outer_left",
    `${stairsShape(a.cell(0, 10, 0) >> 8)}, ${stairsShape(b.cell(0, 10, 0) >> 8)}, ${stairsShape(c.cell(0, 10, 0) >> 8)}`);
  breakAt(c.w, 0, 10, -1, () => undefined);
  check("phá bậc kề: bậc còn lại thẳng lại", stairsShape(c.cell(0, 10, 0) >> 8) === "straight");
}

{ // 3. tấm: nửa dưới / trên, ghép tấm đôi (bấm mặt trong, hoặc đặt vào ô có tấm), rơi 2 tấm
  const { w, cell, place } = mkWorld();
  place(B.STONE_SLAB, floor(0, 0));
  const bottom = cell(0, 10, 0) >> 8 === SLAB_BOTTOM;
  place(B.STONE_SLAB, { x: 0, y: 10, z: 0, nx: 0, ny: 1, nz: 0, fy: 0.5 });
  const dbl = cell(0, 10, 0) >> 8 === SLAB_DOUBLE && cell(0, 11, 0) === 0;
  w.setCell(3, 10, 0, B.STONE, 0);
  place(B.STONE_SLAB, { x: 3, y: 10, z: 0, nx: -1, ny: 0, nz: 0, fy: 0.9 }); // nửa trên ở (2, 10, 0)
  const top = cell(2, 10, 0) >> 8 === SLAB_TOP;
  place(B.STONE_SLAB, { x: 3, y: 10, z: 0, nx: -1, ny: 0, nz: 0, fy: 0.1 }); // ô đã có tấm trên → thành tấm đôi
  const dbl2 = cell(2, 10, 0) >> 8 === SLAB_DOUBLE;
  place(B.COBBLE_SLAB, floor(4, 4));
  const other = !place(B.STONE_SLAB, { x: 4, y: 10, z: 4, nx: 0, ny: 1, nz: 0, fy: 0.5 }) || (cell(4, 10, 4) & 255) === B.COBBLE_SLAB;
  const drops = blockDrops(B.STONE_SLAB, SLAB_DOUBLE, { kind: "pickaxe", tier: "wood" }, mulberry32(1));
  check("tấm: nửa dưới, ghép đôi khi bấm mặt trên; nửa trên khi bấm cao; đặt vào ô có tấm → đôi",
    bottom && dbl && top && dbl2, `${bottom} ${dbl} ${top} ${dbl2}`);
  check("tấm khác loại không ghép; tấm đôi rơi 2 tấm", other && drops[0]?.item === "stone_slab" && drops[0].count === 2);
}

const walkInput = { forward: 1, strafe: 0, jump: false, sneak: false, sprint: false, yaw: YAW_N };
{ // 4. đi lên cầu thang 2 nấc không cần nhảy; tấm nửa dưới cũng bước lên được
  const { w, cell, place } = mkWorld();
  place(B.OAK_STAIRS, floor(0, -2), YAW_N);
  w.setCell(0, 10, -3, B.STONE, 0); // khối sau bậc
  place(B.OAK_STAIRS, { x: 0, y: 10, z: -3, nx: 0, ny: 1, nz: 0, fy: 1 }, YAW_N); // bậc thứ hai trên khối
  const s = createPlayer(0.5, 10, 0.5);
  let maxY = s.y;
  for (let t = 0; t < 150; t++) { stepPlayer(s, walkInput, (x, y, z) => cell(x, y, z)); maxY = Math.max(maxY, s.y); }
  check("đi thẳng lên cầu thang (2 bậc + khối) không cần nhảy", maxY >= 11.99, `cao nhất y=${maxY.toFixed(2)}`);
  const t2 = mkWorld();
  t2.place(B.STONE_SLAB, floor(0, -1));
  const p = createPlayer(0.5, 10, 0.5);
  let top = p.y;
  for (let t = 0; t < 40; t++) { stepPlayer(p, walkInput, (x, y, z) => t2.cell(x, y, z)); top = Math.max(top, p.y); }
  check("bước lên tấm nửa dưới", Math.abs(top - 10.5) < 1e-6, `cao nhất y=${top.toFixed(2)}`);
}

{ // 5. tường: nối nhau, cột giữa chỉ khi không thẳng; cao 1.5 không nhảy qua
  const { w, cell, place } = mkWorld();
  for (let x = -3; x <= 3; x++) place(B.COBBLE_WALL, floor(x, -2));
  const idAt = (x: number, y: number, z: number) => cell(x, y, z) & 255;
  const mid = wallBoxes(0, 10, -2, idAt, 1.5, 1.5), end = wallBoxes(3, 10, -2, idAt, 1.5, 1.5);
  check("tường thẳng: 2 tay nối, không cột; đầu tường: có cột", mid.length === 2 && end.length === 2 && end[0]![3] - end[0]![0] === 0.5);
  const s = createPlayer(0.5, 10, 0.5);
  for (let t = 0; t < 120; t++) stepPlayer(s, { ...walkInput, jump: true }, (x, y, z) => cell(x, y, z));
  check("không nhảy qua được tường", s.z > -1.5, `z=${s.z.toFixed(2)}`);
  w.setCell(5, 10, 5, B.SPRUCE_FENCE, 0); w.setCell(6, 10, 5, B.FENCE, 0);
  check("hàng rào thông nối với hàng rào sồi", collisionBoxes(makeCell(B.SPRUCE_FENCE, 0), 5, 10, 5, idAt).length === 2);
}

{ // 6. cửa theo loài: đặt 2 ô, phá nửa trên mất cả cửa, rơi đúng loài
  const { cell, place, w } = mkWorld();
  const ok = place(B.BIRCH_DOOR, floor(0, 0), YAW_N);
  const two = (cell(0, 10, 0) & 255) === B.BIRCH_DOOR && (cell(0, 11, 0) & 255) === B.BIRCH_DOOR;
  const drops = breakAt(w, 0, 11, 0, () => undefined);
  check("cửa bạch dương: 2 ô, phá nửa trên mất cả cửa, rơi 1 cửa bạch dương",
    ok && two && cell(0, 10, 0) === 0 && drops.filter((d) => d.id === B.BIRCH_DOOR).length >= 1
    && blockDrops(B.BIRCH_DOOR, 0, null, mulberry32(1))[0]?.item === "birch_door");
}

{ // 7. công thức
  const g = (cells: (string | null)[]) => matchGrid(cells, 3)?.out;
  const X = "spruce_planks";
  check("ván thông → rào thông, cửa thông; ván sồi → rào sồi",
    g([X, "stick", X, X, "stick", X, null, null, null])?.item === "spruce_fence"
    && g([X, X, null, X, X, null, X, X, null])?.item === "spruce_door"
    && g(["planks", "stick", "planks", "planks", "stick", "planks", null, null, null])?.item === "fence");
  const st = g(["cobble", null, null, "cobble", "cobble", null, "cobble", "cobble", "cobble"]);
  const sl = g(["stone", "stone", "stone", null, null, null, null, null, null]);
  const wl = g(["stone_bricks", "stone_bricks", "stone_bricks", "stone_bricks", "stone_bricks", "stone_bricks", null, null, null]);
  const br = matchGrid(["stone", "stone", "stone", "stone"], 2)?.out;
  check("bậc đá cuội ×4, tấm đá ×6, tường gạch đá ×6, gạch đá ×4 (lưới 2x2)",
    st?.item === "cobble_stairs" && st.count === 4 && sl?.item === "stone_slab" && sl.count === 6
    && wl?.item === "stone_brick_wall" && wl.count === 6 && br?.item === "stone_bricks" && br.count === 4);
  check("đủ 32 block mới (id 63–94) có tên kỹ thuật và rơi ra chính nó", BLOCKS.slice(63, 95).length === 32 && BLOCKS.slice(63, 95).every((b) => b.drops[0]?.item === b.key));
}

{ // 8. cửa đôi: hai cửa cùng hướng cạnh nhau tự thành cặp, mở về hai phía (đặt theo thứ tự nào cũng được)
  const sides = (first: number, second: number): number[] => {
    const { w, cell, place } = mkWorld();
    place(B.IRON_DOOR, floor(first, 0), YAW_N);
    place(B.DOOR, floor(second, 0), YAW_N);
    for (const x of [0, 1]) for (const y of [10, 11]) w.setCell(x, y, 0, cell(x, y, 0) & 255, (cell(x, y, 0) >> 8) | 4); // mở cả hai
    return [0, 1].flatMap((x) => [10, 11].map((y) => doorSide(cell(x, y, 0) >> 8)));
  };
  // nhìn về Bắc (hướng 2): cánh trái (x = 0) mở về Tây (1), cánh phải (x = 1) mở về Đông (3)
  const a = sides(0, 1), b = sides(1, 0);
  check("cửa đôi: cánh trái mở về bên trái, cánh phải mở về bên phải; đặt cánh nào trước cũng được",
    a.join() === "1,1,3,3" && b.join() === "1,1,3,3", `${a} / ${b}`);
}
