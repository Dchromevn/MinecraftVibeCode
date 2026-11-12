# PROGRESS.md — Tiến độ dự án Voxel Survival

Trạng thái: `chưa làm` · `đang làm` · `chờ người dùng test` · `xong`

> Kế hoạch đã chuyển hướng sang SINH TỒN THẾ GIỚI MỞ (PLAN.md cập nhật 2026-11-11).
> Đánh số giai đoạn theo PLAN.md mới. Lịch sử bên dưới giữ nguyên số cũ.

| Giai đoạn | Tên | Trạng thái |
|---|---|---|
| 0 | Dựng khung | xong |
| 1 | Thế giới voxel cơ bản (bản cố định) | xong (theo PLAN.md mới) |
| 2a | Thế giới vô hạn và biome | xong (người dùng bảo "tiếp" sau khi sửa lỗi, 2026-11-11) |
| 2b | Hang động, hầm mỏ, ánh sáng, block mới | xong (người dùng xác nhận 2026-11-12) |
| 3a | Dữ liệu phụ của block, vật lý người chơi, hình dạng block | xong (người dùng xác nhận 2026-11-12) |
| 3b | Đào, đặt, chỗ bám, cát rơi | xong (người dùng xác nhận 2026-11-12) |
| 4a | Vật phẩm, túi đồ, chế tạo, sinh tồn | chờ người dùng test |
| 4b | Rương, lò nung, cửa, trồng trọt | chưa làm |
| 4c | Chất lỏng, xô | chưa làm |
| 5 | Mạng nhiều người và lưu thế giới | chưa làm |
| 6 | Chiến đấu PvP và hồi sinh | chưa làm |
| 7 | Ngày đêm, động vật, quái vật, giường | chưa làm |
| 8 | Làng và dân làng | chưa làm |
| 9 | Hoàn thiện và phát hành | chưa làm |
| 10 | (Tùy chọn) Vực Lửa | chỉ làm khi người dùng yêu cầu |
| 11 | (Tùy chọn) Cõi Hư Không | chỉ làm khi người dùng yêu cầu |

### Ghi chú chuyển hướng: phần "1b" cũ dùng lại được gì cho Giai đoạn 2a/2b

Dùng lại gần như nguyên: simplex noise 3D; thuật toán hang sợi mì/phô mai và
dung nham đáy; thuật toán ánh sáng (cột trời + flood fill, tính lại theo vùng,
đã kiểm khớp 100% với tính lại toàn bộ); mesher có ánh sáng mượt + AO; hình dạng
cột rào/đuốc/ray/chữ X; ẩn đoạn khuất; nhìn đêm debug.

Phải làm lại hoặc sửa:
- Đánh số lại block 16–24 theo bảng 2.2 mới (sỏi 16, nước 17, dung nham 18,
  đá cuội rêu 19, ... đuốc 25) và thêm id 25–34. Chưa có dữ liệu lưu nên đổi
  id lúc này không mất gì.
- Một block đường ray duy nhất, tự chọn thẳng/cong/ngã ba/ngã tư theo ray bên cạnh.
- Hàng rào có thanh nối, va chạm cao 1.5; mạng nhện cứng 6, rơi sợi tơ;
  quặng sắt rơi sắt thô; quặng sắt y < 64, kim cương y < 16, đá sâu dưới y = 8.
- World theo bảng băm chunk (cx, cz) thay cho mảng 16x16 cố định; ánh sáng lưu
  theo chunk thay cho một mảng toàn bản đồ.
- Mọi bước sinh (hang, cửa hang, cây, hầm mỏ) phải sinh được độc lập từng chunk:
  cửa hang và hầm mỏ lập kế hoạch theo vùng (hầm mỏ ~1 mỗi 256x256), mỗi chunk
  chỉ đặt phần thuộc về nó.
- Thêm biome, mực nước biển 62, đại dương, nước bán trong suốt.
- Sinh/ánh sáng/mesh chạy trong Web Worker; tải/gỡ chunk theo tầm nhìn 8.
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

---

## Giai đoạn 2a — Thế giới vô hạn và biome (2026-11-11)

Kèm theo yêu cầu bổ sung "nước tự nhiên" của người dùng: phần trên mặt đất (sông, hồ, mạch nước núi) làm trong 2a; phần dưới lòng đất (hồ ngầm, mạch nước/dung nham trong hang, không đục hang dưới đáy nước) ghi vào 2b. Đã cập nhật `PLAN.md` mục 2.1, 2.10, giai đoạn 2a/2b/4 và `DESIGN.md`.

### File đã tạo / sửa

- `shared/src/constants.ts` (thế giới, địa hình, biome, sông, hồ, mạch nước) + `shared/src/gameplay.ts` (thông số lối chơi tách ra cho file ngắn).
- `shared/src/blocks.ts`, `blockTable.ts` — đánh số lại theo bảng 2.2 (id 0–17, 20, 21, 32, 34; id còn lại "dành chỗ" cho 2b); rơi ra dạng danh sách; quặng sắt rơi sắt thô.
- `shared/src/chunk.ts`, `world.ts` — chunk 16x128x16, `World` dùng bảng băm (cx, cz), đánh dấu chunk đã sửa.
- `shared/src/raycast.ts` — raycast DDA (dùng lại ở Giai đoạn 3).
- `shared/src/worldgen/{terrainSampler,chunkGen,trees,lakes,springs,index}.ts` — sinh theo từng chunk: địa hình liên tục, 6 biome, sông, hồ, mạch nước núi, quặng/sỏi xuyên chunk, cây xuyên chunk, cỏ cao, tuyết phủ, đá sâu.
- Xóa bộ sinh bản đồ cố định cũ (`terrain`, `decorate`, `caves`, `mineshaft*`) và ánh sáng/ẩn hang cũ ở client — mã vẫn còn trong commit `a098b81` để 2b dùng lại.
- `client/src/mesh/mesher.ts` (dựng mesh từ khối có viền 18x128x18, nước hạ 1/8, lớp tuyết, cỏ có tuyết), `geomBuilder.ts` (không cần three, chạy trong worker).
- `client/src/workers/{protocol,worldWorker,workerPool}.ts` — sinh chunk và dựng mesh trong 1–4 Web Worker.
- `client/src/world/{chunkManager,chunkMeshes}.ts` — tải/gỡ theo tầm nhìn (mặc định 8, phím [ ]), ưu tiên chunk gần và trước mặt, gỡ ngoài bán kính + 2, giữ chunk đã sửa trong bộ nhớ; nước bán trong suốt.
- `client/src/debug/blockEditor.ts` — công cụ tạm: chuột trái phá, chuột phải đặt, 1–9 chọn block.
- `client/src/main.ts`, `strings.ts`, `fallbackTextures.ts`, `scripts/texture-map.json` — HUD mới (biome, chunk, việc đang chờ, bộ nhớ), 6 texture mới.

