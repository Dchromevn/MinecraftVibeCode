// Gói tin client ↔ server (Giai đoạn 5a, JSON; 5c chuyển gói thường xuyên sang nhị phân).
// Ô block luôn gửi dạng cell = id | dữ liệu phụ << 8.
import type { InvAction, InvSnapshot } from "./invActions.js";

/** Ô nhắm (kết quả raycast phía client) — server kiểm tra lại tầm với và block thật. */
export interface NetHit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  fy?: number; // độ cao điểm chạm trong ô (chọn nửa trên / dưới khi đặt bậc, tấm)
}

export type ClientMsg =
  | { t: "hello"; name: string; version: number }
  | {
      // 20 lần / giây. Đến 5c: vị trí, máu, đói do client tính (server tin)
      t: "move"; x: number; y: number; z: number; yaw: number; pitch: number;
      flying: boolean; sneaking: boolean; swing: number; health: number; dead: boolean;
    }
  | { t: "sub"; add: number[]; remove: number[] } // chunk cần / bỏ: [cx, cz, cx, cz, ...]
  | { t: "dig"; x: number; y: number; z: number } // đã đào xong ô này
  | { t: "use"; hit: NetHit | null; src: { x: number; y: number; z: number } | null; sneaking: boolean; yaw: number }
  | { t: "eat" } // ăn xong món đang cầm
  | { t: "inv"; seq: number; a: InvAction }
  | { t: "trample"; x: number; y: number; z: number; fall: number }
  | { t: "armorWear"; n: number } // giáp vừa đỡ đòn n lần
  | { t: "died" }
  | { t: "give"; item: string; count: number }; // lệnh thử (chỉ khi server bật chế độ thử)

/** Người chơi khác (gửi 20 lần / giây). */
export interface PlayerView {
  id: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  sneaking: boolean;
  swing: number; // tăng mỗi lần vung tay
  held: string | null;
  armor: (string | null)[];
  dead: boolean;
}

/** Vật phẩm rơi: [id, khóa vật phẩm, số lượng, x, y, z]. */
export type NetItem = [number, string, number, number, number, number];

export type ServerMsg =
  | { t: "welcome"; id: number; name: string; seed: number; spawn: { x: number; y: number; z: number }; debug: boolean }
  | { t: "reject"; reason: string }
  | { t: "chunk"; cx: number; cz: number; cells: number[] } // [chỉ số trong chunk, cell, ...]; gửi cho mọi chunk được đăng ký (có thể rỗng)
  | { t: "blocks"; list: number[] } // [x, y, z, cell, ...]
  | { t: "join"; id: number; name: string }
  | { t: "leave"; id: number }
  | { t: "players"; list: PlayerView[] }
  | { t: "inv"; s: InvSnapshot }
  | { t: "open"; kind: "workbench" | "chest" | "furnace"; size: number }
  | { t: "close" }
  | { t: "furnace"; burnLeft: number; burnMax: number; cook: number }
  | { t: "items"; up: NetItem[]; gone: number[] }
  | { t: "fall"; x: number; y: number; z: number; cell: number }; // cát / sỏi bắt đầu rơi (chỉ để vẽ)
