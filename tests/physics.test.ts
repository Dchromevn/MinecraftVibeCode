// Kiểm tra vật lý 3a trên thế giới nhỏ dựng tay: nhảy 1/2 block, rào, tường, góc,
// rơi nhanh, bước lên, ngồi mép, thang, bơi, mạng nhện, dung nham, chunk chưa tải.
import {
  B, createPlayer as createPlayer0, stepPlayer, makeCell, doorMeta, type PlayerInput, type PlayerState,
} from "../shared/src/index.js";
import { check } from "./harness.js";
// đói 17, không còn độ no: tắt hồi máu để đo đúng sát thương
const createPlayer = (x: number, y: number, z: number): PlayerState => {
  const p = createPlayer0(x, y, z);
  p.hunger = 17;
  p.saturation = 0;
  return p;
};

type W = Map<string, number>;
const mk = (): W => new Map();
const put = (w: W, x: number, y: number, z: number, id: number, meta = 0) => w.set(`${x},${y},${z}`, makeCell(id, meta));
const floor = (w: W, y = 9, r = 12, id: number = B.STONE) => { for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) put(w, x, y, z, id); };
const reader = (w: W, unloadedX = Infinity) => (x: number, y: number, z: number) => (x >= unloadedX ? -1 : w.get(`${x},${y},${z}`) ?? B.AIR);
const inp = (o: Partial<PlayerInput> = {}): PlayerInput => ({ forward: 0, strafe: 0, jump: false, sneak: false, sprint: false, yaw: 0, ...o });
const run = (s: PlayerState, w: (x: number, y: number, z: number) => number, n: number, i: PlayerInput | ((t: number) => PlayerInput)) => {
  let maxY = s.y;
  for (let t = 0; t < n; t++) { stepPlayer(s, typeof i === "function" ? i(t) : i, w); maxY = Math.max(maxY, s.y); }
  return maxY;
};
// yaw = 0 nhìn về −Z; đi tới = −Z

