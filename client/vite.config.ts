import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Ảnh của game: nhập từ client.jar của Minecraft (npm run import-textures, không commit) vào public_mc. */
const MC_DIR = fileURLToPath(new URL("./public_mc", import.meta.url));

function mcOverride(): Plugin {
  return {
    name: "mc-override",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? "").split("?")[0]!);
        const file = join(MC_DIR, path);
        if (path.endsWith(".png") && file.startsWith(MC_DIR) && existsSync(file) && statSync(file).isFile()) {
          res.setHeader("Content-Type", "image/png");
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

export default defineConfig({
  plugins: [mcOverride()],
  server: {
    port: 5173,
    // chạy dev: client gọi /ws cùng địa chỉ trang, Vite chuyển sang server (cổng 8080)
    proxy: { "/ws": { target: process.env.WS_TARGET ?? "ws://localhost:8080", ws: true } },
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
