# PLAN.md — Đặc tả và kế hoạch dự án Voxel Survival

Tài liệu này là đặc tả đầy đủ. Quy tắc làm việc nằm trong `AGENTS.md`.
Làm lần lượt từng giai đoạn, mỗi lần một giai đoạn, dừng lại sau mỗi giai đoạn
để người dùng chơi thử.

> GHI CHÚ CHUYỂN HƯỚNG: phiên bản trước của file này mô tả game PvP theo trận
> (bản đồ 256x256 cố định, vòng bo). Dự án đã chuyển sang SINH TỒN THẾ GIỚI MỞ.
> Giai đoạn 0 và 1 đã làm xong theo bản cũ và được giữ lại; Giai đoạn 2a sẽ
> chuyển thế giới cố định thành thế giới vô hạn. Mọi thứ về trận đấu, vòng bo,
> sảnh chờ, phòng chơi, thùng tiếp tế đã bị BỎ.
>
> GHI CHÚ 2026-11-12: thêm quặng vàng (có bản đá sâu) và quặng ngọc lục bảo,
> cấp đồ vàng, giáp vàng, táo vàng; than/sắt dày gấp đôi; hầm mỏ dày hơn
> (vùng 160x160, tối đa 70 đoạn, thử lại vị trí tâm). Phần sinh thế giới làm
> trong 2b; vật phẩm, chế tạo, nung, ăn làm ở Giai đoạn 4 như các món khác.
>
> GHI CHÚ 2026-11-13: thêm Giai đoạn 4d (cây thông / bạch dương / keo, hoa, xương rồng) và
> 4e (bậc / tấm / tường, thuốc nhuộm 16 màu, đồ sắt, cửa sắt + nút / cần gạt, lửa không lan),
> làm sau khi 5a test xong và trước 5b. Thông số ở mục 2.13.
>
> GHI CHÚ 2026-11-14: rà danh sách sinh vật theo client.jar (bản 26.3) — mục 2.7 nay liệt kê đủ
> mọi sinh vật có skin: quái thù địch, động vật, dưới nước, làng, Vực Lửa, Cõi Hư Không, và danh
> sách chờ (sinh vật cần biome / công trình chưa có). Giai đoạn 7 chia 7a–7d, Giai đoạn 8 chia
> 8a–8b. Chỉ số chi tiết ở MECHANICS.md mục 8 (viết lại), 15 (hiệu ứng), 16 (vụ nổ).
>
> GHI CHÚ 2026-11-14 (sau 7b): thêm 7b2 — biome đầm lầy (biome thứ 7; ban đầu chỉ ở xa gốc ≥ 1600 block, đã bỏ khi
> làm lại thế giới); nhà phù thủy (phù thủy chỉ sinh ở đây) chuyển vào đầm lầy, có rương.
> Thông số ở DESIGN.md mục "Đầm lầy, nhà phù thủy (7b2)".
>
> GHI CHÚ 2026-11-16 (người dùng chọn): Giai đoạn 10 coi như xong sau 10d2, BỎ 10e (Quỷ héo, Ma bay hiền).
> Giai đoạn 9 chia 9a–9e (xem dưới); KHÔNG làm âm thanh / nhạc; CÓ làm bản đồ nhỏ. Thêm 9a (menu chính + danh sách server, menu
> Esc, ẩn bảng thông số, lệnh /admin cho mọi người); trước mắt chạy server trên máy nhà + Cloudflare tunnel.

---

## 1. Tổng quan

Game voxel sinh tồn thế giới mở nhiều người chơi, góc nhìn thứ nhất, chạy trên
trình duyệt. Người chơi cùng sống trong một thế giới vô hạn được lưu lại lâu
dài: khai thác, chế tạo, xây nhà, trồng trọt, khám phá hang động và hầm mỏ bỏ
hoang, chống lại quái vật ban đêm, giao dịch với dân làng, và có thể đánh nhau
(PvP bật/tắt được).

Lối chơi lấy cảm hứng từ thể loại sandbox khối vuông, nhưng tên, texture, model
và âm thanh phải là nguyên bản hoặc có giấy phép mở.

### Công nghệ

- Client: TypeScript + Three.js + Vite
- Server: Node.js + WebSocket (thư viện `ws`), server-authoritative
- Code dùng chung đặt trong `/shared`
- Lưu thế giới: file trên đĩa của server (thư mục `/server/data`)
- Quản lý bằng npm workspaces

### Cấu trúc thư mục

```
/client          Vite + Three.js
  /public/textures   texture block (16x16)
  /public/icons      icon vật phẩm (16x16)
  /public/entities   skin sinh vật
  /src
/server          Node.js + ws
  /src
  /data          thế giới đã lưu, KHÔNG commit
/shared          kiểu dữ liệu, hằng số, bảng dữ liệu, sinh địa hình, vật lý
  /src
/scripts         script tiện ích (import-textures, ...)
/assets-src      tài nguyên gốc tải về, KHÔNG commit
AGENTS.md  PLAN.md  DESIGN.md  PROGRESS.md  CREDITS.md
```

### Danh sách giai đoạn

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 0 | Dựng khung | đã xong |
| 1 | Thế giới voxel cơ bản (bản cố định) | đã xong |
| 2a | Thế giới vô hạn và biome | đã xong |
| 2b | Hang động, hầm mỏ, ánh sáng, block mới | đã xong |
| 3a | Dữ liệu phụ của block, vật lý người chơi, hình dạng block | đã xong |
| 3b | Đào, đặt, chỗ bám, cát rơi | đã xong |
| 4a | Vật phẩm, túi đồ, chế tạo, sinh tồn | đã xong |
| 4b | Rương, lò nung, cửa, trồng trọt | đã xong |
| 4c | Chất lỏng, xô | đã xong |
| 5a | Server làm chủ thế giới, chơi chung qua link | đã xong |
| 4d | Loài cây mới, hoa, xương rồng (sau 5a, trước 5b) | đã xong |
| 4e | Bậc, tấm, tường, gỗ theo loài (trước 5b) | đã xong |
| 4f | 16 màu, đồ sắt (trước 5b) | đã xong |
| 5b | Lưu thế giới, đăng nhập | đã xong |
| 5c | Server tính di chuyển, chống gian lận, mạng trễ | đã xong |
| 6a | Cận chiến, khiên, quét kiếm, tay trái, chat, vùng an toàn, lệnh quản trị | đã xong |
| 6b | Cung tên, hạt chí mạng (không âm thanh) | đã xong |
| 7a | Ngày đêm, hệ thống thực thể, giường, 7 sinh vật cơ bản | |
| 7b | Quái thêm (quái nổ, kẻ hư không, khối nhầy, biến thể xác sống / bộ xương, nhện hang, bóng ma đêm, phù thủy, mọt đá), hiệu ứng, vụ nổ | đã xong |
| 7b2 | Biome đầm lầy, nhà phù thủy có rương (người dùng chọn 2026-11-14) | |
| 7c | Động vật thêm (thỏ, sói, cáo, dê, gấu trắng, lạc đà không bướu, tatu, dơi), sinh vật dưới nước | |
| 7d | Cưỡi thú: ngựa, lừa, la, yên, dây dắt | |
| 7e | Công cụ nhập mẫu công trình (.nbt) từ client.jar; lều tuyết, cổng đổ nát, kim tự tháp sa mạc, trại bỏ hoang (người dùng chọn 2026-11-14; làm trước 7d — người dùng chọn 2026-11-15) | |
| 7f | Công trình dưới nước: tàu đắm, tàn tích đại dương (người dùng chọn 2026-11-15: bỏ kho báu chôn, mỗi loại 1–2 cái cả thế giới) | |
| 8a | Làng, dân làng, người sắt, mèo, dân làng xác sống, thương nhân lang thang | |
| 8b | Kẻ cướp, tiền đồn, cuộc cướp làng | |
| 8c–8h | (Tùy chọn, hỏi người dùng sau 8b) Công trình lớn: dinh thự rừng, đền rừng rậm, đền đại dương, khảo cổ + tàn tích đường mòn, phòng thử thách, thành phố cổ | |
| 9a | Menu chính (danh sách server), menu Esc (thoát), ẩn bảng thông số, lệnh /admin | |
| 9b | Độ bền: tự kết nối lại, giới hạn gói tin, sao lưu, log lỗi | |
| 9c | Tối ưu: greedy meshing, tick server, lưu file vùng, băng thông | |
| 9d | Cảm giác game + cài đặt: hạt, mây, tọa độ, bản đồ nhỏ, cài đặt trong menu Esc, đổi phím (không âm thanh) | |
| 9e | Phát hành: Dockerfile, DEPLOY.md, README, CREDITS, chạy thử công khai | |
| 10 | (Tùy chọn) Vực Lửa — thế giới thứ hai (10a–10d2; bỏ 10e — người dùng chọn 2026-11-16) | đã xong |
| 11 | (Tùy chọn) Cõi Hư Không — thế giới cuối và trùm | |

Giai đoạn 10 và 11 chỉ làm khi người dùng yêu cầu. Các giai đoạn công trình lớn 8c–8h cũng chỉ làm khi người dùng yêu cầu (thứ tự đã chọn 2026-11-14, xem dưới Giai đoạn 8b).

---

## 2. Thông số game

`DESIGN.md` là bản sao của mục này và là nguồn sự thật. Khi file này đổi,
cập nhật `DESIGN.md` theo, giữ lại các chỉnh sửa người dùng đã làm.

### 2.1 Thế giới

- Vô hạn theo chiều ngang (giới hạn mềm ±100.000 block để tránh sai số số thực),
  cao 128 (y = 0 đến 127).
- Chunk 16x16, cao 128, lưu bằng `Uint8Array` (hoặc `Uint16Array` nếu cần hơn
  256 loại block). Chunk được nhận diện bằng tọa độ (cx, cz).
- Mực nước biển y = 62. Mặt đất từ khoảng y = 55 (đáy biển) đến y = 110 (núi).
- y = 0 là đá nền, không phá được.
- Cùng seed phải sinh ra cùng thế giới, trên cả client và server.

Biome (chọn theo hai trường noise nhiệt độ và độ ẩm, chuyển tiếp mượt):

| Biome | Mặt đất | Cây và trang trí |
|---|---|---|
| Đồng cỏ | cỏ, đất | cây thưa (sồi, ít bạch dương; phần nóng khô có keo — 4d), cỏ cao dày, hoa theo đám (4d) |
| Rừng | cỏ, đất | cây dày (sồi + khoảng 30% bạch dương — 4d), cỏ cao, hoa theo đám (4d) |
| Sa mạc | cát, sa thạch bên dưới | xương rồng (4d), không cây |
| Đồng tuyết | tuyết phủ trên cỏ | cây thông thưa (4d) |
| Núi | đá lộ ra trên cao, tuyết trên đỉnh | cây thông thưa ở chân núi (4d) |
| Đại dương | nước, đáy cát và sỏi | không |

Nước tự nhiên trên mặt đất (sinh theo seed + tọa độ, liền mạch qua chunk):
- Sông: trường noise riêng, nơi giá trị gần 0 thì khoét lòng sông rộng 5–12
  block, sâu 3–5 block, mặt nước y = 62, uốn lượn và đổ ra biển; bờ thoải, đáy
  cát và sỏi; không cắt qua núi cao hơn y = 85.
- Hồ: đường kính 8–20 block ở vùng đất bằng, khoảng 1 hồ mỗi vùng 128x128;
  mặt nước bằng điểm thấp nhất của bờ, có thể cao hơn mực biển.
- Mạch nước trên núi: thỉnh thoảng một nguồn nước gắn trên vách núi (chỉ biome
  núi, vách cao ≥ 4 block, có đá phía trên), để chảy thành thác khi có nước chảy
  (Giai đoạn 4). Không đặt trên đồi cỏ thường.
- Núi phủ tuyết đều mọi mặt trên (cả đá và cỏ) từ đường tuyết y ≈ 90 trở lên;
  đá chỉ lộ ở mặt vách dựng đứng.
- Hiển thị nước: mặt nước bán trong suốt, có gợn sóng nhẹ và texture trôi chậm;
  đáy và vách dưới nước tối dần, ám xanh theo độ sâu (không nhìn rõ đáy hồ sâu).
  Dòng chảy có hướng làm ở Giai đoạn 4.
- Nước sinh sẵn (biển, sông, hồ, hồ ngầm) phải "tĩnh": không ô nước nào có
  không khí bên cạnh hoặc bên dưới. Chỉ các mạch nước/dung nham là ô "hở".

Dưới lòng đất:
- Lớp: mặt biome → 3 lớp đất (hoặc cát/sa thạch) → đá → đá sâu (y < 8) → đá nền.
  Quặng chỉ thay ô đá thường (riêng quặng vàng có thêm bản trong đá sâu), nên
  kim cương nằm ở y = 8–15.
- Quặng theo cụm, kèm số lần thử mỗi chunk: than (y < 100, cụm 13, 20 lần),
  sắt (y < 64, cụm 9, 15 lần), vàng (y < 32, cụm 4–8, 2 lần),
  kim cương (y < 16, cụm 3, 3 lần). Mục tiêu: đi trong hang, mỗi chunk thấy
  khoảng 4–5 khối than và 4 khối sắt lộ trên vách.
- Quặng ngọc lục bảo: chỉ trong biome núi, y < 100, từng khối lẻ (không theo
  cụm), 3–8 lần thử mỗi chunk núi.
- Hang dạng "sợi mì": noise 3D, đục rỗng nơi hai trường noise cùng gần 0.
- Hang lớn dạng "phô mai": noise 3D tần số thấp, hiếm hơn.
- Hang không đục đá nền; có cửa hang lộ ra mặt đất.
- Dưới y = 12: đáy hang là hồ dung nham.
- Hồ ngầm: trong hang lớn, phần đáy hang dưới một mực nước ngẫu nhiên của
  từng vùng (tính bằng noise, trong khoảng y = 20–50) được lấp đầy nước. Dưới
  y = 12 vẫn là dung nham, không trộn lẫn.
- Mạch nước trong hang: khoảng 1 nguồn mỗi chunk có hang (ngẫu nhiên), đặt trên
  trần hoặc vách hang để chảy thành dòng/thác nhỏ. Mạch dung nham tương tự nhưng
  hiếm hơn, chỉ dưới y = 30.
- Hang không đục vào ngay dưới đáy biển, sông, hồ (tránh nước tràn ngập hang).
- Hầm mỏ bỏ hoang: xem 2.9.

### 2.2 Block

Các block id 0–15 đã có từ Giai đoạn 1 được giữ nguyên id. Block mới thêm từ 16.

| id | Tên | Độ cứng (giây, tay không) | Công cụ | Rơi ra | Ghi chú |
|---|---|---|---|---|---|
| 0 | không khí | – | – | – | |
| 1 | cỏ | 0.9 | xẻng | đất | |
| 2 | đất | 0.75 | xẻng | đất | |
| 3 | đá | 7.5 | cuốc (bắt buộc) | đá cuội | |
| 4 | đá cuội | 10 | cuốc (bắt buộc) | đá cuội | |
| 5 | cát | 0.75 | xẻng | cát | rơi xuống khi bên dưới trống |
| 6 | thân gỗ | 3 | rìu | thân gỗ | |
| 7 | lá | 0.3 | – | 5% táo, 5% cây non | |
| 8 | ván gỗ | 3 | rìu | ván gỗ | |
| 9 | quặng than | 15 | cuốc gỗ+ | than | |
| 10 | quặng sắt | 15 | cuốc đá+ | sắt thô | ĐỔI: không rơi thẳng thỏi nữa, phải nung |
| 11 | quặng kim cương | 15 | cuốc sắt+ | kim cương | |
| 12 | bàn chế tạo | 3.75 | rìu | bàn chế tạo | |
| 13 | rương | 3.75 | rìu | rương + đồ bên trong | |
| 14 | đá nền | không phá được | – | – | |
| 15 | cỏ cao | 0 | – | 10% hạt | không va chạm |
| 16 | sỏi | 0.9 | xẻng | sỏi (10% đá lửa) | rơi xuống khi bên dưới trống |
| 17 | nước | – | – | – | chất lỏng, xem 2.10 |
| 18 | dung nham | – | – | – | chất lỏng, phát sáng 15, gây cháy |
| 19 | đá cuội rêu | 10 | cuốc (bắt buộc) | đá cuội rêu | |
| 20 | sa thạch | 4 | cuốc (bắt buộc) | sa thạch | |
| 21 | tuyết phủ | 0.5 | xẻng | không | lớp mỏng trên cỏ ở biome tuyết |
| 22 | hàng rào gỗ | 3 | rìu | hàng rào | hộp va chạm cao 1.5 |
| 23 | đường ray | 1 | cuốc | đường ray | không va chạm, nằm sát sàn |
| 24 | mạng nhện | 6 | kiếm | sợi tơ | đi qua bị chậm 75% |
| 25 | đuốc | 0 | – | đuốc | phát sáng 14, không va chạm |
| 26 | lò nung | 5 | cuốc (bắt buộc) | lò nung | phát sáng 13 khi đang cháy |
| 27 | kính | 0.45 | – | không | trong suốt |
| 28 | thang | 0.6 | rìu | thang | gắn vào tường, leo được |
| 29 | cửa gỗ | 4.5 | rìu | cửa | cao 2 block, mở/đóng bằng chuột phải |
| 30 | đất cày | 0.9 | xẻng | đất | thấp hơn 1/16, ẩm khi gần nước trong 4 block |
| 31 | lúa mì | 0 | – | hạt (non) / lúa + hạt (chín) | 8 giai đoạn lớn |
| 32 | cây non | 0 | – | cây non | lớn thành cây sau 5–10 phút |
| 33 | giường | 0.3 | – | giường | dài 2 block, xem 2.7 |
| 34 | đá sâu | 12 | cuốc (bắt buộc) | đá sâu | thay đá ở y < 8 |
| 35 | quặng vàng | 15 | cuốc sắt+ | vàng thô | nung thành thỏi vàng |
| 36 | quặng vàng đá sâu | 20 | cuốc sắt+ | vàng thô | bản trong đá sâu (y < 8) |
| 37 | quặng ngọc lục bảo | 15 | cuốc sắt+ | ngọc lục bảo | chỉ ở núi, từng khối lẻ |
| 38 | cà rốt (cây) | 0 | – | chín: 2–5 cà rốt; non: 1 | trồng bằng cà rốt trên đất cày, 8 giai đoạn |
| 39 | khoai tây (cây) | 0 | – | chín: 2–5 khoai tây; non: 1 | trồng bằng khoai tây trên đất cày, 8 giai đoạn |
| 40 | củ cải đường (cây) | 0 | – | chín: 1 củ cải + 1–4 hạt; non: 1 hạt | 4 giai đoạn |
| 41 | dưa hấu | 1 | rìu | 3–7 lát dưa | quả, mọc cạnh thân dưa |
| 42 | bí ngô | 1 | rìu | bí ngô | quả, mọc cạnh thân bí; sinh rải rác trên cỏ |
| 43 | thân dưa | 0 | – | 1 hạt dưa | 8 giai đoạn, lớn hết thì mọc quả ra ô bên cạnh |
| 44 | thân bí | 0 | – | 1 hạt bí | như thân dưa |
| 45 | đá vỏ chai | 50 | cuốc kim cương | đá vỏ chai | nước chảy vào nguồn dung nham (Giai đoạn 4c) |

"Bắt buộc" nghĩa là đào bằng tay vẫn phá được nhưng không rơi gì.
Đào sai cấp công cụ với quặng: không rơi gì.

#### Dữ liệu phụ của block

Mỗi chunk có thêm một mảng 1 byte/block song song với mảng id block. Ý nghĩa
của byte do từng loại block quy định, khai báo trong `/shared/src/blocks.ts`;
block không dùng thì luôn là 0. Hàm đọc/ghi block nhận và trả cả id lẫn dữ liệu
phụ. Sinh thế giới ghi dữ liệu phụ ngay khi sinh (ray, đuốc trong hầm mỏ); mesh,
ánh sáng, va chạm và raycast đọc dữ liệu phụ để biết hình dạng, không đoán lại
theo ô kề lúc vẽ.

