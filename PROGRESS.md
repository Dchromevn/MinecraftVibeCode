# PROGRESS.md — Tiến độ dự án Voxel PvP

Trạng thái: `chưa làm` · `đang làm` · `chờ người dùng test` · `xong`

| Giai đoạn | Tên | Trạng thái |
|---|---|---|
| 0 | Dựng khung | xong (người dùng xác nhận 2026-11-11) |
| 1 | Thế giới voxel (chỉ client) | chờ người dùng test |
| 1b | Hang động, hầm mỏ, ánh sáng (chỉ client) | chờ người dùng test |
| 2 | Người chơi và tương tác block (chỉ client) | chưa làm |
| 3 | Vật phẩm, chế tạo, sinh tồn (chỉ client) | chưa làm |
| 4 | Mạng nhiều người chơi | chưa làm |
| 5 | Chiến đấu PvP | chưa làm |
| 6 | Luật trận đấu | chưa làm |
| 7 | Hoàn thiện và phát hành | chưa làm |

---

## Giai đoạn 0 — Dựng khung (2026-11-11)

### File đã tạo

- `package.json`, `tsconfig.base.json`, `.gitignore` — npm workspaces (shared, server, client), TypeScript strict, lệnh `dev` / `typecheck` / `build` / `import-textures`.
- `shared/` — `package.json`, `tsconfig.json`, `src/index.ts`, `src/constants.ts` (mọi con số gameplay từ mục 2 của `DESIGN.md`).
- `server/` — `package.json`, `tsconfig.json`, `src/index.ts` (WebSocketServer cổng 8080, log khi kết nối/ngắt).
- `client/` — `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts` (khối xoay Three.js + FPS), `src/net.ts` (nối WS tới server), `src/strings.ts` (văn bản hiển thị gom một chỗ). Thư mục trống `public/textures`, `public/icons`, `public/ui`.
- `scripts/import-textures.ts` — chỗ giữ chỗ, Giai đoạn 1 viết thật.
- `DESIGN.md` (chép mục 2 `PLAN.md`), `CREDITS.md`, `PROGRESS.md`.

### Đã tự kiểm tra

- `npm install`, `npm run typecheck`, `npm run build` chạy không lỗi.
- Chạy thử server + Vite: server log kết nối/ngắt, client WS nối được, Vite phục vụ `main.ts` và mã trong `/shared`.
- Mục "mở trình duyệt thấy khối xoay" cần người dùng tự xem.

### Ghi chú / vấn đề còn tồn tại

- Thư viện ngoài yêu cầu tối thiểu: `concurrently` (chạy client + server trong một lệnh `dev`), `tsx` (chạy TypeScript server khi dev và script tiện ích), `@types/node`, `@types/ws`, `@types/three`.
- Server build ra `server/dist/server/src/index.js` (vì `rootDir` là gốc dự án để gộp `/shared`); chạy bằng `npm run start -w server`.
- Import trong `shared`/`server` dùng đuôi `.js` để Node ESM chạy được sau khi build.
- Node.js 26 LTS được cài bằng winget trong phiên này; cần mở lại terminal để có `node` trong PATH.
- `REFI_Textures` đã chuyển vào `assets-src/REFI_Textures` (không commit).

---

## Giai đoạn 1 — Thế giới voxel (2026-11-11)

### File đã tạo / sửa