### Đã tự kiểm tra bằng lệnh

- `npm run typecheck`, `npm run build` thành công; không file nào quá 300 dòng.
- Sinh 1 chunk khoảng 1 ms; sinh lại theo thứ tự khác cho kết quả giống hệt từng byte.
- Trên vùng 6000x6000: đồng cỏ 24%, rừng 19%, sa mạc 7%, tuyết 13%, núi 7%, biển 31%; độ cao 49–108. Ngoài vùng núi chỉ ~0,06% cặp cột kề nhau chênh ≥ 4 block.
- Sông: bề rộng đo theo hàng ngang trung vị 11 block (đo chéo nên thiên cao). Hồ: có ở khoảng 50% số vùng 128x128 (gần như mọi vùng đất liền), mặt nước cao hơn mực biển.
- Cây ở mép chunk đủ tán như cây ở giữa chunk (98–100% trong vùng rừng).
- Nước sinh sẵn: 0 ô hở trên ba vùng thử; mạch nước núi: ~10 trên 144 chunk vùng núi.
- Trình duyệt headless (dựng hình bằng CPU): bay thẳng 2 phút ~2.900 block, số chunk trong bộ nhớ giữ ~314, bộ nhớ JS sau dọn rác 36–58 MB không tăng dần, hàng đợi gần như trống; quay về thì block đã đặt/đào vẫn còn.
- Raycast đúng ở tọa độ âm và biên chunk; sửa block ở góc chunk đánh dấu đủ 4 chunk.
- Ảnh chụp: đồng cỏ, rừng, sa mạc, đồng tuyết, núi (đá + tuyết), đại dương, sông, hồ, mạch nước trên sườn dốc.

### Cần người dùng kiểm tra

- FPS với tầm nhìn 8 trên máy thật (headless chỉ đo được 21–53 FPS vì dựng hình bằng CPU).
- Bay nhanh (Ctrl) có bị khựng/thấy lỗ chunk chưa tải không.
- Phá/đặt block bằng chuột, bay xa rồi quay lại xem còn không.
- Ranh giới biome trông có hợp lý không; tìm sông, hồ, mạch nước.

### Ghi chú / vấn đề còn tồn tại

- Chưa có ánh sáng (2b): mọi nơi sáng đều như ban ngày, chỉ có AO và độ sáng theo hướng mặt.
- Texture nước gốc màu xanh tím; đã nhuộm thêm xanh, có thể chỉnh `WATER_TINT` trong mesher.
- Đồi cát trong sa mạc có thể khá dốc (tới y = 88); cao hơn y = 88 luôn là núi.
- Thứ tự tải chưa tính chiều cao camera; bay rất cao vẫn tải theo hình tròn trên mặt phẳng.
- Debug: `?debug=1` mở `window.__game` (camera, chunk, world, autopilot) cho script kiểm tra; `?vd=` đặt tầm nhìn.

### Sửa sau phản hồi người dùng (2026-11-11)

- Nhìn rõ đáy hồ sâu: trước đây chỉ vẽ mặt trên của nước với độ trong cố định nên sâu cạn như nhau. Nay đáy/vách dưới nước tối và ám xanh theo số block nước phía trên; nước dùng texture riêng lặp lại, có gợn sóng và trôi chậm (shader, không dựng lại mesh). Dòng chảy có hướng phải chờ mô phỏng chất lỏng ở Giai đoạn 4.
- Mảng đá trên đỉnh núi tuyết: trước đây đá lộ từ y = 92 nhưng tuyết chỉ từ y = 100. Nay tuyết phủ mọi mặt trên của núi từ đường tuyết y ≈ 90 (cả đá và cỏ); đá chỉ còn ở mặt vách đứng. Lá cây thay được lớp tuyết.
- Block nước đơn lẻ cạnh đất: đã kiểm tra, cả 14/14 khối nước nhỏ đều là mạch nước đặt trên đồi cỏ thường (y 75–79). Nay mạch nước chỉ ở biome núi, mặt đất ≥ 85, vách ≥ 4 block (còn ~1 mạch trên 576 chunk quanh điểm xuất phát). Không có vũng nước nhỏ nào do sông/hồ.
- Tự phát hiện thêm: vệt sỏi đáy nước tính theo tọa độ trong chunk nên lặp lại mỗi chunk và đứt ở ranh giới; đã đổi sang tọa độ thế giới.
- Kiểm tra lại: typecheck/build qua; sinh lại vẫn giống hệt; 0 ô nước hở ngoài mạch nước; mặt nước đổi 18% điểm ảnh sau 0,7 giây (sóng chạy).

