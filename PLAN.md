# PLAN.md — Đặc tả và kế hoạch dự án Voxel Survival

Tài liệu này là đặc tả đầy đủ. Quy tắc làm việc nằm trong `AGENTS.md`.
Làm lần lượt từng giai đoạn, mỗi lần một giai đoạn, dừng lại sau mỗi giai đoạn
để người dùng chơi thử.

> GHI CHÚ CHUYỂN HƯỚNG: phiên bản trước của file này mô tả game PvP theo trận
> (bản đồ 256x256 cố định, vòng bo). Dự án đã chuyển sang SINH TỒN THẾ GIỚI MỞ.
> Giai đoạn 0 và 1 đã làm xong theo bản cũ và được giữ lại; Giai đoạn 2a sẽ
> chuyển thế giới cố định thành thế giới vô hạn. Mọi thứ về trận đấu, vòng bo,
> sảnh chờ, phòng chơi, thùng tiếp tế đã bị BỎ.

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
| 2a | Thế giới vô hạn và biome | |
| 2b | Hang động, hầm mỏ, ánh sáng, block mới | |
| 3 | Người chơi và tương tác block | |
| 4 | Vật phẩm, chế tạo, lò nung, sinh tồn, trồng trọt | |
| 5 | Mạng nhiều người và lưu thế giới | |
| 6 | Chiến đấu PvP và hồi sinh | |
| 7 | Ngày đêm, động vật, quái vật, giường | |
| 8 | Làng và dân làng | |
| 9 | Hoàn thiện và phát hành | |
| 10 | (Tùy chọn) Vực Lửa — thế giới thứ hai | |
| 11 | (Tùy chọn) Cõi Hư Không — thế giới cuối và trùm | |

Giai đoạn 10 và 11 chỉ làm khi người dùng yêu cầu.

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
| Đồng cỏ | cỏ, đất | cây thưa, cỏ cao dày |
| Rừng | cỏ, đất | cây dày, cỏ cao |
| Sa mạc | cát, sa thạch bên dưới | xương rồng nếu có texture, không cây |
| Đồng tuyết | tuyết phủ trên cỏ | cây thưa |
| Núi | đá lộ ra trên cao, tuyết trên đỉnh | cây thưa ở chân núi |
| Đại dương | nước, đáy cát và sỏi | không |

Nước tự nhiên trên mặt đất (sinh theo seed + tọa độ, liền mạch qua chunk):
- Sông: trường noise riêng, nơi giá trị gần 0 thì khoét lòng sông rộng 5–12
  block, sâu 3–5 block, mặt nước y = 62, uốn lượn và đổ ra biển; bờ thoải, đáy
  cát và sỏi; không cắt qua núi cao hơn y = 85.
- Hồ: đường kính 8–20 block ở vùng đất bằng, khoảng 1 hồ mỗi vùng 128x128;
  mặt nước bằng điểm thấp nhất của bờ, có thể cao hơn mực biển.
- Mạch nước trên núi: thỉnh thoảng một nguồn nước gắn trên vách núi hoặc sườn
  dốc (có đá phía trên), để chảy thành thác khi có nước chảy (Giai đoạn 4).
- Nước sinh sẵn (biển, sông, hồ, hồ ngầm) phải "tĩnh": không ô nước nào có
  không khí bên cạnh hoặc bên dưới. Chỉ các mạch nước/dung nham là ô "hở".

Dưới lòng đất:
- Lớp: mặt biome → 3 lớp đất (hoặc cát/sa thạch) → đá → đá sâu (y < 8) → đá nền.
  Quặng chỉ thay ô đá thường, nên kim cương nằm ở y = 8–15.
- Quặng theo cụm: than (y < 100, cụm 8), sắt (y < 64, cụm 5),
  kim cương (y < 16, cụm 3).
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

"Bắt buộc" nghĩa là đào bằng tay vẫn phá được nhưng không rơi gì.
Đào sai cấp công cụ với quặng: không rơi gì.

### 2.3 Công cụ, vũ khí, giáp

