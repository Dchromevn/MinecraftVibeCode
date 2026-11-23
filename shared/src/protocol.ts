// Gói tin client ↔ server (Giai đoạn 5a, JSON; 5c chuyển gói thường xuyên sang nhị phân).
// Ô block luôn gửi dạng cell = id | dữ liệu phụ << 8.
import type { InvAction, InvSnapshot } from "./invActions.js";
import type { TradeView } from "./trades.js";
import type { CustomStructure } from "./villageCustom.js";

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
  | { t: "hello"; name: string; password: string; version: number }
  // (5c) phím bấm theo từng bước vật lý: gói nhị phân INPUT (netCodec.ts), không còn gói "move"
  | { t: "sub"; add: number[]; remove: number[]; d?: number } // chunk cần / bỏ: [cx, cz, cx, cz, ...]; (10a) d = cõi client đang ở
  | { t: "digStart"; x: number; y: number; z: number } // bắt đầu đào ô này (server đo thời gian đào)
  | { t: "dig"; x: number; y: number; z: number } // đã đào xong ô này
  | { t: "use"; hit: NetHit | null; src: { x: number; y: number; z: number } | null; sneaking: boolean; yaw: number }
  | { t: "inv"; seq: number; a: InvAction }
  | { t: "ping"; c: number } // F3: đo thời gian khứ hồi
  | { t: "give"; item: string; count: number } // lệnh thử (chỉ khi server bật chế độ thử)
  // (6a) đánh người chơi id; lag = người đánh đang thấy mục tiêu trễ bao nhiêu ms (ping + nội suy) — server tua lại
  | { t: "attack"; id: number; lag: number }
  | { t: "chat"; text: string } // tin chat, hoặc lệnh bắt đầu bằng "/"
  | { t: "draw" } // (6b) bắt đầu kéo cung (server đo thời gian kéo)
  | { t: "shoot"; power: number } // (6b) thả cung: lực client tính (server lấy min với lực theo đồng hồ server)
  // (7a) đánh sinh vật id (lag như "attack"); chuột phải vào sinh vật (cho ăn, tỉa lông, vắt sữa); rời giường
  | { t: "hitMob"; id: number; lag: number }
  | { t: "useMob"; id: number }
  | { t: "rideInv" } // (7d) đang cưỡi thú có rương: mở rương của thú (phím túi đồ)
  | { t: "trade"; mob: number; i: number; all: boolean } // (8a) bấm giao dịch i (all: Shift — làm tới khi hết đồ / hết hàng)
  | { t: "tradeClose" }
  | { t: "enchant"; i: number } // (8b2) chọn lựa chọn i (0–2) của bàn phù phép
  | { t: "anvilTake"; name: string } // (8b3) lấy kết quả của đe (tên mới, "" = giữ)
  | { t: "grindTake" }
  | { t: "smithTake" } // (10d2) bàn rèn
  | { t: "wake" };

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
  off: string | null; // (6a) đồ tay trái
  armor: (string | null)[];
  dead: boolean;
  blocking?: boolean; // (6a) đang giơ khiên
  drawing?: boolean; // (6b) đang kéo cung
  sleeping?: boolean; // (7a) đang nằm giường
  ride?: number; // (7d) id thú đang cưỡi (0 = không)
}

/** Mã thông báo hệ thống trong chat (văn bản tiếng Việt ở client/src/strings.ts). */
export type ChatKey =
  // chết: args = [người chết, người giết nếu có]
  | "dieOther" | "dieFall" | "dieDrown" | "dieStarve" | "dieLava" | "dieFire" | "dieCactus" | "diePlayer" | "dieFallBy" | "dieOtherBy" | "dieArrow"
  | "dieMob" // (7a) args = [người chết, "mob:<loài>"] — client dịch tên loài
  // (7a) giường, giờ
  | "spawnSet" | "noSleepDay" | "noSleepMobs" | "bedMissing" | "sleeping" | "timeIs" | "timeSet"
  | "dieExplosion" | "dieExplosionBy" | "dieMagic" // (7b)
  | "dieWither" | "locateFortress" | "locateFortressOw" | "locateNone" // (10c) chết vì Héo; /locate fortress
  | "anchorSet" | "anchorMissing" | "anchorEmpty" | "locateBastion" | "locateBastionOw" | "locateBastionNone" // (10d2)
  | "locateFound" | "locateFoundNether" | "locateNotFound" // /locate công trình thế giới chính
  // thông tin
  | "join" | "leave" | "pvpOn" | "pvpOff" | "tpDone" | "kicked" | "gave" | "xpSet" | "help" | "helpAdmin" | "structSaved"
  | "adminOn" | "adminOff" // (9a) args = [tên] — bật / tắt chế độ quản trị
  // lỗi
  | "notAdmin" | "unknownCmd" | "noPlayer" | "usage" | "badItem" | "pvpDisabled" | "safeZone" | "slowDown" | "structFail";

/** Mũi tên: [id, x, y, z, vx, vy, vz, cờ (1 = đã cắm vào block, 2 = chí mạng)]. */
export type NetArrow = [number, number, number, number, number, number, number, number];

/** Vật phẩm rơi: [id, khóa vật phẩm, số lượng, x, y, z]. */
export type NetItem = [number, string, number, number, number, number];