{ // 1. đứng yên trên đất, đỉnh nhảy
  const w = mk(); floor(w);
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 30, inp());
  check("đứng trên đất y=10", Math.abs(s.y - 10) < 1e-9 && s.onGround, `y=${s.y}`);
  const top = run(s, reader(w), 60, (t) => inp({ jump: t === 0 }));
  check("đỉnh nhảy ≈ 1.25", Math.abs(top - 11.25) < 0.02, `max=${top.toFixed(3)}`);
}
for (const [h, expect] of [[1, true], [2, false]] as const) { // 2. nhảy lên block cao 1 / 2
  const w = mk(); floor(w);
  for (let x = -3; x <= 3; x++) for (let k = 0; k < h; k++) put(w, x, 10 + k, -2, B.STONE);
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 120, inp({ forward: 1, jump: true }));
  check(`nhảy lên block cao ${h}: ${expect ? "lên được" : "không lên"}`, (s.z < -1) === expect, `y=${s.y.toFixed(2)} z=${s.z.toFixed(2)}`);
}
{ // 3. không nhảy qua hàng rào (một dãy rào nối nhau)
  const w = mk(); floor(w);
  for (let x = -5; x <= 5; x++) put(w, x, 10, -2, B.FENCE);
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 180, inp({ forward: 1, jump: true }));
  check("không qua được dãy rào", s.z > -1.1, `z=${s.z.toFixed(3)} y=${s.y.toFixed(2)}`);
  const s2 = createPlayer(0.5, 10, 0.5); // lách giữa hai cột rào: không được
  run(s2, reader(w), 120, inp({ forward: 1 }));
  check("không lách giữa cột rào", s2.z > -1.1, `z=${s2.z.toFixed(3)}`);
}
{ // 4. áp sát tường: không rung, không xuyên; góc tường không kẹt
  const w = mk(); floor(w);
  for (let x = -5; x <= 5; x++) for (let y = 10; y < 13; y++) put(w, x, y, -2, B.STONE);
  for (let z = -5; z <= 5; z++) for (let y = 10; y < 13; y++) put(w, -2, y, z, B.STONE);
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 120, inp({ forward: 1 }));
  const zs: number[] = [];
  for (let t = 0; t < 60; t++) { stepPlayer(s, inp({ forward: 1 }), reader(w)); zs.push(s.z); }
  const jitter = Math.max(...zs) - Math.min(...zs);
  check("áp tường không rung", jitter < 1e-9 && Math.abs(s.z - (-1 + 0.3)) < 1e-6, `z=${s.z} rung=${jitter}`);
  run(s, reader(w), 120, inp({ forward: 1, strafe: -1 })); // đi chéo vào góc
  check("vào góc không xuyên", s.x >= -1 + 0.3 - 1e-9 && s.z >= -1 + 0.3 - 1e-9, `x=${s.x} z=${s.z}`);
  run(s, reader(w), 60, inp({ forward: -1, strafe: 1 }));
  check("ra khỏi góc được", s.x > 0 && s.z > 0, `x=${s.x.toFixed(2)} z=${s.z.toFixed(2)}`);
}
{ // 5. rơi từ cao xuống: không xuyên sàn mỏng
  const w = mk(); floor(w, 0);
  const s = createPlayer(0.5, 120, 0.5);
  run(s, reader(w), 600, inp());
  check("rơi 120 block không xuyên", Math.abs(s.y - 1) < 1e-9, `y=${s.y} vy=${s.vy}`);
}
{ // 6. bước lên đất cày (15/16) và giường (9/16) không cần nhảy
  { // đất cày thay đất ở mặt sàn (thấp 1/16): đi từ đất cày lên đá không cần nhảy
    const w = mk(); floor(w);
    for (let x = -3; x <= 3; x++) for (let z = -1; z <= 2; z++) put(w, x, 9, z, B.FARMLAND);
    const s = createPlayer(0.5, 9.9375, 0.5);
    run(s, reader(w), 90, inp({ forward: 1 }));
    check("từ đất cày bước lên đá", s.z < -3 && Math.abs(s.y - 10) < 1e-9, `y=${s.y.toFixed(4)} z=${s.z.toFixed(2)}`);
  }
  for (const [id, name] of [[B.BED, "giường"]] as const) {
    const w = mk(); floor(w);
    for (let x = -3; x <= 3; x++) for (let z = -6; z <= -2; z++) put(w, x, 10, z, id);
    const s = createPlayer(0.5, 10, 0.5);
    run(s, reader(w), 90, inp({ forward: 1 }));
    check(`tự bước lên ${name}`, s.z < -2 && s.y > 10.5, `y=${s.y.toFixed(3)} z=${s.z.toFixed(2)}`);
  }
}
{ // 7. ngồi không rơi khỏi mép
  const w = mk(); for (let x = -3; x <= 3; x++) for (let z = -1; z <= 1; z++) put(w, x, 9, z, B.STONE);
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 10, inp());
  run(s, reader(w), 240, inp({ forward: 1, sneak: true }));
  check("ngồi dừng ở mép", s.y === 10 && s.z > -1.3 - 1e-6, `y=${s.y} z=${s.z.toFixed(3)}`);
  run(s, reader(w), 120, inp({ forward: 1 }));
  check("đứng dậy thì rơi khỏi mép", s.y < 10, `y=${s.y.toFixed(2)}`);
}
{ // 8. thang: leo lên, đứng yên khi Shift, tụt xuống
  const w = mk(); floor(w);
  for (let y = 10; y < 20; y++) { put(w, 0, y, -1, B.STONE); put(w, 0, y, 0, B.LADDER, 2); } // tường ở Bắc (−Z)
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 120, inp({ forward: 1 }));
  const climbed = s.y;
  check("leo thang lên (2.4 b/s)", climbed > 13.5 && climbed < 15.5, `y sau 2 s=${climbed.toFixed(2)}`);
  run(s, reader(w), 60, inp({ sneak: true }));
  check("giữ Shift đứng yên trên thang", Math.abs(s.y - climbed) < 0.2, `y=${s.y.toFixed(2)}`);
  const y0 = s.y; run(s, reader(w), 30, inp());
  check("tụt xuống tối đa 3 b/s", y0 - s.y <= 1.5 + 1e-6 && y0 - s.y > 0.5, `tụt ${(y0 - s.y).toFixed(2)} trong 0.5 s`);
}
{ // 9. bơi: chìm 2 b/s, giữ Space nổi lên; ra khỏi hồ lên bờ cao 1
  const w = mk(); floor(w, 0, 12);
  for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) for (let y = 1; y <= 10; y++) put(w, x, y, z, B.WATER);
  for (let x = -6; x <= 6; x++) for (let y = 1; y <= 10; y++) for (let z = -12; z <= -7; z++) put(w, x, y, z, B.STONE);
  const s = createPlayer(0.5, 8, 0.5);
  run(s, reader(w), 60, inp());
  check("chìm chậm trong nước", s.y > 5 && s.y < 7, `y sau 1 s=${s.y.toFixed(2)} vy=${s.vy.toFixed(2)}`);
  run(s, reader(w), 180, inp({ jump: true }));
  check("giữ Space nổi lên mặt nước", s.y > 9.6, `y=${s.y.toFixed(2)}`);
  run(s, reader(w), 240, inp({ jump: true, forward: 1 }));
  check("bơi vào bờ cao 1 rồi lên bờ", s.z < -7 && s.y >= 11 - 1e-6, `y=${s.y.toFixed(2)} z=${s.z.toFixed(2)}`);
}
{ // 10. mạng nhện: chậm
  const w = mk(); floor(w);
  for (let x = -3; x <= 3; x++) for (let z = -10; z <= 0; z++) put(w, x, 10, z, B.COBWEB);
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 60, inp({ forward: 1 }));
  check("đi trong mạng nhện ≈ 25% tốc độ", -s.z + 0.5 < 1.3 && -s.z + 0.5 > 0.6, `đi ${(0.5 - s.z).toFixed(2)} block / 1 s`);
}
{ // 11. dung nham trừ máu, ra ngoài còn cháy
  const w = mk(); floor(w);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) put(w, x, 10, z, B.LAVA);
  const s = createPlayer(0.5, 10, 0.5);
  run(s, reader(w), 60, inp());
  check("dung nham 4 máu/lần, miễn 0.5 s → 8 máu/giây", Math.abs(s.health - 12) < 0.01 && s.burnS === 15, `máu=${s.health.toFixed(2)} cháy=${s.burnS}`);
}
{ // 12. chunk chưa tải: đứng yên
  const w = mk(); floor(w);
  const s = createPlayer(20.5, 30, 0.5);
  run(s, reader(w, 16), 60, inp());
  check("chunk chưa tải: không rơi", s.y === 30 && s.frozen, `y=${s.y}`);
}
{ // 13. cửa đóng chặn, cửa mở đi qua (cửa hướng Bắc nằm sát cạnh −Z của ô)
  for (const open of [false, true]) {
    const w = mk(); floor(w);
    for (let x = -3; x <= 3; x++) for (let y = 10; y < 13; y++) if (x !== 0) put(w, x, y, -2, B.STONE);
    put(w, 0, 10, -2, B.DOOR, doorMeta(2, open, false)); put(w, 0, 11, -2, B.DOOR, doorMeta(2, open, true));
    const s = createPlayer(0.5, 10, 0.5);
    run(s, reader(w), 120, inp({ forward: 1 }));
    check(open ? "cửa mở: đi qua được" : "cửa đóng: bị chặn", open ? s.z < -2.5 : s.z > -2 + 0.3 - 1e-6 - 3 / 16 && s.z > -2, `z=${s.z.toFixed(3)}`);
  }
}
{ // 14. sát thương rơi: rơi 10 block → 7 máu; rơi vào nước không mất
  const w = mk(); floor(w);
  const s = createPlayer(0.5, 20, 0.5);
  run(s, reader(w), 120, inp());
  check("rơi 10 block mất 7 máu", s.health === 13, `máu=${s.health}`);
  const w2 = mk(); floor(w2, 0);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) for (let y = 1; y <= 3; y++) put(w2, x, y, z, B.WATER);
  const s2 = createPlayer(0.5, 40, 0.5);
  run(s2, reader(w2), 240, inp());
  check("rơi vào nước không mất máu", s2.health === 20, `máu=${s2.health}`);
}
{ // 15. chết đuối: 15 s dưỡng khí rồi 2 máu/giây
  const w = mk(); floor(w, 0);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) for (let y = 1; y <= 6; y++) put(w, x, y, z, B.WATER);
  const s = createPlayer(0.5, 1, 0.5);
  run(s, reader(w), 60 * 15 - 10, inp());
  const h15 = s.health;
  run(s, reader(w), 60 * 3 + 10, inp());
  check("chết đuối: 15 s chưa mất, sau đó 2 máu/giây", h15 === 20 && s.health === 14, `15 s: ${h15}, 18 s: ${s.health}`);
}
{ // 16. ngồi: cao 1.5; trần thấp (khe đúng 1.5) thì thả Shift vẫn ngồi, bỏ trần thì đứng dậy
  const w = mk(); floor(w, 8); put(w, 0, 9, 0, B.FENCE);
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) put(w, x, 12, z, B.STONE);
  const s = createPlayer(0.5, 10.5, 0.5);
  s.sneaking = true;
  run(s, reader(w), 30, inp());
  check("trần thấp: thả Shift vẫn ngồi", s.sneaking && Math.abs(s.y - 10.5) < 1e-6, `ngồi=${s.sneaking} y=${s.y}`);
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) w.delete(`${x},12,${z}`);
  run(s, reader(w), 5, inp());
  check("bỏ trần thì đứng dậy", !s.sneaking, `ngồi=${s.sneaking}`);
}
{ // 17. chạy + nhảy liên tục nhanh hơn chạy; vượt khe 4 block (đi bộ: 2)
  const gapWorld = (gap: number) => {
    const w = mk();
    for (let x = -2; x <= 2; x++) {
      for (let z = 0; z <= 30; z++) put(w, x, 9, z, B.STONE);
      for (let z = -gap - 20; z < -gap; z++) put(w, x, 9, z, B.STONE);
    }
    return reader(w);
  };
  const w = gapWorld(-100);
  const s = createPlayer(0.5, 10, 29.5);
  run(s, w, 60, inp({ forward: 1, sprint: true }));
  const z0 = s.z;
  run(s, w, 180, inp({ forward: 1, sprint: true, jump: true }));
  const v = (z0 - s.z) / 3;
  check("chạy + nhảy ≈ 7.1 b/s", v > 6.6 && v < 7.6, `${v.toFixed(2)} b/s`);
  const best = (sprint: boolean): number => {
    let b = 0;
    for (let gap = 1; gap <= 6; gap++) {
      const ww = gapWorld(gap);
      const p = createPlayer(0.5, 10, 25.5);
      let jumped = false;
      for (let t = 0; t < 600 && p.y > 5; t++) {
        const j = !jumped && p.z < -0.28;
        if (j) jumped = true;
        stepPlayer(p, inp({ forward: 1, sprint, jump: j }), ww);
        if (p.z < -gap - 1 && p.onGround) break;
      }
      if (p.y >= 10 && p.z < -gap) b = gap;
    }
    return b;
  };
  const gs = best(true), gw = best(false);
  check("vượt khe: chạy 4, đi bộ 2", gs === 4 && gw === 2, `chạy ${gs}, đi bộ ${gw}`);
}