Hướng ngang: 0 = Nam (+Z), 1 = Tây (−X), 2 = Bắc (−Z), 3 = Đông (+X).

| Block | Ý nghĩa byte dữ liệu phụ |
|---|---|
| đuốc | 0 = cắm trên sàn; 1–4 = gắn tường ở hướng (giá trị − 1), nghiêng ra ngoài |
| thang | 0–3 = hướng bức tường mà thang bám vào |
| cửa | bit 0–1 hướng (tấm cửa nằm sát cạnh đó khi đóng), bit 2 đang mở, bit 3 nửa trên, bit 4 bản lề trái (cửa đôi: đặt hai cửa cùng hướng cạnh nhau thì tự ghép, cánh trái mở về bên trái, cánh phải mở về bên phải) |
| lúa mì | 0–7 = giai đoạn lớn |
| cà rốt, khoai tây | 0–7 = giai đoạn lớn; củ cải đường: 0–3 |
| thân dưa, thân bí | 0–7 = tuổi; 8–11 = đã ra quả, quả ở hướng (giá trị − 8) |
| nước, dung nham | bit 0–2 mức 0–7 (0 = nguồn), bit 3 đang rơi |
| lò nung | bit 0–1 hướng mặt trước, bit 2 đang cháy (sáng 13) |
| rương | bit 0–1 hướng mặt trước; bit 2–3: 0 rương đơn, 1 nửa trái, 2 nửa phải của rương đôi (trái/phải nhìn từ phía trước) |
| đường ray | bit 0–1 góc xoay, bit 2–3 dạng (0 thẳng, 1 cong, 2 ngã ba, 3 ngã tư) |
| giường | bit 0–1 hướng từ chân tới đầu, bit 2 = ô đầu giường |
| đất cày | bit 0 = ẩm (có nước trong 4 block ngang) |
| cây non | bit 0 = giai đoạn ẩn (0–1), qua giai đoạn cuối thì mọc thành cây |
| lá | bit 0 = lá do người chơi đặt (không bao giờ rụng); khoảng cách tới thân gỗ tính khi cần |

Từ Giai đoạn 5, server lưu dữ liệu phụ cùng với id block trong file lưu và gửi
kèm trong gói tin (chunk và thay đổi block).

#### Rương đôi (người dùng đồng ý 2026-11-12)

- Đặt một rương đơn sát cạnh một rương đơn khác, cùng hướng mặt trước, nằm cạnh nhau theo
  chiều ngang (vuông góc với hướng mặt trước) thì hai rương tự ghép thành rương đôi. Giữ
  Shift (ngồi) khi đặt thì không ghép. Tối đa 2 rương: rương thứ ba cạnh rương đôi là rương đơn.
- Rương đôi chứa 54 ô (6 hàng); mở bên nào cũng ra cùng giao diện: 27 ô của nửa trái ở
  trên, 27 ô của nửa phải ở dưới. Mỗi nửa vẫn lưu 27 ô của riêng nó.
- Phá một nửa: đồ trong nửa đó rơi ra (kèm 1 rương), nửa kia trở lại rương đơn, giữ đồ.
- Vẽ liền thành một khối dài 2 ô bằng ảnh rương đôi gốc (client.jar).
- Rương sinh sẵn trong hầm mỏ là rương đơn.

#### Chỗ bám của block

- Block cần chỗ bám: đuốc (sàn hoặc tường), thang (tường), đường ray (sàn), cửa
  và giường (sàn dưới ô thấp nhất): chỗ bám phải là khối đầy, không trong suốt
  (không tính lá, kính); riêng đuốc trên sàn được cắm trên đầu cột rào (như đuốc
  trong hầm mỏ). Cỏ cao, cây non: cỏ/đất/đất cày bên dưới. Lúa mì, cà rốt,
  khoai tây, củ cải đường, thân dưa, thân bí: đất cày bên dưới. Tuyết phủ: khối đầy bên dưới.
- Đặt block cũng phải kiểm tra chỗ bám: không đặt đuốc lên không khí, lá, kính;
  không đặt lúa lên block khác đất cày.
- Block mất chỗ bám thì rơi ra thành vật phẩm của nó (đường ray, đuốc, thang,
  cây non...); riêng cỏ cao rơi theo tỉ lệ như khi phá; tuyết phủ không rơi gì.
- Kiểm tra dây chuyền: block mất chỗ bám làm block khác mất chỗ bám thì xử lý
  tiếp. Cát/sỏi rơi xuống đè lên đuốc (hoặc block không va chạm khác) thì block
  đó rơi ra, cát/sỏi nằm vào chỗ đó.
- Cửa và giường chiếm 2 ô: phá một nửa thì nửa kia cũng mất, chỉ rơi 1 vật phẩm.

### 2.3 Công cụ, vũ khí, giáp

| Cấp | Độ bền | Hệ số tốc độ đào | Sát thương kiếm |
|---|---|---|---|
| gỗ | 60 | x2 | 4 |
| đá | 130 | x4 | 5 |
| sắt | 250 | x6 | 6 |
| kim cương | 1500 | x8 | 7 |
| vàng | 32 | x12 | 4 |

- Cấp vàng đào rất nhanh nhưng mau hỏng, và chỉ đào được những gì cuốc gỗ đào
  được: quặng sắt, vàng, kim cương, ngọc lục bảo đào bằng cuốc vàng không rơi gì.

- Loại công cụ: cuốc (đá, quặng), rìu (gỗ), xẻng (đất, cát, sỏi), kiếm,
  cuốc đất (biến đất/cỏ thành đất cày).
- Hệ số tốc độ chỉ áp dụng khi dùng đúng loại công cụ.
- Tay không: sát thương 1. Rìu: sát thương bằng kiếm cùng cấp trừ 1 (người dùng chọn 2026-11-12: rìu yếu hơn kiếm).
- Giáp 4 món, cấp da, sắt, vàng, kim cương:
  da: mũ 1, áo 3, quần 2, giày 1 (tổng 7), độ bền 80;
  sắt: 2, 6, 5, 2 (tổng 15), độ bền 200;
  vàng: 2, 5, 3, 1 (tổng 11), độ bền 110;
  kim cương: 3, 8, 6, 3 (tổng 20), độ bền 450.
  Giảm sát thương theo công thức có độ cứng giáp (MECHANICS.md 5.4, người dùng
  chọn 2026-11-12):
  giảm = min(20, max(giáp / 5, giáp − 4 × sát_thương / (độ_cứng + 8))) / 25,
  sát thương nhận = sát thương × (1 − giảm). Độ cứng: chỉ giáp kim cương, 2 mỗi
  món. Giáp không giảm sát thương rơi, chết đuối, đói, dung nham (lửa vẫn giảm).
  Mỗi lần giáp giảm được sát thương, mỗi món đang mặc mất 1 độ bền.
- Cung: độ bền 384. Tên xếp chồng 64.
- Xếp chồng: block và nguyên liệu 64, công cụ/vũ khí/giáp/giường/cửa 1.
- Vật phẩm rơi (MECHANICS.md 11): biến mất sau 5 phút; không nhặt được ngay (đồ đào
  ra 0.5 giây, đồ vứt bằng Q 2 giây); hai đống cùng loại cách nhau < 0.5 block thì gộp
  (tối đa 64); hút về người chơi trong 1.5 block; chết thì đồ văng ngẫu nhiên quanh chỗ chết.

### 2.4 Chế tạo

Làm được mọi lúc (trong túi đồ):
- 1 thân gỗ → 4 ván gỗ
- 2 ván gỗ → 4 que
- 4 ván gỗ → 1 bàn chế tạo
- 1 than + 1 que → 4 đuốc

Cần bàn chế tạo (lưới 3x3; X = ván gỗ / đá cuội / thỏi sắt / thỏi vàng / kim cương):
- cuốc, rìu: 3 X + 2 que · xẻng: 1 X + 2 que · kiếm: 2 X + 1 que
- cuốc đất: 2 X + 2 que
- mũ 5 X · áo 8 X · quần 7 X · giày 4 X (da / sắt / vàng / kim cương)
- cung: 3 que + 3 sợi tơ
- 4 mũi tên: 1 que + 1 đá lửa + 1 lông gà
- rương: 8 ván gỗ · lò nung: 8 đá cuội
- 3 thang: 7 que · 3 cửa gỗ: 6 ván gỗ · 3 hàng rào: 4 que + 2 ván gỗ
- 16 đường ray: 6 thỏi sắt + 1 que
- xô: 3 thỏi sắt
- bánh mì: 3 lúa mì
- táo vàng: 1 táo + 8 thỏi vàng
- 4 bát: 3 ván gỗ (hình chữ V) · súp củ cải: 6 củ cải + 1 bát (trả lại bát khi ăn)
- 1 hạt dưa: 1 lát dưa · 4 hạt bí: 1 bí ngô
- giường: 3 len + 3 ván gỗ
- sa thạch: 4 cát

Giao diện chế tạo (người dùng chọn 2026-11-12): lưới kéo thả kèm sổ công thức.
- Túi đồ (phím E) có lưới 2x2; chuột phải vào bàn chế tạo mở màn hình bàn chế tạo có
  lưới 3x3 (giữ Shift + chuột phải thì vẫn đặt block lên bàn). Công thức "làm được
  mọi lúc" làm được ở cả hai lưới; công thức cần bàn chế tạo chỉ làm được ở lưới 3x3.
- Xếp nguyên liệu vào lưới đúng hình thì ô kết quả hiện thành phẩm; bấm ô kết quả để
  lấy (mỗi ô lưới mất 1 nguyên liệu), Shift + bấm thì làm liên tục vào túi đồ. Một số
  công thức không cần hình (thân gỗ → ván, đuốc...). Hình lật ngang cũng được.
- Đóng giao diện thì nguyên liệu còn trong lưới trả về túi (thừa thì vứt ra).
- Sổ công thức: nút sách cạnh lưới chế tạo, bấm để mở/đóng danh sách bên trái giao
  diện; đủ nguyên liệu thì sáng, thiếu thì mờ; bấm một công thức thì nguyên liệu tự xếp
  vào lưới, Shift + bấm xếp nhiều bộ nhất có thể.
- Bố cục (người dùng chọn 2026-11-12, theo ảnh mẫu): túi đồ = cột 4 ô giáp (hình mờ gợi
  ý) + hình nhân vật (quay theo con trỏ) + "Chế tạo" 2x2 → ô kết quả; bàn chế tạo =
  "Chế tạo" 3x3 → ô kết quả; bên dưới 27 ô túi và hàng hotbar tách riêng. Không có ô tay
  trái (chưa có cơ chế cầm tay trái).
- Thao tác chuột như thể loại gốc: kéo chuột trái qua nhiều ô chia đều chồng đang cầm;
  kéo chuột phải đặt 1 cái mỗi ô; bấm đúp gom vật phẩm cùng loại lên con trỏ; trỏ vào ô
  rồi bấm 1–9 đổi chỗ với ô hotbar đó; trỏ vào ô bấm Q vứt 1 (Shift+Q cả chồng); bấm ra
  ngoài khung thì vứt chồng đang cầm (chuột phải: vứt 1).
- Vật phẩm đang cầm hiện ở tay phải (góc nhìn thứ nhất): block là khối nhỏ, vật phẩm
  khác là hình nổi khối từ icon; tay trống thì hiện cánh tay; vung khi đào/đặt/ăn.
- Hình xếp (X = vật liệu, | = que): cuốc XXX / ·|· / ·|·; rìu XX / X| / ·|; xẻng X / | / |;
  kiếm X / X / |; cuốc đất XX / ·| / ·|; mũ XXX / X·X; áo X·X / XXX / XXX; quần XXX / X·X /
  X·X; giày X·X / X·X; que: 2 ván dọc; bàn chế tạo: 2x2 ván; đuốc: than trên que;
  rương / lò nung: vòng 8 ô; thang: |·| / ||| / |·|; cửa: 2x3 ván; hàng rào: ván|ván x2;
  ray: sắt·sắt / sắt|sắt / sắt·sắt; bánh mì: 3 lúa ngang; giường: 3 len trên 3 ván;
  sa thạch: 2x2 cát; táo vàng: 8 thỏi vàng quanh táo; cung, mũi tên theo hình quen thuộc.

### 2.5 Lò nung

- 3 ô: nguyên liệu, nhiên liệu, kết quả. Mỗi món nung mất 10 giây.
- Nhiên liệu: than nung được 8 món; thân gỗ / ván gỗ 1.5 món; que 0.5 món.
- Công thức nung: sắt thô → thỏi sắt; vàng thô → thỏi vàng; cát → kính; đá cuội → đá; khoai tây → khoai nướng;
  thịt bò/lợn/gà sống → chín.
- Lò tiếp tục chạy khi không có người mở (server xử lý).

### 2.6 Người chơi và sinh tồn

- Hộp va chạm AABB rộng 0.6, cao 1.8; mắt ở độ cao 1.62.
- Vật lý bước cố định 60 Hz.
- Đi bộ 4.3 block/giây · chạy nhanh 5.6 · ngồi 1.3 (không rơi khỏi mép).
- Nhảy cao 1.25 block · trọng lực 32 block/giây².
- Bơi: trong nước rơi chậm, giữ Space để nổi lên; dưới nước có thanh dưỡng khí
  10 bong bóng, hết thì mất 2 máu mỗi giây.
- Leo thang: đứng sát thang thì đi lên/xuống, không rơi.
- Tầm với 4.5 block.
- 20 máu, 20 đói. Sát thương rơi: 1 máu cho mỗi block vượt quá 3
  (rơi vào nước thì không).
- Đói theo ba biến (MECHANICS.md 3): đói 0–20 (hiển thị), độ no ẩn (0 tới mức
  đói, lúc mới vào 5), hao sức ẩn 0–4 (đạt 4 thì trừ 4 rồi trừ 1 độ no, hết độ no
  thì trừ 1 đói). Hao sức: chạy nhanh 0.1/block, nhảy 0.05, chạy + nhảy 0.2, bơi
  0.01/block, đào xong 1 block 0.005, đánh trúng 0.1, bị trúng đòn 0.1, hồi 1 máu 6.
  Đói 20 và còn độ no: hồi 1 máu mỗi 0.5 giây; đói ≥ 18: hồi 1 máu mỗi 4 giây; đói 0:
  mất 1 máu mỗi 4 giây, dừng khi còn 1 máu. Đói ≤ 6: không chạy nhanh được.
- Ăn: giữ chuột phải 1.6 giây; không ăn được khi đói 20 (trừ táo vàng). Đói / độ no:
  táo 4 / 2.4, bánh mì 5 / 6, cà rốt 3 / 3.6, khoai tây 1 / 0.6, khoai nướng 5 / 6,
  củ cải đường 1 / 1.2, súp củ cải 6 / 7.2, lát dưa 2 / 1.2,
  táo vàng 4 / 9.6 và hồi 4 máu trong 5 giây; thịt (Giai
  đoạn 7) theo bảng MECHANICS.md 3.
- Dung nham: mất 4 máu mỗi giây và bị cháy thêm 4 giây sau khi ra.
- Chết: rơi toàn bộ đồ tại chỗ (tồn tại 5 phút), hồi sinh ở giường đã ngủ gần
  nhất, nếu không có thì ở điểm hồi sinh của thế giới.

### 2.7 Ngày đêm, sinh vật, giường

- Một ngày 20 phút: ngày 10 phút, đêm 7 phút, bình minh và hoàng hôn mỗi lúc
  1.5 phút. Server giữ đồng hồ, gửi cho client.
- Ánh sáng 16 mức (0–15): ánh sáng trời theo giờ trong ngày + ánh sáng block.
- Quái vật sinh ở chỗ ánh sáng ≤ 7, cách người chơi 24–64 block,
  tối đa 30 quái trong bán kính 64 block quanh mỗi người chơi. Bị gỡ khi
  cách mọi người chơi trên 128 block. (MECHANICS.md mục 8 thay luật sinh này.)

#### Danh sách sinh vật đầy đủ (đối chiếu client.jar bản 26.3, 2026-11-14)

Tên trong ngoặc là đường dẫn skin dưới `assets/minecraft/textures/entity/` của client.jar.
Chỉ số chi tiết (sát thương, kích thước, trọng số sinh, cơ chế riêng): MECHANICS.md mục 8, 15, 16.
Tên hiển thị trong game là tên tiếng Việt ở cột đầu (gom vào file chữ của client).

Quái thù địch — thế giới chính:

| Sinh vật | Máu | Hành vi | Rơi ra | Nơi sinh | GĐ |
|---|---|---|---|---|---|
| Xác sống (zombie/zombie) | 20 | đuổi trong 35 block, đánh 3; cháy dưới nắng; 5% là xác sống con (nhỏ, nhanh) | thịt thối | trên cạn, chỗ tối | 7a |
| Bộ xương (skeleton/skeleton) | 20 | giữ khoảng cách, bắn tên 2–4 mỗi 2 giây; cháy dưới nắng | xương, tên | trên cạn, chỗ tối | 7a |
| Nhện (spider/spider) | 16 | leo tường, đánh 2; ban ngày trung lập | sợi tơ, mắt nhện | trên cạn, chỗ tối | 7a |
| Quái nổ (creeper/creeper) | 20 | tới gần ≤ 3 block thì xì 1.5 giây rồi nổ (sức nổ 3), phá block | thuốc súng | trên cạn, chỗ tối | 7b |
| Kẻ hư không (enderman/enderman) | 40 | trung lập; bị nhìn vào mặt hoặc bị đánh thì tức, dịch chuyển, đánh 7; nhặt block; sợ nước; tên không trúng | ngọc hư không | trên cạn, chỗ tối, hiếm | 7b |
| Mọt hư không (endermite/endermite) | 8 | nhỏ, đánh 2; tự biến mất sau 2 phút | – | 5% khi ném ngọc hư không | 7b |
| Khối nhầy (slime/slime) | 16 / 4 / 1 | nhảy tới, đánh 4 / 2 / 0 theo cỡ; chết thì tách 2–4 con nhỏ hơn | viên nhầy (cỡ nhỏ) | "chunk nhầy" (1/10 số chunk) dưới y = 40, bất kể ánh sáng | 7b |
| Xác khô (zombie/husk) | 20 | như xác sống nhưng không cháy; đánh trúng gây đói | thịt thối | sa mạc (thay 80% xác sống) | 7b |
| Xác đuối (zombie/drowned) | 20 | như xác sống, bơi và đi dưới nước, lên bờ đuổi; cháy dưới nắng | thịt thối | sông, đại dương | 7b |
| Bộ xương băng (skeleton/stray) | 20 | như bộ xương, tên gây chậm 30 giây; cháy dưới nắng | xương, tên | đồng tuyết, núi trên đường tuyết (thay 80% bộ xương) | 7b |
| Nhện hang (spider/cave_spider) | 12 | nhỏ (0.7 × 0.5, lọt khe 1×1), leo tường, đánh 2 + độc 7 giây | sợi tơ, mắt nhện | chỉ từ lồng sinh quái trong hầm mỏ | 7b |
| Bóng ma đêm (phantom/phantom) | 20 | bay vòng trên cao rồi lao xuống cắn 6; cháy dưới nắng | màng bóng ma | trên trời, ban đêm, quanh người chơi ≥ 3 ngày chưa ngủ | 7b |
| Phù thủy (witch/witch) | 26 | giữ khoảng cách, ném bình gây độc / chậm / yếu / 6 sát thương; tự uống bình hồi máu | thuốc súng, mắt nhện, que | trên cạn, chỗ tối, rất hiếm | 7b |
| Mọt đá (silverfish/silverfish) | 8 | nhỏ, đánh 1; bị đánh thì gọi mọt trong đá nhiễm gần đó ra | – | chui ra khi phá đá nhiễm (block mới ở núi) | 7b |
| Dân làng xác sống (zombie_villager/) | 20 | như xác sống; LỰA CHỌN: chữa bằng táo vàng | thịt thối | 5% số xác sống; dân làng bị xác sống giết | 8a |

