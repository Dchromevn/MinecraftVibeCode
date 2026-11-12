// Nhập texture gốc từ client.jar của Minecraft (người dùng tự tải, © Mojang — chỉ dùng trên máy,
// KHÔNG commit). Đọc thẳng file jar (zip) bằng zlib có sẵn của Node, lấy ảnh theo
// scripts/mc-texture-map.json, ghi vào client/public_mc/ (Vite ưu tiên thư mục này hơn client/public).
// Mục nào không có trong jar thì game vẫn dùng ảnh REFI. Xóa client/public_mc để quay lại REFI.
//   npm run import-mc              tìm *.jar trong assets-src/minecraft
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { PNG } from "pngjs";
import { blitOver, compose, cropPng, rotateCW, tint, type Compose } from "./pngTools.js";

interface Entry {
  dest: string;
  src: string | string[]; // đường dẫn trong assets/minecraft/textures (không .png); mảng = thử lần lượt
  tint?: string; // nhân màu (ảnh xám: cỏ, lá, nước, thân dưa)
  overlay?: string; // ghép đè ảnh này (đã nhân overlayTint) lên src
  overlayTint?: string;
  crop?: [number, number, number, number]; // x, y, rộng, cao
  regions?: [number, number, number, number, number, number][]; // chép vùng [x, y, rộng, cao, tới x, tới y] sang ảnh trống cùng cỡ
  rotate?: number; // xoay 90° theo chiều kim đồng hồ n lần
  compose?: Compose; // ghép nhiều mảnh (ảnh thực thể rương, ray ngã ba / ngã tư)
  tiers?: Record<string, string>; // tên đích → tên trong jar ({tier} / {mcTier})
  pieces?: string[];
}

const root = process.cwd();
const jarDir = join(root, "assets-src/minecraft");
const outRoot = join(root, "client/public_mc");
const PREFIX = "assets/minecraft/textures/";

const jarName = existsSync(jarDir) ? readdirSync(jarDir).find((f) => f.toLowerCase().endsWith(".jar")) : undefined;
if (!jarName) {
  console.log("[import-mc] Chưa thấy file .jar trong assets-src/minecraft. Xem cách tải trong PROGRESS.md (mục Texture gốc Minecraft).");
  process.exit(0);
}

// ---- đọc zip: thư mục trung tâm → vị trí từng file ----
const zip = readFileSync(join(jarDir, jarName));
interface ZipItem { method: number; size: number; offset: number }
const items = new Map<string, ZipItem>();
let eocd = -1;
for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--)
  if (zip.readUInt32LE(i) === 0x06054b50) {
    eocd = i;
    break;
  }
if (eocd < 0) throw new Error("[import-mc] file jar hỏng (không thấy thư mục zip)");
let p = zip.readUInt32LE(eocd + 16);
for (let n = zip.readUInt16LE(eocd + 10); n > 0; n--) {
  if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("[import-mc] thư mục zip lỗi");
  const nameLen = zip.readUInt16LE(p + 28), extra = zip.readUInt16LE(p + 30), comment = zip.readUInt16LE(p + 32);
  const name = zip.toString("utf8", p + 46, p + 46 + nameLen).replaceAll("\\", "/");
  if (name.startsWith(PREFIX))
    items.set(name, { method: zip.readUInt16LE(p + 10), size: zip.readUInt32LE(p + 20), offset: zip.readUInt32LE(p + 42) });
  p += 46 + nameLen + extra + comment;
}

function readEntry(path: string): Buffer | null {
  const it = items.get(PREFIX + path + ".png");
  if (!it) return null;
  const start = it.offset + 30 + zip.readUInt16LE(it.offset + 26) + zip.readUInt16LE(it.offset + 28);
  const raw = zip.subarray(start, start + it.size);
  return it.method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
}

function load(src: string | string[]): PNG | null {
  for (const s of Array.isArray(src) ? src : [src]) {
    const buf = readEntry(s);
    if (!buf) continue;
    let png: PNG = PNG.sync.read(buf);
    // ảnh động (dải khung dọc): lấy khung đầu
    if (s.startsWith("block/") && png.height > png.width && png.height % png.width === 0) png = cropPng(png, 0, 0, png.width, png.width);
    return png;
  }
  return null;
}

function expand(e: Entry): Entry[] {
  const tiers = e.tiers ? Object.entries(e.tiers) : [["", ""]];
  const out: Entry[] = [];
  for (const [tier, mcTier] of tiers)
    for (const piece of e.pieces ?? [""]) {
      const sub = (s: string): string => s.replace("{tier}", tier!).replace("{mcTier}", mcTier!).replace("{piece}", piece);
      out.push({ ...e, dest: sub(e.dest), src: Array.isArray(e.src) ? e.src.map(sub) : sub(e.src) });
    }
  return out;
}

const map = JSON.parse(readFileSync(join(root, "scripts/mc-texture-map.json"), "utf8")) as { entries: Entry[] };
const missing: string[] = [];
let written = 0;
for (const raw of map.entries)
  for (const e of expand(raw)) {
    let png = load(e.src);
    if (!png) {
      missing.push(`${e.dest} ← ${[e.src].flat().join(" | ")}`);
      continue;
    }
    if (e.compose) {
      const c = compose(e.compose, png, load);
      if (!c) {
        missing.push(`${e.dest} ← ${e.compose.parts.map((p) => p.from).filter(Boolean).join(" | ")}`);
        continue;
      }
      png = c;
    }
    if (e.rotate) png = rotateCW(png, e.rotate);
    if (e.crop) png = cropPng(png, ...e.crop);
    if (e.regions) {
      const out = new PNG({ width: png.width, height: png.height });
      for (const [x, y, w, h, dx, dy] of e.regions) PNG.bitblt(png, out, x, y, w, h, dx, dy);
      png = out;
    }
    if (e.tint) png = tint(png, e.tint);
    if (e.overlay) {
      const o = load(e.overlay);
      if (o && o.width === png.width && o.height === png.height) blitOver(png, e.overlayTint ? tint(o, e.overlayTint) : o, 0, 0);
    }
    const dest = join(outRoot, e.dest + ".png");
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, PNG.sync.write(png));
    written++;
  }
console.log(`[import-mc] ${jarName}: đã ghi ${written} ảnh vào client/public_mc.`);
if (missing.length) {
  console.log(`[import-mc] Không có trong jar ${missing.length} mục (game dùng ảnh REFI):`);
  for (const m of missing) console.log(`  - ${m}`);
}
