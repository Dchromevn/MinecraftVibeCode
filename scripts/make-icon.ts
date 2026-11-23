// Logo app desktop: khối cỏ nhìn chéo, vẽ từ texture grass_top / grass_side trong client/public_mc (npm run make-icon).
// Ghi desktop/resources/icon.png (256×256) — electron-builder dùng làm icon .exe / bản cài.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIZE = 256;
const SS = 4; // lấy mẫu 4×4 mỗi điểm ảnh cho mép mượt
const SHADE = { top: 1, left: 0.86, right: 0.66 }; // mặt trên sáng nhất, mặt phải tối nhất

function tex(name: string): PNG {
  const f = join(root, "client", "public_mc", "textures", `${name}.png`);
  if (!existsSync(f)) {
    console.error(`[make-icon] thiếu ${f} — chạy npm run import-textures trước`);
    process.exit(1);
  }
  return PNG.sync.read(readFileSync(f));
}

type V = [number, number];
interface Face { o: V; a: V; b: V; t: PNG; shade: number }

// đỉnh khối (tọa độ ảnh): mặt trên là hình thoi, hai mặt bên đứng
const T: V = [128, 8], L: V = [16, 72], R: V = [240, 72], C: V = [128, 136], LB: V = [16, 184], B: V = [128, 248];
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const top = tex("grass_top"), side = tex("grass_side");
const faces: Face[] = [
  { o: T, a: sub(R, T), b: sub(L, T), t: top, shade: SHADE.top },
  { o: L, a: sub(C, L), b: sub(LB, L), t: side, shade: SHADE.left },
  { o: C, a: sub(R, C), b: sub(B, C), t: side, shade: SHADE.right },
];

/** Màu tại điểm (x, y) của ảnh, null nếu ngoài khối. Giải P = o + u·a + v·b cho từng mặt. */
function sample(x: number, y: number): [number, number, number] | null {
  for (const f of faces) {
    const det = f.a[0] * f.b[1] - f.a[1] * f.b[0];
    const px = x - f.o[0], py = y - f.o[1];
    const u = (px * f.b[1] - py * f.b[0]) / det, v = (f.a[0] * py - f.a[1] * px) / det;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
    const tx = Math.floor(u * f.t.width), ty = Math.floor(v * f.t.height);
    const i = (ty * f.t.width + tx) * 4;
    return [f.t.data[i]! * f.shade, f.t.data[i + 1]! * f.shade, f.t.data[i + 2]! * f.shade];
  }
  return null;
}

const out = new PNG({ width: SIZE, height: SIZE });
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        if (!c) continue;
        r += c[0]; g += c[1]; b += c[2]; n++;
      }
    }
    const i = (y * SIZE + x) * 4;
    if (n) {
      out.data[i] = Math.round(r / n);
      out.data[i + 1] = Math.round(g / n);
      out.data[i + 2] = Math.round(b / n);
    }
    out.data[i + 3] = Math.round((255 * n) / (SS * SS));
  }
}
const file = join(root, "desktop", "resources", "icon.png");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, PNG.sync.write(out));
console.log(`[make-icon] đã ghi ${file}`);