Động vật và sinh vật trung lập trên cạn:

| Sinh vật | Máu | Hành vi | Rơi ra | Nơi sinh | GĐ |
|---|---|---|---|---|---|
| Lợn (pig/pig_{temperate,cold,warm}) | 10 | lang thang, chạy khi bị đánh | thịt lợn sống 1–3 | đồng cỏ, rừng | 7a |
| Bò (cow/cow_{temperate,cold,warm}) | 10 | như trên; vắt sữa bằng xô | thịt bò sống 1–3, da 0–2 | đồng cỏ, rừng | 7a |
| Cừu (sheep/sheep, sheep_wool) | 8 | ăn cỏ thì lông mọc lại; tỉa bằng kéo; màu len tự nhiên theo bản gốc | len 1 (tỉa 1–3), thịt cừu sống 1–2 | đồng cỏ, rừng, núi | 7a |
| Gà (chicken/chicken_{temperate,cold,warm}) | 4 | rơi chậm; đẻ trứng mỗi 5–10 phút | thịt gà sống 1, lông 0–2 | đồng cỏ, rừng | 7a |
| Thỏ (rabbit/rabbit_*) | 3 | nhảy, chạy khỏi người chơi | thịt thỏ sống 0–1, da thỏ 0–1, chân thỏ 10% | sa mạc, đồng tuyết, rừng, chân núi | 7c |
| Sói (wolf/wolf_*) | 8, thuần rồi 40 | trung lập, đánh 4; thuần bằng xương (1/3 mỗi lần); đi theo / ngồi; đánh thứ chủ đánh; săn cừu, thỏ, cáo, bộ xương | – | rừng, đồng tuyết, chân núi, núi tuyết, đồng cỏ khô có keo (skin theo biome) | 7c |
| Cáo (fox/fox, fox_snow) | 10 | ngủ ban ngày, săn gà / thỏ, ngậm đồ nhặt được, tránh người | món đang ngậm | đồng tuyết (cáo tuyết), chân núi rừng thông | 7c |
| Dê (goat/goat) | 10 | nhảy cao; thỉnh thoảng húc 2 và đẩy mạnh; vắt sữa bằng xô | – | núi trên đường tuyết | 7c |
| Gấu trắng (bear/polarbear) | 30 | trung lập; có gấu con gần thì tấn công; đánh 6 | cá tuyết / cá hồi sống 0–2 | đồng tuyết | 7c |
| Lạc đà không bướu (llama/llama_*) | 15–30 | trung lập, nhổ nước bọt 1; đi thành đoàn; chở rương (cần 7d) | da 0–2 | núi, đồng cỏ khô có keo | 7c |
| Tatu (armadillo/armadillo) | 12 | cuộn tròn khi sợ; tự rụng vảy mỗi 5–10 phút | vảy tatu | đồng cỏ khô có keo | 7c |
| Dơi (bat/bat) | 6 | bay loạn trong hang, không đánh | – | hang tối, dưới y = 63 | 7c |
| Ngựa (horse/horse_* + horse_markings_*) | 15–30 | thuần bằng cưỡi nhiều lần; đặt yên để điều khiển; tốc độ và độ nhảy ngẫu nhiên | da 0–2 | đồng cỏ, đồng cỏ khô (đàn 2–6) | 7d |
| Lừa (horse/donkey) | 15–30 | như ngựa; chở rương 15 ô | da 0–2 | đồng cỏ (đàn 1–3) | 7d |
| La (horse/mule) | 15–30 | như lừa; chỉ có khi ngựa + lừa phối giống | da 0–2 | không sinh tự nhiên | 7d |

Sinh vật dưới nước:

| Sinh vật | Máu | Hành vi | Rơi ra | Nơi sinh | GĐ |
|---|---|---|---|---|---|
| Mực (squid/squid) | 10 | bơi lững lờ, phun mực khi bị đánh | túi mực 1–3 (= thuốc nhuộm đen) | đại dương, sông | 7c |
| Mực phát sáng (squid/glow_squid) | 10 | như mực, tự phát sáng mờ | túi mực sáng 1–3 | nước tối dưới y = 30 (hồ ngầm) | 7c |
| Cá tuyết (fish/cod) | 3 | bơi theo đàn; lên cạn thì ngạt; múc bằng xô nước | cá tuyết sống, xương 5% | đại dương | 7c |
| Cá hồi (fish/salmon) | 3 | như trên | cá hồi sống | sông, đại dương lạnh | 7c |
| Cá nóc (fish/pufferfish) | 3 | phồng lên khi người lại gần, chạm vào gây độc | cá nóc | đại dương ấm | 7c |
| Cá nhiệt đới (fish/tropical_*) | 3 | màu ghép từ 2 dáng × 6 hoa văn × màu | cá nhiệt đới | đại dương ấm | 7c |
| Cá heo (dolphin/dolphin) | 10 | trung lập, đánh 3; bơi cạnh người chơi thì cho bơi nhanh; phải ngoi lên thở | cá tuyết sống 0–1 | đại dương không lạnh | 7c |

Làng (Giai đoạn 8):

| Sinh vật | Máu | Hành vi | Rơi ra | Nơi sinh | GĐ |
|---|---|---|---|---|---|
| Dân làng (villager/) | 20 | theo mục 2.11 | – | làng | 8a |
| Người sắt (iron_golem/iron_golem) | 100 | tuần tra làng, đánh quái thù địch 7–21 và hất lên; trung lập với người chơi trừ khi bị đánh hoặc người đó đánh dân làng | thỏi sắt 3–5, anh túc 0–2 | 1 con mỗi làng (LỰA CHỌN: sinh thêm khi làng đông dân) | 8a |
| Mèo (cat/cat_*) | 10 | mèo hoang trong làng; thuần bằng cá sống; quái nổ và bóng ma đêm tránh mèo | sợi tơ 0–2 | làng | 8a |
| Thương nhân lang thang (wandering_trader/) + 2 lạc đà không bướu (llama, lớp trader) | 20 | thỉnh thoảng xuất hiện gần người chơi, bán đồ hiếm lấy ngọc lục bảo; đi sau 40–60 phút | – | gần người chơi | 8a |
| Lạc đà (camel/camel) | 32 | cưỡi được 2 người, cao (quái thấp không với tới), lướt nhanh | – | làng sa mạc | 8a (cần 7d) |
| Kẻ cướp (illager/pillager) | 24 | bắn nỏ 4; đi tuần theo đội 2–5, đội trưởng đeo cờ | nỏ 8.5%, tên | đội tuần tra, tiền đồn, cướp làng | 8b |
| Đao phủ (illager/vindicator) | 24 | cầm rìu sắt đánh 13 | ngọc lục bảo 0–1, rìu sắt 8.5% | dinh thự rừng | 8c |
| Pháp sư (illager/evoker) | 24 | gọi hàng nanh từ đất (6 mỗi nanh), gọi 3 tiểu quỷ | vật tổ bất tử, ngọc lục bảo 0–1 | dinh thự rừng | 8c |
| Tiểu quỷ (illager/vex) | 14 | bay xuyên block, đánh 9; tự chết sau 30–119 giây | – | do pháp sư gọi | 8c |
| Quái tàn phá (illager/ravager) | 100 | húc 12, phá lá và cây trồng, gầm đẩy lùi | yên ngựa | cướp làng | 8b |
| Tiểu linh (allay/allay) | 20 | đưa một món thì đi nhặt các món giống thế mang về cho người chơi | – | lồng trong tiền đồn kẻ cướp | 8b |

Vực Lửa (Giai đoạn 10, tùy chọn):

| Sinh vật | Máu | Hành vi | Rơi ra |
|---|---|---|---|
| Ma bay (ghast/ghast) | 10 | bay to, bắn cầu lửa nổ (sức nổ 1); đánh bật được cầu lửa | nước mắt ma bay, thuốc súng |
| Quỷ lửa (blaze/blaze) | 20 | bay, bắn loạt 3 cầu lửa (5 mỗi quả), đánh 6; nước làm nó mất máu | que quỷ lửa (pháo đài) |
| Khối nhầy dung nham (slime/magmacube) | 16 / 4 / 1 | như khối nhầy, đánh 6 / 4 / 3, nhảy cao | kem dung nham |
| Người lợn (piglin/piglin) | 16 | trung lập nếu người chơi mặc ít nhất 1 món giáp vàng; đưa thỏi vàng thì đổi lại đồ ngẫu nhiên | nỏ / kiếm vàng |
| Người lợn vệ binh (piglin/piglin_brute) | 50 | luôn thù địch, rìu vàng 13 | rìu vàng |
| Người lợn xác sống (piglin/zombified_piglin) | 20 | trung lập; đánh một con thì cả bầy tức; đánh 8 | thịt thối, cục vàng, thỏi vàng |
| Lợn rừng lửa (hoglin/hoglin) | 40 | thù địch, húc 3–8 và hất lên; sợ nấm cong vênh | thịt lợn sống, da |
| Lợn rừng xác sống (hoglin/zoglin) | 40 | đánh mọi thứ trừ creeper và chính nó | thịt thối |
| Kẻ lội dung nham (strider/strider) | 20 | đi trên dung nham; cưỡi được bằng yên + cần câu nấm | sợi tơ |
| Bộ xương héo (skeleton/wither_skeleton) | 20 | cao 2.4, kiếm đá 8 + héo 10 giây | than, xương, sọ bộ xương héo 2.5% |
| Ma bay hiền (ghast/happy_ghast) | 20 | LỰA CHỌN: nuôi từ khối ma bay khô, đeo dây cương thì chở 4 người bay | – |
| Quỷ héo (wither/wither) | 300 | trùm do người chơi triệu hồi (4 cát linh hồn + 3 sọ bộ xương héo); bắn sọ nổ, phá block | ngôi sao vực lửa |
| Kẻ hư không | 40 | như trên, nhiều ở rừng cong vênh | ngọc hư không |

Cõi Hư Không (Giai đoạn 11, tùy chọn):

| Sinh vật | Máu | Hành vi | Rơi ra |
|---|---|---|---|
| Rồng hư không (enderdragon/dragon) | 200 | trùm; bay vòng, phun lửa, hồi máu nhờ tinh thể trên các cột | – (mở cổng về) |
| Sò hư không (shulker/shulker_*) | 30 | bám block, núp trong vỏ (giáp cao); bắn đạn đuổi theo 4 + bay lên 10 giây | vỏ sò 50% |
| Kẻ hư không, mọt hư không | | như trên | |

Danh sách chờ — có skin trong client.jar nhưng KHÔNG làm cho tới khi có thứ nó cần
(người dùng muốn thì thêm biome / công trình trước, rồi đưa sinh vật vào giai đoạn phù hợp):

| Sinh vật | Cần có trước |
|---|---|
| Bò nấm (cow/mooshroom_*) | biome đảo nấm, block nấm |
| Gấu trúc (panda), Vẹt (parrot), Mèo rừng (cat/ocelot) | biome rừng rậm, tre |
| Ếch, nòng nọc (frog, tadpole) | biome đầm lầy, khối trứng ếch |
| Bộ xương đầm lầy (skeleton/bogged) | biome đầm lầy hoặc phòng thử thách; tên gây độc |
| Ong (bee) | tổ ong, mật ong, sáp ong |
| Rùa (turtle) | cỏ biển, block trứng rùa; vảy rùa → mũ rùa |
| Kỳ giông (axolotl) | hang tươi tốt (rêu, cây đất sét), xô kỳ giông |
| Thú đánh hơi (sniffer) | khảo cổ (cát nghi vấn, chổi), trứng thú đánh hơi |
| Hộ vệ biển, hộ vệ biển già (guardian) | đền dưới biển, hiệu ứng mỏi tay |
| Kẻ canh giữ (warden) | biome tối sâu, block cảm biến âm thanh |
| Mộc quái (creaking) | biome rừng nhợt, tim mộc quái |
| Quái gió (breeze) | phòng thử thách, cầu gió |
| Người tuyết (snow_golem) | bí ngô (bí ngô khắc đặt lên 2 khối tuyết) |
| Người đồng (copper_golem) | đồng, rương đồng |
| Ngựa xương (horse/horse_skeleton) | thời tiết có sét |
| Ngựa xác sống (horse/horse_zombie), Lạc đà khô (camel/camel_husk), Bộ xương khô cằn (skeleton/parched), Ốc anh vũ và ốc anh vũ xác sống (nautilus/) | thêm ở bản 2025–2026; kiểm cơ chế trên minecraft.wiki trước khi đưa vào |
| Khối lưu huỳnh (sulfur_cube/) | bản 26.x, đi cùng các block lưu huỳnh; chưa có tài liệu cơ chế → hỏi người dùng |
| Pháp sư ảo ảnh (illager/illusioner), Người khổng lồ, Thỏ sát thủ (rabbit_caerbannog) | không sinh tự nhiên ngay cả ở bản gốc → bỏ |

Không phải sinh vật (có trong thư mục entity nhưng bỏ qua ở đây): đệm (cushion), ma-nơ-canh, giá treo giáp,
thuyền, xe mỏ, rương, khiên, cờ.

- Động vật sinh trên cỏ khi tạo chunk mới, theo đàn 2–4 con; không sinh lại liên tục. Riêng sinh vật dưới
  nước và dơi sinh lại liên tục theo giới hạn riêng (MECHANICS.md mục 8).
- Giường: ngủ được khi đêm và không có quái trong 8 block. Ngủ thì đặt điểm hồi
  sinh. Khi hơn một nửa số người chơi đang online cùng ngủ thì tua sang sáng.

### 2.8 Chiến đấu

- Cận chiến: tầm 3 block, hồi đòn 0.6 giây; đánh khi chưa hồi xong thì sát
  thương giảm theo tỷ lệ, tối thiểu 20%.
- Chí mạng khi đang rơi xuống: x1.5.
- Knockback: đẩy ngang 0.4 block/tick, hất lên 0.36; đang chạy nhanh thì đẩy
  ngang gấp đôi.
- Miễn sát thương 0.5 giây sau khi trúng đòn.
- Cung: kéo tối đa 1 giây; sát thương 2–9 theo lực kéo; tốc độ đầu tối đa
  60 block/giây; có trọng lực và lực cản.
- Sát thương thực theo công thức giáp ở mục 2.3.
- PvP: cấu hình server `PVP=on|off`, mặc định on.
- Vùng an toàn bán kính 16 block quanh điểm hồi sinh thế giới: không PvP,
  không phá/đặt block (trừ quản trị viên).

### 2.9 Hầm mỏ bỏ hoang

- Khoảng 1 hệ thống mỗi vùng 160x160 block, ở độ sâu y = 20–50.
  Vị trí quyết định bằng seed + tọa độ vùng để sinh được theo từng chunk.
  Nếu tâm rơi vào biển hoặc đất không đủ dày thì thử lại tối đa 4 vị trí khác
  trong vùng rồi mới bỏ. Mục tiêu: ít nhất 3 hầm mỏ trong bán kính 300 block
  quanh điểm xuất phát. Hệ thống của hai vùng kề nhau có thể cắt qua nhau.
- Một phòng trung tâm bằng đất, từ đó tỏa ra hành lang 3x3 thẳng theo trục,
  dài 8–25 block, rẽ nhánh và giao nhau, có đoạn dốc lên xuống giữa các tầng.
  Tối đa khoảng 70 đoạn mỗi hệ thống.
- Cứ 4–5 block một khung chống: hai cột hàng rào gỗ và một xà ván gỗ ngang.
- Đường ray trên sàn, thiếu ngẫu nhiên khoảng 30%.
- Mạng nhện rải rác, dày hơn ở ngã rẽ. Đuốc thỉnh thoảng trên cột.
- Khi hành lang cắt qua hang: bắc sàn ván gỗ qua khoảng trống.
- Rương ở cuối một số nhánh cụt với đồ: bánh mì, than, sắt thô, đường ray,
  hạt giống, vàng thô, thỏi vàng, ngọc lục bảo, thỉnh thoảng kim cương
  (bảng tỉ lệ đặt trong `/shared`).
- Hầm mỏ phải liền mạch khi vắt qua nhiều chunk: lập kế hoạch toàn bộ hệ thống
  theo vùng, rồi mỗi chunk chỉ đặt những block thuộc về nó.

### 2.10 Chất lỏng

- Nước lan ngang tối đa 7 block từ nguồn, chảy xuống không giới hạn; dung nham
  lan 3 block và chậm hơn.
- Nước gặp dung nham: nguồn dung nham thành đá vỏ chai (nếu có texture) hoặc
  đá cuội, dung nham chảy thành đá cuội.
- Chỉ cập nhật chất lỏng ở chunk gần người chơi.
- Khi tải một chunk, quét các ô chất lỏng "hở" (có không khí bên cạnh/bên dưới)
  để đưa vào hàng đợi chảy. Nhờ vậy mạch nước sinh từ trước Giai đoạn 4 tự chảy
  thành dòng mà không cần sinh lại thế giới.

### 2.11 Làng

- Sinh trên đồng cỏ và sa mạc, khoảng 1 làng mỗi vùng 512x512 block.
- 4–10 công trình nối nhau bằng đường sỏi: nhà nhỏ, nhà lớn, ruộng lúa có
  mương nước, giếng, lò rèn có rương đồ.
- Công trình được định nghĩa bằng dữ liệu (mảng block hoặc file JSON) trong
  `/shared/structures`, đặt khớp độ cao mặt đất, san nền bằng đất bên dưới.
- Dân làng: 20 máu, đi lang thang trong làng ban ngày, vào nhà ban đêm.
  Chuột phải để mở giao diện trao đổi: 2–4 giao dịch cố định theo nghề
  (nông dân, thợ rèn, thủ thư), tiền tệ là ngọc lục bảo (đào quặng ngọc lục
  bảo ở núi, tìm trong rương làng và rương hầm mỏ, hoặc bán đồ cho dân làng).

### 2.12 Điều khiển

| Phím | Chức năng |
|---|---|
| W A S D | di chuyển |
| Space | nhảy / bơi lên |
| Nhấn đúp W (giữ W) | chạy nhanh — không dùng Ctrl vì Ctrl+W / Ctrl+D là phím tắt trình duyệt |
| Shift (giữ) | ngồi; Shift + chuột phải: đặt khối lên rương / bàn / lò thay vì mở (như Minecraft — người dùng chọn 2026-11-14, bỏ phím C) |
| Chuột | nhìn (pointer lock) |
| Chuột trái | đào (giữ) / đánh |
| Chuột phải | đặt block / dùng (rương, lò, cửa, giường, dân làng) / ăn / kéo cung |
| 1–9, lăn chuột | chọn ô hotbar |
| E | túi đồ và chế tạo |
| Q | vứt vật phẩm |
| Tab (giữ) | danh sách người chơi |
| T | chat |
| F3 | thông tin debug |
| Esc | menu |

### 2.13 Nội dung mở rộng: loài cây, hoa, đồ xây dựng, màu, đồ sắt (người dùng chọn 2026-11-13)

Làm ở Giai đoạn 4d (thứ làm thay đổi thế giới sinh ra) và 4e (thứ chỉ chế tạo ra), sau khi 5a
test xong và trước 5b. Độ cứng ghi theo "giây, tay không" như mục 2.2 (cách quy đổi theo
MECHANICS.md 4: block cần công cụ = độ cứng gốc × 5, không cần = × 1.5).

Cách lưu: id block vẫn 8 bit (tối đa 256). Sau 4d + 4e dùng khoảng 115 id, còn đủ cho các
giai đoạn sau. Màu (16) lưu trong dữ liệu phụ; mỗi loài cây dùng id riêng (texture, rơi đồ
đơn giản). Khi gần hết id thì nới lên 16 bit kèm bước chuyển đổi dữ liệu đã lưu.

#### Loài cây mới (4d)

