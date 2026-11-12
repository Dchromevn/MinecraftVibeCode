# DESIGN.md — Thông số game (nguồn sự thật)

Bản sao mục 2 của `PLAN.md` (bản sinh tồn thế giới mở, đồng bộ 2026-11-12 — dữ liệu phụ, chỗ bám, thông số di chuyển;
thêm vàng, ngọc lục bảo, tăng mật độ quặng và hầm mỏ).
Khi cần đổi thông số thì sửa ở đây và trong `/shared/src/constants.ts`.
Khi `DESIGN.md` và `PLAN.md` khác nhau, theo `DESIGN.md`.

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
| cửa | bit 0–1 hướng (tấm cửa nằm sát cạnh đó khi đóng), bit 2 đang mở, bit 3 nửa trên |
| lúa mì | 0–7 = giai đoạn lớn |
| nước, dung nham | bit 0–2 mức 0–7 (0 = nguồn), bit 3 đang rơi |
| lò nung, rương | bit 0–1 hướng mặt trước; riêng lò: bit 2 đang cháy (sáng 13) |
| đường ray | bit 0–1 góc xoay, bit 2–3 dạng (0 thẳng, 1 cong, 2 ngã ba, 3 ngã tư) |
| giường | bit 0–1 hướng từ chân tới đầu, bit 2 = ô đầu giường |

Từ Giai đoạn 5, server lưu dữ liệu phụ cùng với id block trong file lưu và gửi
kèm trong gói tin (chunk và thay đổi block).

#### Chỗ bám của block

- Block cần chỗ bám: đuốc (sàn hoặc tường), thang (tường), đường ray (sàn), cửa
  và giường (sàn dưới ô thấp nhất): chỗ bám phải là khối đầy, không trong suốt
  (không tính lá, kính). Cỏ cao, cây non: cỏ/đất/đất cày bên dưới. Lúa mì: đất
  cày bên dưới. Tuyết phủ: khối đầy bên dưới.
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
- Tay không: sát thương 1. Rìu: sát thương bằng kiếm cùng cấp trừ 1.
- Giáp 4 món, cấp da, sắt, vàng, kim cương:
  da: mũ 1, áo 3, quần 2, giày 1 (tổng 7), độ bền 80;
  sắt: 2, 6, 5, 2 (tổng 15), độ bền 200;
  vàng: 2, 5, 3, 1 (tổng 11), độ bền 110;
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

Cần đứng trong 4 block quanh bàn chế tạo (X = ván gỗ / đá cuội / thỏi sắt / thỏi vàng / kim cương):
- cuốc, rìu: 3 X + 2 que · xẻng: 1 X + 2 que · kiếm: 2 X + 1 que
- cuốc đất: 2 X + 2 que
- mũ 5 X · áo 8 X · quần 7 X · giày 4 X (da / sắt / vàng / kim cương)
- cung: 3 que + 3 sợi tơ
- 4 mũi tên: 1 que + 1 đá lửa + 1 lông gà
- rương: 8 ván gỗ · lò nung: 8 đá cuội
- 3 thang: 7 que · 3 cửa gỗ: 6 ván gỗ · 3 hàng rào: 4 que + 2 ván gỗ
- 16 đường ray: 6 thỏi sắt + 1 que
- bánh mì: 3 lúa mì
- táo vàng: 1 táo + 8 thỏi vàng
- giường: 3 len + 3 ván gỗ
- sa thạch: 4 cát

Giao diện chế tạo dạng danh sách (không cần lưới kéo thả): công thức đủ nguyên
liệu thì sáng, thiếu thì mờ.

### 2.5 Lò nung

- 3 ô: nguyên liệu, nhiên liệu, kết quả. Mỗi món nung mất 10 giây.
- Nhiên liệu: than nung được 8 món; thân gỗ / ván gỗ 1.5 món; que 0.5 món.
- Công thức nung: sắt thô → thỏi sắt; vàng thô → thỏi vàng; cát → kính; đá cuội → đá;
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
  thịt chín +6–8. Táo vàng: +4 đói và hồi 4 máu trong 5 giây.
- Dung nham: mất 4 máu mỗi giây và bị cháy thêm 4 giây sau khi ra.
- Chết: rơi toàn bộ đồ tại chỗ (tồn tại 5 phút), hồi sinh ở giường đã ngủ gần
  nhất, nếu không có thì ở điểm hồi sinh của thế giới.

