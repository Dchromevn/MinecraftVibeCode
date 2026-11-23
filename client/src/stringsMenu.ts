// Văn bản tiếng Việt (phần menu — Giai đoạn 9a): menu chính (danh sách server), menu Esc, mất kết nối, chế độ quản trị (/admin).
// Gộp vào STR.chat khi được import (strings.ts đã đủ 300 dòng).
import { STR } from "./strings.js";

export const STR_MENU = {
  servers: "Danh sách server",
  thisServer: "Server này",
  thisServerUrl: "(địa chỉ trang đang mở)",
  add: "Thêm server",
  edit: "Sửa",
  remove: "Xóa",
  refresh: "Làm mới",
  save: "Lưu",
  cancel: "Hủy",
  serverName: "Tên server",
  serverUrl: "Link server (ví dụ abc.trycloudflare.com)",
  join: "Vào server",
  statusChecking: "đang kiểm tra…",
  statusOk: "đang chạy · {0} người chơi",
  statusDown: "không kết nối được",
  statusVersion: "khác phiên bản game",
  statusMixed: "trang https không vào được server http — dùng link https",
  errUrl: "Link không hợp lệ",
  errName: "Nhập tên server",
  errFull: "Danh sách đã đủ {0} server",
  confirmRemove: "Xóa server \"{0}\" khỏi danh sách?",
  menuTip: "Tài khoản lưu riêng trên từng server. Bấm đúp vào một server để vào nhanh.",
  // menu Esc
  pauseTitle: "Menu",
  resume: "Tiếp tục",
  quit: "Thoát về menu chính",
  disconnected: "Mất kết nối tới server.",
  backToMenu: "Về menu chính",
  chat: {
    adminOn: "{0} đã bật chế độ quản trị (thoát: /admin off)",
    adminOff: "{0} đã thoát chế độ quản trị",
    notAdmin: "Lệnh này cần bật chế độ quản trị: gõ /admin",
    help:
      "Lệnh: /help · /items [từ khóa] (tìm khóa vật phẩm) · /time (xem giờ) · /locate <công trình> (gần nhất: village, fortress, bastion, " +
      "outpost, witch_hut, mansion, pyramid, igloo, camp, shipwreck, ocean_ruin, ruined_portal) · /admin (bật chế độ quản trị: bay, " +
      "bảng thông số, /give, /summon, /tp, /nether, /xp, /time set, /kick, /pvp, /structure; thoát: /admin off hoặc /unadmin)",
  } as Record<string, string>,
};

Object.assign(STR.chat, STR_MENU.chat, { helpAdmin: `Thoát chế độ quản trị: /admin off (hoặc /unadmin) · ${STR.chat.helpAdmin ?? ""}` });
