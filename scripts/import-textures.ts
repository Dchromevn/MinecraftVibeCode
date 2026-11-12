// Nhập texture từ assets-src/REFI_Textures vào client/public theo scripts/texture-map.json.
// Xử lý: sao chép, ghép đè (base) khi ảnh nguồn có điểm trong suốt, cắt dọc (slice).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";

interface Entry {
  dest: string;
  src: string;
  base?: string;
  slice?: { count: number; tile: number };
  tiers?: string[];
  pieces?: string[];
}
interface MapFile {
  sourceRoot: string;
  destRoot: string;
  entries: Entry[];
}

const SRC_TIER: Record<string, string> = { wood: "wood", stone: "stone", iron: "steel", gold: "gold", diamond: "diamond" };

const root = process.cwd();
const map = JSON.parse(readFileSync(join(root, "scripts/texture-map.json"), "utf8")) as MapFile;
const srcRoot = join(root, map.sourceRoot);
const destRoot = join(root, map.destRoot);

if (!existsSync(srcRoot)) {
  console.log(`[import-textures] Chưa thấy ${map.sourceRoot}. Tải REFI_Textures về rồi chạy lại.`);
  process.exit(0);
}

function readPng(path: string): PNG {
  return PNG.sync.read(readFileSync(path));
}

function writePng(path: string, png: PNG): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}

function hasTransparency(png: PNG): boolean {
  for (let i = 3; i < png.data.length; i += 4) if (png.data[i]! < 255) return true;
  return false;
}

/** Ghép src đè lên base (src-over). Kích thước phải bằng nhau. */
function composite(base: PNG, over: PNG): PNG {
  const out = new PNG({ width: base.width, height: base.height });
  for (let i = 0; i < out.data.length; i += 4) {
    const a = over.data[i + 3]! / 255;
    for (let c = 0; c < 3; c++) {
      out.data[i + c] = Math.round(over.data[i + c]! * a + base.data[i + c]! * (1 - a));
    }
    out.data[i + 3] = Math.max(base.data[i + 3]!, over.data[i + 3]!);
  }
  return out;
}

function crop(src: PNG, x: number, y: number, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  return out;
}

/** Nhân bản mục theo tiers/pieces và thay chỗ giữ chỗ. */
function expand(entry: Entry): Entry[] {
  const tiers = entry.tiers ?? [null];
  const pieces = entry.pieces ?? [null];
  const out: Entry[] = [];
  for (const tier of tiers) {
    for (const piece of pieces) {
      const sub = (s: string): string =>
        s
          .replace("{tier}", tier ?? "")
          .replace("{srcTier}", tier ? (SRC_TIER[tier] ?? tier) : "")
          .replace("{piece}", piece ?? "");
      const e: Entry = { dest: sub(entry.dest), src: sub(entry.src) };
      if (entry.base) e.base = entry.base;
      if (entry.slice) e.slice = entry.slice;
      out.push(e);
    }
  }
  return out;
}

const missing: string[] = [];
let written = 0;

for (const raw of map.entries) {
  for (const e of expand(raw)) {
    const srcPath = join(srcRoot, e.src);
    if (!existsSync(srcPath)) {
      missing.push(e.src);
      continue;
    }
    const src = readPng(srcPath);

    if (e.slice) {
      for (let i = 0; i < e.slice.count; i++) {
        const frame = crop(src, 0, i * e.slice.tile, src.width, e.slice.tile);
        writePng(join(destRoot, e.dest.replace("{i}", String(i))), frame);
        written++;
      }
      continue;
    }

    let out = src;
    if (e.base) {
      const basePath = join(srcRoot, e.base);
      if (!existsSync(basePath)) {
        missing.push(e.base);
      } else if (hasTransparency(src)) {
        const base = readPng(basePath);
        if (base.width === src.width && base.height === src.height) out = composite(base, src);
        else console.warn(`[import-textures] kích thước khác nhau, bỏ ghép: ${e.src} / ${e.base}`);
      }
    }
    writePng(join(destRoot, e.dest), out);
    written++;
  }
}

console.log(`[import-textures] Đã ghi ${written} file vào ${map.destRoot}.`);
if (missing.length > 0) {
  console.log(`[import-textures] THIẾU ${missing.length} file nguồn (game sẽ vẽ tạm):`);
  for (const m of missing) console.log(`  - ${m}`);
}