Thông số di chuyển bổ sung (đề xuất ở Giai đoạn 3, người dùng đồng ý 2026-11-12):
- Tự bước lên bậc cao tới 0.6 block mà không cần nhảy (tuyết phủ, đất cày,
  giường); block cao 1 vẫn phải nhảy.
- Tốc độ rơi tối đa 60 block/giây.
- Thang: leo lên 2.4 block/giây (giữ Space hoặc W), tụt xuống tối đa 3; giữ
  Shift thì đứng yên trên thang.
- Bơi: chìm tối đa 2 block/giây, giữ Space nổi lên 3. Đi ngang trong nước bằng
  50% tốc độ đi bộ; trong dung nham 30%, nổi/chìm bằng 50% so với nước.
- Chạy nhanh: góc nhìn (FOV) rộng thêm 10%.
- Bị cháy sau khi ra khỏi dung nham: mất 1 máu mỗi giây trong 4 giây.

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

## Phụ lục — Thông số chi tiết của Giai đoạn 2a

- Chiều cao là hàm liên tục của các trường noise: lục địa (1/700, 4 octave,
  biển khi < -0.3, đất liền khi > 0), chi tiết (1/64), đồi (1/180), núi (1/320,
  nâng 20 + 18 theo đỉnh núi 1/90). Đáy biển 52 ± 3, đất liền 66 ± 8, tối đa 115.
- Biome: nhiệt độ (1/800) và độ ẩm (1/700). Tuyết khi nhiệt độ < -0.3; sa mạc khi
  nhiệt độ > 0.3 và độ ẩm < 0; rừng khi độ ẩm > 0.1. Núi khi mức nâng > 0.55
  hoặc mặt đất cao hơn y = 88; đá thay cỏ trên y = 92; tuyết phủ mọi mặt trên từ
  đường tuyết y = 90 ± 2 (lượn theo noise). Lá cây thay được lớp tuyết.
- Cây: lưới 5x5, mỗi ô tối đa 1 cây; xác suất mỗi ô: đồng cỏ 0.12, rừng 0.85,
  tuyết 0.15, núi 0.12 (dưới y = 88). Cỏ cao: đồng cỏ 20%, rừng 10%, núi 5%.
- Sông: noise 1/420; lòng sông |noise| < 0.022, bờ thoải tới 0.075 (nhân 0.75–1.25
  theo noise độ rộng 1/260); tắt dần khi địa hình cao 79–85.
- Hồ: vùng 128x128, xác suất 0.8, thử 8 chỗ, bờ chênh tối đa 5 block, bán kính 4–10,
  đáy sâu 1–4. Đo được: khoảng 50% số vùng có hồ (gần như mọi vùng đất liền).
- Mạch nước trên núi: chỉ cột biome núi có mặt đất ≥ y = 85, xác suất 0.3 mỗi chunk,
  vách cao ≥ 4 block (đo được ~1 mạch / 300 chunk quanh điểm xuất phát).
- Hiển thị nước (client): độ trong 0.8, sóng cao 0.035 block, texture trôi
  (0.04, 0.025) block/giây; mặt dưới nước nhân hệ số exp(-0.35 × độ sâu).
- Quặng mỗi chunk: than 20 cụm 13 ô, sắt 15 cụm 9 ô, vàng 2 cụm 4–8 ô, kim cương
  3 cụm 3 ô, sỏi 3 khối cầu bán kính 2. Ngọc lục bảo: 3–8 khối lẻ mỗi chunk núi.

## Phụ lục — Thông số chi tiết của Giai đoạn 2b

- Hang sợi mì: tần số 1/56, kéo giãn trục y 1.6, ngưỡng 0.085. Hang phô mai: tần số
  1/72, ngưỡng 0.56, chỉ dưới y = 64. Noise 3D lấy mẫu mỗi 4 block rồi nội suy (chunk
  và truy vấn từng điểm dùng cùng hàm nên trùng khớp). Không đục trong 7 block dưới mặt
  đất, thu hẹp dần trong dải 8 block. Ô bị đục có y ≤ 11 thành dung nham.
- Không đục cạnh cột đang có nước bề mặt (cùng độ cao) và sát dưới đáy nước, nên
  biển/sông/hồ không thủng xuống hang.
