// Cấu hình server: server/config.json, ghi đè bằng biến môi trường PORT, SEED.
//   seed  — chuỗi seed thế giới; "random" (9a): mỗi thế giới mới một seed ngẫu nhiên (thế giới đã lưu giữ seed của nó)
//   spawn — "random" (9a: thế giới mới lấy điểm đất liền ngẫu nhiên, lưu vào world.json) hoặc "fixed" (gần gốc tọa độ)
//   debug — bật chế độ thử: bộ đồ thử 64 món cho người mới vào
//   world — tên thế giới (thư mục lưu server/data/<world>); admins — tên bật sẵn chế độ quản trị lần đầu vào.
//           (9a) ai cũng bật / tắt chế độ quản trị cho mình bằng /admin; trạng thái lưu theo người chơi.
//   pvp   — người chơi đánh nhau được không (mặc định true; biến môi trường PVP=on|off; quản trị viên đổi bằng /pvp)
//   sleepPercent — (7a) % người online cùng ngủ thì tua sáng (mặc định 50)
//   mobGriefing  — (7b) quái phá / lấy block (quái nổ, kẻ hư không, mọt đá); mặc định true (người dùng chọn); MOB_GRIEFING=on|off
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NET } from "../../shared/src/index.js";

export interface ServerConfig {
  seed: string;
  port: number;
  spawn: "random" | "fixed";
  debug: boolean;
  world: string;
  admins: string[];
  /** (9a) Bài thử: mọi người vào là bật sẵn chế độ quản trị. */
  adminAll?: boolean;
  pvp?: boolean;
  sleepPercent?: number;
  mobGriefing?: boolean;
  /** App desktop: mã bí mật của chủ máy (OWNER_TOKEN) — gửi mã này thay mật khẩu thì vào không cần tài khoản. */
  ownerToken?: string;
  /** App desktop (ACCESS=local): lúc đầu chỉ máy này vào được; app mở cho LAN khi người chơi chọn "Tạo server". */
  localOnly?: boolean;
  /** Thư mục lưu (server/data); null = không lưu xuống đĩa (bộ kiểm tra). */
  dataDir: string | null;
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
  const root = findPath("../package.json", "../../../package.json"); // thư mục server/ (chạy từ src hoặc dist)
  const cfg: ServerConfig = {
    seed: "voxel", port: NET.DEFAULT_PORT, spawn: "random", debug: true, world: "world", admins: [],
    dataDir: root ? join(dirname(root), "data") : null,
  };
  // CONFIG_FILE: app desktop truyền config.json nằm trong thư mục dữ liệu người dùng
  const file = process.env.CONFIG_FILE && existsSync(process.env.CONFIG_FILE)
    ? process.env.CONFIG_FILE : findPath("../config.json", "../../../config.json");
  if (file) Object.assign(cfg, JSON.parse(readFileSync(file, "utf8")) as Partial<ServerConfig>);
  if (process.env.PORT) cfg.port = Number(process.env.PORT);
  if (process.env.SEED) cfg.seed = process.env.SEED;
  if (process.env.WORLD) cfg.world = process.env.WORLD;
  if (process.env.DATA_DIR) cfg.dataDir = process.env.DATA_DIR;
  if (process.env.NO_SAVE === "1") cfg.dataDir = null; // app desktop: chưa chọn thế giới (màn hình mở đầu) — không ghi gì xuống đĩa
  if (process.env.PVP) cfg.pvp = process.env.PVP.toLowerCase() !== "off";
  if (process.env.OWNER_TOKEN) cfg.ownerToken = process.env.OWNER_TOKEN;
  if (process.env.ACCESS === "local") cfg.localOnly = true;
  if (process.env.MOB_GRIEFING) cfg.mobGriefing = process.env.MOB_GRIEFING.toLowerCase() !== "off";
  return cfg;
}
