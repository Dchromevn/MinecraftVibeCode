// Vẽ block hình dạng đặc biệt theo dữ liệu phụ (DESIGN.md 2.2): đuốc sàn/tường, thang,
// cửa (hướng, mở, nửa trên/dưới), ray (dạng + góc xoay), giường (đầu/chân), cây trồng theo
// giai đoạn, thân dưa / bí (cao theo tuổi, đã ra quả thì cong về phía quả). Riêng hàng rào nối theo ô kề (giống hộp va chạm trong /shared).
import {
  BLOCKS, STEM_RIPE, bedDir, bedHead, doorSide, doorUpper, isFence, railKind, railRot, slabBox, stairBoxes, stemAttachedDir,
  torchWall, wallBoxes, type BlockBox,
} from "../../../shared/src/index.js";
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
function addBoxes(b: GeomBuilder, x: number, y: number, z: number, boxes: readonly BlockBox[], tex: BoxTex, light: readonly number[], at: At): void {
  const covered = (dx: number, dy: number, dz: number): boolean => OPAQUE[at(x + dx, y + dy, z + dz)] === 1;
  for (const bx of boxes) {
    let faces = 63;
    if (bx[4] >= 1 && covered(0, 1, 0)) faces &= ~1;
    if (bx[1] <= 0 && covered(0, -1, 0)) faces &= ~2;
    if (bx[3] >= 1 && covered(1, 0, 0)) faces &= ~4;
    if (bx[0] <= 0 && covered(-1, 0, 0)) faces &= ~8;
    if (bx[5] >= 1 && covered(0, 0, 1)) faces &= ~16;
    if (bx[2] <= 0 && covered(0, 0, -1)) faces &= ~32;
    if (faces) addBox(b, x, y, z, bx[0] * 16, bx[3] * 16, bx[1] * 16, bx[4] * 16, bx[2] * 16, bx[5] * 16, tex, light, faces);
  }
}

/** Vẽ block đặc biệt tại (x, y, z) trong chunk; at() đọc block theo tọa độ trong chunk (cho phép -1..16). */
export function addSpecial(
  b: GeomBuilder, id: number, meta: number, x: number, y: number, z: number, at: At, uv: SpecialUv,
  light: readonly number[],
): boolean {
  const t = uv.blocks[id]!;
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
      const head = bedHead(meta);
      addBed(b, x, y, z, {
        top: head ? t[0]! : t[3]!, end: head ? uv.bedHeadEnd : uv.bedFootEnd,
        side: head ? t[2]! : uv.bedFootSide, bottom: t[1]!,
      }, light, bedDir(meta), head);
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
      addBox(b, x, y, z, 0, 16, 0, 15, 0, 16, { top: meta & 1 ? uv.farmlandWet : t[0]!, side: t[2]!, bottom: t[1]! }, light, up ? 62 : 63);
      return true;
    }
    default:
      return false;
  }
}