---

## Giai đoạn 2b — Hang động, hầm mỏ, ánh sáng, block mới (2026-11-11)

Giai đoạn 2a được coi là đạt khi người dùng bảo "tiếp" sau lần sửa lỗi.

### File đã tạo / sửa

- `shared/src/blockTable.ts`, `blocks.ts` — đủ id 0–34 (dung nham, đá cuội rêu, hàng rào, ray, mạng nhện, đuốc, lò nung, kính, thang, cửa, đất cày, lúa mì, giường) và các kiểu vẽ mới.
- `shared/src/constants.ts` — CAVES, MINESHAFT cho bản sinh theo từng chunk.
- `shared/src/worldgen/caveField.ts` (trường hang), `caveRules.ts` (ô đục thành gì, chống thủng nước, hồ ngầm), `entrances.ts` (cửa hang theo vùng), `caves.ts` (đục trong chunk), `natural.ts` (block tự nhiên cho bộ lập kế hoạch), `mineshaftCenter.ts`, `mineshaft.ts`, `mineshaftParts.ts` (hầm mỏ theo vùng), `caveSprings.ts`; sửa `chunkGen.ts`, `trees.ts` (không trồng lên miệng hang), `springs.ts`, `terrainSampler.ts` (cache cột).
- `client/src/light/regionLight.ts` — ánh sáng vùng 3x3 chunk.
- `client/src/mesh/{mesher,specialBlocks,shapes,connectivity,geomBuilder}.ts` — mesh theo đoạn 16 block, ánh sáng mượt, hình dạng đặc biệt, độ thông.
- `client/src/world/{chunkMeshes,chunkShader,sectionCuller,chunkManager}.ts` — mesh theo đoạn, shader ánh sáng (uDaylight, nhìn đêm), ẩn đoạn khuất, dựng lại 15 block quanh chỗ sửa.
- `client/src/workers/{protocol,worldWorker}.ts`, `client/src/main.ts`, `strings.ts`, `debug/blockEditor.ts` (bảng block đầy đủ, lăn chuột), `fallbackTextures.ts`, `scripts/texture-map.json` (27 texture mới). Xóa `client/src/mesh/shade.ts`.

### Đã tự kiểm tra bằng lệnh

- `npm run typecheck`, `npm run build` thành công; không file nào quá 300 dòng.
- Sinh theo từng chunk xác định: sinh lại theo thứ tự ngược bằng bộ sinh mới giống hệt từng byte (4 vùng, 3 seed). Sinh 1 chunk 3–4,5 ms (lần đầu chạm hầm mỏ ~120 ms để lập kế hoạch).
- Hang chiếm 2,8–4,3% lòng đất; có dung nham, hồ ngầm (đến ~10.000 ô nước), 80–100 mạch nước và 20–35 mạch dung nham mỗi ~144 chunk.
- 0 ô nước/dung nham "hở" ngoài mạch; 0 chỗ không khí trong hang nằm cạnh nước bề mặt (không thủng đáy biển/sông/hồ).
- Hầm mỏ quanh (87, 32, 157): 138 ray, 146 hàng rào, 6 đuốc, 22 mạng nhện, 1 rương.
- Ánh sáng: 0 ô lệch trên 100.352 ô ở ranh giới chunk (tính từ hai vùng khác nhau); 6/6 đuốc đúng mức 14 và ô kề 13; 100% ô hang sâu tối hẳn ánh sáng trời. Tính ánh sáng ~2,6–4,7 ms, dựng mesh ~9–10 ms mỗi chunk (Node).
- Trình duyệt headless: mặt đất ~126 nghìn tam giác / 226 lệnh vẽ (2a tương đương); trong hang/hầm mỏ chỉ 8–40 nghìn tam giác nhờ ẩn đoạn khuất. Bay 2 phút: bộ nhớ JS sau dọn rác 80–117 MB, không tăng dần; block đã sửa còn khi quay lại. Đặt đuốc trong hang tối thì vùng quanh sáng lên.
- Ảnh chụp: hành lang hầm mỏ (ray, khung, đuốc), hồ dung nham, hồ ngầm, mạch nước trần hang, nhìn xuyên đá thấy mạng hang.

### Cần người dùng kiểm tra

- FPS tầm nhìn 8 so với 2a (F4 bật/tắt ẩn hang khuất để so).
- Bay xuống lòng đất (N nhìn đêm): hang nối nhau, hồ dung nham ở đáy, hồ ngầm, mạch nước; hang và hầm mỏ liền mạch qua ranh giới chunk.
- Tìm hầm mỏ: ray thẳng/cong/ngã rẽ, khung gỗ, mạng nhện, rương.
- Đặt đuốc (phím 3) trong hang tối rồi phá đi, kể cả sát ranh giới chunk.
- Đặt thử các block mới (lăn chuột): hàng rào nối nhau, ray tự cong, thang bám tường, cửa, giường 2 ô, kính, lúa, đất cày.

### Ghi chú / vấn đề còn tồn tại

- Ánh sáng không lưu theo chunk như PLAN ghi, mà tính lại trong worker từ vùng 3x3 mỗi lần dựng mesh (kết quả giống hệt, đơn giản hơn, không phải đồng bộ xuyên chunk). Đổi block thì dựng lại tối đa 9 chunk (~vài chục ms).
- Chưa có dữ liệu phụ cho block (hướng, giai đoạn lớn): cửa chọn hướng theo tường kề, lúa luôn vẽ giai đoạn chín, lò nung luôn tắt, giường chọn đầu/chân theo ô kề. Giai đoạn 4 sẽ cần thêm dữ liệu phụ cho block.
- Mạch nước/dung nham vẫn chỉ là một block cho tới Giai đoạn 4.
- Mỗi hầm mỏ hiện chỉ có 1–2 rương (50% nhánh cụt có đáy đặc).
- Debug: `?nv=1`, `?nocull=1`, phím N, F4.

