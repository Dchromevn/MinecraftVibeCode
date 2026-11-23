// Gom bản build vào desktop/stage cho app desktop (Electron):
//   stage/app  — vỏ Electron (desktop/src biên dịch bằng tsc, chạy sau script này) + package.json
//   stage/game — server/dist, server/config.json (mặc định), client/dist (có texture public_mc), node_modules/ws
// electron-builder chép stage/game nguyên vẹn vào resources/game (desktop/builder.json).
// Chạy sau npm run build (lệnh npm run desktop / npm run dist-desktop làm sẵn).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(root, "desktop", "stage");
const game = join(stage, "game");
const appDir = join(stage, "app");

function need(path: string, hint: string): string {
  const p = join(root, path);
  if (!existsSync(p)) {
    console.error(`[desktop] thiếu ${path} — ${hint}`);
    process.exit(1);
  }
  return p;
}

const serverDist = need("server/dist/server/src/index.js", "chạy npm run build trước");
const clientDist = need("client/dist/index.html", "chạy npm run build trước");
const ws = need("node_modules/ws/package.json", "chạy npm install");
if (!existsSync(join(root, "client/dist/structures.json")))
  console.warn("[desktop] cảnh báo: client/dist chưa có structures.json / texture (client/public_mc) — app sẽ dùng texture tạm");

rmSync(stage, { recursive: true, force: true });
mkdirSync(game, { recursive: true });
mkdirSync(appDir, { recursive: true });

cpSync(join(serverDist, "../../.."), join(game, "server", "dist"), { recursive: true });
cpSync(join(root, "server", "package.json"), join(game, "server", "package.json")); // "type": "module" cho file .js
cpSync(join(root, "server", "config.json"), join(game, "server", "config.json"));
cpSync(dirname(clientDist), join(game, "client", "dist"), { recursive: true });
cpSync(dirname(ws), join(game, "node_modules", "ws"), { recursive: true });
const icon = join(root, "desktop", "resources", "icon.png"); // logo (npm run make-icon) cho cửa sổ app
if (existsSync(icon)) cpSync(icon, join(appDir, "icon.png"));
cpSync(join(root, "desktop", "src", "preload.cjs"), join(appDir, "preload.cjs")); // cầu nối trang game ↔ app (không qua tsc)

const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
writeFileSync(join(appDir, "package.json"), JSON.stringify({
  name: "voxel-survival",
  productName: "Voxel Survival",
  version: rootPkg.version,
  description: "Voxel Survival — game voxel sinh tồn",
  author: "Voxel Survival",
  main: "main.js",
  type: "module",
}, null, 2));

console.log(`[desktop] đã gom vào ${stage}`);
