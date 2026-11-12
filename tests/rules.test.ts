// Kiểm tra 3b: chỗ bám, dây chuyền, cửa/giường, cát rơi đè đuốc, đặt block, thời gian đào.
import {
  B, BLOCKS, breakAt, canPlace, createFalling, digRate, doorMeta, makeCell, placeCells, placementCells,
  playerBox, createPlayer, railKind, stepFalling, torchMeta, type BlockAccess, type FallingBlock,
} from "../shared/src/index.js";
import { check } from "./harness.js";

function mkWorld() {
  const m = new Map<string, number>();
  const acc: BlockAccess = {
    getCell: (x, y, z) => m.get(`${x},${y},${z}`) ?? 0,
    setCell: (x, y, z, id, meta) => { if (id === 0) m.delete(`${x},${y},${z}`); else m.set(`${x},${y},${z}`, makeCell(id, meta)); },
  };
  const id = (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) & 255;
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) acc.setCell(x, 9, z, B.STONE, 0);
  return { m, acc, id };
}
const falling: FallingBlock[] = [];
const fall = (x: number, y: number, z: number, id: number, meta: number) => falling.push(createFalling(x, y, z, id, meta));
const runFalling = (acc: BlockAccess) => {
  const dropped: number[] = [];
  for (let t = 0; t < 600 && falling.length; t++)
    for (let i = falling.length - 1; i >= 0; i--) { // thứ tự ngược (khối trên trước) để thử trường hợp khó
      const r = stepFalling(falling[i]!, 1 / 60, acc);
      if (r.kind !== "falling") { falling.splice(i, 1); if (r.kind === "landed") dropped.push(...r.dropped.map((d) => d.id)); }
    }
  return dropped;
};

