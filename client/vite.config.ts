import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Ảnh gốc Minecraft (npm run import-mc, không commit): file trong public_mc đè file cùng đường dẫn trong public. */
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