### Bổ sung trong 2b: quặng vàng, ngọc lục bảo, tăng mật độ (2026-11-12)

Theo yêu cầu người dùng (PLAN.md/DESIGN.md đã cập nhật trước, ghi chú 2026-11-12).
2b vẫn ở trạng thái chờ người dùng test.

File đã sửa / tạo:
- `PLAN.md`, `DESIGN.md` — quặng vàng (y < 32, có bản đá sâu) và ngọc lục bảo (núi), cấp đồ vàng (bền 32, x12, đào như gỗ, kiếm 4), giáp vàng 2/5/3/1 bền 110, táo vàng, vàng thô → thỏi vàng, than/sắt dày gấp đôi, hầm mỏ vùng 160 tối đa 70 đoạn, thử lại tâm, đồ rương hầm mỏ, texture/icon mới.
- `shared/src/constants.ts` — ORE (cluster [min, max]), EMERALD, MINESHAFT (REGION 160, CENTER_TRIES 5, CENTER_MARGIN 16, MAX_PIECES 70).
- `shared/src/gameplay.ts` — TOOL_TIERS thêm vàng và `level`, ARMOR vàng, GOLDEN_APPLE, MINESHAFT_LOOT (Giai đoạn 4 dùng).
- `shared/src/blocks.ts`, `blockTable.ts` — block 35 quặng vàng, 36 quặng vàng đá sâu, 37 quặng ngọc lục bảo (cần cuốc sắt).
- `shared/src/worldgen/ores.ts` (mới, tách từ chunkGen.ts) — quặng theo cụm có bản đá sâu, ngọc lục bảo khối lẻ ở cột núi.
- `shared/src/worldgen/mineshaftCenter.ts` — thử tối đa 5 vị trí tâm; phòng phải cao hơn mực nước hồ ngầm.
- `shared/src/worldgen/mineshaft.ts`, `caveRules.ts` — đổi chiều quy tắc: hồ ngầm không còn né cả vùng quanh hầm mỏ (với vùng 160 thì hồ ngầm gần như biến mất); thay vào đó hành lang trong vùng có hồ chỉ được nằm cao hơn mực nước.
- `scripts/texture-map.json` (ore_gold, ore_gold_deep, ore_emerald), `client/src/strings.ts`, `client/src/fallbackTextures.ts`.

Số đo (seed voxel / abc, cùng script trước và sau):

| | Trước | Sau |
|---|---|---|
| Hầm mỏ trong bán kính 300 block quanh gốc | 2 / 2 | 8 / 9 |
| Hầm mỏ gần nhất | 164 / 188 block | 128 / 103 block |
| Số vùng 64x64 có hồ ngầm | 21% / 25% | 35% / 37% |
| Than mỗi chunk (lộ ra hang) | 51 (2,3) / 53 (2,4) | 102 (4,8) / 105 (4,9) |
| Sắt mỗi chunk (lộ ra hang) | 39 (2,1) / 39 (1,8) | 81 (3,9) / 83 (3,9) |
| Kim cương mỗi chunk | 4,3 / 4,2 | 4,1 / 4,1 |
| Vàng (thường + đá sâu) mỗi chunk | – | 9,4 / 9,7 |
| Ngọc lục bảo mỗi chunk núi | – | 4,4 / 4,3 |

- Kiểm tra lại 2b ở 4 vùng 24x24 chunk (2 seed): sinh xác định, 0 ô nước/dung nham hở ngoài mạch, 0 chỗ thủng nước bề mặt.
- Ảnh chụp: quặng vàng trong hang ở `?seed=voxel&pos=23.5,22.6,6.5&look=-3.14,-0.29&nv=1`, ngọc lục bảo ở `?seed=voxel&pos=35.5,31.6,53.5&look=-1.57,0.24&nv=1`.
- Vấn đề: không hầm mỏ nào chạm giới hạn 70 đoạn (trung bình ~19, lớn nhất 47) vì nhánh tự tắt (giới hạn độ sâu 10, nhánh cụt, ngã rẽ bỏ nhánh 35%), nên mỗi hầm mỏ chỉ ~15 chunk, không lớn hơn trước. Muốn hầm mỏ to hơn thì phải chỉnh xác suất rẽ nhánh.
- Thế giới cũ của cùng seed đổi theo (quặng, hầm mỏ, hồ ngầm). Chưa có dữ liệu lưu trên server nên không cần chuyển đổi.

## Giai đoạn 3a — Dữ liệu phụ, vật lý người chơi, hình dạng block (2026-11-12)

Trạng thái: chờ người dùng test. Người dùng chọn: lớp dữ liệu phụ (phương án A), bỏ
giai đoạn 2c (nước chảy ở Giai đoạn 4), phá tức thì chỉ khi bay (3b), quy tắc chỗ bám (3b),
thông số di chuyển ghi trong DESIGN.md 2.6.

### File đã tạo / sửa

