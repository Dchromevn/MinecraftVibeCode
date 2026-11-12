// Cấu hình server: server/config.json, ghi đè bằng biến môi trường PORT, SEED.
//   seed  — chuỗi seed thế giới
//   spawn — "random" (điểm đất liền ngẫu nhiên, cố định theo seed) hoặc "fixed" (gần gốc tọa độ)
//   debug — bật chế độ thử: bộ đồ thử 64 món cho người mới vào, lệnh give
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NET } from "../../shared/src/index.js";

export interface ServerConfig {
  seed: string;
  port: number;
  spawn: "random" | "fixed";
  debug: boolean;
}

/** Tìm file theo vài đường dẫn tương đối với file này (chạy bằng tsx từ src/ hoặc bản build trong dist/). */
export function findPath(...candidates: string[]): string | null {
  for (const c of candidates) {
    const p = fileURLToPath(new URL(c, import.meta.url));
    if (existsSync(p)) return p;
  }
  return null;
}

export function loadConfig(): ServerConfig {
  const cfg: ServerConfig = { seed: "voxel", port: NET.DEFAULT_PORT, spawn: "random", debug: true };
  const file = findPath("../config.json", "../../../config.json");
  if (file) Object.assign(cfg, JSON.parse(readFileSync(file, "utf8")) as Partial<ServerConfig>);
  if (process.env.PORT) cfg.port = Number(process.env.PORT);
  if (process.env.SEED) cfg.seed = process.env.SEED;
  return cfg;
}
