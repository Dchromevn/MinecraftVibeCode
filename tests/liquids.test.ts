// Chất lỏng (4c): lan 7 / 3 ô, tìm chỗ trũng, nguồn vô hạn, rút khi mất nguồn, nước gặp dung nham,
// cuốn trôi block nhỏ, chảy xuống, hướng dòng chảy, raycast trúng nguồn (xô), vật phẩm trôi.
import {
  B, LiquidSim, createItemEntity, liquidFlow, makeCell, raycast, stack, stepItem, type LiquidWorld,
} from "../shared/src/index.js";
import { check } from "./harness.js";

function mk() {
  const m = new Map<string, number>();
  const dropped: number[] = [];
  const w: LiquidWorld = {
    getCell: (x, y, z) => (y < 0 ? -1 : m.get(`${x},${y},${z}`) ?? 0),
    setCell: (x, y, z, id, meta) => {
      if (id === 0) m.delete(`${x},${y},${z}`);
      else m.set(`${x},${y},${z}`, makeCell(id, meta));
    },
    drop: (id) => void dropped.push(id),
  };
  const sim = new LiquidSim(w);
  const id = (x: number, y: number, z: number): number => (m.get(`${x},${y},${z}`) ?? 0) & 255;
  const level = (x: number, y: number, z: number): number => ((m.get(`${x},${y},${z}`) ?? 0) >> 8) & 7;
  const floor = (y: number, r = 12): void => {
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) w.setCell(x, y, z, B.STONE, 0);
  };
  const put = (x: number, y: number, z: number, b: number, meta = 0): void => {
    w.setCell(x, y, z, b, meta);
    sim.notify(x, y, z);
  };
  const run = (ticks: number): void => {
    for (let t = 0; t < ticks; t++) sim.step(100000);
  };
  return { m, w, sim, id, level, floor, put, run, dropped };
}