- `shared/src/blocks.ts` (MetaKind, META_MASK — ý nghĩa byte dữ liệu phụ), `blockTable.ts` (gán kiểu).
- `shared/src/blockMeta.ts` (mới) — ô = id | dữ liệu phụ << 8, hướng ngang, mã hóa/giải mã từng kiểu, hình ray (chuyển từ client), ánh sáng lò đang cháy.
- `shared/src/chunk.ts`, `world.ts` — mảng dữ liệu phụ song song; `getCell`, `getMeta`, `setBlock(x, y, z, id, meta)` (làm sạch bit không dùng).
- `shared/src/blockShapes.ts` (mới) — hộp va chạm (rào nối cao 1.5, cửa theo hướng/mở, đất cày, giường) và hộp nhắm (đuốc sàn/tường, thang, ray, cây, lúa theo giai đoạn).
- `shared/src/raycast.ts` — trúng đúng hộp nhắm, trả về cả ô (id + dữ liệu phụ).
- `shared/src/collide.ts`, `physics.ts` (mới) — va chạm từng trục, bước lên 0.6, ngồi không rơi mép, nhảy, bơi, thang, mạng nhện, dung nham/cháy, đứng yên khi chunk chưa tải.
- `shared/src/placement.ts` (mới) — dữ liệu phụ khi đặt (đuốc/thang theo mặt bấm, cửa/giường 2 ô, lò/rương quay về người chơi), ray tự nối, ô còn lại của cửa/giường.
- `shared/src/gameplay.ts` — thông số di chuyển mới; `worldgen/chunkGen.ts` (trả id + dữ liệu phụ), `worldgen/mineshaft.ts` (ray ghi dạng ngay khi sinh; ngã rẽ nối ray với hành lang nên có ray cong/ngã ba/ngã tư).
- `client/src/player/playerController.ts`, `viewEffects.ts` (mới) — bước vật lý 60 Hz + nội suy, lắc camera, phím F bay, FOV khi chạy, ám màu/sương dưới nước và dung nham.
- `client/src/mesh/{mesher,specialBlocks,shapes}.ts` — vẽ theo dữ liệu phụ (đuốc tường nghiêng, thang, cửa, ray, giường, lúa theo giai đoạn, mặt trước lò/rương, lò cháy, mặt nước theo mức).
- `client/src/light/regionLight.ts`, `workers/*`, `world/chunkManager.ts` — gửi/nhận dữ liệu phụ, lò đang cháy phát sáng 13.
- `client/src/debug/blockEditor.ts` — khung viền đúng hình, ghi dữ liệu phụ khi đặt, phá cửa/giường mất cả hai nửa; `flyCamera.ts`, `main.ts`, `strings.ts`, `index.html` (tâm ngắm, lớp ám màu).

### Đã tự kiểm tra bằng lệnh

- `npm run typecheck`, `npm run build` thành công; không file nào quá 300 dòng.
- Kiểm tra vật lý tự động 25/25 đạt: đỉnh nhảy 1.25; nhảy lên block cao 1 được, cao 2 không; không qua được dãy rào, không lách giữa cột rào; áp tường không rung (dao động 0), vào góc không xuyên và ra được; rơi 120 block không xuyên; từ đất cày bước lên đá, tự bước lên giường; ngồi dừng ở mép; leo thang 2.4 b/s, Shift đứng yên, tụt ≤ 3 b/s; chìm 2 b/s, Space nổi lên, bơi lên bờ cao 1; mạng nhện ~25%; dung nham 4 máu/giây; chunk chưa tải thì đứng yên; cửa đóng chặn, cửa mở đi qua.
- Sinh thế giới xác định cả id lẫn dữ liệu phụ (2 seed); 0 ô nước hở / thủng. Ray trong 40x40 chunk: 1.116 thẳng, 5 cong, 6 ngã ba, 6 ngã tư; đuốc hầm mỏ dữ liệu phụ 0 (cắm trên cột). Tốc độ sinh chunk không đổi so với trước.
- Trình duyệt headless: bắt đầu đi bộ trên đất; chạy + nhảy 3 giây đi ~16 block, FOV tăng; rơi xuống biển thì ám xanh; tường thử: đuốc tường nghiêng, đuốc sàn, thang, cửa 2 ô, lò đang cháy, rương quay đúng hướng; khung viền ray là tấm mỏng.

### Cần người dùng kiểm tra

- Đi, chạy (Ctrl), nhảy, áp tường, vào góc: không xuyên, không kẹt, không rung.
- Nhảy lên block cao 1 được, cao 2 không, không qua hàng rào; ngồi (Shift) ở mép không rơi.
- Bơi (Space nổi lên, lên bờ), leo thang (W áp vào thang hoặc Space; Shift đứng yên), đi qua mạng nhện.
- Đặt đuốc lên tường (nghiêng) và lên sàn; đặt thang, cửa, giường, lò, rương, ray (tự nối, cong); hầm mỏ có ray cong/ngã rẽ.
- Phím F bật/tắt bay; tâm ngắm; camera lắc khi đi; màn hình ám xanh dưới nước.

### Ghi chú / vấn đề còn tồn tại

- Ray cong/ngã rẽ trong hầm mỏ vẫn hiếm (~1,5% số ray) vì phần lớn hệ thống là hành lang thẳng.
- Mặt trên giường chưa xoay theo hướng (gối luôn cùng một phía); mặt nước theo mức chỉ phẳng từng ô (dốc mượt làm ở Giai đoạn 4 cùng nước chảy).
- Công cụ debug vẫn phá tức thì, chưa kiểm tra chỗ bám, đặt lúa ở giai đoạn chín: Giai đoạn 3b thay bằng đào/đặt thật.
- Chưa có sát thương rơi (Giai đoạn 4 cùng thanh máu); ngồi chưa hạ camera.
- Thêm `?walk=1` / `?fly=1`; `?pos=` mặc định bắt đầu ở chế độ bay. `?debug=1` cho script nhấn phím không cần khóa chuột.

## Áp dụng MECHANICS.md cho Giai đoạn 2–3a (2026-11-12)

Người dùng bảo "sửa theo MECHANICS hết, tiếp 3b". Random tick và lá tự rụng để Giai đoạn 4
(cần có lúa/cây non dùng). Ba mục LỰA CHỌN (rìu, giáp, táo từ lá) chưa có câu trả lời rõ:
tạm giữ theo PLAN (rìu = kiếm − 1, giáp 4%/điểm, táo 5%).