| Loài | Nơi mọc | Hình cây |
|---|---|---|
| sồi (đã có) | đồng cỏ, rừng | như hiện tại |
| thông | đồng tuyết, chân núi | thân cao 6–9, tán hình nón nhiều tầng |
| bạch dương | rừng (khoảng 30% số cây), rải rác ở đồng cỏ | thân trắng cao 5–7, tán như sồi |
| keo | phần nóng và khô của đồng cỏ (gần sa mạc), thưa | thân nghiêng 1–2 nhánh, tán phẳng rộng |

- Mỗi loài có: thân gỗ, ván gỗ, lá, cây non (thông số giống bản sồi). Cây non lớn thành đúng loài.
- Lá rơi cây non đúng loài 5%, que 2%; táo chỉ rơi từ lá sồi (5%).
- Công thức chung nhận thân / ván của mọi loài: que, bàn chế tạo, rương, bát, thang, đuốc,
  công cụ gỗ, giường, nút gỗ; nhiên liệu lò như nhau. Thân → 4 ván cùng loài.
- Đồ theo loài (4e): bậc, tấm, hàng rào, cửa. Hàng rào khác loài vẫn nối với nhau.

#### Hoa và xương rồng (4d)

| Block | Độ cứng | Nơi mọc | Rơi ra | Ghi chú |
|---|---|---|---|---|
| bồ công anh | 0 | đồng cỏ, rừng, theo đám | chính nó | → thuốc nhuộm vàng |
| anh túc | 0 | đồng cỏ, rừng, theo đám | chính nó | → thuốc nhuộm đỏ |
| hoa ngô xanh | 0 | đồng cỏ, theo đám | chính nó | → thuốc nhuộm xanh dương |
| linh lan | 0 | rừng, theo đám | chính nó | → thuốc nhuộm trắng |
| xương rồng | 0.6 | sa mạc, cao 1–3 | xương rồng | nung → thuốc nhuộm xanh lá |

- Hoa: không va chạm, chỗ bám như cỏ cao (cỏ / đất / đất cày), bị chất lỏng cuốn trôi, đặt lại được.
- Xương rồng: chỉ đặt trên cát hoặc xương rồng; có block ở 4 ô ngang bên cạnh thì vỡ (rơi ra);
  random tick mọc thêm tới cao 3; chạm vào mất 1 máu (theo luật miễn sát thương 0.5 giây);
  hộp va chạm hẹp hơn 1 block (14/16).

#### Bậc, tấm, tường (4e)

- Vật liệu: đá, đá cuội, đá cuội rêu, sa thạch, đá sâu, gạch đá (mới), ván gỗ 4 loài.
  Tường chỉ cho: đá cuội, đá cuội rêu, sa thạch, đá sâu, gạch đá.
- Gạch đá: 4 đá (2x2) → 4 gạch đá; độ cứng 7.5, cuốc bắt buộc.
- Công thức: 6 vật liệu hình bậc → 4 bậc; 3 vật liệu một hàng ngang → 6 tấm; 6 vật liệu hai hàng → 6 tường.
- Độ cứng, công cụ như vật liệu gốc.
- Bậc: dữ liệu phụ bit 0–1 hướng (phía cao quay về hướng ngược người đặt), bit 2 lật ngược
  (đặt vào nửa trên của mặt bên hoặc mặt dưới block), bit 3–5 dạng góc (thẳng, góc trong
  trái / phải, góc ngoài trái / phải) tự tính khi đặt và khi bậc bên cạnh đổi, như ray. Va
  chạm đúng hình bậc; mỗi nấc cao 0.5 nên đi lên cầu thang không cần nhảy (bước lên tối đa 0.6).
- Tấm: dữ liệu phụ 0 = nửa dưới, 1 = nửa trên, 2 = đôi; đặt tấm vào tấm cùng loại thành tấm đôi
  (rơi ra 2 tấm). Tấm nửa dưới không chặn ánh sáng hoàn toàn.
- Tường: nối với tường, khối đầy, cổng như hàng rào; va chạm cao 1.5; cột giữa cao hơn khi không thẳng.

#### Thuốc nhuộm và 16 màu (4f)

- 16 màu: trắng, cam, đỏ tía, xanh nhạt, vàng, vàng chanh, hồng, xám, xám nhạt, lục lam,
  tím, xanh dương, nâu, xanh lá, đỏ, đen.
- Nguồn màu gốc: trắng (linh lan; GĐ 7 thêm bột xương), đỏ (anh túc, củ cải đường), vàng (bồ
  công anh), xanh dương (hoa ngô xanh), xanh lá (nung xương rồng), đen (than — game tự đặt,
  bản gốc dùng túi mực), nâu (đỏ + xanh lá — game tự đặt). Mỗi hoa / củ cải → 1 thuốc nhuộm.
- Trộn (không cần bàn): cam = đỏ + vàng; tím = đỏ + xanh dương; lục lam = xanh dương + xanh lá;
  xanh nhạt = xanh dương + trắng; vàng chanh = xanh lá + trắng; hồng = đỏ + trắng; xám = đen +
  trắng; xám nhạt = xám + trắng; đỏ tía = tím + hồng. Mỗi lần trộn ra 2.
- Len trước GĐ 7: 4 sợi tơ (2x2) → 1 len trắng. Len là block đặt được (độ cứng 1.2, không cần công cụ).
- Đồ có màu (màu lưu ở dữ liệu phụ 4 bit):
  - len: 1 thuốc nhuộm + 1 len bất kỳ → len màu đó;
  - thảm: 2 len cùng màu → 3 thảm (cao 1/16, cần block bên dưới, độ cứng 0.15);
  - kính màu: 8 kính quanh 1 thuốc nhuộm → 8 kính màu (bán trong suốt, ám màu; độ cứng 0.45, không rơi gì);
  - tấm kính màu: 6 kính màu (2 hàng) → 16; hoặc 8 tấm kính quanh 1 thuốc nhuộm → 8;
  - giường: 3 len cùng màu + 3 ván → giường màu đó; giường + thuốc nhuộm → đổi màu.
    Giường: dữ liệu phụ thêm bit 3–6 = màu (giường đã có hiện là màu đỏ).

#### Đồ sắt và đồ hay dùng (4f)

| Vật phẩm / block | Công thức | Thông số |
|---|---|---|
| kéo | 2 thỏi sắt chéo | độ bền 238. Phá lá nhanh và rơi ra khối lá; mạng nhện nhanh và rơi ra mạng nhện (đặt được); cỏ cao rơi ra cỏ cao (đặt được). Tỉa lông cừu ở GĐ 7 |
| bật lửa | 1 thỏi sắt + 1 đá lửa | độ bền 64. Chuột phải lên mặt trên khối đầy: đặt lửa |
| lửa (block) | – | không va chạm, sáng 15; KHÔNG lan, không đốt block; tự tắt sau 2–6 giây (trên đá sâu / đá nền cũng vậy); nước chảy vào thì tắt; đi vào: mất 1 máu + cháy 8 giây. GĐ 10 dùng để kích hoạt cổng |
| khối than / sắt / vàng / kim cương / ngọc lục bảo / sắt thô / vàng thô | 9 món (3x3) ↔ 1 khối | độ cứng 25 (vàng 15), cần cuốc cùng cấp với quặng; khối than là nhiên liệu 80 món |
| mảnh sắt | 1 thỏi sắt → 9; 9 mảnh → 1 thỏi | nguyên liệu |
| lồng đèn | 8 mảnh sắt quanh 1 đuốc | sáng 15; đặt trên sàn hoặc treo dưới trần (dữ liệu phụ bit 0); độ cứng 17.5, cuốc |
| song sắt | 6 thỏi sắt (2 hàng) → 16 | nối với nhau và với khối đầy như tấm kính; độ cứng 25, cuốc bắt buộc |
| tấm kính | 6 kính (2 hàng) → 16 | nối như song sắt; không rơi gì; độ cứng 0.45 |
| cửa sắt | 6 thỏi sắt (2x3) → 3 | như cửa gỗ nhưng chuột phải KHÔNG mở được; mở khi có nút / cần gạt đang bật ở gần (dưới); độ cứng 25, cuốc bắt buộc |
| nút đá / nút gỗ | 1 đá / 1 ván bất kỳ | gắn sàn, trần hoặc tường; bấm thì bật 1 giây (đá) / 1.5 giây (gỗ) rồi tắt; độ cứng 0.75 |
| cần gạt | 1 que trên 1 đá cuội | gắn sàn, trần hoặc tường; bấm thì bật / tắt; độ cứng 0.75 |

- Cửa sắt mở khi một nút / cần gạt đang bật cách một trong hai nửa cửa tối đa 2 ô (khoảng cách
  cộng các trục), không có dây dẫn. Hết bật thì cửa đóng. Nút / cần gạt không làm gì khác.
- Xô sữa chuyển sang GĐ 7 (cần bò).

#### Thêm ở GĐ 7 (cùng động vật)

- 7a: thịt sống / chín các loại (bảng MECHANICS.md 3), thịt thối, xương → 3 bột xương (thuốc nhuộm
  trắng; bón cho cây trồng / cây non lớn ngay một bậc), lông, da, mắt nhện (ăn được, gây độc), trứng (ném ra:
  1/8 nở gà con), mũi tên làm được trong sinh tồn (công thức đã có ở 2.4, nay có lông gà), xô sữa (vắt bò bằng xô; uống thì hết hiệu ứng
  đang có), cừu có màu len theo bản gốc, kéo tỉa lông cừu.
- 7b: thuốc súng, ngọc hư không (ném để dịch chuyển, mất 5 máu, chồng 16), viên nhầy, màng bóng ma (chưa có công
  dụng), block đá nhiễm (giống đá, sinh ở núi), block lồng sinh quái (trong hầm mỏ, không lấy được).
  LỰA CHỌN: thuốc nổ TNT (5 thuốc súng + 4 cát, châm bằng bật lửa, sức nổ 4, dùng chung hệ thống nổ).
- 7c: thịt thỏ sống / chín, da thỏ (4 → 1 da), chân thỏ, cá tuyết / cá hồi sống / chín, cá nóc, cá nhiệt đới,
  túi mực (= thuốc nhuộm đen), túi mực sáng, vảy tatu, xô cá (múc cá bằng xô nước, đổ ra thì thả cá).
  LỰA CHỌN: giáp sói (6 vảy tatu).
- 7d: yên (3 da + 1 thỏi sắt; thêm vào bảng đồ rương hầm mỏ), dây dắt (4 sợi tơ + 1 viên nhầy → 2).
- 8b: nỏ. 8c: vật tổ bất tử (cầm ở tay trái hoặc tay phải: chết thì sống lại với 1 máu, mất vật tổ).

---

## 3. Tài nguyên hình ảnh

Nguồn duy nhất (người dùng chọn 2026-11-13, bỏ REFI_Textures): texture gốc trong client.jar của
Minecraft, người dùng tự tải vào `/assets-src/minecraft`; `npm run import-textures` nhập theo
`scripts/mc-texture-map.json` vào `client/public_mc` (được commit từ 2026-11-23, repo riêng tư). Thiếu file thì game vẽ tạm.
Các bảng 3.1–3.4 dưới đây là danh sách texture ban đầu; đường dẫn REFI trong đó không còn dùng —
bảng ánh xạ thật là `scripts/mc-texture-map.json`.

Nguyên tắc chung cho script nhập:
- Texture có điểm trong suốt mà dùng cho block đặc (quặng, cỏ mặt bên) thì
  ghép đè lên nền tương ứng.
- Texture cao hơn 16 px (ví dụ nước, dung nham, đuốc động) là dải khung hình
  xếp dọc: lấy khung đầu, hoặc dùng làm hoạt ảnh nếu tiện.
- File nào không tìm thấy thì tìm file gần tên nhất trong thư mục, báo người
  dùng; vẫn không có thì vẽ tạm.

### 3.1 Block đã có từ Giai đoạn 1

| Đích | Nguồn |
|---|---|
| grass_top.png | default_mcl_core/soil/default_grass.png |
| grass_side.png | GHÉP: default_mcl_core/soil/default_grass_side.png đè lên default_dirt.png |
| dirt.png | default_mcl_core/soil/default_dirt.png |
| stone.png | default_mcl_core/stone/default_stone.png |
| cobble.png | default_mcl_core/stone/default_cobble.png |
| bedrock.png | default_mcl_core/stone/mcl_core_bedrock.png |
| sand.png | default_mcl_core/sand/default_sand.png |
| log_side.png / log_top.png | default_mcl_core/trees/default_tree.png / default_tree_top.png |
| leaves.png | default_mcl_core/trees/default_leaves.png |
| planks.png | default_mcl_core/trees/default_wood.png |
| ore_coal / ore_iron / ore_diamond.png | default_mcl_core/minerals_ores/default_mineral_{coal,iron,diamond}.png |
| workbench_{top,side,front}.png | default_mcl_core/crafting_workbench_{top,side,front}.png |
| chest_{top,side,front}.png | default_mcl_core/default_chest_{top,side,front}.png |
| chest_{top,side,front}_big.png | mcl_chests/default_chest_{top,side,front}_big.png (rương đôi) |
| tallgrass.png | default_mcl_core/plants/default_grass_3.png |
| crack_0 … crack_4.png | CẮT: default_mcl_core/gui_hud/crack_anylength.png (16x80) |

### 3.2 Block mới

| Đích | Nguồn |
|---|---|
| gravel.png | default_mcl_core/stone/default_gravel.png |
| water.png | default_mcl_core/default_water.png |
| lava.png | default_mcl_core/default_lava.png |
| mossy_cobble.png | default_mcl_core/stone/default_mossycobble.png |
| sandstone.png | default_mcl_core/sand/default_sandstone.png |
| snow.png / snow_side.png | default_mcl_core/soil/default_snow.png / default_snow_side.png |
| fence.png | default_mcl_core/fences/default_fence_wood.png |
| rail.png, rail_curved.png, rail_t.png, rail_cross.png | carts_mcl_minecarts/default_rail.png, default_rail_curved.png, default_rail_t_junction.png, default_rail_crossing.png |
| cobweb.png | default_mcl_core/mcl_core_web.png |
| torch.png | default_mcl_core/default_torch_on_floor.png |
| furnace_front.png, furnace_front_on.png, furnace_side.png, furnace_top.png | default_mcl_core/default_furnace_front.png, default_furnace_front_active.png, default_furnace_side.png, default_furnace_top.png |
| glass.png | default_mcl_core/glass/default_glass.png |
| ladder.png | default_mcl_core/default_ladder_wood.png |
| door_lower.png / door_upper.png | doors_mcl_doors/mcl_doors_door_wood_lower.png / mcl_doors_door_wood_upper.png |
| farmland.png / farmland_wet.png | farming_mcl_farming/farming_soil.png / farming_soil_wet.png |
| wheat_0 … wheat_7.png | farming_mcl_farming/mcl_farming_wheat_stage_0.png … _7.png |
| deepslate.png / deepslate_top.png | mcl_deepslate/mcl_deepslate.png / mcl_deepslate_top.png |
| ore_gold.png | default_mcl_core/minerals_ores/default_mineral_gold.png (ghép lên đá như các quặng khác) |
| ore_gold_deep.png | mcl_deepslate/mcl_deepslate_gold_ore.png |
| ore_emerald.png | default_mcl_core/minerals_ores/mcl_core_emerald_ore.png |
| obsidian.png | default_mcl_core/stone/default_obsidian.png |
| bed_*.png | beds_mcl_beds/ — chọn bộ màu đỏ (red) cho mặt trên, bên, đầu, chân |
| sapling.png | tìm trong default_mcl_core/trees hoặc plants |

### 3.3 Vật phẩm → `/client/public/icons/`

| Đích | Nguồn |
|---|---|
| {wood,stone,iron,gold,diamond}_{pickaxe,axe,shovel,sword}.png | default_mcl_core/tools/default_tool_{wood,stone,steel,gold,diamond}{pick,axe,shovel,sword}.png |
| {…}_hoe.png | tìm trong farming_mcl_farming (cuốc đất) |
| stick.png | default_mcl_core/default_stick.png |
| coal.png | default_mcl_core/minerals_ores/default_coal_lump.png |
| raw_iron.png | default_mcl_core/minerals_ores/mcl_raw_ores_raw_iron.png |
| iron_ingot.png | default_mcl_core/minerals_ores/default_steel_ingot.png |
| diamond.png | default_mcl_core/minerals_ores/default_diamond.png |
| raw_gold.png / gold_ingot.png | default_mcl_core/minerals_ores/mcl_raw_ores_raw_gold.png / default_gold_ingot.png |
| emerald.png | default_mcl_core/minerals_ores/mcl_core_emerald.png |
| golden_apple.png | default_mcl_core/plants/mcl_core_apple_golden.png |
| apple.png | default_mcl_core/plants/default_apple.png |
| bread.png / seeds.png | farming_mcl_farming/farming_bread.png / mcl_farming_wheat_seeds.png |
| wheat.png | tìm trong farming_mcl_farming |
| {leather,iron,gold,diamond}_{helmet,chestplate,leggings,boots}.png | mcl_armor/mcl_armor_inv_{helmet,chestplate,leggings,boots}_{leather,iron,gold,diamond}.png |
| bow.png, bow_pull_0..2.png | mcl_bows/mcl_bows_bow.png, mcl_bows_bow_0.png, _1, _2 |
| arrow.png | mcl_bows/mcl_bows_arrow_inv.png |
| beef_raw / beef_cooked.png | mcl_mobitems/mcl_mobitems_beef_raw.png / _beef_cooked.png |
| chicken_raw / chicken_cooked.png | mcl_mobitems/mcl_mobitems_chicken_raw.png / _chicken_cooked.png |
| pork_raw / pork_cooked, rotten_flesh, string, feather, mutton… | tìm trong mcl_mobitems |
| bone.png / leather.png | mcl_mobitems/mcl_mobitems_bone.png / mcl_mobitems_leather.png |
| door.png | doors_mcl_doors/doors_door_wood.png |
| flint, shears, wool | tìm trong default_mcl_core, mcl_core, wool_mcl_wool |

Chú ý tên nguồn dùng "steel" cho cấp sắt. Vật phẩm dạng block thì vẽ khối 3D
nhỏ từ texture block.

### 3.4 Giao diện, nhân vật, sinh vật

| Đích | Nguồn |
|---|---|
| /client/public/ui/hotbar.png, hotbar_selected.png | default_mcl_core/gui_hud/gui_hotbar.png, gui_hotbar_selected.png |
| /client/public/entities/player.png | HUD/character.png (64x32) |
| entities/<tên>.png (mọi sinh vật) | client.jar `assets/minecraft/textures/entity/<đường dẫn ghi trong bảng mục 2.7>` |
| icons/effect_<tên>.png (hiệu ứng, từ 7b) | client.jar `assets/minecraft/textures/mob_effect/<tên>.png` |

- Skin sinh vật thêm vào `scripts/mc-texture-map.json` khi làm giai đoạn có sinh vật đó, không thêm trước.
- Nhiều sinh vật có skin con riêng (`*_baby.png`) và lớp phủ (`sheep_wool`, `drowned_outer_layer`,
  `stray_overlay`, `horse_markings_*`, mắt phát sáng `spider_eyes`, `enderman_eyes`, `phantom_eyes`).
- Model sinh vật không có file JSON trong client.jar (nằm trong code Java): tự dựng hộp theo bố cục UV của skin.


---

## 4. Các giai đoạn

### Giai đoạn 0 — Dựng khung (ĐÃ XONG)

Giữ nguyên. Nếu `.gitignore` chưa có `server/data/` thì thêm vào.

### Giai đoạn 1 — Thế giới voxel cơ bản (ĐÃ XONG, bản cố định)

Đã có: chunk, bảng block id 0–15, sinh địa hình bản đồ cố định, texture atlas,
mesh theo chunk, camera bay, nhập texture. Giai đoạn 2a sẽ thay phần bản đồ cố
định.

---

### Giai đoạn 2a — Thế giới vô hạn và biome