| Cấp | Độ bền | Hệ số tốc độ đào | Sát thương kiếm |
|---|---|---|---|
| gỗ | 60 | x2 | 4 |
| đá | 130 | x4 | 5 |
| sắt | 250 | x6 | 6 |
| kim cương | 1500 | x8 | 7 |

- Loại công cụ: cuốc (đá, quặng), rìu (gỗ), xẻng (đất, cát, sỏi), kiếm,
  cuốc đất (biến đất/cỏ thành đất cày).
- Hệ số tốc độ chỉ áp dụng khi dùng đúng loại công cụ.
- Tay không: sát thương 1. Rìu: sát thương bằng kiếm cùng cấp trừ 1.
- Giáp 4 món, cấp da, sắt, kim cương:
  da: mũ 1, áo 3, quần 2, giày 1 (tổng 7), độ bền 80;
  sắt: 2, 6, 5, 2 (tổng 15), độ bền 200;
  kim cương: 3, 8, 6, 3 (tổng 20), độ bền 450.
  Mỗi điểm giáp giảm 4% sát thương.
- Cung: độ bền 384. Tên xếp chồng 64.
- Xếp chồng: block và nguyên liệu 64, công cụ/vũ khí/giáp/giường/cửa 1.

### 2.4 Chế tạo

Làm được mọi lúc (trong túi đồ):
- 1 thân gỗ → 4 ván gỗ
- 2 ván gỗ → 4 que
- 4 ván gỗ → 1 bàn chế tạo
- 1 than + 1 que → 4 đuốc

Cần đứng trong 4 block quanh bàn chế tạo (X = ván gỗ / đá cuội / thỏi sắt / kim cương):
- cuốc, rìu: 3 X + 2 que · xẻng: 1 X + 2 que · kiếm: 2 X + 1 que
- cuốc đất: 2 X + 2 que
- mũ 5 X · áo 8 X · quần 7 X · giày 4 X (da / sắt / kim cương)
- cung: 3 que + 3 sợi tơ
- 4 mũi tên: 1 que + 1 đá lửa + 1 lông gà
- rương: 8 ván gỗ · lò nung: 8 đá cuội
- 3 thang: 7 que · 3 cửa gỗ: 6 ván gỗ · 3 hàng rào: 4 que + 2 ván gỗ
- 16 đường ray: 6 thỏi sắt + 1 que
- bánh mì: 3 lúa mì
- giường: 3 len + 3 ván gỗ
- sa thạch: 4 cát

Giao diện chế tạo dạng danh sách (không cần lưới kéo thả): công thức đủ nguyên
liệu thì sáng, thiếu thì mờ.

### 2.5 Lò nung

- 3 ô: nguyên liệu, nhiên liệu, kết quả. Mỗi món nung mất 10 giây.
- Nhiên liệu: than nung được 8 món; thân gỗ / ván gỗ 1.5 món; que 0.5 món.
- Công thức nung: sắt thô → thỏi sắt; cát → kính; đá cuội → đá;
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
- Đói giảm theo hoạt động. Đói ≥ 18: hồi 1 máu mỗi 4 giây. Đói = 0: mất 1 máu
  mỗi 4 giây (không chết vì đói khi máu còn 1). Đói ≤ 6: không chạy nhanh được.
- Ăn: giữ chuột phải 1.6 giây. Táo +4, bánh mì +5, thịt sống +2–3,
  thịt chín +6–8.
- Dung nham: mất 4 máu mỗi giây và bị cháy thêm 4 giây sau khi ra.
- Chết: rơi toàn bộ đồ tại chỗ (tồn tại 5 phút), hồi sinh ở giường đã ngủ gần
  nhất, nếu không có thì ở điểm hồi sinh của thế giới.

### 2.7 Ngày đêm, sinh vật, giường

- Một ngày 20 phút: ngày 10 phút, đêm 7 phút, bình minh và hoàng hôn mỗi lúc
  1.5 phút. Server giữ đồng hồ, gửi cho client.