- Cửa hang: vùng 64x64, xác suất 0.85, đường hầm đào chéo tối đa 160 bước, không đi
  xa quá 60 block theo chiều ngang, dừng khi gặp hang noise; miệng loe rộng; không
  trồng cây trong 3 block quanh miệng hang.
- Hồ ngầm: vùng 64x64, xác suất 0.35, mực nước y = 20–50; mọi ô hang dưới mực nước
  trong vùng đó là nước; đập đá 2 block ở biên vùng; lớp đá ở y = 12 ngăn với dung
  nham. Hồ ngầm không né hầm mỏ; ngược lại, trong vùng có hồ ngầm thì phòng và
  hành lang hầm mỏ chỉ được nằm cao hơn mực nước (giữ nước tĩnh).
- Mạch nước trần hang: 70% số chunk, mạch dung nham 25% (chỉ dưới y = 30); trần
  phải dày ≥ 2 block. Mạch nước trên núi cũng cần đá ngay phía trên.
- Hầm mỏ: vùng 160x160, xác suất 0.9, thử tối đa 5 vị trí tâm (cách biên vùng
  16 block); phòng y = 24–44 dưới đất khô sâu ≥ 8 block;
  hành lang luôn dưới đất khô ≥ 8 block (không thủng đáy nước); các thông số khác
  như phụ lục 1b bên dưới. Ray tự chọn thẳng/cong/ngã ba/ngã tư theo ray kề.
- Ánh sáng: tính trong worker cho vùng 3x3 chunk (48 x 128 x 48) mỗi lần dựng mesh
  chunk giữa (ánh sáng lan tối đa 14 ô nên luôn đúng, kể cả xuyên chunk); sửa block
  thì dựng lại mọi chunk trong bán kính 15 block. Đỉnh lưu (trời, block) riêng; shader
  tính độ sáng = max(trời × hệ số ban ngày, block × màu vàng ấm), đường cong
  (f / (3 − 2f))^1.6, tối thiểu 0.004.
- Ẩn đoạn khuất: đoạn 16x16x16, BFS từ đoạn chứa camera qua các mặt thông nhau,
  trong khối nhìn và tầm nhìn + 1. Camera ở trong khối đặc thì tắt (nhìn xuyên).

## Phụ lục — Thông số chi tiết đã tinh chỉnh (từ Giai đoạn 1b cũ, dùng cho 2b)

Các giá trị dưới đây đã đo và chỉnh khi làm hang động/hầm mỏ/ánh sáng trên bản
đồ cố định. Giai đoạn 2 giữ lại làm điểm xuất phát, chỉnh cho khớp mục 2.1/2.9.

- Noise địa hình: tần số cơ bản 1/64, 3 octave.
- Số cụm thử đặt mỗi chunk (chỉ thay ô đá): than 16, sắt 12, kim cương 4,
  sỏi 3 (cụm sỏi 24 ô). 12% mặt cỏ có cỏ cao.
- Hang sợi mì: tần số 1/56, kéo giãn trục y 1.6, bán kính ngưỡng 0.085.
  Hang phô mai: tần số 1/72, ngưỡng 0.56, chỉ dưới y = 64.
  Noise 3D lấy mẫu mỗi 4 block rồi nội suy.
- Không đục trong 7 block dưới mặt đất; hang thu hẹp dần trong dải 8 block
  (không có trần phẳng). Ô bị đục có y ≤ 11 thành dung nham.
- Cửa hang: đường hầm đào chéo từ mặt đất xuống tới khi gặp hang, dài tối đa
  160 bước, miệng loe rộng; không trồng cây trong 3 block quanh cửa hang.
- Hầm mỏ: phòng 7–11 x 7–11 cao 4–6, hành lang 8–25, khung chống mỗi 4–5 block,
  20% khung có đuốc, ray 70%, mạng nhện 4% (ngã rẽ 30%), rương ở 50% nhánh cụt,
  tối đa 70 đoạn (2b), bán kính 72 block, cầu thang 5 bậc.
- Ánh sáng: đuốc 14, dung nham 15; lá cản 1, nước 2, mạng nhện 1; đổi block thì
  tính lại vùng ±15 block. Đường cong độ sáng: (f / (3 − 2f))^1.6, tối thiểu 0.004.
- Client vẽ theo đoạn 16x16x16 và ẩn đoạn khuất (duyệt từ đoạn chứa camera
  qua các mặt thông nhau).