- Tốc độ 4.317 / 5.612 / 1.295; bay debug 10.9; rơi tối đa 78.4.
- Ngồi: hộp cao 1.5, mắt 1.27, trần thấp không đứng dậy; không bước khỏi mép ≥ 5/8.
- Nhảy lúc chạy nhanh được đẩy thêm 2.8 b/s, trên không giữ đà (hãm 2/giây), vận tốc mong
  muốn trên không 85%: chạy + nhảy liên tục 7.16 b/s, vượt khe 4 (đi bộ 2).
- Sát thương rơi floor(quãng − 3) (nước/thang/mạng nhện tính lại); dưỡng khí 15 s, hết thì
  2 máu/giây, hồi đầy 3.75 s; dung nham 4 máu/lần + miễn sát thương 0.5 s, cháy 15 s;
  cháy 1 máu/giây; chỉ lưu số máu.
- Độ bền công cụ 59/131/250/32/1561; nước cản ánh sáng 1; lá rơi thêm que 2%.
- Công thức đào + bảng độ cứng (dùng ở 3b); mạng nhện tay không không rơi gì (20 giây).

## Giai đoạn 3b — Đào, đặt, chỗ bám, cát rơi (2026-11-12)

Trạng thái: chờ người dùng test (người dùng chọn làm tiếp 3b, test gộp với 3a).

### File đã tạo / sửa

- `shared/src/blockRules.ts` (mới) — chỗ bám theo DESIGN 2.2, kiểm tra đặt (ô thay được, chỗ bám, không chồng người chơi), phá + dây chuyền (cửa/giường mất cả hai nửa, ray tự nối lại), cát/sỏi hết đỡ thì rơi.
- `shared/src/digging.ts` (mới) — tốc độ đào theo MECHANICS mục 4 (tay không / công cụ, dưới nước, trên không, phá ngay).
- `shared/src/fallingBlock.ts` (mới) — cát/sỏi đang rơi, đáp đè đuốc/cỏ cao (rơi ra), cột cát chồng đúng thứ tự.
- `shared/src/{gameplay,blockTable,blocks,physics,collide,index}.ts` — hằng số và vật lý theo MECHANICS (mục trên).
- `client/src/interact/{interaction,crackOverlay,fallingBlocks,boxMesh}.ts` (mới) — giữ chuột trái đào, vết nứt 5 mức, chuột phải đặt (giữ để đặt lặp lại), khung viền đúng hình, cát rơi có hình, HUD "Rơi ra".
- `client/src/player/arm.ts` (mới) — cánh tay góc nhìn thứ nhất (skin `entities/player.png`), vung khi đào/đặt.
- `client/src/main.ts`, `strings.ts`, `flyCamera.ts`, `player/playerController.ts` (mắt hạ khi ngồi); `scripts/texture-map.json` (skin người chơi). Xóa `client/src/debug/blockEditor.ts`.

### Đã tự kiểm tra bằng lệnh

- `npm run typecheck`, `npm run build` thành công; không file nào quá 300 dòng.
- Vật lý 32/32 (thêm: rơi 10 block mất 7 máu, rơi vào nước không mất, chết đuối 15 s rồi 2 máu/giây, dung nham 8 máu/giây thực tế, ngồi dưới trần thấp không đứng dậy, chạy + nhảy 7.16 b/s, vượt khe chạy 4 / đi bộ 2).
- Quy tắc 18/18: phá block dưới đuốc / tường có đuốc → đuốc rơi; phá nửa trên cửa hoặc sàn dưới cửa → mất cả cửa, 1 vật phẩm; cát rơi đè đuốc → đuốc rơi ra, cát nằm vào chỗ đó; cột cát–sỏi–cát rơi chồng đúng; không đặt đuốc lên lá/kính/không khí; lúa chỉ trên đất cày; không đặt đá chồng lên người, đuốc ở chân thì được; ray đặt nối thành góc cong; cát đặt lơ lửng thì rơi; thời gian đào tay không: đá 7.5 s, đất 0.75 s, gỗ 3 s, quặng 15 s, mạng nhện 20 s; dưới nước / trên không chậm 5 lần.
- Trình duyệt headless: đi bộ giữ chuột trái đào cỏ rồi đất bên dưới (HUD "Rơi ra: Đất ×1"); đào đá ~7.5 s, vết nứt hiện rõ, cánh tay vung; phá đá đỡ cột cát/sỏi/cát → cả cột rơi xuống, đuốc dưới đáy rơi ra.

### Cần người dùng kiểm tra (gộp 3a + 3b)

- Mục "Cần người dùng kiểm tra" của 3a (đi, nhảy, rào, bơi, thang, mạng nhện, ngồi mép, F bay).
- Ngồi (Shift): camera hạ thấp, chui qua khe cao 1.5; chạy nhanh + nhảy (Ctrl + W + Space) nhanh hơn chạy thường, vượt khe 4.
- Giữ chuột trái đào: vết nứt, thời gian (đất < 1 s, đá 7.5 s), khi bay phá ngay; đào/đặt ở ranh giới chunk cập nhật mesh và ánh sáng.
- Phá block dưới đuốc/ray/lúa/thang → chúng rơi theo (dây chuyền); phá nửa cửa → mất cả cửa; cát rơi khi phá block dưới, đuốc bị cát đè thì rơi ra.
- Không đặt được đuốc lên lá/kính/không khí, lúa lên block khác đất cày, block đặc chồng lên người.
- Rơi từ cao, ở dưới nước lâu, chạm dung nham: HUD "Máu" và "Dưỡng khí" giảm đúng (chưa chết).

### Ghi chú / vấn đề còn tồn tại