- Ánh sáng 16 mức (0–15): ánh sáng trời theo giờ trong ngày + ánh sáng block.
- Quái vật sinh ở chỗ ánh sáng ≤ 7, cách người chơi 24–64 block,
  tối đa 30 quái trong bán kính 64 block quanh mỗi người chơi. Bị gỡ khi
  cách mọi người chơi trên 128 block.

| Sinh vật | Máu | Hành vi | Rơi ra |
|---|---|---|---|
| Xác sống | 20 | đuổi người chơi trong 32 block, đánh 3; cháy dưới nắng | thịt thối |
| Bộ xương | 20 | giữ khoảng cách, bắn cung 2–4; cháy dưới nắng | xương, tên |
| Nhện | 16 | leo tường, đánh 2; ban ngày chỉ đánh khi bị đánh | sợi tơ |
| Lợn | 10 | đi lang thang, chạy khi bị đánh | thịt lợn sống |
| Bò | 10 | như trên | thịt bò sống, da |
| Gà | 4 | như trên, rơi chậm | thịt gà sống, lông |
| Cừu | 8 | như trên; tỉa lông bằng kéo hoặc giết | len |

- KHÔNG làm các sinh vật mang thiết kế riêng của Minecraft (quái nổ màu xanh,
  người cao đen dịch chuyển, rồng End...). Nếu cần quái mới thì tự thiết kế.
- Động vật sinh trên cỏ khi tạo chunk mới, theo đàn 2–4 con; không sinh lại liên tục.
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
- Sát thương thực = sát thương gốc × (1 − điểm giáp × 4%).
- PvP: cấu hình server `PVP=on|off`, mặc định on.
- Vùng an toàn bán kính 16 block quanh điểm hồi sinh thế giới: không PvP,
  không phá/đặt block (trừ quản trị viên).

### 2.9 Hầm mỏ bỏ hoang

- Khoảng 1 hệ thống mỗi vùng 256x256 block, ở độ sâu y = 20–50.
  Vị trí quyết định bằng seed + tọa độ vùng để sinh được theo từng chunk.
- Một phòng trung tâm bằng đất, từ đó tỏa ra hành lang 3x3 thẳng theo trục,
  dài 8–25 block, rẽ nhánh và giao nhau, có đoạn dốc lên xuống giữa các tầng.
  Tối đa khoảng 40 đoạn mỗi hệ thống.
- Cứ 4–5 block một khung chống: hai cột hàng rào gỗ và một xà ván gỗ ngang.
- Đường ray trên sàn, thiếu ngẫu nhiên khoảng 30%.
- Mạng nhện rải rác, dày hơn ở ngã rẽ. Đuốc thỉnh thoảng trên cột.
- Khi hành lang cắt qua hang: bắc sàn ván gỗ qua khoảng trống.
- Rương ở cuối một số nhánh cụt với đồ: bánh mì, than, sắt thô, đường ray,
  hạt giống, thỉnh thoảng kim cương.
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
  (nông dân, thợ rèn, thủ thư), tiền tệ là ngọc lục bảo (vật phẩm mới,
  không cần quặng; lấy được từ rương làng và bán đồ cho dân làng).

### 2.12 Điều khiển

| Phím | Chức năng |
|---|---|
| W A S D | di chuyển |
| Space | nhảy / bơi lên |
| Shift (giữ) | chạy nhanh |
| Ctrl (giữ) | ngồi |
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

---

## 3. Tài nguyên hình ảnh

