// Danh sách server ở menu chính (Giai đoạn 9a): "Server này" (địa chỉ trang) + server người chơi tự thêm (lưu localStorage),
// chuẩn hóa link (abc.trycloudflare.com, https://..., wss://.../ws), đọc trạng thái qua /status.
import { NET } from "../../../shared/src/index.js";

/** url "" = server của trang đang mở. */
export interface ServerEntry { name: string; url: string }

export type ServerStatus =
  | { state: "ok"; players: number }
  | { state: "down" | "version" | "mixed" };

const KEY = "voxel.servers", SEL = "voxel.server";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    // trình duyệt chặn lưu: bỏ qua
  }
}

/** Server tự thêm (không gồm "Server này"); dữ liệu hỏng thì coi như rỗng. */
export function loadServers(): ServerEntry[] {
  try {
    const v = JSON.parse(read(KEY) ?? "[]") as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((e): e is ServerEntry => !!e && typeof e.name === "string" && typeof e.url === "string" && !!normalizeUrl(e.url)).slice(0, NET.SERVERS_MAX);
  } catch {
    return [];
  }
}

export function saveServers(list: readonly ServerEntry[]): void {
  write(KEY, JSON.stringify(list));
}

/** Link server đã chọn lần trước ("" = server này). */
export function loadSelected(): string {
  return read(SEL) ?? "";
}

export function saveSelected(url: string): void {
  write(SEL, url);
}

/** Chuẩn hóa link người chơi nhập thành gốc http(s)://host[:cổng][/đường] (bỏ /ws ở cuối); null nếu sai. */
export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^[a-z]+:\/\//i.test(s)) {
    const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(s) || /^[\d.]+(:\d+)?(\/|$)/.test(s);
    s = `${local ? "http" : "https"}://${s}`;
  }
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const proto = { "ws:": "http:", "wss:": "https:", "http:": "http:", "https:": "https:" }[u.protocol];
  if (!proto || !u.hostname) return null;
  let path = u.pathname.replace(/\/+$/, "");
  if (path.endsWith(NET.WS_PATH)) path = path.slice(0, -NET.WS_PATH.length);
  return `${proto}//${u.host}${path}`;
}

/** Gốc http(s) của server (url "" = trang đang mở). */
function base(url: string): string {
  return url || `${location.protocol}//${location.host}`;
}

/** Địa chỉ WebSocket của server. */
export function wsUrl(url: string): string {
  return base(url).replace(/^http/, "ws") + NET.WS_PATH;
}

/** Trang https không được mở WebSocket ws:// (trình duyệt chặn). */
export function mixedBlocked(url: string): boolean {
  return location.protocol === "https:" && base(url).startsWith("http:");
}

/** Hỏi trạng thái server (số người, phiên bản); hết 5 giây không trả lời thì coi như không kết nối được. */
export async function fetchStatus(url: string): Promise<ServerStatus> {
  if (mixedBlocked(url)) return { state: "mixed" };
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(base(url) + NET.STATUS_PATH, { signal: ctl.signal, cache: "no-store" });
    const j = (await r.json()) as { version?: unknown; players?: unknown };
    if (j.version !== NET.PROTOCOL_VERSION) return { state: "version" };
    return { state: "ok", players: typeof j.players === "number" ? j.players : 0 };
  } catch {
    return { state: "down" };
  } finally {
    clearTimeout(timer);
  }
}
