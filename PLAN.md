# PLAN.md — Đặc tả và kế hoạch dự án Voxel PvP

Tài liệu này là đặc tả đầy đủ. Quy tắc làm việc nằm trong `AGENTS.md`.
Làm lần lượt từ Giai đoạn 0 đến Giai đoạn 7 (có thêm Giai đoạn 1b sau Giai đoạn 1),
mỗi lần một giai đoạn, dừng lại
sau mỗi giai đoạn để người dùng chơi thử.

---

## 1. Tổng quan

Game voxel sinh tồn PvP nhiều người chơi, góc nhìn thứ nhất, chạy trên trình
duyệt. Mỗi trận: người chơi được thả xuống một bản đồ khối vuông, khai thác tài
nguyên, chế tạo vũ khí và giáp, rồi chiến đấu trong vòng bo thu hẹp dần. Người
sống sót cuối cùng thắng.

Lối chơi lấy cảm hứng từ thể loại sandbox khối vuông, nhưng tên, texture, model
và âm thanh phải là nguyên bản hoặc có giấy phép mở.

### Công nghệ

- Client: TypeScript + Three.js + Vite
- Server: Node.js + WebSocket (thư viện `ws`), server-authoritative
- Code dùng chung đặt trong `/shared`
- Quản lý bằng npm workspaces

### Cấu trúc thư mục

```
/client          Vite + Three.js
  /public/textures   texture block (16x16)
  /public/icons      icon vật phẩm (16x16)
  /src
/server          Node.js + ws
  /src
/shared          kiểu dữ liệu, hằng số, bảng dữ liệu, vật lý dùng chung
  /src
/scripts         script tiện ích (import-textures, ...)
/assets-src      tài nguyên gốc tải về, KHÔNG commit
AGENTS.md  PLAN.md  DESIGN.md  PROGRESS.md  CREDITS.md
```

---

## 2. Thông số game

Giai đoạn 0 chép các bảng này sang `DESIGN.md` và `/shared`. Sau đó `DESIGN.md`
là nguồn sự thật.

### 2.1 Thế giới

- Block 1x1x1. Chunk 16x16x128, lưu bằng `Uint8Array` (1 byte = 1 id block).
  Client vẽ theo đoạn 16x16x16 (8 đoạn mỗi chunk).
- Bản đồ 256x256 block (16x16 chunk), cao 128.
- Địa hình: simplex noise theo seed, 3 octave, mặt đất cao từ 70 đến 90.
- Lớp: cỏ trên cùng, 3 lớp đất, còn lại là đá, y=0 là đá nền.
- Cát ở vùng thấp (dưới y=74).
- Cây: thân cao 4–6, tán lá 5x5, khoảng 1 cây mỗi 60 block mặt đất.
- Cỏ cao rải trên mặt cỏ.
- Quặng theo cụm: than (y<100, cụm 8), sắt (y<70, cụm 5), kim cương (y<24, cụm 3).
- Sỏi theo khối lớn (y<100, cụm 24).
- Cùng seed phải sinh ra cùng thế giới, trên cả client và server.

#### Hang động (Giai đoạn 1b)

- Hang "sợi mì": noise 3D, đục nơi hai trường noise cùng gần 0 → đường hầm
  ngoằn ngoèo nối nhau. Hang "phô mai": noise 3D tần số thấp → hốc rộng, chỉ
  dưới y=64. Noise lấy mẫu mỗi 4 block rồi nội suy.
- Không đục trong 7 block dưới mặt đất (hang thu hẹp dần, không có trần phẳng),
  không đục đá nền. Ô bị đục có y <= 11 thành dung nham (hồ dung nham ở đáy hang).
- Khoảng 1 cửa hang mỗi 60x60 block: đường hầm đào chéo từ mặt đất xuống tới khi
  gặp hang có sẵn; miệng loe rộng; không trồng cây trong vòng 3 block quanh cửa.

#### Hầm mỏ bỏ hoang (Giai đoạn 1b)

- 2–4 hệ thống mỗi bản đồ, tâm cách nhau ít nhất 80 block, độ sâu y=20–50.
- Mỗi hệ thống: phòng trung tâm (7–11 x 7–11, cao 4–6, sàn đất lẫn đá cuội rêu),
  hành lang 3x3 thẳng theo trục dài 8–25, ngã ba/ngã tư, cầu thang 5 bậc lên/xuống,
  tối đa 40 đoạn, bán kính tối đa 72 block.
- Khung chống mỗi 4–5 block: 2 cột hàng rào + xà ván gỗ. 20% khung có đuốc trên cột.
- Đường ray trên sàn, thiếu khoảng 30%. Mạng nhện 4% ở góc trần, 30% ở ngã rẽ.
- Hành lang cắt qua hang: bắc cầu ván gỗ. Nhánh cụt: 50% có rương (hạng hiếm),
  vị trí lưu trong danh sách rương của thế giới để Giai đoạn 6 điền đồ.

#### Ánh sáng (Giai đoạn 1b, chỉ client)

