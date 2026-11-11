// Giai đoạn 0: chỉ mở kết nối WebSocket tới server để kiểm tra.
import { NET } from "../../shared/src/index.js";

export type NetStatus = "connecting" | "connected" | "disconnected";

export function serverUrl(): string {
  const fromEnv = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.hostname}:${NET.DEFAULT_PORT}`;
}

export function connect(onStatus: (s: NetStatus) => void): WebSocket {
  onStatus("connecting");
  const ws = new WebSocket(serverUrl());
  ws.addEventListener("open", () => onStatus("connected"));
  ws.addEventListener("close", () => onStatus("disconnected"));
  ws.addEventListener("error", () => onStatus("disconnected"));
  return ws;
}
