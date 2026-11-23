import { cpSync, createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Ảnh của game + mẫu công trình (7e): nhập từ client.jar của Minecraft (npm run import-textures, không commit) vào public_mc. */
const MC_DIR = fileURLToPath(new URL("./public_mc", import.meta.url));

function mcOverride(): Plugin {
  return {
    name: "mc-override",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? "").split("?")[0]!);
        const file = join(MC_DIR, path);
        const json = path === "/structures.json"; // (7e) mẫu công trình nhập từ client.jar
        if ((path.endsWith(".png") || json) && file.startsWith(MC_DIR) && existsSync(file) && statSync(file).isFile()) {
          res.setHeader("Content-Type", json ? "application/json" : "image/png");
          res.setHeader("Cache-Control", "no-cache");
          createReadStream(file).pipe(res);
          return;
        }
        next();
      });
    },
    closeBundle() {
      if (existsSync(MC_DIR)) cpSync(MC_DIR, fileURLToPath(new URL("./dist", import.meta.url)), { recursive: true });
    },
  };
}

/** Phiên bản game (package.json gốc) — hiện ở góc màn hình mở đầu. */
const VERSION = (JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")) as { version: string }).version;

export default defineConfig({
  plugins: [mcOverride()],
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  server: {
    port: 5173,
    // chạy dev: client gọi /ws cùng địa chỉ trang, Vite chuyển sang server (cổng 8080)
    proxy: {
      "/ws": { target: process.env.WS_TARGET ?? "http://127.0.0.1:8080", ws: true },
      "/status": { target: process.env.WS_TARGET ?? "http://127.0.0.1:8080" }, // (9a) trạng thái server cho menu chính
    },
    fs: {
      // cho phép Vite đọc mã nguồn trong /shared
      allow: [".."],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