- 16 mức (0–15), hai kênh: trời (chiếu thẳng xuống theo cột rồi lan ngang) và
  block (đuốc 14, dung nham 15), lan bằng flood fill, mỗi ô giảm 1 (+ độ cản).
- Lá cản 1, nước 2, mạng nhện 1; block đặc chặn hẳn.
- Đỉnh mesh lấy trung bình ánh sáng các ô quanh đỉnh (ánh sáng mượt) nhân với AO.
- Khi đổi block: tính lại vùng ±15 block quanh đó, dựng lại các đoạn có ánh sáng đổi.
- Ẩn đoạn khuất: mỗi đoạn biết mặt nào thông nhau; duyệt từ đoạn chứa camera.

### 2.2 Block

| id | Tên | Độ cứng (giây, tay không) | Công cụ | Rơi ra | Ghi chú |
|---|---|---|---|---|---|
| 0 | không khí | – | – | – | |
| 1 | cỏ | 0.9 | xẻng | đất | mặt trên/bên/dưới khác nhau |
| 2 | đất | 0.75 | xẻng | đất | |
| 3 | đá | 7.5 | cuốc (bắt buộc) | đá cuội | |
| 4 | đá cuội | 10 | cuốc (bắt buộc) | đá cuội | |
| 5 | cát | 0.75 | xẻng | cát | |
| 6 | thân gỗ | 3 | rìu | thân gỗ | mặt đầu khác mặt bên |
| 7 | lá | 0.3 | – | 5% táo | trong suốt một phần |
| 8 | ván gỗ | 3 | rìu | ván gỗ | |
| 9 | quặng than | 15 | cuốc gỗ+ | than | |
| 10 | quặng sắt | 15 | cuốc đá+ | thỏi sắt | rơi thẳng thỏi, không cần lò |
| 11 | quặng kim cương | 15 | cuốc sắt+ | kim cương | |
| 12 | bàn chế tạo | 3.75 | rìu | bàn chế tạo | |
| 13 | rương | 3.75 | rìu | rương + đồ bên trong | |
| 14 | đá nền | không phá được | – | – | lớp y=0 |
| 15 | cỏ cao | 0 | – | 10% hạt | không va chạm, vẽ dạng chữ X |
| 16 | sỏi | 0.9 | xẻng | sỏi | |
| 17 | đá cuội rêu | 10 | cuốc (bắt buộc) | đá cuội rêu | |
| 18 | nước | không phá được | – | – | không va chạm, cản sáng 2 (chưa đặt trong thế giới) |
| 19 | dung nham | không phá được | – | – | không va chạm, phát sáng 15 |
| 20 | hàng rào gỗ | 3 | rìu | hàng rào gỗ | cột 4x4 điểm ảnh, va chạm theo cột |
| 21 | đường ray (dọc Z) | 0.7 | cuốc | đường ray | không va chạm, vẽ sát sàn |
| 22 | đường ray (dọc X) | 0.7 | cuốc | đường ray | như trên |
| 23 | mạng nhện | 4 | – | – | không va chạm, đi chậm còn 25%, vẽ chữ X |
| 24 | đuốc | 0 | – | đuốc | không va chạm, phát sáng 14 |

"Bắt buộc" nghĩa là đào bằng tay vẫn phá được nhưng không rơi gì.
Đào sai cấp công cụ với quặng: không rơi gì.

### 2.3 Công cụ, vũ khí, giáp

| Cấp | Độ bền | Hệ số tốc độ đào | Sát thương kiếm |
|---|---|---|---|
| gỗ | 60 | x2 | 4 |
| đá | 130 | x4 | 5 |
| sắt | 250 | x6 | 6 |
| kim cương | 1500 | x8 | 7 |

- Loại công cụ: cuốc (đá, quặng), rìu (gỗ, bàn chế tạo, rương), xẻng (đất, cỏ, cát), kiếm.
- Hệ số tốc độ chỉ áp dụng khi dùng đúng loại công cụ.
- Tay không: sát thương 1. Rìu: sát thương bằng kiếm cùng cấp trừ 1.
- Giáp 4 món (mũ, áo, quần, giày), cấp sắt và kim cương.
  Điểm giáp sắt: mũ 2, áo 6, quần 5, giày 2 (tổng 15).
  Điểm giáp kim cương: mũ 3, áo 8, quần 6, giày 3 (tổng 20).
  Mỗi điểm giáp giảm 4% sát thương. Độ bền giáp: sắt 200, kim cương 450.
- Cung: độ bền 384. Tên xếp chồng 16.
- Xếp chồng: block và nguyên liệu 64, công cụ/vũ khí/giáp 1.

### 2.4 Công thức chế tạo

Làm được mọi lúc:
- 1 thân gỗ → 4 ván gỗ
- 2 ván gỗ → 4 que
- 4 ván gỗ → 1 bàn chế tạo
- 3 hạt → 1 bánh mì