{ // 1. nước lan 7 ô trên mặt phẳng rồi dừng
  const s = mk();
  s.floor(9);
  s.put(0, 10, 0, B.WATER);
  s.run(300);
  check("nước lan đúng 7 ô (mức 1..7) rồi dừng; hết việc thì hàng đợi trống",
    s.id(7, 10, 0) === B.WATER && s.level(7, 10, 0) === 7 && s.id(8, 10, 0) === 0 && s.level(3, 10, 0) === 3 && s.sim.pending === 0,
    `ô 7: mức ${s.level(7, 10, 0)}, ô 8: ${s.id(8, 10, 0)}`);
}
{ // 2. tìm chỗ trũng: có lỗ cách 3 ô về +X thì chỉ chảy về hướng đó
  const s = mk();
  s.floor(9);
  s.floor(7);
  s.w.setCell(3, 9, 0, B.AIR, 0);
  s.put(0, 10, 0, B.WATER);
  s.run(200);
  check("nước tìm lỗ trong 4 ô và chỉ chảy về đó (không loang các hướng khác), rồi rơi xuống",
    s.id(1, 10, 0) === B.WATER && s.id(-1, 10, 0) === 0 && s.id(0, 10, 1) === 0 && s.id(3, 8, 0) === B.WATER,
    `−X ${s.id(-1, 10, 0)}, +Z ${s.id(0, 10, 1)}, đáy lỗ ${s.id(3, 8, 0)}`);
}
{ // 3. nguồn vô hạn: hai nguồn kẹp một ô có nền đặc → ô giữa thành nguồn; bỏ một nguồn ngoài thì vẫn còn
  const s = mk();
  s.floor(9);
  for (let x = -1; x <= 3; x++) for (const z of [-1, 1]) s.w.setCell(x, 10, z, B.STONE, 0);
  s.w.setCell(-1, 10, 0, B.STONE, 0);
  s.w.setCell(3, 10, 0, B.STONE, 0);
  s.put(0, 10, 0, B.WATER);
  s.put(2, 10, 0, B.WATER);
  s.run(50);
  const mid = s.id(1, 10, 0) === B.WATER && s.level(1, 10, 0) === 0;
  s.put(1, 10, 0, B.AIR); // múc ô giữa: vẫn kẹp giữa hai nguồn → đầy lại thành nguồn
  s.run(50);
  check("hai nguồn kề ô giữa (nền đặc) → ô giữa thành nguồn; múc ô giữa thì nó tự đầy lại",
    mid && s.id(1, 10, 0) === B.WATER && s.level(1, 10, 0) === 0);
}
{ // 4. mất nguồn → nước rút hết
  const s = mk();
  s.floor(9);
  s.put(0, 10, 0, B.WATER);
  s.run(200);
  s.put(0, 10, 0, B.AIR);
  s.run(300);
  let left = 0;
  for (const [k, v] of s.m) if ((v & 255) === B.WATER) left += k ? 1 : 0;
  check("múc mất nguồn → toàn bộ nước chảy rút hết", left === 0, `còn ${left} ô`);
}
{ // 5. chảy xuống không giới hạn, cột rơi luôn đầy
  const s = mk();
  s.floor(0, 3);
  s.w.setCell(0, 30, 0, B.STONE, 0);
  s.put(0, 31, 0, B.WATER);
  s.run(400);
  check("nước chảy ra mép rồi rơi xuống tận đáy (cột rơi có cờ đang rơi)",
    s.id(1, 5, 0) === B.WATER || s.id(-1, 5, 0) === B.WATER || s.id(0, 5, 1) === B.WATER || s.id(0, 5, -1) === B.WATER);
}
{ // 6. dung nham: lan 3 ô, chậm hơn nước
  const s = mk();
  s.floor(9);
  s.put(0, 10, 0, B.LAVA);
  s.run(55);
  const early = s.id(2, 10, 0); // 30 tick mỗi ô: tick 55 mới tới ô 1
  s.run(400);
  check("dung nham lan 3 ô (không tới ô 4) và chậm (30 tick mỗi ô: tick 55 chưa tới ô 2)",
    s.id(3, 10, 0) === B.LAVA && s.id(4, 10, 0) === 0 && early === 0, `tick 55 ô 2: ${early}`);
}
{ // 7. nước gặp dung nham
  const s = mk();
  s.floor(9);
  s.w.setCell(4, 10, 0, B.LAVA, 0); // nguồn dung nham
  s.put(0, 10, 0, B.WATER);
  s.run(200);
  const obs = s.id(4, 10, 0) === B.OBSIDIAN;
  const t = mk();
  t.floor(9);
  t.w.setCell(0, 10, 0, B.WATER, 0);
  t.put(3, 10, 0, B.LAVA);
  t.run(400);
  let cobble = 0;
  for (const v of t.m.values()) if ((v & 255) === B.COBBLE) cobble++;
  check("nước chảy vào nguồn dung nham → đá vỏ chai", obs);
  check("dung nham đang chảy chạm nước → đá cuội", cobble > 0, `${cobble} đá cuội`);
}
{ // 8. dung nham rơi xuống nước → đá
  const s = mk();
  s.floor(5, 3);
  s.w.setCell(0, 6, 0, B.WATER, 0);
  s.put(0, 8, 0, B.LAVA);
  s.run(200);
  check("dung nham chảy xuống ô nước → đá", s.id(0, 6, 0) === B.STONE || s.id(0, 7, 0) === B.STONE, `y6 ${s.id(0, 6, 0)}, y7 ${s.id(0, 7, 0)}`);
}
{ // 9. cuốn trôi đuốc, lúa → rơi vật phẩm
  const s = mk();
  s.floor(9);
  s.w.setCell(2, 10, 0, B.TORCH, 0);
  s.w.setCell(0, 10, 2, B.WHEAT, 3);
  s.put(0, 10, 0, B.WATER);
  s.run(100);
  check("nước cuốn trôi đuốc, lúa (rơi ra vật phẩm), ô đó thành nước",
    s.dropped.includes(B.TORCH) && s.dropped.includes(B.WHEAT) && s.id(2, 10, 0) === B.WATER);
}
{ // 10. hướng dòng chảy, raycast trúng nguồn khi múc xô, vật phẩm trôi
  const s = mk();
  s.floor(9);
  s.put(0, 10, 0, B.WATER);
  s.run(200);
  const [fx, fz] = liquidFlow(s.w.getCell, 3, 10, 0);
  const get = (x: number, y: number, z: number): number => s.w.getCell(x, y, z);
  const pass = raycast(get, 0.5, 12, 0.5, 0, -1, 0, 5);
  const hit = raycast(get, 0.5, 12, 0.5, 0, -1, 0, 5, true);
  const e = createItemEntity(stack("dirt"), 3.5, 10.05, 0.5);
  for (let k = 0; k < 60; k++) stepItem(e, 1 / 20, get, null);
  check("dòng chảy hướng ra xa nguồn (+X ở ô x = 3)", fx > 0.9 && Math.abs(fz) < 0.1, `(${fx.toFixed(2)}, ${fz.toFixed(2)})`);
  check("raycast thường xuyên qua nước, chế độ xô trúng nguồn", pass?.y === 9 && hit?.y === 10 && (hit.cell & 255) === B.WATER);
  check("vật phẩm trong dòng nước trôi theo dòng", e.x > 4.2, `x = ${e.x.toFixed(2)}`);
}
