// Vẽ block hình dạng đặc biệt theo dữ liệu phụ (DESIGN.md 2.2): đuốc sàn/tường, thang,
// cửa (hướng, mở, nửa trên/dưới), ray (dạng + góc xoay), giường (đầu/chân), cây trồng theo
// giai đoạn, thân dưa / bí (cao theo tuổi, đã ra quả thì cong về phía quả). Riêng hàng rào nối theo ô kề (giống hộp va chạm trong /shared).
import {
  B, BED_PARTS, BLOCKS, STEM_RIPE, anvilAlongX, facingDir, anvilBoxes, bedColor, bedDir, bedHead, buttonBoxes, doorSide, doorUpper, isFence, lanternBoxes, leverBoxes,
  paneBoxes, plateBox, railKind, railRot, slabBox, stairBoxes, stemAttachedDir, torchWall, wallBoxes, type BlockBox,
} from "../../../shared/src/index.js";
import { LANTERN_UV, addBoxRegion } from "./decorShapes.js";
import type { TileUV } from "../atlas.js";
import type { GeomBuilder } from "./geomBuilder.js";
import {
  addBed, addBox, addCactus, addCrop, addCross, type BoxTex, addFence, addLadder, addRail, addStem, addStemAttached, addTorch, addTorchWall,
} from "./shapes.js";

export interface SpecialUv {
  blocks: TileUV[][]; // [id][top, bottom, side, front]
  railCurved: TileUV;
  railT: TileUV;
  railCross: TileUV;
  bedFootSide: TileUV;
  bedHeadEnd: TileUV;
  bedFootEnd: TileUV;
  crops: (TileUV[] | undefined)[]; // [id][giai đoạn 0..7] của cây trồng
  stemAttached: (TileUV | undefined)[]; // [id] thân đã ra quả
  farmlandWet: TileUV;
  colored: (TileUV[][] | undefined)[]; // [id][màu][trên, dưới, bên, trước] (Giai đoạn 4f)
  beds: Record<(typeof BED_PARTS)[number], TileUV>[]; // [màu]
}

const OPAQUE = new Uint8Array(256);
for (const b of BLOCKS) OPAQUE[b.id] = b.opaque ? 1 : 0;

type At = (x: number, y: number, z: number) => number;

/** Hướng (0 Nam +Z, 1 Tây −X, 2 Bắc −Z, 3 Đông +X) → tham số side của addLadder (0 +X, 1 −X, 2 +Z, 3 −Z). */
const LADDER_SIDE = [2, 1, 3, 0] as const;
/** Tấm dày 3 điểm ảnh sát cạnh theo hướng: [x0, x1, z0, z1]. */
const PANEL: readonly (readonly [number, number, number, number])[] = [
  [0, 16, 13, 16], [0, 3, 0, 16], [0, 16, 0, 3], [13, 16, 0, 16],
];

/** Hộp (0..1) → điểm ảnh; bỏ mặt nằm sát mép ô mà ô bên kia là khối che khuất. */
function addBoxes(b: GeomBuilder, x: number, y: number, z: number, boxes: readonly BlockBox[], tex: BoxTex, light: readonly number[], at: At, topRot = false): void {
  const covered = (dx: number, dy: number, dz: number): boolean => OPAQUE[at(x + dx, y + dy, z + dz)] === 1;
  for (const bx of boxes) {
    let faces = 63;
    if (bx[4] >= 1 && covered(0, 1, 0)) faces &= ~1;
    if (bx[1] <= 0 && covered(0, -1, 0)) faces &= ~2;
    if (bx[3] >= 1 && covered(1, 0, 0)) faces &= ~4;
    if (bx[0] <= 0 && covered(-1, 0, 0)) faces &= ~8;
    if (bx[5] >= 1 && covered(0, 0, 1)) faces &= ~16;
    if (bx[2] <= 0 && covered(0, 0, -1)) faces &= ~32;
    if (faces) addBox(b, x, y, z, bx[0] * 16, bx[3] * 16, bx[1] * 16, bx[4] * 16, bx[2] * 16, bx[5] * 16, tex, light, faces, topRot);
  }
}