Nguồn: REFI_Textures của MysticTempest, giấy phép CC BY-SA 4.0
(https://github.com/MysticTempest/REFI_Textures).
Người dùng giải nén vào `/assets-src/REFI_Textures`.
Đường dẫn dưới đây tính từ `/assets-src/REFI_Textures/textures/`.
Bảng ánh xạ thực tế nằm trong `scripts/texture-map.json`; mục này là nguồn để
cập nhật file đó.

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
| obsidian.png | default_mcl_core/stone/default_obsidian.png |
| bed_*.png | beds_mcl_beds/ — chọn bộ màu đỏ (red) cho mặt trên, bên, đầu, chân |
| sapling.png | tìm trong default_mcl_core/trees hoặc plants |

### 3.3 Vật phẩm → `/client/public/icons/`

| Đích | Nguồn |
|---|---|
| {wood,stone,iron,diamond}_{pickaxe,axe,shovel,sword}.png | default_mcl_core/tools/default_tool_{wood,stone,steel,diamond}{pick,axe,shovel,sword}.png |
| {…}_hoe.png | tìm trong farming_mcl_farming (cuốc đất) |
| stick.png | default_mcl_core/default_stick.png |
| coal.png | default_mcl_core/minerals_ores/default_coal_lump.png |
| raw_iron.png | default_mcl_core/minerals_ores/mcl_raw_ores_raw_iron.png |
| iron_ingot.png | default_mcl_core/minerals_ores/default_steel_ingot.png |
| diamond.png | default_mcl_core/minerals_ores/default_diamond.png |
| apple.png | default_mcl_core/plants/default_apple.png |
| bread.png / seeds.png | farming_mcl_farming/farming_bread.png / mcl_farming_wheat_seeds.png |
| wheat.png | tìm trong farming_mcl_farming |
| {leather,iron,diamond}_{helmet,chestplate,leggings,boots}.png | mcl_armor/mcl_armor_inv_{helmet,chestplate,leggings,boots}_{leather,iron,diamond}.png |
| bow.png, bow_pull_0..2.png | mcl_bows/mcl_bows_bow.png, mcl_bows_bow_0.png, _1, _2 |
| arrow.png | mcl_bows/mcl_bows_arrow_inv.png |
| beef_raw / beef_cooked.png | mcl_mobitems/mcl_mobitems_beef_raw.png / _beef_cooked.png |
| chicken_raw / chicken_cooked.png | mcl_mobitems/mcl_mobitems_chicken_raw.png / _chicken_cooked.png |
| pork_raw / pork_cooked, rotten_flesh, string, feather, mutton… | tìm trong mcl_mobitems |
| bone.png / leather.png | mcl_mobitems/mcl_mobitems_bone.png / mcl_mobitems_leather.png |
| door.png | doors_mcl_doors/doors_door_wood.png |
| flint, emerald, shears, wool | tìm trong default_mcl_core, mcl_core, wool_mcl_wool |

Chú ý tên nguồn dùng "steel" cho cấp sắt. Vật phẩm dạng block thì vẽ khối 3D
nhỏ từ texture block.

### 3.4 Giao diện, nhân vật, sinh vật

| Đích | Nguồn |
|---|---|
| /client/public/ui/hotbar.png, hotbar_selected.png | default_mcl_core/gui_hud/gui_hotbar.png, gui_hotbar_selected.png |
| /client/public/entities/player.png | HUD/character.png (64x32) |
| /client/public/entities/zombie.png | mobs_mc/mobs_mc_zombie.png (64x64) |
| /client/public/entities/skeleton.png | mobs_mc/mobs_mc_skeleton.png (64x32) |
| /client/public/entities/spider.png | mobs_mc/mobs_mc_spider.png (64x32) |
| /client/public/entities/pig.png, cow.png, chicken.png | mobs_mc/mobs_mc_{pig,cow,chicken}.png |
| /client/public/entities/sheep.png, sheep_fur.png | mobs_mc/mobs_mc_sheep.png, mobs_mc_sheep_fur.png |
| /client/public/entities/villager_*.png | mobs_mc/villager/ |

KHÔNG nhập các skin creeper, enderman, dragon, wither, ghast, blaze và các
sinh vật mang thiết kế riêng khác trong `mobs_mc/`.

Trái tim, thanh đói, bong bóng dưỡng khí, tâm ngắm: tự vẽ theo nét pixel.

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
- Cập nhật `scripts/texture-map.json` cho các block này và chạy lại script nhập.

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
- Thêm các block id còn thiếu trong 16–34 (chỉ dữ liệu và hình ảnh; hành vi
  đặc biệt như cửa, giường, lò, cây lớn làm ở Giai đoạn 4 và 7).
- Cập nhật `scripts/texture-map.json` theo mục 3.2 và chạy lại script nhập.
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

VẬT LÝ
- Theo mục 2.6. Hàm bước vật lý đặt trong `/shared`, thuần túy và xác định,
  để server dùng lại.
- Va chạm AABB từng trục; hỗ trợ hộp va chạm không phải khối đầy (hàng rào,
  đất cày, giường).
- Bơi trong nước, leo thang, chậm lại trong mạng nhện, dung nham gây sát
  thương (chỉ lưu số máu, chưa hiển thị).
- Chunk chưa tải xong thì giữ người chơi đứng yên, không rơi xuyên đất.

TƯƠNG TÁC
- Pointer lock; raycast DDA trong tầm 4.5; khung viền quanh block đang nhắm
  (đúng hình dạng block đặc biệt).
- Giữ chuột trái để đào, vết nứt 5 mức.
- Chuột phải đặt block; không đặt chồng lên người chơi. Đuốc và thang chỉ đặt
  được lên mặt block đặc; đuốc đặt lên tường thì nghiêng.
- Block chịu trọng lực (cát, sỏi) rơi xuống khi bên dưới trống.
- Tạm thời: phím 1–9 chọn loại block, số lượng vô hạn.

HÌNH ẢNH
- Tâm ngắm, cánh tay vung, camera lắc khi đi, FOV tăng khi chạy nhanh.
- Màn hình ám xanh khi ở dưới nước.
- Phím F bật/tắt chế độ bay để debug.

NGHIỆM THU
- Không xuyên tường, không kẹt góc, không rung khi đứng sát tường.
- Nhảy lên được block cao 1, không lên được block cao 2; không nhảy qua hàng rào.
- Bơi, leo thang, đi qua mạng nhện hoạt động đúng.
- Đào/đặt ở biên chunk cập nhật đúng cả mesh và ánh sáng.
- Cát rơi xuống khi phá block bên dưới.

---

### Giai đoạn 4 — Vật phẩm, chế tạo, lò nung, sinh tồn, trồng trọt (chỉ client)

VẬT PHẨM VÀ TÚI ĐỒ
- `/shared/items.ts`, `/shared/recipes.ts`, `/shared/smelting.ts` theo mục 2.3–2.5.
- 9 ô hotbar + 27 ô túi + 4 ô giáp; logic túi đồ trong `/shared`.
- Bấm trái nhấc/đặt chồng; bấm phải nhấc nửa/đặt 1; Shift+bấm chuyển nhanh.
- Vật phẩm rơi: khối nhỏ xoay, có trọng lực, hút về người chơi trong 1.5 block,
  gộp chồng khi nằm gần nhau, biến mất sau 5 phút.
- Công cụ: hệ số tốc độ, yêu cầu cấp, độ bền, vỡ khi hết.

BLOCK CÓ CHỨC NĂNG
- Rương: 27 ô, chuột phải mở; điền đồ cho rương hầm mỏ khi chunk được sinh.
- Lò nung: giao diện 3 ô, thanh lửa và thanh tiến độ, chạy cả khi đóng.
- Cửa: chuột phải mở/đóng, đặt theo hướng người chơi.
- Cây non lớn thành cây sau 5–10 phút.

TRỒNG TRỌT
- Cuốc đất biến đất/cỏ thành đất cày. Gieo hạt bằng chuột phải.
- Lúa lớn 8 giai đoạn, nhanh hơn trên đất cày ẩm. Lúa chín rơi lúa + 1–3 hạt.
- Đứng/nhảy lên đất cày có thể làm nó thành đất.

CHẤT LỎNG
- Mô phỏng chảy theo mục 2.10, chỉ ở chunk gần người chơi. Mạch nước/dung nham
  đã sinh sẵn trong thế giới phải tự chảy khi chunk được tải (quét ô chất lỏng hở).
- Xô (tùy chọn nếu dễ): múc và đổ nước/dung nham.

SINH TỒN
- Thanh máu, đói, dưỡng khí trên hotbar. Luật theo mục 2.6.
- Chết: màn hình chết, đồ rơi tại chỗ, nút hồi sinh ở điểm hồi sinh thế giới.

NGHIỆM THU
- Chơi trọn: chặt cây → bàn chế tạo → cuốc gỗ → đá → lò nung → đào sắt thô →
  nung thỏi sắt → đồ sắt; đặt đuốc trong hang.
- Trồng lúa → bánh mì.
- Lò nung tiếp tục nung khi đóng giao diện.
- Không nhân đôi/mất đồ khi thao tác túi và rương.
- Nước chảy và dừng đúng; nước gặp dung nham tạo đá.

---

### Giai đoạn 5 — Mạng nhiều người và lưu thế giới

Giai đoạn khó nhất. Không thêm tính năng gameplay mới.

SERVER VÀ LƯU TRỮ
- Một thế giới chung, vòng lặp 20 tick/giây.
- Server sinh chunk theo yêu cầu bằng code trong `/shared` (có thể chạy trong
  worker thread). Chỉ giữ trong bộ nhớ các chunk gần người chơi online.
- Lưu xuống `/server/data/<tên thế giới>/`:
  - `world.json`: seed, giờ trong ngày, điểm hồi sinh;
  - chunk đã bị sửa: mỗi vùng 32x32 chunk một file, nén (zlib), chỉ lưu chunk
    khác với bản sinh gốc;
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

DI CHUYỂN VÀ HÀNH ĐỘNG
- Client dự đoán + server hiệu chỉnh (reconciliation) như thiết kế chuẩn;
  người chơi khác nội suy trễ 100 ms.
- Server chạy cùng hàm vật lý với input nhận được; không tin vị trí client gửi.
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

NGÀY ĐÊM
- Đồng hồ server theo mục 2.7, lưu trong `world.json`.
- Màu trời, sương mù, mặt trời/mặt trăng, độ sáng ánh sáng trời đổi theo giờ.
  Đổi độ sáng bằng uniform trong shader, không dựng lại mesh.

HỆ THỐNG THỰC THỂ
- Thực thể chung cho sinh vật: vị trí, vận tốc, máu, hộp va chạm, dùng chung
  vật lý với người chơi. Server mô phỏng, client nội suy.
- Model khối theo từng loại, dùng skin ở mục 3.4, có hoạt ảnh đi.
- Tìm đường A* trên lưới block (giới hạn số nút mỗi tick để không làm chậm
  server), nhảy lên bậc 1 block, tránh rơi vực và dung nham.

SINH VẬT
- Theo bảng mục 2.7: luật sinh, giới hạn số lượng, hành vi, vật phẩm rơi.
- Quái cháy dưới nắng (trừ khi đứng trong bóng râm hoặc nước).
- Bộ xương bắn tên dùng chung hệ thống mũi tên của Giai đoạn 6.
- Động vật: chạy khi bị đánh; cầm lúa mì thì chúng đi theo; cừu tỉa lông
  bằng kéo (2 thỏi sắt).
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

---

### Giai đoạn 8 — Làng và dân làng

- Theo mục 2.11. Công trình định nghĩa bằng dữ liệu trong `/shared/structures`;
  viết thêm công cụ nhỏ để lưu một vùng block trong game thành file công trình
  (lệnh quản trị viên `/structure save <tên> x1 y1 z1 x2 y2 z2`), giúp người
  dùng tự thiết kế nhà.
- Làng vắt qua nhiều chunk phải liền mạch (lập kế hoạch theo vùng như hầm mỏ).
- Dân làng: thực thể dùng chung hệ thống Giai đoạn 7; giao diện trao đổi;
  vật phẩm ngọc lục bảo.
- Quái không tấn công dân làng ở giai đoạn này (giữ đơn giản).

NGHIỆM THU
- Đi khám phá tìm được làng trong vòng vài phút bay.
- Nhà đặt khớp mặt đất, không lơ lửng, không bị chôn.
- Đổi đồ với dân làng hoạt động, đồng bộ giữa nhiều người.
- Tự lưu một ngôi nhà mình xây thành công trình, xuất hiện trong làng mới sinh.

---

### Giai đoạn 9 — Hoàn thiện và phát hành

CẢM GIÁC GAME
- Hạt vụn khi đào; bụi khi tiếp đất; bọt nước; khói đuốc.
- Âm thanh bước chân theo loại block, đào, đặt, nhặt, ăn, mở rương, cửa,
  tiếng nước chảy, tiếng hang; nhạc nền nhẹ thỉnh thoảng.
- Mây trôi. Bản đồ nhỏ hoặc tọa độ trên màn hình (bật/tắt được).

CÀI ĐẶT
- Menu Esc: độ nhạy chuột, FOV, tầm nhìn, âm lượng từng loại, đổi phím.
  Lưu localStorage, bọc try/catch.

TỐI ƯU
- Greedy meshing (giữ đúng ánh sáng và AO).
- Chỉ vẽ chunk trong khối nhìn camera; bỏ chunk bị che kín nếu dễ làm.
- Server chỉ gửi thực thể trong bán kính tầm nhìn của từng người.
- Mục tiêu: 60 FPS client với tầm nhìn 8; mỗi tick server dưới 20 ms với
  10 người chơi; băng thông dưới 30 KB/giây mỗi người khi đi bình thường.

ĐỘ BỀN
- Tự kết nối lại khi mất mạng.
- Giới hạn tần suất gói tin; bỏ gói sai định dạng; giới hạn độ dài tên/chat.
- Sao lưu thế giới tự động mỗi 6 giờ, giữ 5 bản gần nhất.
- Ghi log lỗi; lỗi một chunk không làm sập server.

PHÁT HÀNH
- Build client tĩnh; Dockerfile cho server với volume cho `/server/data`.
- `DEPLOY.md` từng bước: client lên dịch vụ host tĩnh; server lên máy chủ chạy
  Node có hỗ trợ WebSocket và ổ đĩa lưu lâu dài; `VITE_SERVER_URL`; `wss://`
  khi client chạy https; cách sao lưu và khôi phục thế giới.
- Hoàn thiện `CREDITS.md` và `README.md`.

NGHIỆM THU
- Chơi được qua link công khai từ 2 máy khác mạng; server khởi động lại
  không mất thế giới.
- 8 tab chạy 30 phút không rò bộ nhớ, không tụt FPS dần.
- `CREDITS.md` có dòng ghi công REFI_Textures kèm giấy phép CC BY-SA 4.0.

---

### Giai đoạn 10 — (Tùy chọn) Vực Lửa

Chỉ làm khi người dùng yêu cầu.

- Thế giới thứ hai chạy song song trên server, seed riêng, lưu riêng.
- Địa hình kiểu hang khổng lồ: trần và sàn bằng đá lửa, biển dung nham ở
  y = 32, đá phát sáng treo trên trần, cát linh hồn làm chậm.
- Cổng: khung đá vỏ chai do người chơi tự xây, kích hoạt bằng đá lửa và thép;
  đứng trong cổng 4 giây thì dịch chuyển. Tỷ lệ tọa độ 1:8.
- Không có ngày đêm, không có nước (đổ nước thì bốc hơi).
- Quái riêng do tự thiết kế (không dùng thiết kế của Minecraft).
- Texture tham khảo: `mcl_nether/` (đá, cát linh hồn, đá phát sáng, cổng).
  Đặt tên block và quái theo tên riêng của game.

### Giai đoạn 11 — (Tùy chọn) Cõi Hư Không

Chỉ làm khi người dùng yêu cầu.

- Thế giới thứ ba: các đảo lơ lửng trên khoảng không, rơi xuống là chết.
- Cổng tìm thấy trong một công trình ngầm hiếm ở thế giới chính.
- Một con trùm do tự thiết kế, nhiều giai đoạn, cả server cùng đánh;
  hạ xong thì mở cổng về và rơi phần thưởng.
- Texture tham khảo: `mcl_end/` cho đá và cổng; KHÔNG dùng skin rồng hay các
  sinh vật End của bộ texture.
