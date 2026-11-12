// Vẽ block hình dạng đặc biệt theo dữ liệu phụ (DESIGN.md 2.2): đuốc sàn/tường, thang,
// cửa (hướng, mở, nửa trên/dưới), ray (dạng + góc xoay), giường (đầu/chân), lúa theo
// giai đoạn. Riêng hàng rào nối theo ô kề (giống hộp va chạm trong /shared).
import {
  B, BLOCKS, bedHead, doorSide, doorUpper, railKind, railRot, torchWall,
} from "../../../shared/src/index.js";
import type { TileUV } from "../atlas.js";
import type { GeomBuilder } from "./geomBuilder.js";
import { addBox, addCrop, addCross, addFence, addLadder, addRail, addTorch, addTorchWall } from "./shapes.js";

export interface SpecialUv {
  blocks: TileUV[][]; // [id][top, bottom, side, front]
  railCurved: TileUV;
  railT: TileUV;
  railCross: TileUV;
  bedFootSide: TileUV;
  wheat: TileUV[]; // giai đoạn 0..7
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
      addCrop(b, x, y, z, id === B.WHEAT ? uv.wheat[meta & 7]! : t[2]!, light);
      return true;
    case "torch": {
      const wall = torchWall(meta);
      if (wall === null) addTorch(b, x, y, z, t[2]!, light);
      else addTorchWall(b, x, y, z, t[2]!, light, wall);
      return true;
    }
    case "fence": {
      const joins = (n: number): boolean => n === B.FENCE || OPAQUE[n] === 1;
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
      const foot = !bedHead(meta);
      const top = foot ? t[3]! : t[0]!;
      addBox(b, x, y, z, 0, 16, 0, 9, 0, 16, { top, side: foot ? uv.bedFootSide : t[2]!, bottom: t[1]! }, light);
      return true;
    }
    case "farmland": {
      const up = OPAQUE[at(x, y + 1, z)] === 1;
      addBox(b, x, y, z, 0, 16, 0, 15, 0, 16, { top: t[0]!, side: t[2]!, bottom: t[1]! }, light, up ? 62 : 63);
      return true;
    }
    default:
      return false;
  }
}