export type ServerMsg =
  | {
      t: "welcome"; id: number; name: string; seed: number; debug: boolean; dim: number; // (10a) cõi: 0 thế giới chính, 1 Vực Lửa
      spawn: { x: number; y: number; z: number }; // vị trí vào game (đã lưu, hoặc điểm hồi sinh)
      respawn: { x: number; y: number; z: number }; // điểm hồi sinh khi chết
      admin: boolean; // quản trị viên: được bay (và phá tức thì khi bay)
      health: number; hunger: number; saturation: number; // trạng thái đã lưu
      safe: { x: number; z: number; r: number } | null; // (6a) vùng an toàn quanh điểm hồi sinh thế giới
      time: number; // (7a) giờ trong ngày (tick)
      customs: { list: CustomStructure[]; cuts: number[] }; // (8a) nhà người chơi tự lưu (sinh làng giống server)
    }
  | { t: "reject"; reason: string } // name, taken, version, password (sai mật khẩu), pwshort (mật khẩu quá ngắn / dài)
  | { t: "chunk"; cx: number; cz: number; cells: number[] } // [chỉ số trong chunk, cell, ...]; gửi cho mọi chunk được đăng ký (có thể rỗng)
  | { t: "blocks"; list: number[] } // [x, y, z, cell, ...]
  | { t: "join"; id: number; name: string }
  | { t: "leave"; id: number }
  // (5c) vị trí người chơi khác: gói nhị phân PLAYERS; đồ cầm / giáp gửi riêng khi đổi:
  | { t: "look"; id: number; held: string | null; off: string | null; armor: (string | null)[] }
  | { t: "pong"; c: number; chunks: number; tickMs: number } // trả lời ping (+ số chunk server giữ, thời gian 1 tick)
  | { t: "inv"; s: InvSnapshot }
  | { t: "open"; kind: "workbench" | "chest" | "furnace" | "enchant" | "anvil" | "grindstone" | "smithing"; size: number }
  | { t: "close" }
  | { t: "furnace"; burnLeft: number; burnMax: number; cook: number }
  | { t: "items"; up: NetItem[]; gone: number[] }
  | { t: "fall"; x: number; y: number; z: number; cell: number } // cát / sỏi bắt đầu rơi (chỉ để vẽ)
  // (6a) chat: tin của người chơi (from + text); thông báo hệ thống theo mã (key + args) — client dịch ra chữ
  | { t: "chat"; kind: "chat"; from: string; text: string }
  | { t: "chat"; kind: "info" | "death" | "error"; key: ChatKey; args: string[] }
  | { t: "admin"; on: boolean } // (9a) chế độ quản trị của chính mình đổi (/admin)
  // (6a) người chơi id trúng đòn (vẽ nháy đỏ; crit: chí mạng — hạt ở 6b)
  | { t: "hurt"; id: number; crit: boolean }
  | { t: "tp"; x: number; y: number; z: number } // (6a) quản trị viên dịch chuyển: đặt lại vị trí
  | { t: "shieldOff"; s: number } // (6a) khiên của mình bị rìu đánh: khóa s giây
  | { t: "arrows"; up: NetArrow[]; gone: number[] } // (6b) mũi tên: đang bay (mỗi tick) / vừa cắm vào block (một lần)
  // (6b) hiệu ứng: vệt quét kiếm; (7b) vụ nổ (n = sức nổ), bình vỡ (n = màu 0xRRGGBB), hạt dịch chuyển của kẻ hư không
  // (8c) "totem": vật tổ bất tử của người chơi id n vừa cứu mạng
  | { t: "fx"; kind: "sweep" | "boom" | "splash" | "portal" | "hearts" | "smoke" | "totem" | "snowball"; x: number; y: number; z: number; n?: number }
  | { t: "fangs"; x: number; y: number; z: number; yaw: number; delay: number } // (8c) nanh pháp sư mọc lên sau delay tick
  | { t: "dim"; dim: number; x: number; y: number; z: number } // (10a) sang cõi khác (qua cổng / hồi sinh): dựng lại thế giới ở client
  // (7d) dây dắt trong tầm nhìn, gửi lại mỗi giây: [id sinh vật, loại đầu dây (0 người chơi, 1 sinh vật, 2 cọc), id / x, y, z]
  | { t: "leashes"; list: [number, number, number, number, number][] }
  | { t: "trades"; mob: number; key: string; prof: number; list: TradeView[] } // (8a) bảng đổi đồ (mở / cập nhật)
  | { t: "tradeEnd" }
  | { t: "enchantInfo"; seed: number; shelves: number } // (8b2) bàn phù phép: hạt giống lựa chọn + số giá sách
  | { t: "customs"; list: CustomStructure[]; cuts: number[] } // (8a) có nhà tự lưu mới
  | { t: "tnt"; id: number; x: number; y: number; z: number; fuse: number } // (7b) TNT bắt đầu cháy ngòi (client tự cho rơi)
  // (7a) giờ trong ngày (gửi định kỳ và khi đổi); sinh vật trúng đòn; mình nằm / rời giường; điểm hồi sinh mới
  | { t: "time"; time: number }
  | { t: "mobHurt"; id: number; crit: boolean }
  | { t: "sleep"; on: boolean }
  | { t: "respawnAt"; x: number; y: number; z: number };
