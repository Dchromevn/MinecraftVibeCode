# Voxel Survival

Game voxel sinh tồn thế giới mở, góc nhìn thứ nhất, chơi nhiều người. Chạy được bằng **app desktop (.exe)** hoặc **trình duyệt**.
Viết bằng TypeScript: client Three.js (Vite), server Node.js (WebSocket), phần dùng chung (luật game, sinh thế giới) ở `shared/`.

> Repo riêng tư: `client/public_mc` chứa texture và mẫu công trình lấy từ client.jar của Minecraft (© Mojang Studios).
> Đừng chuyển repo sang công khai.

## Chơi ngay (không cần cài gì)

Tải ở mục **Releases** của repo:

| File | Cách dùng |
|---|---|
| `VoxelSurvival-Setup-<bản>.exe` | Bản cài đặt: cài một lần, mở bằng shortcut |
| `VoxelSurvival-Portable-<bản>.exe` | Bấm đúp là chơi, không cần cài |

- Lần đầu chạy, Windows SmartScreen có thể báo "Unknown publisher" (app chưa ký số): bấm **More info → Run anyway**.
- Windows Firewall hỏi quyền mạng: cho phép thì bạn bè trong mạng LAN mới vào được.
- Thế giới (`data\<id>`, danh sách trong `worlds.json`), `config.json`, `server.log` nằm ở `%APPDATA%\Voxel Survival\`.
- Phím của app: **F11** toàn màn hình, **F12** công cụ dò lỗi.

## Chạy từ mã nguồn

Cần [Node.js](https://nodejs.org) 22 trở lên.

```bash
npm install          # cài thư viện (lần đầu)
npm run desktop      # build rồi mở app desktop
# hoặc
npm run dev          # chế độ phát triển: mở http://localhost:5173 (tự tải lại khi sửa code)
npm run host         # build rồi chạy server: mở http://localhost:8080
```

### Chơi cùng bạn bè

App desktop mở ra có hai lựa chọn:

- **Chơi một mình**: danh sách thế giới trên máy bạn (tạo mới với tên + seed tùy chọn, chơi, xóa — xóa thì thư mục vào
  Thùng rác); chỉ máy bạn vào được.
- **Chơi nhiều người**:
  - **Tạo server**: danh sách server của bạn — tách riêng khỏi thế giới chơi một mình; **Tạo server mới** là một thế giới
    mới. Mở server thì màn hình hiện địa chỉ (ví dụ `192.168.1.5:8080`, có nút Chép)
    để gửi bạn bè. Menu Esc trong game cũng hiện lại địa chỉ này. Chủ máy không cần mật khẩu.
  - **Vào server của người khác**: bấm **Thêm server**, dán địa chỉ bạn bè gửi, rồi vào bằng tên + mật khẩu tự đặt
    (lần đầu vào là tạo tài khoản trên server đó).

Đổi sang thế giới khác thì app lưu thế giới cũ rồi khởi động lại server (vài giây). Mọi người phải cùng phiên bản game.

- Cùng Wi-Fi / mạng LAN: dùng địa chỉ `192.168…`. Lần đầu Windows Firewall hỏi quyền mạng thì bấm **Allow**.
- Khác mạng: cả nhóm cài cùng một VPN ảo (Radmin VPN, Tailscale, ZeroTier…) rồi dùng địa chỉ của VPN đó
  (màn hình Tạo server liệt kê cả địa chỉ VPN); hoặc chạy `cloudflared tunnel --url http://localhost:8080` rồi gửi link
  `https://….trycloudflare.com`.
- Bản web (`npm run host`): người khác mở `http://<IP-máy-chủ>:8080` hoặc thêm địa chỉ đó vào danh sách server;
  `npm run share` (cần `cloudflared.exe` ở thư mục gốc) tạo link tạm qua Internet.

### Build file .exe

```bash
npm run dist-desktop # ra desktop/release/VoxelSurvival-Setup-<bản>.exe và VoxelSurvival-Portable-<bản>.exe
```

Bản Mac / Linux phải build trên máy chạy hệ điều hành đó (cùng lệnh). File .exe không đưa vào git: đăng ở mục Releases.

## Các lệnh khác

| Lệnh | Việc |
|---|---|
| `npm run typecheck` | Kiểm tra kiểu toàn dự án |
| `npm run build` | Build client + server |
| `npm test` | Chạy bộ kiểm tra (`tests/`) |
| `npm run import-textures` | Nhập lại texture + mẫu công trình từ client.jar (xem mục Texture) |
| `npm run make-icon` | Vẽ lại logo app từ texture khối cỏ |
| `npm run list-items` | Tạo `docs/ITEMS.md` — khóa vật phẩm cho lệnh `/give` |
| `npm run list-places` | Tạo `docs/DIA-DIEM.md` — tọa độ làng, công trình của thế giới đang chơi |

## Cấu hình server

`server/config.json` (bản desktop: `%APPDATA%\Voxel Survival\config.json`):

| Khóa | Ý nghĩa |
|---|---|
| `seed` | Seed thế giới; `"random"` = mỗi thế giới mới một seed |
| `port` | Cổng (mặc định 8080) |
| `world` | Tên thế giới (thư mục lưu) |
| `spawn` | `"random"` hoặc `"fixed"` |
| `pvp` | Người chơi đánh nhau được không |
| `admins` | Tên bật sẵn chế độ quản trị |
| `debug` | Chế độ thử (bộ đồ thử cho người mới) |

## Texture

Texture đã có sẵn trong `client/public_mc` nên tải repo về là chạy được. Chỉ khi cần nhập lại (đổi bản Minecraft, thêm texture
trong `scripts/mc-texture-map.json`): chép file `.jar` của Minecraft (ví dụ `%APPDATA%\.minecraft\versions\<bản>\<bản>.jar`)
vào `assets-src/minecraft/` rồi chạy `npm run import-textures`. Thiếu texture thì game tự vẽ tạm.

## Cấu trúc thư mục

```
client/            trang game (Vite + Three.js)
  src/             mã nguồn client
  public_mc/       texture + structures.json nhập từ client.jar
server/            server Node.js (WebSocket, lưu thế giới)
  src/             mã nguồn server
  config.json      cấu hình mặc định
  data/            thế giới đã lưu khi chạy từ mã nguồn (không commit)
shared/src/        dùng chung client + server: block, vật phẩm, công thức, vật lý, sinh thế giới
desktop/           app desktop (Electron)
  src/             vỏ app: chạy server trong máy + mở cửa sổ game
  resources/       logo (icon.png)
  builder.json     cấu hình đóng gói electron-builder
scripts/           công cụ: nhập texture, gom file đóng gói, tạo danh sách vật phẩm / địa điểm
tests/             bộ kiểm tra (npm test)
tools/             công cụ thử (bot kết nối server, chụp màn hình)
docs/              tài liệu thiết kế
  PLAN.md          đặc tả + kế hoạch theo giai đoạn
  DESIGN.md        thông số game (nguồn sự thật khi khác PLAN)
  MECHANICS.md     cơ chế chi tiết
  PROGRESS.md      tiến độ, nhật ký thay đổi
  ITEMS.md         danh sách vật phẩm (tự tạo)
  DIA-DIEM.md      tọa độ địa điểm (tự tạo)
AGENTS.md          quy tắc cho AI agent làm việc trong dự án
CREDITS.md         ghi công tài nguyên / thư viện
```

Không commit: `node_modules/`, `dist/`, `assets-src/` (client.jar), `server/data/`, `desktop/stage/`, `desktop/release/`.