Chỉ ở client, chưa có mạng. Thiết kế sao cho Giai đoạn 5 chuyển việc sinh và
lưu chunk lên server dễ dàng. Hang, hầm mỏ, ánh sáng để sang 2b.

THẾ GIỚI VÔ HẠN
- Bỏ giới hạn 256x256. `World` quản lý chunk theo bảng băm tọa độ (cx, cz).
- Chiều cao 128. Chỉnh lại sinh địa hình theo mục 2.1.
- Tải chunk theo bán kính tầm nhìn quanh camera (mặc định 8, chỉnh được),
  ưu tiên chunk gần và chunk trước mặt. Gỡ mesh và dữ liệu chunk ra ngoài
  bán kính + 2.
- Chunk đã bị sửa thì giữ thay đổi trong bộ nhớ khi bị gỡ (Giai đoạn 5 sẽ lưu
  xuống đĩa ở server); quay lại phải còn nguyên.
- Sinh địa hình và dựng mesh trong Web Worker (có thể nhiều worker), không làm
  khựng luồng chính.
- Mọi bước sinh xác định theo seed + tọa độ, sinh được độc lập từng chunk.
- Debug tạm (chỉ để kiểm tra, Giai đoạn 3 thay bằng tương tác thật): với camera
  bay, chuột trái phá block đang nhắm, chuột phải đặt block.

BIOME, ĐỊA HÌNH, QUẶNG
- Biome theo bảng 2.1, chuyển tiếp mượt về độ cao, không có vách dựng đứng
  vô lý ở ranh giới. Mực nước biển 62, đại dương và hồ.
- Cây sinh xuyên ranh giới chunk đúng (cây ở mép chunk không bị cụt lá):
  quyết định vị trí cây theo seed + tọa độ, chunk nào chứa phần lá thì tự
  đặt phần đó.
- Quặng theo cụm (mục 2.1), sỏi, đá sâu dưới y = 8, đá nền y = 0.
- Nước là block tĩnh, vẽ bán trong suốt, mặt nước thấp hơn 1/8 block, không vẽ
  mặt tiếp giáp giữa hai block nước. Mô phỏng chảy làm ở Giai đoạn 4.
- Nước tự nhiên trên mặt đất theo mục 2.1: sông, hồ, mạch nước trên núi
  (mạch nước chỉ là một block nước cho tới Giai đoạn 4).

BLOCK CẦN CHO ĐỊA HÌNH
- Đánh số lại block theo bảng 2.2 (id 0–15 giữ nguyên). Thêm ở giai đoạn này:
  sỏi (16), nước (17), sa thạch (20), tuyết phủ (21), cây non (32, chỉ hình ảnh),
  đá sâu (34). Các block còn lại làm ở 2b.
- Cập nhật `scripts/mc-texture-map.json` cho các block này và chạy lại script nhập.

NGHIỆM THU
- Bay thẳng một hướng 2 phút: địa hình sinh liên tục, không khựng hình rõ rệt,
  bộ nhớ không tăng mãi.
- Bay xa rồi quay lại: block đã sửa vẫn còn.
- Thấy ít nhất 4 biome khác nhau và đại dương; ranh giới biome không có vách vô lý.
- Cây ở mép chunk không bị cụt.
- Đi/bay thấp vài phút trên mặt đất gặp được sông và hồ; có mạch nước trên vách núi.
- Nước sinh sẵn không có ô hở (trừ mạch nước).
- Cùng seed cho ra cùng thế giới.
- FPS 60 với tầm nhìn 8 chunk trên laptop thông thường.

---

### Giai đoạn 2b — Hang động, hầm mỏ, ánh sáng, block mới

Chỉ ở client. Dùng lại thuật toán hang, hầm mỏ, ánh sáng đã làm trên bản đồ
cố định (xem `PROGRESS.md`), chuyển sang sinh theo từng chunk.

HANG ĐỘNG
- Hang "sợi mì" và "phô mai" theo mục 2.1, hồ dung nham dưới y = 12, quặng lộ
  trên vách hang. Không đục đá nền, không đục ngay dưới đáy biển/hồ.
- Cửa hang lộ ra mặt đất: lập kế hoạch theo vùng (seed + tọa độ vùng), mỗi chunk
  chỉ đục phần thuộc về nó.
- Hồ ngầm, mạch nước trong hang, mạch dung nham (dưới y = 30) theo mục 2.1.
  Không đục hang ngay dưới đáy biển, sông, hồ.
- Quặng vàng (cả bản đá sâu) và quặng ngọc lục bảo ở núi theo mục 2.1.

HẦM MỎ BỎ HOANG
- Theo mục 2.9, lập kế hoạch theo vùng, liền mạch qua nhiều chunk. Rương trong
  hầm mỏ tạm thời chỉ cần tồn tại (Giai đoạn 4 mới điền đồ).

ÁNH SÁNG
- Hai kênh 0–15: ánh sáng trời (lan thẳng xuống, giảm 1 mỗi bước ngang) và
  ánh sáng block (đuốc 14, dung nham 15, lò đang cháy 13), lan bằng flood fill.
- Lưu ánh sáng theo chunk, tính trong Web Worker; khi đặt/phá block thì cập
  nhật cục bộ, kể cả xuyên chunk.
- Mesh đọc ánh sáng để tô màu đỉnh, giữ ambient occlusion.
- Ánh sáng trời nhân với hệ số độ sáng ban ngày (cố định 1.0 ở giai đoạn này;
  Giai đoạn 7 mới chạy đồng hồ ngày đêm), đổi bằng uniform trong shader.
- Đặt/phá đuốc bằng công cụ debug của 2a để kiểm tra.
- Ẩn đoạn chunk bị che khuất (hang) để giữ FPS.

BLOCK MỚI CÒN LẠI
- Thêm các block id còn thiếu trong 16–37 (chỉ dữ liệu và hình ảnh; hành vi
  đặc biệt như cửa, giường, lò, cây lớn làm ở Giai đoạn 4 và 7).
