// Vẽ block hình dạng đặc biệt, chọn hình theo các ô kề (rào nối, ray xoay, thang
// bám tường, cửa, giường đầu/chân, đất cày).
import { B, BLOCKS } from "../../../shared/src/index.js";
import type { TileUV } from "../atlas.js";
import type { GeomBuilder } from "./geomBuilder.js";
import { addBox, addCrop, addCross, addFence, addLadder, addRail, addTorch } from "./shapes.js";

export interface SpecialUv {
  blocks: TileUV[][]; // [id][top, bottom, side, front]
  railCurved: TileUV;
  railT: TileUV;
  railCross: TileUV;
  bedFootSide: TileUV;
}

const OPAQUE = new Uint8Array(256);
for (const b of BLOCKS) OPAQUE[b.id] = b.opaque ? 1 : 0;

type At = (x: number, y: number, z: number) => number;

// Ray: bit 1 Bắc (-Z), 2 Đông (+X), 4 Nam (+Z), 8 Tây (-X). Hình gốc (rot 0):
// thẳng = Bắc+Nam, cong = Nam+Đông, ngã ba = Bắc+Nam+Đông. Xoay 90° theo chiều kim đồng hồ.
const rotMask = (m: number): number => ((m << 1) | (m >> 3)) & 15;
function railShape(mask: number): { kind: "straight" | "curve" | "t" | "cross"; rot: number } {
  const n = [1, 2, 4, 8].filter((b) => mask & b).length;
  if (n >= 4) return { kind: "cross", rot: 0 };
  if (n <= 1) return { kind: "straight", rot: mask & (2 | 8) ? 1 : 0 };
  const bases = n === 3 ? [["t", 1 | 4 | 2]] : [["straight", 1 | 4], ["curve", 4 | 2]];
  for (const [kind, base] of bases as [string, number][]) {
    let m = base;
    for (let rot = 0; rot < 4; rot++) {
      if (m === mask) return { kind: kind as "straight" | "curve" | "t", rot };
      m = rotMask(m);
    }
  }
  return { kind: "straight", rot: 0 };
}

/** Vẽ block đặc biệt tại (x, y, z) trong chunk; at() đọc block theo tọa độ trong chunk (cho phép -1..16). */
export function addSpecial(
  b: GeomBuilder, id: number, x: number, y: number, z: number, at: At, uv: SpecialUv, light: readonly number[],
): boolean {
  const t = uv.blocks[id]!;
  const def = BLOCKS[id]!;
  switch (def.render) {
    case "cross":
      addCross(b, x, y, z, t[2]!, light);
      return true;
    case "crop":
      addCrop(b, x, y, z, t[2]!, light);
      return true;
    case "torch":
      addTorch(b, x, y, z, t[2]!, light);
      return true;
    case "fence": {
      const joins = (n: number): boolean => n === B.FENCE || OPAQUE[n] === 1;
      const conn = (joins(at(x + 1, y, z)) ? 1 : 0) | (joins(at(x - 1, y, z)) ? 2 : 0)
        | (joins(at(x, y, z + 1)) ? 4 : 0) | (joins(at(x, y, z - 1)) ? 8 : 0);
      addFence(b, x, y, z, t[2]!, light, conn);
      return true;
    }
    case "rail": {
      const r = (dx: number, dz: number): boolean => at(x + dx, y, z + dz) === B.RAIL;
      const mask = (r(0, -1) ? 1 : 0) | (r(1, 0) ? 2 : 0) | (r(0, 1) ? 4 : 0) | (r(-1, 0) ? 8 : 0);
      const s = railShape(mask);
      const tex = s.kind === "curve" ? uv.railCurved : s.kind === "t" ? uv.railT : s.kind === "cross" ? uv.railCross : t[2]!;
      addRail(b, x, y, z, tex, light, s.rot);
      return true;
    }
    case "ladder": {
      // bám vào khối đặc đầu tiên tìm thấy: +X, -X, +Z, -Z
      const sides: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const side = Math.max(0, sides.findIndex(([dx, dz]) => OPAQUE[at(x + dx, y, z + dz)] === 1));
      addLadder(b, x, y, z, t[2]!, light, side);
      return true;
    }
    case "door": {
      const upper = at(x, y - 1, z) === B.DOOR;
      const tex = upper ? t[0]! : t[1]!;
      // tấm cửa nằm dọc theo bức tường: tường theo trục X thì cửa dày theo Z
      const wallX = OPAQUE[at(x - 1, y, z)] === 1 || OPAQUE[at(x + 1, y, z)] === 1;
      const box = { side: tex, top: tex, bottom: tex };
      if (wallX) addBox(b, x, y, z, 0, 16, 0, 16, 0, 3, box, light);
      else addBox(b, x, y, z, 0, 3, 0, 16, 0, 16, box, light);
      return true;
    }
    case "bed": {
      // cặp giường theo một trục: ô có giường kề ở phía +X/+Z là chân, ô còn lại là đầu
      const foot = at(x + 1, y, z) === B.BED || at(x, y, z + 1) === B.BED;
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