Cần đứng trong 4 block quanh bàn chế tạo (X = ván gỗ / đá cuội / thỏi sắt / kim cương theo cấp):
- cuốc: 3 X + 2 que
- rìu: 3 X + 2 que
- xẻng: 1 X + 2 que
- kiếm: 2 X + 1 que
- mũ: 5 X · áo: 8 X · quần: 7 X · giày: 4 X (chỉ sắt và kim cương)
- cung: 3 que + 3 ván gỗ
- 4 mũi tên: 1 que + 1 đá cuội + 1 ván gỗ
- rương: 8 ván gỗ

### 2.5 Người chơi

- Hộp va chạm AABB rộng 0.6, cao 1.8; mắt ở độ cao 1.62.
- Vật lý bước cố định 60 Hz.
- Đi bộ 4.3 block/giây · chạy nhanh 5.6 · ngồi 1.3 (không rơi khỏi mép).
- Nhảy cao 1.25 block · trọng lực 32 block/giây².
- Tầm với 4.5 block (đào, đặt, mở rương).
- 20 máu, 20 đói.
- Sát thương rơi: 1 máu cho mỗi block vượt quá 3.
- Đói giảm theo hoạt động (chạy nhanh, nhảy, đào, đánh).
  Đói ≥ 18: hồi 1 máu mỗi 4 giây. Đói = 0: mất 1 máu mỗi 4 giây.
  Đói ≤ 6: không chạy nhanh được.
- Ăn: giữ chuột phải 1.6 giây. Táo +4 đói, bánh mì +5 đói.

### 2.6 Chiến đấu

- Cận chiến: tầm 3 block, hồi đòn 0.6 giây. Đánh khi chưa hồi xong thì sát
  thương giảm theo tỷ lệ, tối thiểu 20%.
- Chí mạng khi đang rơi xuống: sát thương x1.5.
- Knockback: đẩy ngang 0.4 block/tick theo hướng đánh, hất lên 0.36; đánh khi
  đang chạy nhanh thì đẩy ngang gấp đôi.
- Sau khi trúng đòn: miễn sát thương 0.5 giây.
- Cung: kéo tối đa 1 giây; sát thương 2–9 theo lực kéo; tốc độ đầu tối đa
  60 block/giây; có trọng lực và lực cản. Đi chậm khi đang kéo.
- Sát thương thực = sát thương gốc × (1 − điểm giáp × 4%).
- Kiếm mất 1 độ bền mỗi đòn trúng; mỗi món giáp mất 1 độ bền mỗi lần chịu đòn.
- Chết: rơi toàn bộ đồ tại chỗ, chuyển sang chế độ xem.

### 2.7 Luật trận đấu

- Phòng 2–16 người, vào bằng mã 5 ký tự hoặc "Chơi nhanh".
- Pha: sảnh chờ → bắt đầu → ân hạn 60 giây (không PvP) → chiến đấu → kết thúc.
- Sảnh: đủ 2 người đếm ngược 30 giây; đủ 8 người rút xuống 10 giây.
- Thả người chơi ở điểm ngẫu nhiên trên mặt đất, cách nhau ít nhất 30 block,
  túi đồ trống.
- Vòng bo hình vuông, tâm ngẫu nhiên gần giữa bản đồ. Cứ 2 phút thu một lần,
  mỗi lần thu trong 30 giây: 256 → 180 → 120 → 70 → 30 → 10.
  Ngoài bo mất 1 máu/giây; hai vòng cuối mất 2 máu/giây.
- 40 rương rải ngẫu nhiên. Ba hạng đồ: thường (thức ăn, công cụ đá, tên),
  hiếm (kiếm sắt, 1 món giáp sắt, cung), cực hiếm (đồ kim cương).
  5 rương cực hiếm đặt gần tâm bản đồ.
- Mỗi lần thu bo: thả 1 thùng tiếp tế trong vùng bo mới, có cột sáng đánh dấu.
- Kết thúc: bảng kết quả 15 giây (hạng, số hạ gục, thời gian sống), rồi về
  sảnh với thế giới mới.

### 2.8 Điều khiển

| Phím | Chức năng |
|---|---|
| W A S D | di chuyển |
| Space | nhảy |
| Shift (giữ) | chạy nhanh |
| Ctrl (giữ) | ngồi |
| Chuột | nhìn (pointer lock) |
| Chuột trái | đào (giữ) / đánh |
| Chuột phải | đặt block / mở rương / ăn (giữ) / kéo cung (giữ) |
| 1–9, lăn chuột | chọn ô hotbar |
| E | túi đồ và chế tạo |
| Q | vứt vật phẩm |
| Tab (giữ) | bảng người chơi |
| T | chat |
| F3 | thông tin debug |
| Esc | menu / thoát pointer lock |

---

## 3. Tài nguyên hình ảnh