- `shared/src/blocks.ts` — bảng 16 block (độ cứng, công cụ, rơi ra, trong suốt, va chạm, texture từng mặt).
- `shared/src/rng.ts`, `shared/src/noise.ts` — RNG có seed (mulberry32, không dùng `Math.random`), simplex noise 2D + fbm.
- `shared/src/chunk.ts`, `shared/src/world.ts` — `Chunk` (Uint8Array 16x16x64) và `World` (get/set theo tọa độ thế giới, heightmap, danh sách chunk bị ảnh hưởng khi đổi block ở biên).
- `shared/src/worldgen/{index,terrain,decorate}.ts` — sinh địa hình, lớp đất/đá/đá nền, cát vùng thấp, quặng theo cụm, cây, cỏ cao.
- `shared/src/constants.ts` — thêm số cụm quặng mỗi chunk, tỷ lệ cỏ cao, tần số noise (đã ghi vào `DESIGN.md` mục 2.1).
- `scripts/import-textures.ts`, `scripts/texture-map.json`, `scripts/tsconfig.json` — nhập 65 file (sao chép, ghép quặng/cỏ bên khi ảnh có điểm trong suốt, cắt `crack_0..4`), in danh sách file thiếu.
- `client/public/textures|icons|ui/*.png` — kết quả của `npm run import-textures` (CC BY-SA 4.0, đã ghi công).
- `client/src/atlas.ts`, `fallbackTextures.ts` — gộp texture thành atlas (tile 16 px, cấu hình được), `NearestFilter`, tắt mipmap, UV lùi vào 1/128 texel; thiếu file thì vẽ tạm bằng canvas.
- `client/src/mesher.ts`, `chunkRenderer.ts` — mesh theo chunk, chỉ mặt lộ, AO theo đỉnh, độ sáng khác nhau theo hướng, lá dùng alpha test, cỏ cao hình chữ X; hàng đợi dựng lại chunk + chunk kề.
- `client/src/sky.ts`, `flyCamera.ts`, `hud.ts`, `main.ts`, `strings.ts`, `index.html` — trời gradient, sương mù, camera bay, HUD (FPS, tọa độ, chunk đang vẽ, tam giác, seed).

### Đã tự kiểm tra bằng lệnh

- `npm run typecheck`, `npm run build` thành công.
- Cùng seed sinh ra thế giới giống hệt từng byte (chạy 2 lần), seed khác cho thế giới khác. Sinh thế giới khoảng 40 ms trong Node.
- Độ cao mặt đất 22–38 (trong khoảng 20–40). Khoảng 1 cây mỗi 62 block mặt đất. Có cát, than, sắt, kim cương.
- Số mặt mesher tạo ra khớp chính xác với số mặt lộ đếm độc lập trên toàn bản đồ, nên không thiếu/thừa mặt ở biên chunk.
- Toàn bản đồ khoảng 576 nghìn tam giác; dựng hết 256 chunk khoảng 1,4 giây (chia nhỏ qua nhiều khung).
- Chụp màn hình bằng Edge headless: địa hình, cây, cỏ cao, AO, sương mù, trời, HUD và mặt cắt quặng hiển thị đúng.

### Cần người dùng kiểm tra

- 60 FPS trên máy thật khi thấy toàn bộ 256 chunk (headless không đo được FPS).
- Không có khe hở, không rỉ màu texture khi bay lại gần/xa.
- Tải lại trang với cùng `?seed=` cho địa hình y hệt.
- Quặng: dùng PageUp/PageDown để xem mặt cắt lòng đất.

### Ghi chú / vấn đề còn tồn tại

- Địa hình khá thoải và có 3 lớp đất nên đá rất ít lộ ra ở vách; quặng chủ yếu thấy qua mặt cắt (chưa có hang động vì đặc tả không yêu cầu).
- Bay vào trong lòng đất sẽ nhìn xuyên đá (không dựng mặt bên trong) — đây là lý do có chế độ mặt cắt debug.
- Mặt giữa hai block lá kề nhau không vẽ để giảm 60% tam giác lá; nhìn xuyên lỗ tán có thể thấy tán rỗng.
- Texture ở xa có vân răng cưa (moiré) do tắt mipmap theo yêu cầu.
- Thêm thư viện dev `pngjs` (đọc/ghi PNG trong script nhập texture; MIT, không vào bản build client).
- `client/src/net.ts` tạm không dùng (Giai đoạn 1 chỉ client); giữ lại cho Giai đoạn 4.
- Tham số URL debug: `?seed=`, `?pos=x,y,z`, `?look=yaw,pitch`, `?cut=y`.

---

## Giai đoạn 1b — Hang động, hầm mỏ, ánh sáng (2026-11-11)

Thêm theo yêu cầu người dùng, trước Giai đoạn 2. Đã ghi vào `PLAN.md` (mục 2.1, 2.2, 3.1 và giai đoạn 1b) và `DESIGN.md`.

### File đã tạo / sửa

