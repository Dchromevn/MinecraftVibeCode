// Icon vật phẩm từ minecraft.wiki (do người dùng tự tải bằng trình duyệt; wiki chặn tải tự động).
//   npm run wiki-icons -- --page   tạo assets-src/wiki_icons/tai-icon.html: mở bằng trình duyệt (đã vào
//                                  minecraft.wiki một lần), rồi "Lưu trang → Toàn bộ trang web" vào cùng thư mục.
//   npm run wiki-icons             tìm các file Invicon_*.png ở bất kỳ đâu trong assets-src (trừ REFI_Textures),
//                                  chép thành client/public/icons_wiki/<khóa>.png (thư mục không commit).
// Game ưu tiên icons_wiki nếu có file, không có thì dùng icon REFI. Xóa thư mục icons_wiki để quay lại.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync as readBytes, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const root = process.cwd();
const map = JSON.parse(readFileSync(join(root, "scripts/wiki-icons.json"), "utf8")) as {
  base: string;
  icons: Record<string, string>;
};
const srcDir = join(root, "assets-src/wiki_icons");
const outDir = join(root, "client/public/icons_wiki");
mkdirSync(srcDir, { recursive: true });

if (process.argv.includes("--page")) {
  const imgs = Object.entries(map.icons)
    .map(([k, f]) => `<figure><img src="${map.base}${f}" alt="${k}" width="64"><figcaption>${k}<br>${f}</figcaption></figure>`)
    .join("\n");
  const html = `<!doctype html><meta charset="utf-8"><title>Icon minecraft.wiki</title>
<style>body{font:13px sans-serif;display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:150px;text-align:center}img{image-rendering:pixelated}</style>
<p style="width:100%">Mở minecraft.wiki trong trình duyệt này trước (để qua trang kiểm tra), tải lại trang này,
rồi bấm Ctrl+S → "Toàn bộ trang web" và lưu vào thư mục assets-src/wiki_icons. Sau đó chạy: npm run wiki-icons</p>
${imgs}`;
  writeFileSync(join(srcDir, "tai-icon.html"), html);
  console.log(`[wiki-icons] Đã tạo ${join(srcDir, "tai-icon.html")} (${Object.keys(map.icons).length} ảnh).`);
  process.exit(0);
}

/** Mọi file trong thư mục (đệ quy, bỏ qua bộ REFI), khóa theo tên file viết thường. */
function listFiles(dir: string, out = new Map<string, string>()): Map<string, string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "REFI_Textures") listFiles(p, out);
    } else out.set(name.toLowerCase(), p);
  }
  return out;
}

/** File có đúng là ảnh PNG không (trang chống bot đôi khi lưu ra HTML mang đuôi .png). */
const isPng = (p: string): boolean => readBytes(p).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

const files = listFiles(join(root, "assets-src"));
const notPng: string[] = [];
mkdirSync(outDir, { recursive: true });
const missing: string[] = [];
let n = 0;
for (const [key, file] of Object.entries(map.icons)) {
  const src = files.get(file.toLowerCase());
  if (!src || !existsSync(src)) {
    missing.push(`${key} (${file})`);
    continue;
  }
  if (!isPng(src)) {
    notPng.push(file);
    continue;
  }
  copyFileSync(src, join(outDir, `${key}.png`));
  n++;
}
console.log(`[wiki-icons] Đã chép ${n} icon vào client/public/icons_wiki.`);
if (missing.length) console.log(`[wiki-icons] Thiếu ${missing.length}: ${missing.join(", ")}`);
if (notPng.length) console.log(`[wiki-icons] Không phải ảnh PNG (bỏ qua) ${notPng.length}: ${notPng.join(", ")}`);
