import { defineConfig } from "vite";

export default defineConfig({
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