- `shared/src/constants.ts` — thế giới cao 128, mặt đất 70–90, quặng theo tỷ lệ mới, thêm `CAVES`, `MINESHAFT`, `LIGHT`, `MOVE`.
- `shared/src/blocks.ts` + `shared/src/blockTable.ts` (tách đôi) — 9 block mới (id 16–24), thêm hình dạng vẽ, độ phát sáng, độ cản sáng, chất lỏng, hệ số đi chậm, hộp va chạm cột rào.
- `shared/src/noise3d.ts` — simplex noise 3D.
- `shared/src/worldgen/caves.ts` — hang sợi mì, hang phô mai, cửa hang, dung nham.
- `shared/src/worldgen/mineshaft.ts`, `mineshaftParts.ts` — hầm mỏ bỏ hoang.
- `shared/src/worldgen/terrain.ts`, `decorate.ts`, `index.ts`, `shared/src/world.ts` — sỏi, không trồng cây sát cửa hang, thứ tự sinh, danh sách rương và hầm mỏ.
- `client/src/light/lightMap.ts`, `lighting.ts` — ánh sáng 16 mức, tính toàn bản đồ và tính lại theo vùng.
- `client/src/mesh/{mesher,shapes,shade,geomBuilder,visibility,sectionRenderer}.ts` — mesh theo đoạn 16x16x16, ánh sáng mượt, cột rào/đuốc/ray/mạng nhện, ẩn đoạn khuất. Xóa `client/src/mesher.ts`, `chunkRenderer.ts` cũ.
- `client/src/main.ts`, `strings.ts`, `fallbackTextures.ts`, `scripts/texture-map.json` — 8 texture mới, HUD mới, phím debug.

### Đã tự kiểm tra bằng lệnh

- `npm run typecheck`, `npm run build` thành công; không file nào quá 300 dòng.
- Cùng seed cho thế giới giống hệt từng byte. Sinh thế giới khoảng 330 ms trong Node (trước 40 ms).
- Hang chiếm khoảng 5,3% thể tích dưới mặt đất; hang lớn nhất chiếm 83–89% thể tích hang (hang nối nhau thành mạng).
- 12–14 cửa hang trên mặt đất thông vào hang lớn mỗi bản đồ (mục tiêu khoảng 16–18).
- 2–4 hầm mỏ mỗi bản đồ, 15–35 đoạn mỗi hầm, 6–8 rương, vài trăm ray và cột rào, 16–26 đuốc.
- Ánh sáng: tính cả bản đồ khoảng 160 ms; tính lại sau khi đổi block khoảng 4 ms và trùng khớp hoàn toàn với tính lại toàn bộ (60 lần đổi ngẫu nhiên).
- Mesh: tổng 1,27 triệu tam giác (trước 0,58 triệu). Nhờ ẩn đoạn khuất, đứng trên mặt đất chỉ vẽ khoảng 260 nghìn tam giác (Giai đoạn 1: khoảng 230 nghìn), trong hang khoảng 45 nghìn.
- Ảnh chụp headless: hành lang hầm mỏ có ray, khung, đuốc sáng; hồ dung nham phát sáng; cửa hang lộ ra mặt đất; hốc hang tối hẳn; nhìn đêm và nhìn xuyên đá thấy mạng hang.

### Cần người dùng kiểm tra

- FPS trên máy thật so với Giai đoạn 1 (F4 tắt/bật ẩn hang khuất để so).
- Bay xuống lòng đất: hang nối nhau, không có hang cụt vuông vức. Bấm N để nhìn đêm.
- Tìm hầm mỏ (tọa độ x,z in trên HUD), xem đường ray, khung gỗ, rương, đuốc chiếu sáng.

### Ghi chú / vấn đề còn tồn tại

- Thời gian tải tăng: sinh thế giới ~0,3 s + ánh sáng ~0,2 s + dựng mesh ~1 s (dàn qua nhiều khung).
- Bay xuyên vào khối đặc thì tự tắt ẩn hang khuất để nhìn xuyên thấy mạng hang (giống chế độ quan sát của game cùng thể loại).
- Nước có trong bảng block nhưng chưa đặt vào thế giới (nước bề mặt thuộc Giai đoạn 7). Nước và dung nham chưa chảy.
- Chưa có luật cho dung nham (sát thương, cháy) và mạng nhện mới có số liệu đi chậm; Giai đoạn 2/3 sẽ dùng — cần người dùng chốt số liệu sát thương dung nham.
- Đuốc, đường ray, hàng rào, sỏi, đá cuội rêu chưa có vật phẩm/công thức (Giai đoạn 3 quyết định).
- Rương hầm mỏ mới có vị trí, chưa có đồ (Giai đoạn 6).
- Đổi chiều cao thế giới làm khác hoàn toàn địa hình của seed cũ.
- Debug mới: `N` nhìn đêm, `F4` ẩn hang khuất, `?nv=1`, `?nocull=1`, `?nomsg=1`.