- "Rơi ra" chỉ hiện trên HUD, chưa có vật phẩm (Giai đoạn 4). Chưa có hotbar hình ảnh, chỉ tên block trên HUD.
- Cánh tay không tối đi trong hang (vẽ với độ sáng cố định).
- Texture vết nứt của REFI chỉ là vết nhỏ ở giữa ô nên mức 1–2 khó thấy trên nền tối.
- Đuốc trên sàn được cắm trên đầu cột rào (ngoại lệ ghi trong DESIGN 2.2) để đuốc hầm mỏ không rơi khi sửa block bên cạnh.
- Block sinh sẵn thiếu chỗ bám (nếu có) chỉ rơi khi ô bên cạnh thay đổi.
- Ba mục LỰA CHỌN của MECHANICS vẫn chờ người dùng chọn.

## Giai đoạn 4a — Vật phẩm, túi đồ, chế tạo, sinh tồn (2026-11-12)

Trạng thái: chờ người dùng test. Người dùng chọn: tách 4a/4b/4c, táo từ lá 5%, giáp theo công
thức có độ cứng, xô làm ở 4c. Mục LỰA CHỌN về rìu (Giai đoạn 6) vẫn chờ.

### File đã tạo / sửa

- `shared/src/survivalConstants.ts` (mới) — đói ba biến, thức ăn, độ cứng giáp, vật phẩm rơi, túi đồ.
- `shared/src/items.ts` (mới) — 83 vật phẩm: block đặt được, nguyên liệu, thức ăn, công cụ 5 loại x 5 cấp, giáp 4 cấp x 4 món, cung/tên (Giai đoạn 6 dùng).
- `shared/src/inventory.ts` (mới) — 36 ô + 4 ô giáp + con trỏ; bấm trái/phải, Shift chuyển nhanh, độ bền, vỡ.
- `shared/src/recipes.ts` (mới) — công thức mục 2.4 (thêm xô ở 4c), cần bàn chế tạo trong 4 block.
- `shared/src/drops.ts` (mới) — rơi đồ theo cấp công cụ, sỏi/đá lửa, lúa chín/chưa chín, hao mòn công cụ.
- `shared/src/survival.ts` (mới) — hao sức → độ no → đói, hồi máu, đói thì mất máu, ăn, táo vàng, giáp theo công thức, miễn sát thương, chết.
- `shared/src/itemEntity.ts` (mới) — vật phẩm trên đất: trọng lực, va chạm, hút về người chơi (đo tới thân người), gộp, hết hạn 5 phút.
- `shared/src/{physics,blockRules,fallingBlock,placement,gameplay,constants,index}.ts` — hao sức khi chạy/nhảy/bơi, không chạy nhanh khi đói ≤ 6, sát thương có nguồn (giáp không chặn rơi/chết đuối/dung nham), đồ rơi mang dữ liệu phụ, gieo hạt giai đoạn 0.
- `client/src/game/session.ts` (mới) — túi đồ, vật phẩm rơi, HUD, màn hình túi đồ (E), giáp, chết/hồi sinh, `__game.give()` (debug).
- `client/src/ui/{styles,itemIcons,survivalHud,inventoryScreen}.ts` (mới) — icon (block vẽ khối 3D), hotbar, thanh máu/đói/giáp/dưỡng khí, túi đồ + danh sách chế tạo, màn hình chết.
- `client/src/items/itemEntities.ts` (mới); `client/src/interact/{interaction,outline}.ts` — đào bằng công cụ đang cầm, rơi vật phẩm thật, hao mòn công cụ, đặt từ hotbar, giữ chuột phải để ăn, Q vứt; `player/playerController.ts` (hồi sinh, dời chỗ giữ trạng thái), `flyCamera.ts` (khóa chuột an toàn), `main.ts`, `strings.ts` (tên vật phẩm tiếng Việt).
- `scripts/texture-map.json`, `import-textures.ts` — icon cuốc đất, đồ/giáp vàng, giáp da, nguyên liệu, cửa, giường, thanh máu/đói/bong bóng/giáp, ô vật phẩm.

### Đã tự kiểm tra bằng lệnh

- `npm run typecheck`, `npm run build` thành công; không file nào quá 300 dòng.
- Kiểm tra 4a 18/18: 20.000 lần bấm ngẫu nhiên vào túi đồ không nhân đôi/mất/vượt giới hạn, giáp chỉ vào đúng ô; thân gỗ → ván → bàn → que → cuốc gỗ (cần bàn); mọi công thức và mọi đồ rơi từ block đều có trong bảng vật phẩm; đá bằng tay không rơi, cuốc gỗ ra đá cuội; sắt cần cuốc đá, kim cương cần cuốc sắt, cuốc vàng không đào được sắt; sỏi ra đá lửa ~10%, lá ra táo ~5%; chạy + nhảy 60 s làm tụt đói; ăn táo +4/+2.4; hồi máu tốn hao sức; đói 0 mất máu dừng ở 1; táo vàng hồi 4 máu; giáp kim cương đủ bộ giảm đòn 10 còn 3, không giảm sát thương rơi; hết máu thì chết. Vật lý 32/32, quy tắc chỗ bám 18/18 vẫn đạt.
- Trình duyệt headless: hotbar có icon/số lượng, thanh tim và đói; màn hình túi đồ + danh sách chế tạo (công thức tay sáng, cần bàn thì mờ); vật phẩm thả cạnh người được hút và nhặt vào túi; chết → màn hình chết, đồ văng ra; hồi sinh đủ máu/đói.

### Cần người dùng kiểm tra