- Cập nhật `scripts/mc-texture-map.json` theo mục 3.2 và chạy lại script nhập.
- Hình dạng đặc biệt: hàng rào (cột + thanh nối), đường ray (tấm phẳng sát
  sàn, tự chọn thẳng/cong theo ray bên cạnh), đuốc (que nhỏ), cửa, thang (tấm
  phẳng sát tường), mạng nhện và cây non (chữ X), lúa mì (dạng #), giường
  (cao 9/16).

NGHIỆM THU
- Xuống lòng đất: hang nối nhau, không có hang cụt vuông vức, có hồ dung nham
  ở đáy; hang và hầm mỏ liền mạch qua ranh giới chunk.
- Gặp được hồ ngầm và mạch nước trên vách hang.
- Không có hang nào bị ngập nước kín do thủng đáy biển/sông/hồ.
- Tìm được hầm mỏ có đường ray (có đoạn cong/ngã rẽ), khung gỗ, mạng nhện, rương.
- Trong hang thì tối, đặt đuốc thì sáng vùng xung quanh; phá đuốc thì tối lại,
  kể cả khi đuốc ở sát ranh giới chunk.
- Cùng seed cho ra cùng thế giới.
- FPS không giảm quá 10% so với 2a, tầm nhìn 8 chunk.

---

### Giai đoạn 3 — Người chơi và tương tác block (chỉ client)

Chia hai phần 3a và 3b; người dùng chơi thử sau mỗi phần. Đọc thêm MECHANICS.md
mục 2 (di chuyển), 4 (công thức đào), 5.5 (sát thương rơi, chết đuối, dung nham —
chỉ lưu số).

### Giai đoạn 3a — Dữ liệu phụ, vật lý người chơi, hình dạng block

DỮ LIỆU PHỤ (mục 2.2)
- Mảng dữ liệu phụ trong chunk; hàm đọc/ghi block nhận và trả cả id lẫn dữ liệu
  phụ; gửi kèm sang worker sinh/dựng mesh.
- Sinh thế giới ghi dữ liệu phụ ngay khi sinh: ray hầm mỏ (thẳng/cong/ngã rẽ),
  đuốc trên cột.
- Mesh vẽ theo dữ liệu phụ: đuốc trên tường nghiêng, thang, cửa (hướng, mở),
  ray, giường, lúa theo giai đoạn, mặt trước lò nung/rương theo hướng, lò đang
  cháy phát sáng, mặt nước theo mức.
- Công cụ đặt block debug ghi dữ liệu phụ đúng (theo mặt được bấm, hướng nhìn).

VẬT LÝ
- Theo mục 2.6. Hàm bước vật lý đặt trong `/shared`, thuần túy và xác định,
  để server dùng lại.
- Va chạm AABB từng trục; hộp va chạm theo hình dạng thật (hàng rào nối nhau
  cao 1.5, đất cày, giường, cửa theo hướng và trạng thái mở).
- Tự bước lên bậc thấp; ngồi (Shift) không rơi khỏi mép.
- Bơi trong nước, leo thang, chậm lại trong mạng nhện, dung nham gây sát
  thương (chỉ lưu số máu, chưa hiển thị).
- Chunk chưa tải xong thì giữ người chơi đứng yên, không rơi xuyên đất.

NHẮM VÀ HÌNH ẢNH
- Pointer lock; raycast DDA trúng đúng hình dạng block (đuốc, ray, rào...);
  khung viền quanh block đang nhắm đúng hình dạng.
- Tâm ngắm, camera lắc khi đi, FOV tăng khi chạy nhanh.
- Màn hình ám xanh khi ở dưới nước.
- Phím F bật/tắt chế độ bay để debug.

NGHIỆM THU
- Không xuyên tường, không kẹt góc, không rung khi đứng sát tường.
- Nhảy lên được block cao 1, không lên được block cao 2; không nhảy qua hàng rào.
- Bơi, leo thang, đi qua mạng nhện hoạt động đúng.
- Ray hầm mỏ vẽ đúng thẳng/cong/ngã rẽ; đuốc đặt lên tường thì nghiêng.

### Giai đoạn 3b — Đào, đặt, chỗ bám, cát rơi

TƯƠNG TÁC
- Tầm với 4.5. Giữ chuột trái để đào theo công thức đào (MECHANICS.md mục 4,
  DESIGN.md mục 2.2; tay không), vết nứt 5 mức. Khi đang bay (phím F) thì phá
  tức thì.
- Chuột phải đặt block; không đặt chồng lên người chơi; kiểm tra chỗ bám khi đặt
  (mục 2.2). Đuốc đặt lên tường thì nghiêng.
- Block mất chỗ bám rơi ra (xử lý dây chuyền); cửa/giường phá một nửa thì mất cả
  hai (mục 2.2). Chưa có túi đồ nên ở giai đoạn này block chỉ biến mất; Giai
  đoạn 4 mới tạo vật phẩm rơi thật.
- Block chịu trọng lực (cát, sỏi) rơi xuống khi bên dưới trống.
- Tạm thời: phím 1–9 chọn loại block, số lượng vô hạn.
- Cánh tay vung khi đào/đặt.

NGHIỆM THU
- Đào/đặt ở biên chunk cập nhật đúng cả mesh và ánh sáng.
- Cát rơi xuống khi phá block bên dưới; đuốc bị cát đè thì rơi ra.
- Phá block dưới đuốc/ray/lúa thì chúng rơi theo, kể cả dây chuyền; phá nửa cửa
  thì mất cả cửa.
- Không đặt được đuốc lên lá/kính/không khí, lúa lên block khác đất cày.

---

### Giai đoạn 4 — Vật phẩm, chế tạo, lò nung, sinh tồn, trồng trọt (chỉ client)

Chia ba phần 4a, 4b, 4c; người dùng chơi thử sau mỗi phần. Đọc thêm MECHANICS.md
mục 3 (đói), 4 (công cụ), 9 (random tick), 10 (chất lỏng), 11 (vật phẩm rơi).

### Giai đoạn 4a — Vật phẩm, túi đồ, chế tạo, sinh tồn

VẬT PHẨM VÀ TÚI ĐỒ
- `/shared/items.ts`, `/shared/recipes.ts` theo mục 2.3–2.4; logic túi đồ trong `/shared`.
- 9 ô hotbar + 27 ô túi + 4 ô giáp; phím E mở túi đồ. Bấm trái nhấc/đặt chồng; bấm
  phải nhấc nửa/đặt 1; Shift+bấm chuyển nhanh. Hotbar thay cho chọn block vô hạn;
  đặt block trừ vào túi đồ.
- Icon: vật phẩm dùng icon riêng; block vẽ thành khối 3D nhỏ từ texture block.
- Vật phẩm rơi theo mục 2.3: khối nhỏ xoay, trọng lực, hút về người chơi, gộp chồng,
  biến mất sau 5 phút; phím Q vứt đồ.
- Đào ra vật phẩm theo cột "Rơi ra" mục 2.2 (tỉ lệ), chỉ khi đủ cấp công cụ; block
  mất chỗ bám rơi ra vật phẩm.
- Công cụ: hệ số tốc độ, yêu cầu cấp, độ bền (MECHANICS.md 4), vỡ khi hết.

CHẾ TẠO
- Theo mục 2.4: lưới 2x2 trong túi đồ, chuột phải vào bàn chế tạo mở lưới 3x3, hình
  xếp đúng thì ra thành phẩm; sổ công thức tự xếp nguyên liệu vào lưới; bố cục, thao
  tác chuột (kéo chia đều / kéo đặt 1, bấm đúp, phím số) và vật phẩm trên tay theo mục 2.4.

SINH TỒN
- Thanh máu, đói, dưỡng khí, giáp trên hotbar. Đói ba biến, hồi máu, mất máu vì
  đói (mục 2.6).
- Ăn: giữ chuột phải 1.6 giây (táo, bánh mì, táo vàng).
- Giáp: mặc vào 4 ô giáp, giảm sát thương theo công thức mục 2.3.
- Chết: màn hình chết, đồ văng ra tại chỗ, nút hồi sinh ở điểm hồi sinh thế giới,
  miễn sát thương 3 giây.
- Debug (?debug=1): hàm lấy đồ để thử nhanh.

NGHIỆM THU
- Chặt cây → ván → bàn chế tạo → que → cuốc gỗ → đào đá → đồ đá → đào được sắt thô
  (nung ở 4b); đào quặng bằng công cụ cấp thấp không rơi gì.
- Vật phẩm rơi, hút về người, gộp chồng, vứt bằng Q.
- Không nhân đôi/mất đồ khi thao tác túi đồ.
- Công cụ mất độ bền và vỡ.
- Chạy nhảy làm tụt đói; ăn táo hồi đói; đói cao thì hồi máu; đói 0 mất máu tới 1.
- Chết rồi hồi sinh, đồ nằm tại chỗ chết.

### Giai đoạn 4b — Rương, lò nung, cửa, trồng trọt

BLOCK CÓ CHỨC NĂNG
- `/shared/smelting.ts` theo mục 2.5. Nội dung rương/lò lưu theo chunk (giữ lại khi
  chunk bị gỡ khỏi bộ nhớ).
- Rương: 27 ô, chuột phải mở; rương hầm mỏ có đồ theo bảng trong `/shared`, xác
  định theo seed + vị trí; phá rương thì đồ bên trong rơi ra.
- Rương đôi theo mục 2.2: hai rương đơn cạnh nhau cùng hướng tự ghép, 54 ô, phá một
  nửa thì nửa kia giữ đồ.
- Lò nung: 3 ô, thanh lửa và thanh tiến độ, chạy cả khi đóng; phát sáng khi cháy.
- Cửa: chuột phải mở/đóng cả hai nửa.

RANDOM TICK VÀ TRỒNG TRỌT (MECHANICS.md 1, 9)
- Random tick ở các chunk gần người chơi.
- Cuốc đất biến đất/cỏ thành đất cày. Gieo hạt bằng chuột phải. Lúa lớn theo random
  tick, cần ánh sáng; lúa chín rơi lúa + 1–3 hạt. Đất cày ẩm/khô, nhảy lên có thể hỏng.
- Cây non lớn thành cây (cần ánh sáng, đủ chỗ trống).
- Cây trồng thêm (người dùng chọn 2026-11-12): cà rốt, khoai tây, củ cải đường, dưa hấu,
  bí ngô theo mục 2.2, 2.4–2.6 và DESIGN.md "Random tick và trồng trọt".
- Cỏ lan sang đất, cỏ bị che thành đất; lá xa thân gỗ tự rụng (lá người đặt không rụng).

NGHIỆM THU
- Đào sắt thô → nung thỏi sắt → đồ sắt; lò tiếp tục nung khi đóng giao diện; đặt đuốc
  trong hang.
- Trồng lúa → bánh mì; trồng cà rốt, khoai tây (nung thành khoai nướng), củ cải (súp);
  thân dưa / bí mọc quả ra ô bên cạnh.
- Không nhân đôi/mất đồ khi thao tác rương (cả rương đôi).
- Đặt hai rương cạnh nhau thành rương đôi 54 ô; phá một nửa thì đồ nửa kia còn nguyên.
- Chặt thân cây thì lá rụng dần; cây non lớn thành cây.

### Giai đoạn 4c — Chất lỏng, xô

- Mô phỏng chảy theo mục 2.10 và MECHANICS.md 10, chỉ ở chunk gần người chơi. Mạch
  nước/dung nham đã sinh sẵn tự chảy khi chunk được tải (quét ô chất lỏng hở).
- Mặt nước dốc theo mức; chất lỏng cuốn trôi đuốc, lúa, ray, cỏ cao, cây non (rơi ra
  vật phẩm); vật phẩm trôi theo dòng nước.
- Xô (người dùng chọn làm): múc và đổ nước/dung nham.

NGHIỆM THU
- Nước chảy và dừng đúng, tìm chỗ trũng; nguồn nước vô hạn; nước gặp dung nham tạo đá.
- Mạch nước/dung nham sinh sẵn chảy thành dòng/thác.
- Xô múc và đổ được.

---

### Giai đoạn 4d — Loài cây mới, hoa, xương rồng (làm sau 5a, trước 5b)

Thông số ở mục 2.13. Làm trước 5b vì đổi thế giới sinh ra (sau khi đã lưu thế giới, đổi bộ
sinh sẽ làm lệch chỗ đã xây với địa hình mới).

- Block + vật phẩm: thân gỗ, ván, lá, cây non của thông, bạch dương, keo; 4 loài hoa; xương rồng.
- Sinh thế giới: cây theo biome (bảng mục 2.13), hoa theo đám trên cỏ, xương rồng ở sa mạc;
  xác định theo seed + tọa độ, liền mạch qua chunk; cây non của từng loài lớn đúng loài.
- Công thức chung nhận thân / ván mọi loài (nhóm nguyên liệu trong `/shared/recipes.ts`);
  hoa → thuốc nhuộm, nung xương rồng → thuốc nhuộm xanh lá (thuốc nhuộm là vật phẩm từ 4d,
  đồ có màu ở 4e).
- Xương rồng: chỗ bám, vỡ khi có block cạnh, mọc theo random tick, gây sát thương khi chạm
  (sát thương do server tính từ 5c; tới lúc đó theo cách hiện tại của máu).
- Texture từ client.jar (`npm run import-textures`); thiếu thì vẽ tạm bằng canvas.
- Thêm số phiên bản bộ sinh thế giới (`WORLDGEN_VERSION` trong `/shared`) để 5b ghi vào file lưu.

NGHIỆM THU
- Đồng tuyết có rừng thông, rừng có xen bạch dương, đồng cỏ nóng có keo; cây liền mạch qua
  ranh giới chunk; cùng seed sinh ra giống hệt.
- Hoa mọc theo đám, hái được, đặt lại được, nước cuốn trôi; xương rồng trên sa mạc, chạm vào
  mất máu, đặt cạnh block thì vỡ.
- Chặt thân mọi loài ra ván đúng loài; ván mọi loài làm được que, bàn, rương, công cụ gỗ.
- Trồng cây non mỗi loài lớn thành đúng loài.

### Giai đoạn 4e — Bậc, tấm, tường, gỗ theo loài (làm sau 4d, trước 5b)

Người dùng chọn (2026-11-13): chia phần cũ "4e" làm hai lần chơi thử, 4e và 4f. Thông số ở mục 2.13.
Không đổi thế giới sinh ra.

- Hình dạng block mới: bậc (hướng, lật ngược, góc tự nối), tấm (dưới / trên / đôi), tường (nối
  như hàng rào). Mesh, va chạm, hộp nhắm, ánh sáng, chỗ bám cho từng hình.
- Vật liệu bậc / tấm / tường và gạch đá; hàng rào, cửa theo loài gỗ (thông, bạch dương, keo).
- Server kiểm tra và đồng bộ như mọi block khác (đặt bậc, ghép tấm đôi).

NGHIỆM THU
- Xây nhà bằng bậc / tấm / tường: đi lên cầu thang không cần nhảy, cầu thang tự thành góc, bậc
  lật ngược khi đặt vào nửa trên, hai tấm chồng thành tấm đôi, tường nối nhau.
- Hàng rào, cửa làm từ ván loài nào ra đúng loài đó; hàng rào khác loài nối với nhau.
- Hai người chơi thấy cùng một kết quả.

### Giai đoạn 4f — 16 màu, đồ sắt (làm sau 4e, trước 5b)

Thông số ở mục 2.13. Không đổi thế giới sinh ra.

- Hình dạng block mới: tấm kính và song sắt (nối hai bên), thảm, lồng đèn (sàn / treo), nút,
  cần gạt, lửa. Mesh, va chạm, hộp nhắm, ánh sáng, chỗ bám cho từng hình.
- Thuốc nhuộm trộn màu; len, thảm, kính màu, tấm kính màu, giường 16 màu (màu ở dữ liệu phụ);
  len từ 4 sợi tơ.
- Đồ sắt: kéo, bật lửa + lửa không lan, khối tài nguyên, mảnh sắt, lồng đèn, song sắt, tấm
  kính, cửa sắt mở bằng nút / cần gạt ở gần; tấm áp lực đá / gỗ (người dùng thêm 2026-11-13).
- Server kiểm tra và đồng bộ như mọi block khác (bấm nút, cửa sắt đóng mở, lửa tự tắt chạy
  trong tick server).

NGHIỆM THU
- Đủ 16 màu thuốc nhuộm; nhuộm len, thảm, kính, giường; kính màu nhìn xuyên được và ám màu.
- Kéo lấy lá và mạng nhện; bật lửa đốt lửa, lửa tự tắt, không lan sang nhà gỗ.
- Đặt cửa sắt + nút / cần gạt bên cạnh: bấm thì mở, nút tự đóng sau 1 giây; chuột phải vào
  cửa sắt không mở.
- Khối tài nguyên ↔ 9 món; lồng đèn sáng; song sắt và tấm kính nối nhau.
- Hai người chơi thấy cùng một kết quả (màu, cửa sắt, lửa).

---

### Giai đoạn 5 — Mạng nhiều người và lưu thế giới

Giai đoạn khó nhất. Không thêm tính năng gameplay mới.

Người dùng chọn (2026-11-12): chia 3 phần, người dùng chơi thử sau mỗi phần; bạn bè vào
qua Cloudflare Tunnel (một link công khai, không cần cài gì). Các mục bên dưới gốc của
Giai đoạn 5 được phân vào:

**5a — Server làm chủ thế giới, chơi chung qua link**
- Một cổng (8080): server HTTP phục vụ client đã build + WebSocket `/ws`. `npm run dev`
  vẫn dùng Vite (chuyển tiếp `/ws` sang server). `npm run host` = build rồi chạy server;
  `npm run share` = mở Cloudflare quick tunnel tới cổng đó (người dùng cài `cloudflared`).
- Vào game bằng tên (chưa mật khẩu — 5b). Tên đang online thì từ chối.
- Seed do server cấu hình. Client tự sinh địa hình theo seed (xác định); server gửi danh
  sách block đã sửa của từng chunk (kèm dữ liệu phụ) khi chunk vào tầm nhìn và phát mọi
  thay đổi block. Client không tự quyết nội dung chunk.
- Server mô phỏng các chunk quanh người chơi: random tick, chất lỏng, lò nung, cát rơi,
  vật phẩm rơi (nhặt, gộp, hút, cháy). Ánh sáng tính ở server (chuyển sang /shared).
- Mọi hành động là yêu cầu gửi server (đào, đặt, túi đồ, chế tạo, rương, lò, cửa, ăn,
  trồng trọt, xô); server kiểm tra (tầm với, có đồ, chỗ bám) rồi áp dụng và phát cho người
  ở gần. Client đoán trước đào / đặt để không thấy trễ; server sửa nếu khác. Túi đồ do
  server giữ (dùng chung logic /shared).
- Người chơi khác: model 6 phần + giáp + vật phẩm trên tay + tên trên đầu, nội suy trễ
  100 ms, tay chân đung đưa, đầu quay theo hướng nhìn.
- Tạm thời (đến 5c): di chuyển, máu, đói do client tính và báo lên server; thời gian đào
  chưa kiểm. Chết thì server rải đồ trong túi.
- Bộ đồ thử 64 món: chỉ khi server bật chế độ thử (cấu hình).
- NGHIỆM THU 5a: 2–3 tab và bạn bè qua link thấy nhau đi lại; đào / đặt / rương / lò /
  cửa / nước / cây trồng đồng bộ; nước chảy, cây lớn, lò chạy ở server (một người thoát
  thì người khác vẫn thấy); đồ rơi ai nhặt trước người đó có.

**5b — Lưu thế giới, đăng nhập**: mục SERVER VÀ LƯU TRỮ (lưu xuống /server/data, tự lưu,
ghi an toàn, chỉ giữ chunk gần người chơi) và ĐĂNG NHẬP (mật khẩu scrypt, quản trị viên;
phá tức thì / bay chỉ cho quản trị viên).
Chunk đã sửa lưu nguyên nội dung (không chỉ các ô khác bản sinh gốc) kèm `WORLDGEN_VERSION`, để
sau này đổi bộ sinh thế giới không làm lệch chỗ đã xây (đề xuất 2026-11-13).

**5c — Server tính di chuyển, chống gian lận, mạng trễ**: DI CHUYỂN (dự đoán + hiệu chỉnh,
server chạy vật lý từ input, kiểm thời gian đào), máu / đói tính ở server, gói nhị phân cho
gói thường xuyên, DEBUG (F3 mạng, FAKE_LAG_MS, FAKE_LOSS_PCT) và các mục nghiệm thu còn lại.

SERVER VÀ LƯU TRỮ
- Một thế giới chung, vòng lặp 20 tick/giây.
- Server sinh chunk theo yêu cầu bằng code trong `/shared` (có thể chạy trong
  worker thread). Chỉ giữ trong bộ nhớ các chunk gần người chơi online.
- Lưu xuống `/server/data/<tên thế giới>/`:
  - `world.json`: seed, giờ trong ngày, điểm hồi sinh;
  - chunk đã bị sửa: mỗi vùng 32x32 chunk một file, nén (zlib), chỉ lưu chunk
    khác với bản sinh gốc;
  - chunk lưu cả dữ liệu phụ (mục 2.2) cùng với id block;
  - nội dung rương, lò nung, vật phẩm rơi;
  - người chơi: vị trí, máu, đói, túi đồ, điểm hồi sinh, theo tên đăng nhập.
- Tự lưu mỗi 60 giây và khi tắt server (bắt SIGINT/SIGTERM). Ghi file an toàn
  (ghi file tạm rồi đổi tên) để mất điện không hỏng thế giới.
- Khởi động lại server thì mọi thứ còn nguyên.

ĐĂNG NHẬP
- Màn hình vào game: nhập tên + mật khẩu đơn giản (băm bằng scrypt ở server,
  lưu trong `/server/data`). Lần đầu nhập tên thì tạo tài khoản.
- Một tên chỉ đăng nhập được một nơi cùng lúc.
- Danh sách quản trị viên trong file cấu hình server.

GIAO THỨC
- Mọi gói tin định nghĩa trong `/shared/protocol.ts`, có kiểu.
- Nhị phân cho gói thường xuyên; JSON cho gói hiếm.
- Server gửi chunk cho client theo bán kính tầm nhìn: chỉ gửi danh sách block
  khác bản sinh gốc kèm seed nếu client sinh được, hoặc gửi chunk nén nếu
  nhanh hơn. Client không tự quyết định nội dung chunk.
- Gói chunk và gói thay đổi block luôn kèm dữ liệu phụ của block.

DI CHUYỂN VÀ HÀNH ĐỘNG
- Client dự đoán + server hiệu chỉnh (reconciliation) như thiết kế chuẩn;
  người chơi khác nội suy trễ 100 ms.
- Server chạy cùng hàm vật lý với input nhận được; không tin vị trí client gửi.
- Phá block tức thì (như khi đang bay ở Giai đoạn 3b) chỉ server cho phép với
  quản trị viên; người chơi thường phải đào đủ thời gian.
- Mọi hành động (đào, đặt, túi đồ, chế tạo, lò nung, rương, cửa, ăn, trồng
  trọt) do server kiểm tra rồi phát cho người chơi ở gần.
- Chất lỏng, cây lớn, lúa lớn, lò nung chạy ở server.

NGƯỜI CHƠI KHÁC
- Model khối 6 phần dùng `player.png`, tay chân đung đưa, đầu quay theo hướng
  nhìn, cầm vật phẩm, tên trên đầu.

DEBUG
- F3: ping, gói tin/giây, số lần hiệu chỉnh, số chunk đang giữ.
- Biến môi trường `FAKE_LAG_MS`, `FAKE_LOSS_PCT`.

NGHIỆM THU
- 3 tab thấy nhau di chuyển mượt; đào/đặt/rương/lò nung đồng bộ.
- `FAKE_LAG_MS=150`: điều khiển vẫn mượt, không giật lùi khi đi thường.
- Xây một ngôi nhà, tắt server, bật lại: nhà còn, túi đồ còn, vị trí còn.
- Hai người đi xa nhau 500 block theo hai hướng: cả hai vẫn mượt, bộ nhớ
  server không tăng mãi.
- Sửa client để gian lận (tăng tốc, đào tức thì, tự thêm đồ): server chặn.

---

### Giai đoạn 6 — Chiến đấu PvP và hồi sinh

Chia làm 2 phần (người dùng chọn 2026-11-14): **6a** cận chiến, chat + thông báo chết, PvP on/off, vùng an toàn,
lệnh quản trị, nháy đỏ / rung màn hình; **6b** cung tên, âm thanh, hạt chí mạng. Hồi đòn theo từng vũ khí
(MECHANICS 5.1). Bỏ viền đỏ chỉ hướng bị đánh (người dùng chọn 2026-11-14). `/time` để sang Giai đoạn 7.
Người dùng thêm vào 6a (2026-11-14): khiên + ô tay trái (F đổi tay, nhấn đúp Space bật/tắt bay), quét kiếm,
giáp mòn theo sức mạnh đòn — xem DESIGN.md "Chiến đấu, chat".
6b (người dùng chọn 2026-11-14): không làm âm thanh; mũi tên chỉ lấy bằng `/give` tới Giai đoạn 7 (lông gà).

Mọi tính toán sát thương ở server. Thông số theo mục 2.8.

CẬN CHIẾN
- Thanh hồi đòn dưới tâm ngắm; server kiểm tra tầm (≤ 3.5 có dung sai), hồi
  đòn, tầm nhìn không bị chắn, thời gian miễn sát thương.
- Bù trễ: lưu lịch sử vị trí 1 giây, tua lại tối đa 250 ms.
- Knockback do server áp dụng.

CUNG TÊN
- Kéo/thả, icon đổi theo 3 mức; mũi tên là thực thể server mô phỏng, kiểm tra
  va chạm theo đoạn thẳng giữa hai tick; cắm vào block thì nhặt lại được.

GIÁP, CHẾT, HỒI SINH
- Giáp hiện trên model (tô màu đè lên từng phần cơ thể).
- Chết: rơi toàn bộ đồ, thông báo trong chat, màn hình chết với nút hồi sinh.
- Hồi sinh ở điểm hồi sinh thế giới (Giai đoạn 7 thêm giường).

LUẬT SERVER
- `PVP=on|off`. Vùng an toàn quanh điểm hồi sinh theo mục 2.8.
- Lệnh chat cho quản trị viên: `/tp <tên>`, `/kick <tên>`, `/pvp on|off`,
  `/time set day|night`, `/give <tên> <vật phẩm> <số>`.

PHẢN HỒI
- Nháy đỏ, rung màn hình, viền đỏ chỉ hướng, hoạt ảnh vung vũ khí, âm thanh
  3D (trúng, chí mạng, bắn, tên cắm, chết), hạt chí mạng.

NGHIỆM THU
- Hai tab đánh nhau: máu trừ đúng theo bảng sát thương và giáp.
- `FAKE_LAG_MS=150`: đánh trúng người đang chạy ngang vẫn tính.
- Không đánh xuyên tường, không đánh nhanh hơn hồi đòn.
- Trong vùng an toàn và khi `PVP=off`: không gây sát thương cho nhau.
- Chết rồi hồi sinh: đồ nằm lại chỗ chết, quay lại nhặt được.

---

### Giai đoạn 7 — Ngày đêm, động vật, quái vật, giường

Chia 4 phần (2026-11-14, sau khi bổ sung danh sách sinh vật đầy đủ ở mục 2.7). Mỗi phần là một
giai đoạn riêng: làm xong, người dùng chơi thử, rồi mới sang phần sau.

### Giai đoạn 7a — Ngày đêm, hệ thống thực thể, giường, 7 sinh vật cơ bản

NGÀY ĐÊM
- Đồng hồ server theo mục 2.7, lưu trong `world.json`.
- Màu trời, sương mù, mặt trời/mặt trăng, độ sáng ánh sáng trời đổi theo giờ.
  Đổi độ sáng bằng uniform trong shader, không dựng lại mesh.

HỆ THỐNG THỰC THỂ
- Thực thể chung cho sinh vật: vị trí, vận tốc, máu, hộp va chạm, dùng chung
  vật lý với người chơi. Server mô phỏng, client nội suy.
- Model khối theo từng loại, dùng skin ở mục 3.4, có hoạt ảnh đi. Model gốc nằm trong code Java của
  client.jar (không có file JSON), nên tự dựng các hộp theo bố cục UV của từng skin.
- Thiết kế để thêm loài mới ở 7b–7d chỉ cần: một dòng trong bảng dữ liệu `/shared` (máu, kích thước,
  tốc độ, nơi sinh, rơi ra), một model, một bộ hành vi ghép từ các khối có sẵn (đi lang thang, chạy trốn,
  đuổi đánh, bắn xa, bay, bơi).
- Tìm đường A* trên lưới block (giới hạn số nút mỗi tick để không làm chậm
  server), nhảy lên bậc 1 block, tránh rơi vực và dung nham.

SINH VẬT
- Xác sống (kèm xác sống con), bộ xương, nhện, lợn, bò, cừu, gà theo mục 2.7 và MECHANICS.md mục 8:
  luật sinh, giới hạn số lượng, hành vi, vật phẩm rơi.
- Lợn, bò, gà có 3 biến thể skin theo nhiệt độ biome (MECHANICS.md mục 8).
- Quái cháy dưới nắng (trừ khi đứng trong bóng râm hoặc nước).
- Bộ xương bắn tên dùng chung hệ thống mũi tên của Giai đoạn 6.
- Động vật: chạy khi bị đánh; cầm lúa mì thì chúng đi theo; cừu tỉa lông
  bằng kéo (kéo có từ 4e); gà đẻ trứng.
- LỰA CHỌN (hỏi người dùng đầu 7a): phối giống động vật (MECHANICS.md mục 8). Không phối giống thì động
  vật chỉ có từ lúc tạo chunk, giết hết là hết.
- Thêm theo mục 2.13 "Thêm ở GĐ 7", phần 7a.
- Giáp và kiếm gây sát thương lên sinh vật như lên người chơi.

GIƯỜNG
- Chế tạo, đặt (2 block theo hướng nhìn), ngủ, đặt điểm hồi sinh, tua đêm
  theo mục 2.7. Giường bị phá thì điểm hồi sinh về điểm của thế giới.

ÂM THANH
- Tiếng từng loại sinh vật khi đứng yên, khi bị đánh, khi chết.

NGHIỆM THU
- Ở ngoài trời một đêm: quái sinh ra quanh mình, sáng ra quái cháy.
- Đặt đuốc kín quanh nhà: quái không sinh trong nhà.
- Quái đuổi theo được qua địa hình gồ ghề, không đi xuyên tường, không kẹt mãi.
- Giết bò ra da và thịt; nung thịt chín ăn được.
- Ngủ giường: hồi sinh đúng chỗ giường; hai người cùng ngủ thì tua sáng.
- 4 người chơi online, mỗi tick server vẫn dưới 20 ms.

### Giai đoạn 7b — Quái thêm, hiệu ứng trạng thái, vụ nổ

- Quái theo mục 2.7 cột GĐ = 7b: quái nổ, kẻ hư không (+ ngọc hư không, mọt hư không), khối nhầy, xác khô,
  xác đuối, bộ xương băng, nhện hang, bóng ma đêm, phù thủy, mọt đá. Chỉ số và cơ chế: MECHANICS.md mục 8.
- Trọng số chọn loài khi sinh quái, đổi theo biome (MECHANICS.md mục 8).
- Hiệu ứng trạng thái (MECHANICS.md mục 15): độc, chậm, yếu, đói (đã có), buồn nôn. Biểu tượng hiệu ứng và
  thời gian còn lại trên HUD (icon `textures/mob_effect/` trong client.jar). Uống sữa thì hết.
- Vụ nổ (MECHANICS.md mục 16): phá block, sát thương theo khoảng cách, đẩy văng. Cấu hình server
  `MOB_GRIEFING=on|off` (mặc định on). Vùng an toàn không bị phá block.
- Sinh thế giới thêm (theo seed + tọa độ, liền mạch qua chunk): đá nhiễm ở núi; lồng sinh quái nhện hang
  trong hầm mỏ. Chunk đã lưu từ trước không có — chỉ chunk mới tạo mới có.
- Thêm theo mục 2.13 "Thêm ở GĐ 7", phần 7b.

NGHIỆM THU
- Quái nổ áp sát thì nổ: phá block (khoảng 1/3 số block rơi ra), sát thương giảm theo khoảng cách, giáp
  giảm được; trong vùng an toàn và khi `MOB_GRIEFING=off` thì không phá block.
- Nhìn vào mặt kẻ hư không thì nó tức và dịch chuyển tới; bắn tên không trúng nó; đứng dưới nước nó không đánh được.
- Tìm được chunk nhầy dưới y = 40; đánh khối nhầy to thì tách thành nhỏ.
- Sa mạc ban đêm gặp xác khô, đồng tuyết gặp bộ xương băng, sông gặp xác đuối.
- Hầm mỏ có lồng nhện hang; thắp đuốc quanh lồng thì ngừng sinh; bị cắn thì trúng độc, uống sữa thì hết.
- 3 ngày không ngủ thì bóng ma đêm xuất hiện; ngủ một đêm thì hết.
- Đào trúng đá nhiễm ở núi thì ra mọt đá.
- 4 người chơi online, mỗi tick server vẫn dưới 20 ms.

### Giai đoạn 7c — Động vật thêm, sinh vật dưới nước, dơi

- Sinh vật theo mục 2.7 cột GĐ = 7c: thỏ, sói, cáo, dê, gấu trắng, lạc đà không bướu, tatu, dơi, mực, mực
  phát sáng, cá tuyết, cá hồi, cá nóc, cá nhiệt đới, cá heo. Biến thể skin theo biome (MECHANICS.md mục 8).
- Sói thuần: đi theo chủ, chuột phải để ngồi / đứng, dịch chuyển về cạnh chủ khi bị bỏ xa > 12 block, đánh
  thứ chủ đánh hoặc thứ đánh chủ; lưu chủ theo tài khoản (5b).
- Bơi cho thực thể: cá và mực chỉ ở trong nước (lên cạn thì ngạt); cá heo phải ngoi lên thở.
- Sinh vật dưới nước và dơi sinh lại liên tục theo giới hạn riêng (MECHANICS.md mục 8).
- Thêm theo mục 2.13 "Thêm ở GĐ 7", phần 7c.

NGHIỆM THU
- Thuần sói bằng xương; sói đi theo, ngồi khi bấm, đánh quái mình đánh; thoát game vào lại vẫn là sói của mình.
- Mỗi biome có đúng động vật và đúng biến thể (cáo tuyết và thỏ trắng ở đồng tuyết, thỏ vàng ở sa mạc,
  lợn / bò / gà lạnh và ấm, sói theo biome).
- Biển có cá, mực, cá heo; múc cá bằng xô rồi thả ra được; nung cá ăn được.
- Dê húc người văng khỏi mép vách; đánh gấu con thì gấu mẹ tấn công.
- Dơi bay trong hang; 4 người chơi online, mỗi tick server vẫn dưới 20 ms.

### Giai đoạn 7d — Cưỡi thú

- Ngựa (7 màu × 5 kiểu vết), lừa, la theo mục 2.7. Thuần bằng cách cưỡi nhiều lần (bị hất xuống
  vài lần), cho ăn lúa mì / táo / táo vàng thì hồi máu và dễ thuần hơn. Đặt yên mới điều khiển được.
- Hệ thống cưỡi dùng chung: server mô phỏng thú cưỡi theo phím của người cưỡi, dùng chung đường di chuyển
  và chống gian lận của 5c; người khác thấy mượt. Nhảy giữ phím để tích lực. Xuống bằng phím ngồi (Shift).
- Lừa và la chở rương 15 ô (đặt rương lên lừa); mở bằng túi đồ khi đang cưỡi.
- Dây dắt: dắt động vật, buộc vào hàng rào; đi quá 10 block thì đứt.
- La chỉ có nếu đã chọn có phối giống ở 7a; không thì bỏ la.
- Thêm theo mục 2.13 "Thêm ở GĐ 7", phần 7d.

NGHIỆM THU
- Thuần một con ngựa, đặt yên, cưỡi chạy và nhảy qua rào.
- Người khác thấy người cưỡi ngựa đi mượt, không giật; xuống ngựa đúng chỗ.
- Lừa chở rương, mở được túi đồ của lừa; đồ trong đó vẫn còn sau khi server khởi động lại.
- Dắt động vật bằng dây, buộc vào hàng rào.

---

### Giai đoạn 7e — Công cụ nhập mẫu công trình, công trình trên mặt đất (người dùng chọn 2026-11-14)

> GHI CHÚ 2026-11-15 (người dùng chọn khi làm 7e): kim tự tháp sa mạc, lều tuyết, trại bỏ hoang — cả thế giới mỗi loại chỉ 1–2
> cái (gần gốc); cổng đổ nát giữ mật độ Minecraft. Lều tuyết chỉ ở đồng bằng tuyết (thêm: phần lạnh nhất biome tuyết không cây).
> Công trình mọc ra cả ở vùng đã đi qua nhưng chưa sửa. Chi tiết: DESIGN.md mục "Công trình".

Thứ tự công trình theo danh sách Structures của Minecraft wiki: làm trước những gì đã đủ block / biome / quái; công trình cần
hệ thống mới để sau (7f, 8, 8c–8h, 10, 11). Hầm mỏ, nhà phù thủy, hầm quái đã có.

- Công cụ đọc file mẫu `.nbt` trong client.jar (`data/minecraft/structure/...`; gzip + NBT, đọc bằng zlib có sẵn của Node, không
  thêm thư viện), đổi tên block Minecraft sang block của game theo một bảng (block chưa có: thay bằng block gần giống, ghi danh
  sách các block bị thay). Dữ liệu mẫu sinh ra nằm cùng texture trong `client/public_mc` (được commit từ 2026-11-23). Dùng lại cho 7f, làng (8a), tiền đồn (8b).
- Đặt công trình xác định theo seed + tọa độ vùng, sinh độc lập từng chunk mà vẫn liền qua ranh giới chunk (như nhà phù thủy).
- Lều tuyết (đồng tuyết): thêm khối tuyết, băng nếu chưa có; tầng hầm (dân làng xác sống, thầy tu) để tới 8a.
- Cổng đổ nát (mọi biome, có cả dưới đất / dưới nước): đá vỏ chai (thiếu: đá vỏ chai khóc, đá lửa, đá magma → thay tạm), rương
  vàng; chưa kích hoạt được tới khi có Giai đoạn 10.
- Kim tự tháp sa mạc: thêm đá cát khắc / cắt, đất nung màu nếu cần; bẫy tấm áp lực đá → nổ TNT bên dưới; 4 rương. Cát khả nghi
  (khảo cổ) để tới giai đoạn khảo cổ.
- Trại bỏ hoang: chỉ dùng mẫu của các biome game có; đọc kỹ mẫu trong jar trước khi làm (bản mới, chưa rõ chi tiết).
- Bảng đồ trong rương từng công trình (theo kiểu LootTable đã có).

NGHIỆM THU
- Tìm được lều tuyết, cổng đổ nát, kim tự tháp sa mạc, trại bỏ hoang; công trình vắt qua ranh giới chunk vẫn liền.
- Dẫm tấm áp lực trong kim tự tháp thì TNT nổ; mở các rương có đồ đúng bảng.
- Thế giới đã khám phá không bị đổi (chỉ chunk mới có công trình) — LỰA CHỌN hỏi người dùng nếu cần đổi WORLDGEN_VERSION.

### Giai đoạn 7f — Công trình dưới nước

> GHI CHÚ 2026-11-15 (người dùng chọn): bỏ kho báu chôn và bản đồ kho báu; tàu đắm, tàn tích đại dương mỗi loại 1–2 cái cả thế giới.

- Tàu đắm (đại dương, bãi biển): nhiều mẫu gỗ, rương đồ tiếp tế / "bản đồ" / kho báu.
- Tàn tích đại dương lạnh / ấm: gạch đá, đá cát; xác đuối canh; rương. Sỏi / cát khả nghi để tới giai đoạn khảo cổ.

NGHIỆM THU
- Lặn biển tìm được tàu đắm và tàn tích đại dương; mở được rương; tàn tích lớn có xác đuối canh.

---

### Giai đoạn 8 — Làng và dân làng

Chia 2 phần (2026-11-14).

### Giai đoạn 8a — Làng, dân làng và sinh vật trong làng

- Theo mục 2.11. Công trình định nghĩa bằng dữ liệu trong `/shared/structures`;
  viết thêm công cụ nhỏ để lưu một vùng block trong game thành file công trình
  (lệnh quản trị viên `/structure save <tên> x1 y1 z1 x2 y2 z2`), giúp người
  dùng tự thiết kế nhà.
- Làng vắt qua nhiều chunk phải liền mạch (lập kế hoạch theo vùng như hầm mỏ).
- Dân làng: thực thể dùng chung hệ thống Giai đoạn 7; giao diện trao đổi;
  vật phẩm ngọc lục bảo.
- Sinh vật theo mục 2.7 cột GĐ = 8a: người sắt, mèo, dân làng xác sống, thương nhân lang thang (kèm 2 lạc đà
  không bướu), lạc đà ở làng sa mạc.
- LỰA CHỌN (hỏi người dùng đầu 8a): giữ đơn giản — quái không tấn công dân làng, dân làng xác sống chỉ sinh
  tự nhiên — hay theo bản gốc: xác sống đuổi đánh dân làng, dân làng bị giết thì 50% thành dân làng xác sống.

NGHIỆM THU
- Đi khám phá tìm được làng trong vòng vài phút bay.
- Nhà đặt khớp mặt đất, không lơ lửng, không bị chôn.
- Đổi đồ với dân làng hoạt động, đồng bộ giữa nhiều người.
- Tự lưu một ngôi nhà mình xây thành công trình, xuất hiện trong làng mới sinh.
- Người sắt đánh quái tới gần làng; đánh dân làng thì người sắt đánh mình.
- Mèo hoang trong làng thuần được bằng cá; quái nổ tránh xa mèo.

### Giai đoạn 8b — Kẻ cướp và cuộc cướp làng

> CHUYỂN HƯỚNG (người dùng chọn 2026-11-15): bỏ điềm xấu và cuộc cướp làng. 8b chỉ còn kẻ cướp (nỏ), tiền đồn kẻ cướp (có lồng
> nhốt tiểu linh / allay) và đội tuần tra 2–5 tên (đội trưởng đeo cờ) như Minecraft; NGHIỆM THU phần cướp làng bỏ. Đao phủ, pháp
> sư, tiểu quỷ, vật tổ bất tử chuyển sang 8c (dinh thự rừng). Sau 8b làm luôn 8c: thêm biome rừng sồi tối (bộ gỗ sồi tối), dinh
> thự dựng theo thuật toán lưới phòng của Minecraft từ 73 mẫu trong client.jar, cả thế giới 1–2 cái gần gốc.

- Tiền đồn kẻ cướp: công trình theo vùng (đồng cỏ, sa mạc, núi), có lồng nhốt tiểu linh.
- Đội tuần tra 2–5 kẻ cướp, đội trưởng đeo cờ; hạ đội trưởng thì bị hiệu ứng "điềm xấu" (icon `bad_omen`).
- Đang có điềm xấu mà vào làng thì cuộc cướp làng bắt đầu: nhiều đợt kẻ cướp, đao phủ, phù thủy, quái tàn phá,
  pháp sư (đợt sau mạnh hơn); thanh tiến độ trên màn hình; dân làng trốn vào nhà. Hết đợt cuối thì thắng.
- Sinh vật theo mục 2.7 cột GĐ = 8b; vật phẩm theo mục 2.13 "Thêm ở GĐ 7", phần 8b.

NGHIỆM THU
- Tìm được tiền đồn; phá lồng thì tiểu linh nhặt đồ mang về cho mình.
- Hạ đội trưởng tuần tra rồi vào làng thì cướp làng bắt đầu; đủ đợt, thắng hoặc thua đều kết thúc gọn.
- Vật tổ bất tử cứu mình khỏi chết đúng một lần.

---

### Giai đoạn 8b2 — Kinh nghiệm, sách, bàn phù phép (người dùng yêu cầu 2026-11-15, làm trước 8c)

- Kinh nghiệm (MECHANICS.md mục 12): quả cầu XP rơi khi giết quái / động vật, đào quặng (than, kim cương, ngọc lục bảo, lưu ly...),
  nung đồ, phối giống, đổi đồ với dân làng; thanh cấp trên HUD. Người dùng chọn: chết KHÔNG mất XP.
- Mía (người dùng chọn: như Minecraft): mọc tự nhiên cạnh nước trên cát / đất / cỏ, cao 1–4, trồng được, tự mọc cao thêm.
  Mía → giấy (3 → 3), sách (3 giấy + 1 da), giá sách (6 ván + 3 sách; phá ra 3 sách).
- Quặng lưu ly + viên lưu ly + khối lưu ly.
- Bàn phù phép (1 sách + 2 kim cương + 4 hắc diện thạch): 3 lựa chọn theo cấp, tốn 1–3 lưu ly + 1–3 cấp; giá sách quanh bàn (tối đa
  15, cách 1 ô) nâng mức tới 30. Phù phép cho đồ đang có (vũ khí, công cụ, giáp, cung, nỏ, sách); bỏ phù phép của chỉ câu / đinh ba.
  Hiệu ứng thật cho từng loại; ánh tím trên đồ đã phù phép.

NGHIỆM THU
- Giết quái / đào quặng có XP, lên cấp; chết vẫn giữ XP.
- Tìm mía cạnh nước, làm sách, giá sách; bàn phù phép có giá sách quanh thì mức cao hơn.
- Phù phép kiếm / cuốc / giáp / cung, thấy ánh tím, hiệu ứng có thật (sắc bén đánh đau hơn, hiệu suất đào nhanh hơn...).

### Giai đoạn 8b3 — Đe, sách phù phép, đá mài (người dùng yêu cầu 2026-11-15)

- Sách phù phép (từ bàn phù phép, trong rương công trình, thủ thư làng bán); đe: gộp sách vào đồ, gộp hai đồ, sửa, đổi tên, tốn
  cấp; đá mài: gỡ phù phép, trả lại một ít XP, gộp sửa hai đồ cùng loại.

NGHIỆM THU
- Gộp sách phù phép vào đồ bằng đe; sửa đồ; đá mài gỡ phù phép; thủ thư bán sách phù phép.

### Giai đoạn 8c–8h — (Tùy chọn) Công trình lớn

Chỉ làm khi người dùng yêu cầu; mỗi mục là một giai đoạn riêng, theo thứ tự (người dùng chọn 2026-11-14):

1. 8c — Dinh thự rừng: biome rừng sồi tối, đao phủ / pháp sư / vex (dùng lại kẻ cướp 8b), linh hồn hỗ trợ (allay).
   Người dùng yêu cầu làm (2026-11-15), ngay sau 8b rút gọn; 1–2 dinh thự cả thế giới; vật tổ bất tử ở đây (pháp sư rơi).
2. 8d — Đền rừng rậm: biome rừng rậm (tre, vẹt, mèo rừng, gấu trúc nếu người dùng muốn), máy bắn, dây bẫy, đá đỏ cơ bản.
3. 8e — Đền đại dương: vệ binh, vệ binh già (mỏi tay), lăng trụ biển, đèn biển, bọt biển.
4. 8f — Khảo cổ + tàn tích đường mòn: cọ, cát / sỏi khả nghi (bổ sung vào kim tự tháp sa mạc, tàn tích đại dương), mảnh gốm.
5. 8g — Phòng thử thách: gió, bộ xương đầm lầy, lồng thử thách, két, khối đồng, chùy.
6. 8h — Thành phố cổ: biome vực sâu tối, khối sculk, Warden.

NGHIỆM THU 8c (thêm 2026-11-15 khi làm 8c)
- Tìm được rừng sồi tối (tán sồi tối thân 2 × 2); chặt được gỗ sồi tối, làm ván / bậc / tấm / hàng rào / cửa; trồng 4 cây non sồi tối xếp
  2 × 2 thì lớn thành cây.
- Tìm được dinh thự rừng (cả thế giới 1–2 cái, gần gốc nhất có thể): 2–3 tầng, hành lang, nhiều phòng, mái; vắt qua chunk vẫn liền,
  không lơ lửng (móng đá cuội); rương có đồ.
- Trong dinh thự có đao phủ (rìu, đánh đau), pháp sư (gọi tiểu quỷ, tung nanh từ đất), tiểu linh trong phòng giam; tiểu quỷ bay xuyên
  tường và tự chết sau một lúc.
- Giết pháp sư được vật tổ bất tử; cầm vật tổ (tay nào cũng được) thì chết một lần được cứu, vật tổ mất.

Pháo đài (stronghold) đi cùng Giai đoạn 10 / 11 vì cần mắt ender (bột quỷ lửa từ Vực Lửa) và cổng Cõi Hư Không.

---

### Giai đoạn 9 — Hoàn thiện và phát hành

> GHI CHÚ 2026-11-16 (người dùng chọn): chia 5 phần 9a → 9b → 9c → 9d → 9e, mỗi phần người dùng test xong mới làm phần sau.
> KHÔNG làm âm thanh / nhạc nền. CÓ bản đồ nhỏ. Nơi chạy server (máy nhà + Cloudflare tunnel hay VPS + Docker) chốt trước 9e — người dùng chọn 2026-11-16: trước mắt chạy trên máy nhà + Cloudflare tunnel.
> Đã có sẵn từ trước (không làm lại): hạt chí mạng / nổ / bắn nước / cổng (particles.ts); ẩn đoạn ngoài khối nhìn + bị che
> (sectionCuller.ts); server chỉ gửi sinh vật / người chơi trong tầm nhìn (MOB_AI.VIEW, NET.PLAYER_VIEW); bỏ gói JSON lỗi; tọa độ trong F3.

### Giai đoạn 9a — Menu chính, menu Esc, chế độ quản trị (người dùng yêu cầu 2026-11-16, làm trước tiên)

- Menu chính thay màn hình vào game: danh sách server (giống Minecraft): mục cố định "Server này" (địa chỉ trang đang mở) + các server
  người chơi tự thêm (tên + link, ví dụ link Cloudflare của bạn bè); thêm / sửa / xóa, lưu localStorage (bọc try/catch). Mỗi server hiện
  trạng thái: đang chạy (số người đang chơi) / không kết nối được / khác phiên bản. Chọn server → nhập tên + mật khẩu (tài khoản riêng
  từng server) → vào. Link nhập kiểu nào cũng được (abc.trycloudflare.com, https://..., wss://.../ws). Trang https không vào được server
  ws:// thì báo rõ. Server có thêm địa chỉ /status (JSON: phiên bản, số người) cho phép trang khác đọc.
- Menu Esc: khi thả chuột (Esc) mà không mở túi đồ / chat / giao dịch / ngủ / màn hình chết → menu "Tiếp tục" / "Thoát về menu chính"
  (thay dòng "Bấm vào màn hình để điều khiển"; phím điều khiển vẫn ghi trong menu). Thoát: đóng kết nối (server lưu người chơi), về menu
  chính. Mất kết nối: bảng báo có nút "Về menu chính" (tự kết nối lại để 9b).
- Ẩn bảng thông số chữ trắng góc trái trên màn hình (FPS, tọa độ, chunk, F3 mạng...) với người chơi thường.
- Lệnh /admin (AI CŨNG DÙNG ĐƯỢC — người dùng chọn 2026-11-16): bật / tắt chế độ quản trị cho chính mình, cả server được báo "X bật /
  tắt chế độ quản trị". Lưu theo người chơi (thoát vào lại vẫn giữ). Tên trong "admins" của config.json bật sẵn lần đầu. Không còn kiểu
  "admins rỗng + debug = mọi người là quản trị viên".
  - Bật: bảng thông số góc trái, F3, nhìn đêm (N), F4; bay (nhấn đúp Space), phá tức thì khi bay, kho đồ sáng tạo khi bay, phù phép /
    rèn không tốn khi bay, sửa block trong vùng an toàn; lệnh /give, /summon, /tp, /nether, /xp, /time set, /kick, /pvp, /structure.
  - Tắt: như người chơi thường (đang bay thì rơi xuống); vẫn dùng /help, /time (xem giờ), /locate, /items, /admin, chat.
  - Cú pháp: /admin (bật / tắt qua lại) · /admin on · /admin off hoặc /unadmin (thoát chế độ quản trị — người dùng yêu cầu 2026-11-16).
- Người mới vào tay trắng (config "debug": false — không bộ đồ thử) và thế giới mới có seed + điểm khởi đầu ngẫu nhiên (config "seed":
  "random", "spawn": "random"; chọn một lần khi tạo, lưu vào world.json; thế giới đã có giữ nguyên) — người dùng yêu cầu 2026-11-16.
- Khung chat cuộn được (người dùng yêu cầu 2026-11-16): mở chat (T) thì lăn chuột / PageUp / PageDown xem lịch sử (giữ 300 tin gần
  nhất); đang đọc tin cũ thì tin mới đến không kéo xuống cuối.

NGHIỆM THU 9a
- Mở trang thấy menu chính; "Server này" hiện đang chạy + số người. Thêm link Cloudflare của server đang chạy (npm run share): hiện
  đang chạy, chọn vào được. Thêm link sai: báo không kết nối được. Sửa / xóa server; tải lại trang vẫn còn danh sách.
- Đang chơi bấm Esc: hiện menu; Tiếp tục thì chơi tiếp; Thoát thì về menu chính, vào lại đúng chỗ cũ, túi đồ còn.
- Người chơi thường không thấy chữ trắng góc trái, không bay được, /give /summon /tp báo không có quyền, /locate dùng được.
- Gõ /admin: mọi người thấy thông báo; thấy bảng thông số, bay được, /give /summon dùng được. Gõ /admin off (hoặc /unadmin, hoặc
  /admin lần nữa): đang bay thì rơi, mất bảng thông số. Thoát vào lại vẫn giữ chế độ đang bật / tắt.
- Mở chat (T): lăn chuột / PageUp cuộn lên xem được tin cũ; có tin mới khi đang đọc tin cũ thì không bị kéo xuống.

### Giai đoạn 9b — Độ bền

- Tự kết nối lại khi mất mạng: hiện "Đang kết nối lại…", thử lại giãn dần (1, 2, 4… tối đa 15 giây), đăng nhập lại bằng tên + mật khẩu
  đã nhập, nạp lại thế giới quanh người chơi; nút "Thoát" để về màn hình vào game. Server khởi động lại thì client tự vào lại.
- Giới hạn tần suất gói tin mỗi người (số gói / giây theo loại: phím bấm, đào / đặt, chat, thao tác túi đồ); vượt mức thì bỏ gói, vượt
  xa liên tục thì ngắt kết nối. Giới hạn kích thước gói (`maxPayload` của ws). Giới hạn độ dài chat; kiểm lại mọi gói từ client có kiểu
  sai (số NaN, chuỗi quá dài, chỉ số ô ngoài phạm vi) thì bỏ.
- Sao lưu tự động mỗi 6 giờ (đổi được trong config.json): chép thư mục thế giới sang `server/data/backups/<thời gian>/` sau khi lưu xong,
  giữ 5 bản gần nhất. Lệnh quản trị `/backup` sao lưu ngay. Khôi phục: tắt server, chép bản sao lưu đè lên thư mục thế giới (ghi trong
  README / DEPLOY).
- Ghi log: lỗi ghi ra `server/data/logs/server-<ngày>.log` (giữ 7 ngày) kèm console; bắt `uncaughtException` / `unhandledRejection`
  (ghi log, lưu thế giới, không sập nếu còn chạy tiếp được); lỗi khi sinh / đọc một chunk hoặc một sinh vật chỉ bỏ chunk / sinh vật đó.
  Tắt server bằng Ctrl+C luôn lưu hết trước khi thoát.

NGHIỆM THU 9b
- Đang chơi tắt server rồi bật lại: client tự vào lại trong ~15 giây, đúng vị trí / túi đồ, thế giới không mất gì.
- Rút mạng (tắt wifi) 10 giây rồi cắm lại: tự vào lại.
- Bot gửi dồn gói tin / gói rác: server không chậm, không sập, bot bị ngắt.
- Có thư mục sao lưu sau `/backup`; quá 5 bản thì bản cũ nhất bị xóa; chép bản sao lưu đè lại thì thế giới quay về đúng lúc đó.
- File log có ghi lỗi; cố tình gây lỗi một chunk (bài thử) thì server vẫn chạy.

### Giai đoạn 9c — Tối ưu

- Greedy meshing: gộp mặt kề nhau cùng texture, cùng hướng, cùng 4 giá trị ánh sáng + AO (giữ y hệt hình hiện tại); chỉ áp dụng cho
  block khối đầy, block hình riêng giữ nguyên. Đo số tam giác / thời gian dựng mesh trước và sau.
- Server: tính lại ánh sáng sau vụ nổ / thay đổi nhiều block theo vùng gộp một lần (không tính từng ô); giảm đọc block lặp trong tick
  sinh vật. Lưu file vùng: chỉ ghi chunk đã đổi, không đọc + nén lại cả file mỗi lần lưu (đổi định dạng thì có bước chuyển dữ liệu cũ,
  không mất thế giới đang chơi).
- Kiểm lại các thứ server gửi theo tầm nhìn: vật phẩm rơi, mũi tên, thay đổi block, hạt hiệu ứng — chỉ gửi người ở gần.
- Bài đo (công cụ trong `tools/`): 10 bot đi lung tung + nhảy giữa đêm → in tick trung bình / p95, KB/giây mỗi người; trình duyệt
  headless đi 5 phút ở tầm nhìn 8 → FPS, thời gian khung, bộ nhớ.
- Mục tiêu: 60 FPS client với tầm nhìn 8 (máy người dùng); tick server trung bình dưới 20 ms (p95 dưới 35 ms) với 10 người;
  băng thông dưới 30 KB/giây mỗi người khi đi bình thường.

NGHIỆM THU 9c
- Thế giới nhìn y như trước (ánh sáng, bóng góc, mép block không lệch, không có khe hở / nhấp nháy), FPS không thấp hơn trước.
- Bài đo 10 bot đạt mục tiêu tick + băng thông (ghi số trong PROGRESS).
- Nổ TNT liên tiếp không làm server khựng thấy rõ; thế giới cũ mở lại đúng sau khi đổi cách lưu.

### Giai đoạn 9d — Cảm giác game, cài đặt, bản đồ nhỏ

- Hạt vụn khi đào (màu / ảnh của block đang đào, nhiều hơn khi vỡ); bụi khi tiếp đất từ cao; bọt nước khi rơi xuống / bơi; khói + lửa
  nhỏ trên đuốc, lồng đèn, lửa trại (chỉ đuốc gần người chơi để không nặng).
- Mây trôi: lớp mây phẳng kiểu khối ở y ≈ 140 ở thế giới chính, trôi theo một hướng, mờ dần theo sương mù; Vực Lửa không có mây.
- Tọa độ trên màn hình (X Y Z + hướng nhìn Bắc / Nam / Đông / Tây), bật / tắt trong cài đặt; F3 giữ nguyên cho gỡ lỗi.
- Bản đồ nhỏ góc phải trên: vẽ từ các chunk client đã tải (màu theo block mặt trên, tối dần theo độ sâu / nước), bán kính ~64 block,
  bắc luôn ở trên, mũi tên = mình, chấm = người chơi khác; trong hang / Vực Lửa vẽ lát cắt quanh độ cao người chơi. Phím M bật / tắt,
  phóng to / nhỏ 2 mức. Chỉ cập nhật khi đi sang ô mới / block đổi, không vẽ lại mỗi khung.
- Thêm nút "Cài đặt" vào menu Esc (menu có từ 9a) và menu chính. Cài đặt: độ nhạy chuột, FOV (60–110),
  tầm nhìn (2–16), hiện tọa độ, bản đồ nhỏ, đổi phím (mọi phím di chuyển / nhảy / ngồi / túi đồ / chat / vứt / bản đồ…; trùng phím thì
  báo). Lưu localStorage, bọc try/catch; hỏng thì về mặc định. Không có mục âm lượng (không âm thanh).
- Mọi chỗ đọc phím trong client đi qua một bảng phím chung (để đổi phím có tác dụng ở mọi nơi).

NGHIỆM THU 9d
- Thấy hạt vụn khi đào, bụi khi nhảy từ cao xuống, bọt khi xuống nước, khói trên đuốc; mây trôi; FPS không tụt rõ.
- Bản đồ nhỏ đúng với địa hình xung quanh, xoay người thì mũi tên xoay, thấy chấm người chơi khác; M bật / tắt.
- Esc mở menu; đổi độ nhạy / FOV / tầm nhìn có tác dụng ngay; đổi phím (ví dụ nhảy sang phím khác) có tác dụng; tải lại trang vẫn giữ.

### Giai đoạn 9e — Phát hành

- Build client tĩnh; `VITE_SERVER_URL` (không đặt thì kết nối về chính địa chỉ trang như hiện nay; `wss://` khi trang chạy https).
- Dockerfile cho server (phục vụ luôn trang game như `npm run host`), volume cho `/server/data`; `docker-compose.yml` mẫu, tự khởi
  động lại khi lỗi / khi máy khởi động lại. Ảnh texture client.jar không đóng vào image công khai: chép riêng lên máy chủ.
- `DEPLOY.md` từng bước theo nơi người dùng chọn: (1) máy nhà + Cloudflare tunnel (như hiện nay); (2) VPS + Docker (thuê máy, cài
  Docker, chép thế giới + texture lên, tên miền + https / tunnel); cách sao lưu, chép bản sao lưu về máy, khôi phục, cập nhật bản mới.
- `README.md` (giới thiệu, cài, chạy, lệnh, chơi chung), `CREDITS.md` hoàn thiện.

NGHIỆM THU 9e
- Chơi được qua link công khai từ 2 máy khác mạng; server khởi động lại không mất thế giới.
- 8 tab chạy 30 phút không rò bộ nhớ, không tụt FPS dần.
- `CREDITS.md` ghi rõ nguồn texture (client.jar, © Mojang) và giới hạn chỉ chơi riêng.

---

### Giai đoạn 10 — (Tùy chọn) Vực Lửa

Chỉ làm khi người dùng yêu cầu.

> GHI CHÚ 2026-11-15 (người dùng chọn): làm Giai đoạn 10 TRƯỚC Giai đoạn 9 (sau 8c). Giai đoạn 9 để sau Vực Lửa.
> LỰA CHỌN đã chốt (2026-11-15): sinh vật lấy bộ client.jar (mục 2.7, cơ chế theo Minecraft); phạm vi đầy đủ như Minecraft (5 biome,
> pháo đài Vực Lửa, tàn tích pháo đài lợn); có Quỷ héo và Ma bay hiền. Chia 5 phần, mỗi phần người dùng test xong mới làm phần sau:
>
> - 10a — Thế giới thứ hai + cổng + hoang mạc Vực Lửa: server chạy song song 2 thế giới (seed riêng, lưu riêng), client chuyển thế giới
>   (bầu trời / sương mù riêng, không ngày đêm); khung đá vỏ chai 4×5 tới 23×23, châm bằng bật lửa, đứng trong cổng 4 giây thì sang,
>   tỉ lệ 1:8, tìm cổng có sẵn hoặc tự tạo cổng; cổng đổ nát kích hoạt được. Địa hình hang khổng lồ, biển dung nham y 32, trần đá nền;
>   block: cát linh hồn (chậm), đất linh hồn, đá phát sáng, quặng vàng / thạch anh Vực Lửa, thạch anh; đổ nước bốc hơi; giường nổ.
> - 10b — 4 biome còn lại (thung lũng cát linh hồn, rừng đỏ thẫm, rừng cong vênh, đồng bằng bazan) + block, gỗ nấm, hóa thạch; sinh vật:
>   ma bay (cầu lửa), người lợn xác sống, khối nhầy dung nham, bộ xương thung lũng, kẻ lội dung nham (cưỡi), lợn rừng lửa, kẻ hư không.
> - 10c — Pháo đài Vực Lửa (dựng bằng code theo Minecraft NetherFortressPieces) + quỷ lửa, bộ xương héo (héo, sọ), mụn cóc Vực Lửa, rương.
> - 10d — Người lợn (vàng, đổi vàng), người lợn vệ binh, lợn rừng xác sống, tàn tích pháo đài lợn (mẫu client.jar, ghép khối), phế tích
>   cổ → netherite (bàn rèn nâng cấp).
> - 10e — Quỷ héo (triệu hồi, trùm, ngôi sao Vực Lửa), Ma bay hiền (khối ma bay khô, dây cương, chở người bay).
>   BỎ (người dùng chọn 2026-11-16: Giai đoạn 10 coi như xong sau 10d2).

- Thế giới thứ hai chạy song song trên server, seed riêng, lưu riêng.
- Địa hình kiểu hang khổng lồ: trần và sàn bằng đá lửa, biển dung nham ở
  y = 32, đá phát sáng treo trên trần, cát linh hồn làm chậm.
- Cổng: khung đá vỏ chai do người chơi tự xây, kích hoạt bằng đá lửa và thép;
  đứng trong cổng 4 giây thì dịch chuyển. Tỷ lệ tọa độ 1:8.
- Không có ngày đêm, không có nước (đổ nước thì bốc hơi).
- Sinh vật: LỰA CHỌN (hỏi người dùng khi bắt đầu GĐ 10) — dùng bộ sinh vật Vực Lửa ở mục 2.7 (skin
  client.jar), hoặc giữ ý ban đầu: quái riêng do tự thiết kế.
- Texture tham khảo: `mcl_nether/` (đá, cát linh hồn, đá phát sáng, cổng).
  Đặt tên block và quái theo tên riêng của game.

NGHIỆM THU 10a (thêm 2026-11-15)
- Xây khung đá vỏ chai (lòng 2..21 × 3..21, không cần góc), châm bằng bật lửa thành cổng tím; phá một khối khung thì cổng tắt.
- Đứng trong cổng 4 giây (màn hình tím dần) thì sang Vực Lửa ở tọa độ ÷ 8; bên kia tự có cổng; đi ngược về đúng cổng cũ; đứng yên
  trong cổng vừa tới không bị đưa về.
- Vực Lửa: hang khổng lồ, biển dung nham, đá phát sáng treo trần, cát linh hồn đi chậm, quặng thạch anh / vàng Vực Lửa; không ngày đêm;
  đổ nước bốc hơi; ngủ giường thì nổ; lửa trên đá lửa ngục không tắt.
- Chết ở Vực Lửa hồi sinh ở thế giới chính; thoát game ở Vực Lửa, vào lại vẫn ở Vực Lửa; khởi động lại server không mất gì ở cả hai cõi.
- Hai người ở hai cõi không thấy nhau; cùng cõi thì thấy.

> GHI CHÚ 2026-11-16 (người dùng chọn cho 10c): làm hết 10c trong một lần; thêm giáp ngựa (sắt / vàng / kim cương, đeo được — có trong
> rương pháo đài); thêm lệnh /locate fortress; bóng tuyết (tuyết đào bằng xẻng ra bóng tuyết như Minecraft) ném trúng quỷ lửa làm nó mất máu.

NGHIỆM THU 10c (thêm 2026-11-16)
- /locate fortress (quản trị viên) báo pháo đài gần nhất; tới nơi thấy cầu gạch Vực Lửa có cột chống, ngã tư, phòng cầu thang, ngai quỷ lửa
  (lồng), giếng dung nham, lâu đài (hành lang, cầu thang, ban công, phòng trồng mụn cóc trên cát linh hồn); rương ở hành lang rẽ có đồ.
- Quỷ lửa: bay lơ lửng, bốc lửa 3 giây rồi bắn 3 cầu lửa nhỏ (cháy, đốt ô trúng), đánh gần; ném bóng tuyết / nước làm nó mất máu; giết
  thì rơi que quỷ lửa → bột quỷ lửa; lồng ở ngai sinh quỷ lửa.
- Bộ xương héo (cao, cầm kiếm đá): trúng đòn thì tim đen (Héo), mất máu dần, có thể chết; đôi khi rơi sọ (đặt lên sàn được).
- Trong pháo đài tự sinh quỷ lửa, bộ xương héo, người lợn xác sống, khối nhầy dung nham, bộ xương.
- Block / đồ: gạch Vực Lửa (nung đá lửa ngục ra viên gạch), gạch đỏ, nứt, khắc; hàng rào / bậc / tấm / tường; cầu lửa nhỏ châm lửa / cổng;
  tuyết đào bằng xẻng ra bóng tuyết; giáp ngựa đeo cho ngựa đã thuần (kéo tháo ra).

> GHI CHÚ 2026-11-16 (người dùng chọn cho 10d): chia 10d thành 10d1 và 10d2, test xong 10d1 mới làm 10d2.
> - 10d1 — Người lợn (trung lập khi mặc giáp vàng, đổi vàng theo bảng piglin_bartering, tức khi mở rương / đào vàng gần đó, nhặt đồ vàng,
>   sợ lửa linh hồn, săn lợn rừng lửa con), người lợn vệ binh (/summon; tự sinh trong tàn tích ở 10d2), lợn rừng xác sống; người lợn / lợn
>   rừng lửa ở thế giới chính 15 giây thì thành xác sống. Thêm để bảng đổi vàng đủ như Minecraft: thuốc kháng lửa (uống / ném), chai nước,
>   phù phép Tốc độ linh hồn (sách, ủng sắt), mũi tên quang phổ.
> - 10d2 — Tàn tích pháo đài lợn (4 kiểu, mẫu client.jar, ghép khối; khối đá đen mới), phế tích cổ → mảnh → thỏi netherite, bàn rèn kiểu 1.20
>   (khuôn nâng cấp netherite trong rương tàn tích, nhân bản bằng 7 kim cương), đồ netherite; thêm /locate bastion, mỏ neo hồi sinh, đá nam châm.

NGHIỆM THU 10d1 (thêm 2026-11-16)
- Người lợn (hoang mạc Vực Lửa, rừng đỏ thẫm) đánh khi không mặc giáp vàng (kiếm vàng hoặc bắn nỏ); mặc một món giáp vàng thì không đánh.
- Đưa thỏi vàng (chuột phải) hoặc ném thỏi vàng gần đó: người lợn cầm ngắm vài giây rồi ném ra đồ đổi (đá vỏ chai khóc, cát linh hồn, ngọc
  ender, sách / ủng Tốc độ linh hồn, thuốc kháng lửa, mũi tên quang phổ...).
- Mở rương / đào khối vàng gần người lợn, hoặc đánh một con: cả bầy tức và đánh cả người mặc vàng.
- Người lợn tránh lửa / đuốc linh hồn, chạy khỏi người lợn xác sống; thỉnh thoảng săn lợn rừng lửa; người lợn vệ binh (/summon piglin_brute)
  đánh cả người mặc vàng; lợn rừng xác sống (/summon zoglin) đánh cả sinh vật.
- /summon piglin hoặc hoglin ở thế giới chính: run rồi sau 15 giây thành người lợn xác sống / lợn rừng xác sống.
- Uống / ném thuốc kháng lửa: không mất máu vì lửa / dung nham; mũi tên quang phổ làm sinh vật sáng, thấy xuyên tường; ủng Tốc độ linh hồn đi
  nhanh trên cát / đất linh hồn.

NGHIỆM THU 10d2 (thêm 2026-11-16)
- /locate bastion tới tàn tích pháo đài lợn: lâu đài đá đen (gạch nứt, đá đen mạ vàng, xích, đèn lồng), 4 kiểu (khu nhà ở, chuồng lợn
  rừng, phòng kho báu có hồ dung nham + lồng khối nhầy dung nham + khối vàng, cầu); người lợn, vệ binh, lợn rừng lửa canh sẵn; rương có đồ
  (kho báu: thỏi / mảnh netherite, phế tích cổ, khuôn nâng cấp netherite).
- Đào sâu ở Vực Lửa (y 8–22) bằng cuốc kim cương tìm phế tích cổ; nung ra mảnh netherite; 4 mảnh + 4 thỏi vàng ra thỏi netherite.
- Bàn rèn: khuôn + đồ kim cương + thỏi netherite → đồ netherite giữ phù phép; đồ netherite rơi vào dung nham không cháy.
- Mỏ neo hồi sinh: nạp bằng đá phát sáng (sáng dần), đặt điểm hồi sinh ở Vực Lửa, chết thì hồi sinh ở đó (mất 1 lần nạp); ở thế giới chính
  thì nổ. Đá nam châm + la bàn: la bàn chỉ về đá nam châm; la bàn thường chỉ điểm hồi sinh, quay loạn ở Vực Lửa.

### Giai đoạn 11 — (Tùy chọn) Cõi Hư Không

Chỉ làm khi người dùng yêu cầu.

- Thế giới thứ ba: các đảo lơ lửng trên khoảng không, rơi xuống là chết.
- Cổng tìm thấy trong một công trình ngầm hiếm ở thế giới chính (pháo đài — stronghold, mẫu từ client.jar bằng công cụ của 7e).
- Một con trùm nhiều giai đoạn, cả server cùng đánh;
  hạ xong thì mở cổng về và rơi phần thưởng.
- Sinh vật và trùm: LỰA CHỌN (hỏi người dùng khi bắt đầu GĐ 11) — dùng bộ Cõi Hư Không ở mục 2.7 (rồng,
  sò hư không, skin client.jar), hoặc giữ ý ban đầu: trùm tự thiết kế, không dùng skin rồng.
- Texture tham khảo: `mcl_end/` cho đá và cổng.