{ // 1. phá block dưới đuốc → đuốc rơi; dây chuyền: đá → ray trên đá; cột đất dưới cỏ cao
  const { acc, id } = mkWorld();
  acc.setCell(0, 10, 0, B.STONE, 0); acc.setCell(0, 11, 0, B.TORCH, 0);
  const d = breakAt(acc, 0, 10, 0, fall);
  check("phá block dưới đuốc: đuốc rơi", id(0, 11, 0) === 0 && d.some((x) => x.id === B.TORCH), JSON.stringify(d.map((x) => BLOCKS[x.id]!.key)));
  acc.setCell(1, 10, 0, B.STONE, 0); acc.setCell(2, 10, 0, B.STONE, 0); acc.setCell(1, 11, 0, B.TORCH, torchMeta(3)); // đuốc gắn tường Đông (+X) = (2,11,0)? tường ở (2,11,0)
  acc.setCell(2, 11, 0, B.STONE, 0);
  const d2 = breakAt(acc, 2, 11, 0, fall);
  check("phá tường: đuốc tường rơi", id(1, 11, 0) === 0 && d2.length === 2, JSON.stringify(d2.map((x) => BLOCKS[x.id]!.key)));
}
{ // 2. dây chuyền: phá sàn dưới cửa → mất cả cửa, tính 1 lần; phá nửa trên → mất cả hai
  const { acc, id } = mkWorld();
  acc.setCell(0, 10, 0, B.DOOR, doorMeta(0, false, false)); acc.setCell(0, 11, 0, B.DOOR, doorMeta(0, false, true));
  const d = breakAt(acc, 0, 11, 0, fall);
  check("phá nửa trên cửa: mất cả cửa, 1 vật phẩm", id(0, 10, 0) === 0 && id(0, 11, 0) === 0 && d.filter((x) => x.id === B.DOOR).length === 1, `${d.length}`);
  acc.setCell(0, 10, 0, B.DOOR, doorMeta(0, false, false)); acc.setCell(0, 11, 0, B.DOOR, doorMeta(0, false, true));
  const d2 = breakAt(acc, 0, 9, 0, fall);
  check("phá sàn dưới cửa: mất cả cửa, 1 vật phẩm", id(0, 10, 0) === 0 && id(0, 11, 0) === 0 && d2.filter((x) => x.id === B.DOOR).length === 1, JSON.stringify(d2.map((x) => BLOCKS[x.id]!.key)));
}
{ // 3. cát rơi đè đuốc: đuốc rơi ra, cát nằm vào chỗ đuốc; sỏi chồng 3 rơi hết
  falling.length = 0;
  const { acc, id } = mkWorld();
  acc.setCell(0, 10, 0, B.TORCH, 0);
  acc.setCell(0, 11, 0, B.STONE, 0); acc.setCell(0, 12, 0, B.SAND, 0); acc.setCell(0, 13, 0, B.GRAVEL, 0); acc.setCell(0, 14, 0, B.SAND, 0);
  acc.setCell(1, 10, 0, B.STONE, 0); acc.setCell(1, 11, 0, B.STONE, 0); // không liên quan
  breakAt(acc, 0, 11, 0, fall);
  const dropped = runFalling(acc);
  check("cát rơi đè đuốc: đuốc rơi ra", dropped.includes(B.TORCH) && id(0, 10, 0) === B.SAND, `ô đuốc giờ là ${BLOCKS[id(0, 10, 0)]!.key}`);
  check("cột cát/sỏi rơi xuống chồng lại", id(0, 11, 0) === B.GRAVEL && id(0, 12, 0) === B.SAND && id(0, 13, 0) === 0, `${id(0, 11, 0)},${id(0, 12, 0)},${id(0, 13, 0)}`);
}
{ // 4. đặt: đuốc không lên lá/kính/không khí; lúa chỉ trên đất cày; không đặt chồng lên người
  const { acc } = mkWorld();
  acc.setCell(0, 10, 0, B.LEAVES, 0); acc.setCell(1, 10, 0, B.GLASS, 0); acc.setCell(2, 10, 0, B.FARMLAND, 0); acc.setCell(3, 10, 0, B.DIRT, 0);
  const torchOn = (x: number) => canPlace(placementCells(B.TORCH, x, 11, 0, 0, 1, 0, 0)!, acc.getCell, null);
  check("không đặt đuốc lên lá / kính", !torchOn(0) && !torchOn(1));
  check("đặt đuốc lên đá được", canPlace(placementCells(B.TORCH, 4, 10, 0, 0, 1, 0, 0)!, acc.getCell, null));
  const torchAir = placementCells(B.TORCH, 0, 15, 0, 0, 1, 0, 0)!;
  check("không đặt đuốc vào không khí", !canPlace(torchAir, acc.getCell, null));
  const wheat = (x: number) => canPlace(placementCells(B.WHEAT, x, 11, 0, 0, 1, 0, 0)!, acc.getCell, null);
  check("lúa chỉ trên đất cày", wheat(2) && !wheat(3));
  const box = playerBox(createPlayer(5.5, 10, 0.5));
  check("không đặt đá chồng lên người", !canPlace([{ x: 5, y: 11, z: 0, id: B.STONE, meta: 0 }], acc.getCell, box));
  check("đặt đuốc ở chân người được (không va chạm)", canPlace([{ x: 5, y: 10, z: 0, id: B.TORCH, meta: 0 }], acc.getCell, box));
}
{ // 5. ray đặt nối nhau thành góc cong; đặt cát lơ lửng thì rơi
  falling.length = 0;
  const { acc, id } = mkWorld();
  placeCells(acc, [{ x: 0, y: 10, z: 0, id: B.RAIL, meta: 0 }], fall);
  placeCells(acc, [{ x: 0, y: 10, z: 1, id: B.RAIL, meta: 0 }], fall);
  placeCells(acc, [{ x: 1, y: 10, z: 0, id: B.RAIL, meta: 0 }], fall);
  check("ray tự nối thành góc cong", railKind(acc.getCell(0, 10, 0) >> 8) === "curve", railKind(acc.getCell(0, 10, 0) >> 8));
  placeCells(acc, [{ x: 3, y: 15, z: 3, id: B.SAND, meta: 0 }], fall);
  runFalling(acc);
  check("đặt cát lơ lửng: rơi xuống đất", id(3, 15, 3) === 0 && id(3, 10, 3) === B.SAND);
}
{ // 6. thời gian đào tay không (khớp số giây cũ) và hệ số
  const g = { tool: null, headInWater: false, onGround: true };
  const sec = (id: number, ctx = g) => 1 / digRate(id, ctx);
  check("đá 7.5 s, đất 0.75 s, gỗ 3 s, quặng 15 s, mạng nhện 20 s",
    Math.abs(sec(B.STONE) - 7.5) < 1e-9 && Math.abs(sec(B.DIRT) - 0.75) < 1e-9 && Math.abs(sec(B.LOG) - 3) < 1e-9
    && Math.abs(sec(B.ORE_IRON) - 15) < 1e-9 && Math.abs(sec(B.COBWEB) - 20) < 1e-9,
    [B.STONE, B.DIRT, B.LOG, B.ORE_IRON, B.COBWEB].map((i) => sec(i).toFixed(2)).join(" "));
  check("đuốc, cỏ cao phá ngay; đá nền không phá được", digRate(B.TORCH, g) === Infinity && digRate(B.TALLGRASS, g) === Infinity && digRate(B.BEDROCK, g) === 0);
  check("dưới nước / trên không chậm 5 lần", Math.abs(sec(B.DIRT, { ...g, headInWater: true }) - 3.75) < 1e-9 && Math.abs(sec(B.DIRT, { ...g, onGround: false }) - 3.75) < 1e-9);
  check("cuốc sắt đào đá: phá rất nhanh", Math.abs(1 / digRate(B.STONE, { ...g, tool: { kind: "pickaxe", tier: "iron" } }) - 0.375) < 1e-9);
}