- Chơi trọn: chặt cây bằng tay → ván → bàn chế tạo → que → cuốc gỗ → đào đá → đồ đá → đào được sắt thô (nung ở 4b); đào quặng bằng cuốc cấp thấp không rơi gì.
- Túi đồ (E): bấm trái/phải, Shift+bấm, mặc giáp; đóng túi khi đang cầm đồ thì đồ quay về túi; không nhân đôi/mất đồ.
- Vật phẩm rơi: hút về người, gộp chồng, Q vứt (Ctrl+Q cả chồng), biến mất sau 5 phút.
- Công cụ mất độ bền (thanh màu dưới icon) và vỡ.
- Chạy nhảy làm tụt đói; giữ chuột phải ăn táo; đói cao thì hồi máu; rơi từ cao / dung nham / chết đuối mất máu; chết → hồi sinh, đồ nằm tại chỗ chết.
- Thử nhanh bằng `?debug=1` rồi gõ trong console: `__game.give("iron_pickaxe")`, `__game.give("diamond_chestplate")`.

### Ghi chú / vấn đề còn tồn tại

- Lò nung, rương, cửa mở/đóng, trồng trọt là 4b; quặng vàng/sắt chỉ thành thỏi khi có lò (4b). Giường cần len, giáp da cần da, mũi tên cần lông (sinh vật ở Giai đoạn 7).
- Vật phẩm rơi trong hố sâu ≥ 2 block không tự hút lên (phải xuống nhặt), giống thể loại gốc.
- Ô giáp trống chưa có hình mờ gợi ý; cánh tay chưa đổi hình theo vật phẩm đang cầm.
- Chưa lưu được: tải lại trang là mất túi đồ (Giai đoạn 5).

### Bổ sung 4a: chế tạo bằng lưới (2026-11-12, người dùng chọn hướng 3)

- Túi đồ (E) có lưới 2x2; chuột phải vào bàn chế tạo mở lưới 3x3 (Shift + chuột phải vẫn đặt block). Bỏ luật "đứng trong 4 block quanh bàn".
- Công thức có hình xếp (lật ngang được, đặt lệch chỗ trong lưới được) hoặc không cần hình; ô kết quả: bấm lấy lên con trỏ, Shift làm liên tục vào túi; đóng giao diện thì nguyên liệu trong lưới trả về túi.
- Sổ công thức bên phải: sáng khi đủ nguyên liệu và vừa lưới đang mở; bấm xếp 1 bộ vào lưới, Shift xếp nhiều bộ.
- File: `shared/src/recipes.ts` (viết lại: hình xếp, so khớp lưới), `shared/src/crafting.ts` (mới), `shared/src/inventory.ts` (vùng "craft"), `client/src/ui/inventoryScreen.ts` (viết lại), `ui/styles.ts`, `game/session.ts`, `interact/interaction.ts`, `main.ts`, `strings.ts`; PLAN.md/DESIGN.md mục 2.4.
- Kiểm tra: 20/20 (thêm: thân gỗ → ván bằng Shift, sổ công thức xếp nhiều bộ, cuốc không làm được ở 2x2 nhưng làm được ở 3x3, rìu lật ngang khớp, hình đặt lệch vẫn khớp, 20.000 lần bấm ngẫu nhiên gồm cả lưới vẫn không mất/nhân đôi). Trình duyệt: chuột phải vào bàn mở lưới 3x3, sổ công thức xếp cuốc gỗ đúng hình, lấy ra trừ đúng 3 ván 2 que; E mở lưới 2x2.

### Bổ sung 4a: giao diện theo ảnh mẫu, thao tác chuột, vật phẩm trên tay (2026-11-12)

- Túi đồ: cột 4 ô giáp (hình mờ gợi ý), hình nhân vật 6 phần từ skin quay theo con trỏ, "Chế tạo" 2x2 → ô kết quả, nút sổ công thức; bàn chế tạo: nút sổ + "Chế tạo" 3x3 → ô kết quả, nhãn "Túi đồ"; 27 ô túi + hàng hotbar tách riêng; màu kiểu ô xám nổi khối. Sổ công thức mở/đóng bằng nút sách, hiện bên trái giao diện. Không làm ô tay trái (chưa có cơ chế cầm tay trái).
- Thao tác: kéo chuột trái chia đều, kéo chuột phải đặt 1 mỗi ô, bấm đúp gom cùng loại, trỏ + phím 1–9 đổi chỗ với hotbar, trỏ + Q vứt (Ctrl+Q cả chồng), bấm ra ngoài khung vứt chồng đang cầm (chuột phải: vứt 1).
- Tay phải: tay trống hiện cánh tay; cầm block hiện khối nhỏ xoay 45°; cầm vật phẩm khác hiện hình nổi khối dựng từ icon; vung khi đào/đặt/ăn.
- File: `shared/src/inventoryOps.ts` (mới), `inventory.ts` (`slots()` công khai); `client/src/player/{playerModel,heldItem}.ts` (mới), `player/arm.ts`; `client/src/ui/{recipeBook,playerPreview}.ts` (mới), `ui/inventoryScreen.ts` (viết lại), `ui/styles.ts`, `strings.ts`, `main.ts`; `scripts/texture-map.json` (nút sách, hình mờ ô giáp).
- Kiểm tra 24/24 (thêm: kéo trái chia đều, kéo phải đặt 1, bấm đúp gom, phím số đổi chỗ và ô giáp chỉ nhận đúng món, Q vứt 1, bấm phải ra ngoài vứt 1). Ảnh chụp: túi đồ và bàn chế tạo giống bố cục mẫu, sổ công thức mở bên trái; cầm cuốc / khối ván / đuốc hiện đúng ở tay phải.
- Ghi chú: hình nhân vật dùng thêm một ngữ cảnh WebGL nhỏ (chỉ vẽ khi túi đồ mở); vật phẩm trên tay chưa tối theo ánh sáng hang.