Nguồn: REFI_Textures của MysticTempest, giấy phép CC BY-SA 4.0
(https://github.com/MysticTempest/REFI_Textures).
Người dùng tải về và giải nén vào `/assets-src/REFI_Textures`.
Tất cả file là PNG 16x16 RGBA; cỏ và lá đã tô màu sẵn.

Đường dẫn dưới đây tính từ `/assets-src/REFI_Textures/textures/`.

### 3.1 Block → `/client/public/textures/`

| Đích | Nguồn |
|---|---|
| grass_top.png | default_mcl_core/soil/default_grass.png |
| grass_side.png | GHÉP: default_grass_side.png đè lên default_dirt.png |
| dirt.png | default_mcl_core/soil/default_dirt.png |
| stone.png | default_mcl_core/stone/default_stone.png |
| cobble.png | default_mcl_core/stone/default_cobble.png |
| bedrock.png | default_mcl_core/stone/mcl_core_bedrock.png |
| sand.png | default_mcl_core/sand/default_sand.png |
| log_side.png | default_mcl_core/trees/default_tree.png |
| log_top.png | default_mcl_core/trees/default_tree_top.png |
| leaves.png | default_mcl_core/trees/default_leaves.png |
| planks.png | default_mcl_core/trees/default_wood.png |
| ore_coal.png | default_mcl_core/minerals_ores/default_mineral_coal.png |
| ore_iron.png | default_mcl_core/minerals_ores/default_mineral_iron.png |
| ore_diamond.png | default_mcl_core/minerals_ores/default_mineral_diamond.png |
| workbench_top.png | default_mcl_core/crafting_workbench_top.png |
| workbench_side.png | default_mcl_core/crafting_workbench_side.png |
| workbench_front.png | default_mcl_core/crafting_workbench_front.png |
| chest_top.png | default_mcl_core/default_chest_top.png |
| chest_side.png | default_mcl_core/default_chest_side.png |
| chest_front.png | default_mcl_core/default_chest_front.png |
| tallgrass.png | default_mcl_core/plants/default_grass_3.png |
| crack_0.png … crack_4.png | CẮT: default_mcl_core/gui_hud/crack_anylength.png (16x80, 5 khung dọc) |
| gravel.png | default_mcl_core/stone/default_gravel.png |
| mossy_cobble.png | default_mcl_core/stone/default_mossycobble.png |
| water.png | default_mcl_core/default_water.png |
| lava.png | default_mcl_core/default_lava.png |
| fence.png | default_mcl_core/fences/default_fence_wood.png |
| rail.png | carts_mcl_minecarts/default_rail.png |
| cobweb.png | default_mcl_core/mcl_core_web.png |
| torch.png | default_mcl_core/default_torch_on_floor.png |

Lưu ý: texture quặng và `default_grass_side.png` có thể là lớp phủ trong suốt.
Script phải kiểm tra kênh alpha; nếu ảnh có điểm trong suốt thì ghép đè lên
nền tương ứng (quặng trên `default_stone.png`, cỏ bên trên `default_dirt.png`).
Riêng `leaves.png` và `tallgrass.png` giữ nguyên độ trong suốt.

### 3.2 Vật phẩm → `/client/public/icons/`

| Đích | Nguồn |
|---|---|
| {wood,stone,iron,diamond}_pickaxe.png | default_mcl_core/tools/default_tool_{wood,stone,steel,diamond}pick.png |
| {…}_axe.png | default_mcl_core/tools/default_tool_{…}axe.png |
| {…}_shovel.png | default_mcl_core/tools/default_tool_{…}shovel.png |
| {…}_sword.png | default_mcl_core/tools/default_tool_{…}sword.png |
| stick.png | default_mcl_core/default_stick.png |
| coal.png | default_mcl_core/minerals_ores/default_coal_lump.png |
| iron_ingot.png | default_mcl_core/minerals_ores/default_steel_ingot.png |
| diamond.png | default_mcl_core/minerals_ores/default_diamond.png |
| apple.png | default_mcl_core/plants/default_apple.png |
| bread.png | farming_mcl_farming/farming_bread.png |
| seeds.png | farming_mcl_farming/mcl_farming_wheat_seeds.png |
| {iron,diamond}_{helmet,chestplate,leggings,boots}.png | mcl_armor/mcl_armor_inv_{helmet,chestplate,leggings,boots}_{iron,diamond}.png |
| bow.png, bow_pull_0.png, bow_pull_1.png, bow_pull_2.png | mcl_bows/mcl_bows_bow.png, mcl_bows_bow_0.png, _1, _2 |
| arrow.png | mcl_bows/mcl_bows_arrow_inv.png |

Chú ý tên nguồn dùng "steel" cho cấp sắt.
Icon của vật phẩm dạng block (đất, đá, ván...) thì vẽ khối 3D nhỏ từ texture
block, không cần file riêng.

### 3.3 Giao diện và nhân vật

| Đích | Nguồn |
|---|---|
| /client/public/ui/hotbar.png | default_mcl_core/gui_hud/gui_hotbar.png |
| /client/public/ui/hotbar_selected.png | default_mcl_core/gui_hud/gui_hotbar_selected.png |
| /client/public/textures/player.png | HUD/character.png (64x32, bố cục skin cổ điển) |

Trái tim, thanh đói, tâm ngắm: tự vẽ bằng canvas/CSS theo nét pixel.

---

## 4. Các giai đoạn

### Giai đoạn 0 — Dựng khung

Việc cần làm:
1. Tạo cấu trúc thư mục ở mục 1 bằng npm workspaces, TypeScript strict.
2. Tạo các lệnh nêu trong `AGENTS.md` (`dev`, `typecheck`, `build`).
3. Client: một trang hiển thị cảnh Three.js trống với một khối lập phương xoay.
   Server: mở cổng WebSocket, ghi log khi có kết nối.
4. Tạo `DESIGN.md` chép toàn bộ mục 2 của file này.
5. Tạo `PROGRESS.md` liệt kê 8 giai đoạn (0–7) với trạng thái.
6. Tạo `CREDITS.md` với dòng ghi công REFI_Textures.
7. Tạo `.gitignore` gồm `node_modules/`, `dist/`, `assets-src/`.
8. `git init` nếu chưa có, rồi commit.

NGHIỆM THU
- `npm install` rồi `npm run dev` chạy không lỗi; mở trình duyệt thấy khối xoay.
- `npm run typecheck` và `npm run build` thành công.

---

### Giai đoạn 1 — Thế giới voxel (chỉ client)

DỮ LIỆU
- `/shared/blocks.ts`: bảng block theo mục 2.2, mỗi block có id, tên, độ cứng,
  công cụ, vật phẩm rơi, cờ trong suốt, cờ va chạm, texture mặt trên/bên/dưới.
- Lớp `Chunk` và `World` trong `/shared` (get/set block theo tọa độ thế giới).

SINH ĐỊA HÌNH
- Theo mục 2.1. Đặt trong `/shared` để server dùng lại ở Giai đoạn 4.
- Bộ sinh số ngẫu nhiên có seed, không dùng `Math.random`.

NHẬP TEXTURE
- Viết `scripts/import-textures.ts` và lệnh `npm run import-textures`:
  sao chép và đổi tên theo mục 3, bảng ánh xạ đặt trong
  `scripts/texture-map.json`; xử lý các mục GHÉP và CẮT; in danh sách file thiếu.
- Chạy script nếu `/assets-src/REFI_Textures` đã có. Nếu chưa có, bỏ qua và
  báo người dùng.

HÌNH ẢNH
- Khi tải game, gộp mọi file trong `/client/public/textures` thành một texture
  atlas (tile 16 px, có thể cấu hình). Thiếu file nào thì vẽ tạm bằng canvas.
- `NearestFilter`, tắt mipmap hoặc xử lý để không rỉ màu giữa các tile.
- Mesh theo chunk, chỉ tạo mặt tiếp giáp không khí hoặc block trong suốt.
  Khi block đổi, dựng lại chunk đó và chunk kề nếu block nằm ở biên.
- Lá dùng alpha test. Cỏ cao vẽ 2 mặt phẳng chéo hình chữ X.
- Ambient occlusion theo đỉnh; các mặt sáng tối khác nhau nhẹ.
- Bầu trời gradient, sương mù ở cuối tầm nhìn, ánh sáng mặt trời cố định.

ĐIỀU KHIỂN TẠM
- Camera bay tự do: WASD, Space lên, Shift xuống, chuột để nhìn.
- Góc màn hình: FPS, tọa độ, số chunk đang vẽ, seed. Seed lấy từ tham số URL
  `?seed=`.

NGHIỆM THU
- 60 FPS trên laptop thông thường khi vẽ toàn bộ 256 chunk.
- Không có khe hở giữa các chunk, không thiếu mặt, không rỉ màu texture.
- Cùng seed cho ra địa hình y hệt sau khi tải lại trang.
- Có cây, cát vùng thấp, quặng lộ ra ở vách đá hoặc khi bay xuống dưới đất.

---

### Giai đoạn 1b — Hang động, hầm mỏ, ánh sáng (chỉ client)

Thêm theo yêu cầu người dùng, làm trước Giai đoạn 2. Thông số ở mục 2.1 và 2.2.

VIỆC CẦN LÀM
- Tăng chiều cao thế giới lên 128, mặt đất y=70–90, độ sâu quặng theo tỷ lệ.
- Hang sợi mì + hang phô mai + cửa hang + hồ dung nham. Quặng lộ trên vách hang.
- Hầm mỏ bỏ hoang: phòng, hành lang, ngã rẽ, cầu thang, khung chống, đường ray,
  mạng nhện, đuốc, cầu ván qua hang, rương ở nhánh cụt.
- Block mới: sỏi, đá cuội rêu, nước, dung nham, hàng rào gỗ, đường ray (2 hướng),
  mạng nhện, đuốc. Texture lấy từ REFI_Textures (mục 3.1).
- Ánh sáng theo block 16 mức (trời + đuốc/dung nham), tính lại theo vùng khi đổi
  block (Giai đoạn 2 dùng).
- Mesh theo đoạn 16x16x16 và ẩn đoạn khuất để giữ FPS khi có hang.
- Debug: N nhìn đêm, F4 bật/tắt ẩn hang khuất, PageUp/PageDown mặt cắt.

NGHIỆM THU
- Bay xuống lòng đất thấy hang nối nhau liên tục, không có hang cụt vuông vức.
- Tìm được ít nhất 2 hầm mỏ có đường ray, khung gỗ, rương.
- Trong hang tối, đuốc chiếu sáng vùng xung quanh.
- FPS không giảm quá 10% so với trước.
- Cùng seed vẫn ra cùng thế giới.

---

### Giai đoạn 2 — Người chơi và tương tác block (chỉ client)

VẬT LÝ
- Theo mục 2.5. Hàm bước vật lý đặt trong `/shared` (đầu vào: trạng thái +
  input + world; đầu ra: trạng thái mới), thuần túy và xác định, để server
  dùng lại.
- Va chạm AABB xử lý từng trục riêng (X, Y, Z) để trượt dọc tường.
- Vật lý 60 Hz bước cố định; hiển thị nội suy giữa hai bước.
- Tính sát thương rơi (chỉ lưu số máu, chưa cần hiển thị).

TƯƠNG TÁC
- Pointer lock khi bấm vào màn hình.
- Raycast kiểu DDA trong tầm 4.5 block; vẽ khung viền quanh block đang nhắm.
- Giữ chuột trái để đào: thời gian = độ cứng; hiện vết nứt 5 mức (crack_0–4).
  Thả chuột hoặc đổi block thì tiến độ về 0.
- Chuột phải đặt block vào mặt đang nhắm; không cho đặt nếu chồng lên hộp va
  chạm của người chơi.
- Tạm thời: phím 1–9 chọn loại block để đặt, số lượng vô hạn.

HÌNH ẢNH
- Tâm ngắm. Cánh tay góc dưới phải, vung khi đào/đặt.
- Camera lắc nhẹ khi đi; FOV tăng nhẹ khi chạy nhanh.
- Giữ lại chế độ bay bằng phím F để debug.

NGHIỆM THU
- Không xuyên tường, không kẹt ở góc, không rung khi đứng sát tường.
- Nhảy lên được block cao 1, không lên được block cao 2.
- Ngồi thì không rơi khỏi mép block.
- Đào và đặt ở biên chunk cập nhật đúng cả hai chunk.
- Không đặt được block vào chỗ mình đang đứng.

---

### Giai đoạn 3 — Vật phẩm, chế tạo, sinh tồn (chỉ client)

VẬT PHẨM
- `/shared/items.ts` theo mục 2.3; `/shared/recipes.ts` theo mục 2.4.
- Icon đọc từ `/client/public/icons`; vật phẩm dạng block thì vẽ khối 3D nhỏ.
  Thiếu icon thì vẽ tạm.

TÚI ĐỒ
- 9 ô hotbar + 27 ô túi + 4 ô giáp. Logic túi đồ đặt trong `/shared`.
- Thao tác: bấm trái nhấc/đặt cả chồng; bấm phải nhấc nửa/đặt 1;
  Shift+bấm chuyển nhanh giữa hotbar và túi (giáp thì vào ô giáp).
- Đào xong: vật phẩm rơi ra thành khối nhỏ xoay tròn, có trọng lực, bị hút về
  người chơi trong bán kính 1.5 block, biến mất sau 5 phút.
- Đặt block trừ 1 trong chồng. Phím Q vứt 1 vật phẩm.
- Công cụ: áp dụng hệ số tốc độ, yêu cầu cấp công cụ, độ bền (thanh dưới
  icon), vỡ khi hết độ bền.
- Hiện vật phẩm đang cầm thay cho cánh tay trống.

CHẾ TẠO
- Danh sách công thức bên phải túi đồ: đủ nguyên liệu thì sáng, thiếu thì mờ;
  di chuột xem nguyên liệu; bấm để chế; Shift+bấm chế tối đa.
- Công thức cần bàn chế tạo chỉ hiện sáng khi đứng trong 4 block quanh bàn.

SINH TỒN
- Thanh máu và đói phía trên hotbar. Luật theo mục 2.5.
- Giữ chuột phải để ăn, có hoạt ảnh và âm thanh tạm.
- Chết: màn hình đỏ, đồ rơi tại chỗ, nút hồi sinh ở điểm xuất phát
  (tạm thời, Giai đoạn 5 sẽ đổi thành chế độ xem).

NGHIỆM THU
- Chơi được trọn vòng lặp: chặt cây → ván → bàn chế tạo → cuốc gỗ → đá cuội →
  cuốc đá → quặng sắt → kiếm sắt và đủ bộ giáp sắt.
- Đào quặng sắt bằng cuốc gỗ không rơi gì.
- Không nhân đôi hay mất vật phẩm khi thao tác trong túi (kể cả Shift+bấm
  khi túi đầy).
- Đói về 0 thì mất máu; ăn thì hồi.

---

### Giai đoạn 4 — Mạng nhiều người chơi

Giai đoạn khó nhất. Không thêm tính năng gameplay mới.

SERVER
- Vòng lặp 20 tick/giây. Sinh thế giới từ seed bằng code trong `/shared`.
- Giữ trạng thái thật: block, người chơi (vị trí, vận tốc, máu, đói, túi đồ),
  vật phẩm rơi.
- Tạm thời một phòng duy nhất; vào là chơi luôn (Giai đoạn 6 mới làm phòng).

GIAO THỨC
- Mọi gói tin định nghĩa trong `/shared/protocol.ts`, có kiểu.
- Nhị phân cho gói thường xuyên (input, snapshot); JSON cho gói hiếm.
- Vào game: server gửi seed + danh sách block đã đổi so với thế giới gốc;
  client tự sinh địa hình rồi áp thay đổi. Không gửi cả chunk.

DI CHUYỂN
- Client gửi input (phím, hướng nhìn, số thứ tự) mỗi bước vật lý.
- Client dự đoán ngay, lưu input chưa xác nhận. Khi server trả trạng thái +
  số thứ tự input cuối đã xử lý: đặt lại trạng thái đó rồi chạy lại các input
  chưa xác nhận.
- Sai lệch nhỏ thì làm mượt; trên 2 block thì nhảy thẳng.
- Người chơi khác hiển thị trễ 100 ms, nội suy giữa hai snapshot.
- Server chạy cùng hàm vật lý trong `/shared` với input nhận được; không tin
  vị trí do client gửi. Giới hạn số input xử lý mỗi tick để chống tăng tốc.

HÀNH ĐỘNG
- Đào, đặt, nhặt đồ, chế tạo, thao tác túi, ăn, vứt đồ: client gửi yêu cầu;
  server kiểm tra (tầm với, thời gian đào tối thiểu theo công cụ, đủ vật phẩm)
  rồi áp dụng và phát cho mọi người.
- Client hiển thị trước kết quả đào/đặt, hoàn tác nếu server từ chối.
- Túi đồ: server là nguồn sự thật, gửi lại khi có thay đổi.

NGƯỜI CHƠI KHÁC
- Model khối 6 phần (đầu, thân, 2 tay, 2 chân) dùng `player.png`; tay chân
  đung đưa khi đi; đầu quay theo hướng nhìn; hiện vật phẩm đang cầm; tên trên
  đầu.

DEBUG
- F3: ping, gói tin/giây, số lần hiệu chỉnh vị trí.
- Biến môi trường server `FAKE_LAG_MS` và `FAKE_LOSS_PCT` để giả lập mạng xấu.

NGHIỆM THU
- 3 tab trình duyệt thấy nhau di chuyển mượt; đào/đặt đồng bộ.
- Với `FAKE_LAG_MS=150`: nhân vật của mình vẫn mượt, không giật lùi khi đi
  bình thường.
- Tab vào sau thấy đúng các block đã bị đổi trước đó và vật phẩm đang rơi.
- Sửa client để gian lận (tăng tốc, đào tức thì, tự thêm đồ) thì server chặn.
- Tắt một tab: nhân vật đó biến mất ở các tab còn lại.

---

### Giai đoạn 5 — Chiến đấu PvP

Mọi tính toán sát thương ở server. Thông số theo mục 2.6.

CẬN CHIẾN
- Chuột trái khi nhắm vào người chơi trong tầm thì gửi yêu cầu đánh.
- Thanh hồi đòn nhỏ dưới tâm ngắm.
- Server kiểm tra: khoảng cách ≤ 3.5 block (có dung sai), hồi đòn hợp lệ,
  không có block chắn giữa hai người, nạn nhân không trong thời gian miễn.
- Bù trễ: server lưu lịch sử vị trí người chơi 1 giây; khi nhận đòn đánh, tua
  vị trí nạn nhân về thời điểm người đánh nhìn thấy, tối đa 250 ms.
- Knockback do server áp dụng; client của nạn nhân nhận qua cơ chế hiệu chỉnh.

CUNG TÊN
- Giữ chuột phải để kéo, thả để bắn; icon cung đổi theo 3 mức kéo.
- Mũi tên là thực thể do server mô phỏng; kiểm tra va chạm theo đoạn thẳng
  giữa hai tick. Cắm vào block thì nhặt lại được; trúng người thì biến mất.
- Client vẽ mũi tên nội suy theo snapshot.

GIÁP VÀ CHẾT
- Model người chơi hiện giáp đang mặc (tô màu đè lên từng phần cơ thể là đủ).
- Chết: rơi toàn bộ đồ, thông báo "A hạ gục B bằng [vũ khí]" cho cả phòng,
  chuyển sang chế độ xem (bay tự do; bấm chuột để theo dõi người còn sống).

PHẢN HỒI
- Nạn nhân nháy đỏ; người bị đánh thấy màn hình rung nhẹ và viền đỏ chỉ hướng.
- Hoạt ảnh vung vũ khí ở góc nhìn thứ nhất và trên model người khác.
- Âm thanh 3D theo vị trí: trúng đòn, chí mạng, bắn cung, tên cắm, chết.
  Tạo bằng Web Audio nếu chưa có file.
- Hạt hiệu ứng khi chí mạng.

NGHIỆM THU
- Hai tab đánh nhau: máu trừ đúng theo bảng sát thương và giáp.
- Với `FAKE_LAG_MS=150`: đánh trúng người đang chạy ngang vẫn tính.
- Không đánh xuyên tường; không đánh nhanh hơn thời gian hồi.
- Tên bay có độ cong, trúng người gây sát thương theo lực kéo.
- Người chết thấy được trận đấu ở chế độ xem; đồ rơi nhặt được.

---

### Giai đoạn 6 — Luật trận đấu

Thông số theo mục 2.7.

PHÒNG
- Menu chính: nhập tên (lưu localStorage, bọc try/catch), "Tạo phòng",
  ô nhập mã, "Chơi nhanh".
- Một tiến trình server chạy nhiều phòng, mỗi phòng một thế giới và seed riêng.
- Phòng trống quá 60 giây thì xóa.

CÁC PHA
1. Sảnh: đảo nhỏ trên trời, không sát thương, không phá block, danh sách
   người chơi, đếm ngược.
2. Bắt đầu: thả người chơi, túi đồ trống.
3. Ân hạn 60 giây: không PvP, có thông báo đếm ngược.
4. Chiến đấu: PvP bật, vòng bo bắt đầu thu.
5. Kết thúc: bảng kết quả 15 giây, về sảnh với thế giới mới.
- Vào giữa trận: ở chế độ xem. Thoát giữa trận: tính là chết, đồ rơi tại chỗ.
- Nếu mọi người còn lại thoát hết thì kết thúc trận.

VÒNG BO
- Server tính; client vẽ tường bán trong suốt màu đỏ.
- Bản đồ nhỏ góc trên phải: vị trí mình, bo hiện tại, bo kế tiếp.
- Đồng hồ đếm đến lần thu tiếp theo; âm thanh cảnh báo khi bo sắp thu.

RƯƠNG VÀ TIẾP TẾ
- Rương sinh cùng thế giới. Chuột phải mở, giao diện 27 ô; nhiều người mở
  cùng lúc thấy đồng bộ. Phá rương thì đồ bên trong rơi ra.
- Thùng tiếp tế rơi chậm từ trên trời, có cột sáng thấy từ xa.

GIAO DIỆN
- Số người còn sống, số hạ gục của mình, dòng thông báo hạ gục.
- Tab: bảng người chơi. T: chat (giới hạn độ dài, lọc ký tự điều khiển).

NGHIỆM THU
- Chạy trọn một trận với 3 tab từ sảnh đến màn hình thắng rồi quay về sảnh,
  không cần tải lại trang; chạy được trận thứ hai ngay sau đó.
- Trong ân hạn không gây được sát thương cho nhau.
- Đứng ngoài bo mất máu đúng tốc độ; bản đồ nhỏ khớp với tường bo.
- Tắt một tab giữa trận: trận tiếp tục, số người còn sống giảm.
- Hai phòng chạy song song không ảnh hưởng nhau.

---

### Giai đoạn 7 — Hoàn thiện và phát hành

CẢM GIÁC GAME
- Hạt vụn theo màu block khi đào và phá xong; bụi khi tiếp đất.
- Âm thanh bước chân theo loại block, đào, đặt, nhặt, ăn, mở rương.
- Chu kỳ ngày đêm 10 phút (đổi màu trời và ánh sáng). Mây trôi.
- Nước ở vùng thấp: bơi được, đi chậm lại, không sát thương rơi.

CÀI ĐẶT
- Menu Esc: độ nhạy chuột, FOV, tầm nhìn, âm lượng, đổi phím.
  Lưu localStorage, bọc try/catch.

TỐI ƯU
- Dựng mesh chunk trong Web Worker.
- Greedy meshing.
- Chỉ vẽ chunk trong tầm nhìn và trong khối nhìn của camera.
- Server chỉ gửi người chơi và thực thể trong bán kính 80 block.
- Mục tiêu: 60 FPS ở client; mỗi tick server dưới 10 ms với 16 người;
  băng thông dưới 20 KB/giây mỗi người.

ĐỘ BỀN
- Mất kết nối thì tự kết nối lại trong 10 giây và giữ nguyên nhân vật.
- Giới hạn tần suất gói tin mỗi client; bỏ qua gói sai định dạng; giới hạn độ
  dài tên và chat.
- Lỗi trong một phòng không làm sập các phòng khác; ghi log lỗi.

PHÁT HÀNH
- Build client thành file tĩnh. Viết Dockerfile cho server.
- Viết `DEPLOY.md` từng bước: client lên dịch vụ host tĩnh; server lên dịch vụ
  chạy Node có hỗ trợ WebSocket; địa chỉ server qua biến môi trường
  `VITE_SERVER_URL`; dùng `wss://` khi client chạy https.
- Hoàn thiện `CREDITS.md`: nguồn và giấy phép của mọi texture, icon, âm thanh.
- Viết `README.md`: giới thiệu, cách chạy, điều khiển.

NGHIỆM THU
- Chơi được qua link công khai từ 2 máy khác mạng.
- 8 tab chạy 10 phút không rò bộ nhớ, không tụt FPS dần.
- Rút mạng 5 giây rồi cắm lại: tự kết nối lại, vẫn ở trong trận.
- `CREDITS.md` có dòng ghi công REFI_Textures kèm giấy phép CC BY-SA 4.0.