/** Vẽ block đặc biệt tại (x, y, z) trong chunk; at() đọc block theo tọa độ trong chunk (cho phép -1..16). */
const B_FARMLAND = B.FARMLAND;

export function addSpecial(
  b: GeomBuilder, id: number, meta: number, x: number, y: number, z: number, at: At, uv: SpecialUv,
  light: readonly number[],
): boolean {
  const t = BLOCKS[id]!.colorTex ? uv.colored[id]![meta & 15]! : uv.blocks[id]!;
  const def = BLOCKS[id]!;
  switch (def.render) {
    case "cross":
      addCross(b, x, y, z, t[2]!, light);
      return true;
    case "crop":
      addCrop(b, x, y, z, uv.crops[id]?.[meta & 7] ?? t[2]!, light);
      return true;
    case "stem": {
      const d = stemAttachedDir(meta);
      if (d !== null) addStemAttached(b, x, y, z, uv.stemAttached[id] ?? t[2]!, light, d);
      else addStem(b, x, y, z, t[2]!, light, (Math.min(meta, STEM_RIPE) + 1) / 8);
      return true;
    }
    case "torch": {
      const wall = torchWall(meta);
      if (wall === null) addTorch(b, x, y, z, t[2]!, light);
      else addTorchWall(b, x, y, z, t[2]!, light, wall);
      return true;
    }
    case "fence": {
      const joins = (n: number): boolean => isFence(n) || OPAQUE[n] === 1; // rào mọi loài gỗ nối nhau
      const conn = (joins(at(x + 1, y, z)) ? 1 : 0) | (joins(at(x - 1, y, z)) ? 2 : 0)
        | (joins(at(x, y, z + 1)) ? 4 : 0) | (joins(at(x, y, z - 1)) ? 8 : 0);
      addFence(b, x, y, z, t[2]!, light, conn);
      return true;
    }
    case "rail": {
      const kind = railKind(meta);
      const tex = kind === "curve" ? uv.railCurved : kind === "t" ? uv.railT : kind === "cross" ? uv.railCross : t[2]!;
      addRail(b, x, y, z, tex, light, railRot(meta));
      return true;
    }
    case "ladder":
      addLadder(b, x, y, z, t[2]!, light, LADDER_SIDE[meta & 3]!);
      return true;
    case "door": {
      const tex = doorUpper(meta) ? t[0]! : t[1]!;
      const [x0, x1, z0, z1] = PANEL[doorSide(meta)]!;
      addBox(b, x, y, z, x0, x1, 0, 16, z0, z1, { side: tex, top: tex, bottom: tex }, light);
      return true;
    }
    case "bed": {
      const head = bedHead(meta), c = uv.beds[bedColor(meta)]!;
      addBed(b, x, y, z, {
        top: head ? c.head_top : c.foot_top, end: head ? c.head_end : c.foot_end,
        side: head ? c.head_side : c.foot_side, bottom: t[1]!,
      }, light, bedDir(meta), head);
      return true;
    }
    case "carpet":
      addBoxes(b, x, y, z, [[0, 0, 0, 1, 1 / 16, 1]], { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      return true;
    case "pane":
      addBoxes(b, x, y, z, paneBoxes(x, y, z, at), { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      return true;
    case "fire":
      addCross(b, x, y, z, t[2]!, light);
      return true;
    case "portal": { // (10a) tấm cổng Vực Lửa dày 4/16 theo trục; bỏ mặt sát khối cổng khác / khối che khuất
      const ax = (meta & 1) === 0, n = (dx: number, dy: number, dz: number): boolean => {
        const v = at(x + dx, y + dy, z + dz);
        return v === B.NETHER_PORTAL || OPAQUE[v] === 1;
      };
      let faces = 63;
      if (n(0, 1, 0)) faces &= ~1;
      if (n(0, -1, 0)) faces &= ~2;
      if (ax && n(1, 0, 0)) faces &= ~4;
      if (ax && n(-1, 0, 0)) faces &= ~8;
      if (!ax && n(0, 0, 1)) faces &= ~16;
      if (!ax && n(0, 0, -1)) faces &= ~32;
      addBox(b, x, y, z, ax ? 0 : 6, ax ? 16 : 10, 0, 16, ax ? 6 : 0, ax ? 10 : 16, { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, faces);
      return true;
    }
    case "lantern": {
      const [body, cap] = lanternBoxes(meta);
      addBoxRegion(b, x, y, z, body!, t[2]!, LANTERN_UV.body.side, LANTERN_UV.body.top, light);
      addBoxRegion(b, x, y, z, cap!, t[2]!, LANTERN_UV.cap.side, LANTERN_UV.cap.top, light);
      return true;
    }
    case "plate":
      addBoxes(b, x, y, z, [plateBox(meta)], { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      return true;
    case "button":
      addBoxes(b, x, y, z, buttonBoxes(meta), { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      return true;
    case "lever": {
      const l = leverBoxes(meta);
      addBoxes(b, x, y, z, [l.base], { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      addBoxes(b, x, y, z, [l.handle], { top: t[3]!, bottom: t[3]!, side: t[3]! }, light, at);
      return true;
    }
    case "anvil": { // (8b3) như Minecraft: chỉ mặt trên của mặt đe dùng texture mặt trên, còn lại texture thân đe
      const boxes = anvilBoxes(meta), body: BoxTex = { top: t[1]!, bottom: t[1]!, side: t[2]! };
      addBoxes(b, x, y, z, boxes.slice(0, 3), body, light, at);
      addBoxes(b, x, y, z, boxes.slice(3), { ...body, top: t[0]! }, light, at, anvilAlongX(meta));
      return true;
    }
    case "skull": { // (10c) sọ: hộp 8 × 8 × 8 giữa ô; mặt trước (mặt sọ) theo hướng — bit mặt: 4 +X, 8 −X, 16 +Z, 32 −Z
      const front = [16, 8, 32, 4][facingDir(meta)]!, body: BoxTex = { top: t[0]!, bottom: t[1]!, side: t[2]! };
      addBox(b, x, y, z, 4, 12, 0, 8, 4, 12, body, light, 63 & ~front);
      addBox(b, x, y, z, 4, 12, 0, 8, 4, 12, { ...body, side: t[3] ?? t[2]! }, light, front);
      return true;
    }
    case "stairs":
      addBoxes(b, x, y, z, stairBoxes(meta), { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      return true;
    case "slab":
      addBoxes(b, x, y, z, [slabBox(meta)], { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      return true;
    case "wall":
      addBoxes(b, x, y, z, wallBoxes(x, y, z, at, 1, 14 / 16), { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at);
      return true;
    case "cactus":
      addCactus(b, x, y, z, { top: t[0]!, bottom: t[1]!, side: t[2]! }, light, at(x, y + 1, z) !== id, at(x, y - 1, z) !== id);
      return true;
    case "farmland": {
      const up = OPAQUE[at(x, y + 1, z)] === 1;
      const h = Math.round((def.box?.[4] ?? 15 / 16) * 16); // (8a) khối thấp dùng chung: đất cày, đường đất 15/16, máy cắt đá 9/16
      addBox(b, x, y, z, 0, 16, 0, h, 0, 16, { top: id === B_FARMLAND && meta & 1 ? uv.farmlandWet : t[0]!, side: t[2]!, bottom: t[1]! }, light, up ? 62 : 63);
      return true;
    }
    default:
      return false;
  }
}
