// Cầu nối với app desktop (desktop/src/preload.cjs → gameHost.ts). Mở bằng trình duyệt thường thì không có (null) — dùng menu
// server cũ.

export type WorldKind = "solo" | "server";

export interface WorldInfo {
  id: string;
  name: string;
  kind: WorldKind;
  seed: string; // "" = ngẫu nhiên, chưa chơi lần nào
  created: number;
  lastPlayed: number; // 0 = chưa chơi
}

export interface DesktopApi {
  /** Mã chủ máy (gửi thay mật khẩu khi vào thế giới của mình), cổng, thế giới server đang chạy; null nếu app từ chối. */
  info(): Promise<{ ownerToken: string; port: number; world: string | null } | null>;
  /** Mở / đóng cho máy khác vào; trả về địa chỉ "IP:cổng" để gửi bạn bè (rỗng khi đóng). */
  setLan(open: boolean): Promise<string[]>;
  worlds(kind: WorldKind): Promise<WorldInfo[] | null>;
  createWorld(kind: WorldKind, name: string, seed: string): Promise<WorldInfo | null>;
  deleteWorld(id: string): Promise<boolean | null>;
  /** reload = app đang đổi thế giới và sẽ tải lại trang (kèm ?play=); không thì vào luôn được. */
  play(id: string, lan: boolean): Promise<{ reload: boolean; addrs: string[] } | null>;
}

export function desktopApi(): DesktopApi | null {
  return (window as unknown as { voxelDesktop?: DesktopApi }).voxelDesktop ?? null;
}

/** Địa chỉ bạn bè dùng để vào khi đang "Tạo server" (menu Esc hiện lại). */
export const hostShare: { addrs: string[] } = { addrs: [] };
