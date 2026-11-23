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
| Đồng cỏ | cỏ, đất | cây thưa (sồi, ít bạch dương; phần nóng khô có keo — 4d), cỏ cao dày, hoa theo đám (4d) |
| Rừng | cỏ, đất | cây dày (sồi + khoảng 30% bạch dương — 4d), cỏ cao, hoa theo đám (4d) |
| Sa mạc | cát, sa thạch bên dưới | xương rồng (4d), không cây |
| Đồng tuyết | tuyết phủ trên cỏ | rừng thông thưa (4d) |
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
| 7 | lá | 0.3 | – | 5% táo, 5% cây non, 2% que | táo 5% (người dùng chọn, MECHANICS 9.4) |
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

#### Đào block (theo MECHANICS.md mục 4, áp dụng từ Giai đoạn 3b)

Cột "Độ cứng (giây, tay không)" ở bảng trên được thay bằng độ cứng dưới đây và công
thức (thời gian đào tay không vẫn khớp số giây cũ):

```
tốc_độ = tốc độ công cụ nếu đúng loại công cụ, ngược lại 1
tiến_độ_mỗi_tick (20 tick/giây) = tốc_độ / độ_cứng / (30 nếu đào được ra đồ, ngược lại 100)
phá xong khi tổng tiến độ ≥ 1
```

- Đầu chìm trong nước: tốc độ ÷ 5. Không đứng trên mặt đất (nhảy, bơi, leo): ÷ 5.
- `tốc_độ / độ_cứng ≥ 30` hoặc độ cứng 0: phá ngay, không có vết nứt. Độ cứng vô
  hạn: không phá được. Phá xong một block thì chờ 5 tick (0.25 giây) mới đào tiếp.
- Tốc độ công cụ: tay 1 · gỗ 2 · đá 4 · sắt 6 · kim cương 8 · vàng 12. Kiếm với
  mạng nhện 15. Khi đang bay (debug) thì phá ngay.

| Block | Độ cứng | Block | Độ cứng |
|---|---|---|---|
| đất, cát | 0.5 | đá | 1.5 |
| cỏ, sỏi, đất cày | 0.6 | đá cuội, đá cuội rêu | 2 |
| lá | 0.2 | thân gỗ, ván gỗ, hàng rào | 2 |
| kính | 0.3 | bàn chế tạo, rương | 2.5 |
| thang | 0.4 | cửa gỗ | 3 |
| sa thạch | 0.8 | các loại quặng | 3 |
| giường | 0.2 | đá sâu | 3 |
| quặng vàng đá sâu | 4.5 | tuyết phủ | 0.1 |
| lò nung | 3.5 | đá vỏ chai | 50 |
| mạng nhện | 4 | đá nền | không phá được |
| đường ray | 0.7 | đuốc, cỏ cao, lúa, cây non | 0 |
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

#### Random tick và trồng trọt (Giai đoạn 4b, MECHANICS.md 1 và 9)

- Mỗi tick (20 tick/giây), với mỗi đoạn 16x16x16 của các chunk trong bán kính
  RANDOM_TICK_RADIUS = 6 chunk quanh người chơi, chọn ngẫu nhiên 3 ô (RANDOM_TICK_SPEED, chỉnh
  được bằng lệnh debug) và gọi hành vi của block ở đó. Trung bình một ô nhận random tick
  khoảng 68 giây một lần. Chưa có server thì client tự chạy.
- Ánh sáng tại một ô = max(ánh sáng trời, ánh sáng block) lấy từ bảng ánh sáng worker trả về
  khi dựng mesh (chưa có ngày đêm nên ánh sáng trời không nhân hệ số giờ).
- Lúa: ánh sáng < 8 thì bật ra (rơi hạt / lúa); ≥ 9 thì mỗi random tick lên 1 giai đoạn với
  xác suất 1 / (floor(25 / điểm) + 1); điểm = 1 + đất cày bên dưới (khô 1, ẩm 3) + mỗi ô đất
  cày trong 8 ô quanh (khô 0.25, ẩm 0.75); chia đôi nếu có lúa ở ô chéo hoặc lúa ở cả hai
  phía theo hai trục.
- Đất cày: ẩm khi có nước trong 4 block ngang (cùng tầng hoặc cao hơn 1); hết nước thì khô;
  khô và không có cây trồng phía trên thì random tick biến về đất. Rơi / nhảy lên đất cày:
  xác suất (quãng rơi − 0.5) biến về đất.
- Cuốc đất: chuột phải vào đất / cỏ có ô trống phía trên → đất cày, cuốc mất 1 độ bền.
- Cây non: ánh sáng ≥ 9, mỗi random tick xác suất 1/7 tiến 1 giai đoạn ẩn; qua giai đoạn cuối
  thì mọc thành cây (thân 4–6, tán như cây sinh sẵn) nếu đủ chỗ trống; cỏ bên dưới thành đất.
- Lá: random tick tìm thân gỗ qua các lá liền nhau trong 6 bước (khoảng cách Manhattan);
  không có thì lá rụng (rơi cây non 5%, que 2%, táo 5%). Lá người chơi đặt không rụng.
- Cỏ: bị khối đặc che phía trên thì thành đất; ánh sáng phía trên ≥ 9 thì thử 4 lần lan
  sang đất trong phạm vi 3x5x3 (đất đó phải có ánh sáng phía trên ≥ 4 và không bị che).
- Cà rốt, khoai tây, củ cải đường: như lúa (cùng công thức xác suất, cùng luật ánh sáng);
  củ cải đường chỉ có 4 giai đoạn. Thân dưa / bí: lớn như lúa tới tuổi 7; ở tuổi 7 mỗi
  random tick (cùng xác suất) thử mọc quả ra một ô ngang ngẫu nhiên đang trống có đất /
  cỏ / đất cày bên dưới; mọc được thì thân chuyển sang "đã ra quả" hướng về quả. Quả bị
  phá thì thân trở lại tuổi 7.
- Bí ngô sinh rải rác trên cỏ khi sinh thế giới (đồng cỏ, rừng), xác định theo seed.
  Nguồn giống khác: rương hầm mỏ (hạt củ cải, hạt dưa, hạt bí, cà rốt, khoai tây). Làng
  (Giai đoạn 8) và sinh vật (Giai đoạn 7) bổ sung sau.

#### Rương và lò nung (Giai đoạn 4b)

- Nội dung rương / lò lưu theo vị trí block, giữ trong bộ nhớ cả khi chunk bị gỡ (Giai đoạn 5
  server lưu xuống đĩa). Phá rương / lò: đồ bên trong rơi ra.
- Rương hầm mỏ: lần đầu mở hoặc phá thì sinh đồ theo bảng MINESHAFT_LOOT với số ngẫu nhiên
  từ seed + vị trí (cùng seed cùng đồ).
- Lò nung: nhiên liệu đốt cháy đủ cho N món x 10 giây (than 8, thân gỗ / ván 1.5, que 0.5);
  đang cháy mà còn nguyên liệu nung được thì tiến độ tăng, đủ 10 giây ra 1 thành phẩm; hết
  nguyên liệu thì tiến độ về 0. Lò chạy cả khi đóng giao diện; đang cháy thì phát sáng 13.
  Ô nhiên liệu chỉ nhận vật phẩm đốt được; ô thành phẩm chỉ lấy ra.
- Chuột phải vào rương, lò nung, bàn chế tạo, cửa: mở / dùng (giữ Shift — ngồi — thì đặt block).

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
| gỗ | 59 | x2 | 4 |
| đá | 131 | x4 | 5 |
| sắt | 250 | x6 | 6 |
| kim cương | 1561 | x8 | 7 |
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
- Xếp chồng: block và nguyên liệu 64, công cụ/vũ khí/giáp/giường/cửa 1, xô rỗng 16,
  xô nước / xô dung nham 1.
- Xô (Giai đoạn 4c): xô rỗng chuột phải vào nguồn nước / dung nham thì múc (ô đó thành
  trống); xô đầy chuột phải thì đổ một nguồn vào ô cạnh mặt đang nhắm (hoặc chính ô nhắm
  nếu thay được: trống, chất lỏng, cỏ cao, tuyết phủ), trả lại xô rỗng. Chỉ múc được nguồn.
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
- Chỗ xuất phát (tới Giai đoạn 5, người dùng chọn 2026-11-12): mỗi lần vào game chọn ngẫu
  nhiên một điểm đất liền trong bán kính 1000 block; chết thì hồi sinh lại điểm đó
  (?spawn=fixed: đất liền gần gốc nhất). Từ Giai đoạn 5 server giữ điểm hồi sinh chung.
- Bộ đồ thử khi mới vào game (chỉ bản chạy thử `npm run dev`, ?kit=0 để tắt): công cụ kim
  cương, cuốc đất sắt, 64 mỗi loại block / nguyên liệu / thức ăn cần để thử (STARTER_KIT trong /shared).
- Chết: rơi toàn bộ đồ tại chỗ (tồn tại 5 phút), hồi sinh ở giường đã ngủ gần
  nhất, nếu không có thì ở điểm hồi sinh của thế giới.

Thông số di chuyển và sát thương môi trường (Giai đoạn 3, theo MECHANICS.md mục 2
và 5.5; người dùng đồng ý 2026-11-12, thay các số tương ứng ở trên):
- Đi bộ 4.317 · chạy nhanh 5.612 · ngồi 1.295 block/giây. Không chạy nhanh khi
  đang ngồi. Nhảy lúc chạy nhanh được đẩy thêm về phía trước: chạy + nhảy liên tục
  trung bình khoảng 7.1 block/giây, vượt khe khoảng 4 block (đi bộ + nhảy khoảng 2).
- Ngồi: hộp va chạm cao 1.5, mắt ở 1.27; trần thấp thì không đứng dậy được. Ngồi
  thì không bước khỏi mép cao từ 5/8 block trở lên.
- Bay (debug): 10.9 block/giây, nhấn đúp W bay nhanh gấp 3, Space bay lên, Shift bay xuống.
- Tự bước lên bậc cao tới 0.6 block mà không cần nhảy (đất cày, giường); block cao
  1 vẫn phải nhảy.
- Tốc độ rơi tối đa 78.4 block/giây.
- Thang: leo lên 2.4 block/giây (giữ Space hoặc W áp vào thang), tụt xuống tối đa
  3; giữ Shift (ngồi) thì đứng yên trên thang.
- Bơi: chìm tối đa 2 block/giây, giữ Space nổi lên 3. Đi ngang trong nước bằng
  50% tốc độ đi bộ; trong dung nham 30%, nổi/chìm bằng 50% so với nước.
- Chạy nhanh: góc nhìn (FOV) rộng thêm 10%.
- Sát thương rơi: floor(khoảng rơi − 3). Rơi vào nước, thang, mạng nhện thì tính lại
  khoảng rơi từ đầu.
- Dưỡng khí 15 giây khi đầu chìm trong nước; hết thì mất 2 máu mỗi giây; ngoi đầu
  lên thì hồi đầy trong 3.75 giây. (Thanh 10 bong bóng ở Giai đoạn 4 hiển thị số này.)
- Dung nham: 4 máu mỗi lần chạm; bị cháy 15 giây, đếm lại từ đầu mỗi tick còn ở
  trong dung nham. Đang cháy: 1 máu mỗi giây; xuống nước thì tắt.
- Sau khi nhận sát thương: miễn sát thương 0.5 giây; đòn mới mạnh hơn chỉ gây phần
  chênh lệch (nên dung nham thực tế khoảng 2 lần mỗi giây). Vừa hồi sinh: miễn 3 giây.
- Giai đoạn 3 chỉ lưu số máu (chưa hiển thị, chưa chết).

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
- Vùng an toàn: người dùng bỏ (2026-11-23) — `COMBAT.SAFE_ZONE_RADIUS = 0`; quanh điểm hồi sinh
  đánh nhau / đào / đặt / nổ phá block như mọi nơi khác.

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
- Thông số đã dùng (Giai đoạn 4c, theo MECHANICS.md 10): "lượng" 1–8 (nguồn và cột
  đang rơi = 8); mỗi ô lan ngang nước mất 1 (lan 7 ô), dung nham mất 2 (lan 3 ô); nước
  5 tick mỗi bước, dung nham 30 tick; tìm chỗ trũng: nước 4 ô, dung nham 2 ô (bản gốc ở
  thế giới thường); ô đang chảy nằm trên chất lỏng / chỗ trống thì không lan ngang (chỉ
  nguồn mới lan). Nguồn vô hạn: ô có ≥ 2 nguồn nước kề ngang và bên dưới là block đặc hoặc
  nguồn nước. Dung nham có nước kề (trừ bên dưới): nguồn → đá vỏ chai, đang chảy → đá cuội;
  dung nham chảy xuống ô nước → đá. Chất lỏng cuốn trôi đuốc, cỏ cao, ray, cây non, lúa,
  cà rốt, khoai tây, củ cải, thân dưa / bí (rơi vật phẩm). Xử lý tối đa 4000 ô mỗi tick.
- Vật phẩm trong chất lỏng bị dòng chảy đẩy (gia tốc 6, tối đa 2.5 block/giây); trong
  nước thì nổi lên (1 block/giây).
- Mô phỏng ở client trong các chunk đã tải (Giai đoạn 5 chuyển lên server); quét chất
  lỏng hở khi chunk vào bán kính random tick (6 chunk).
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

Thông số đã dùng (Giai đoạn 4d, `/shared/src/floraConstants.ts`):
- Thân: sồi 4–6, bạch dương 5–7, thông 6–9, keo 5–7 khúc. Thông: 1–2 khúc thân trần, hai ô lá
  trên ngọn, các tầng bán kính 1–3 xen kẽ to / nhỏ. Keo: 2–3 khúc thẳng, nghiêng 1–2 bước theo một
  hướng, tán bán kính 3 + tầng trên bán kính 2; 50% có nhánh phụ (tán bán kính 2).
- Mật độ cây (xác suất mỗi ô lưới 5x5): đồng tuyết 0.15 → 0.3 (rừng thông thưa), các biome khác giữ nguyên.
- Tỉ lệ loài: rừng 30% bạch dương; đồng cỏ 10% bạch dương; chân núi 70% thông; đồng cỏ có nhiệt
  độ > 0.1 và độ ẩm < 0.05 (sát sa mạc) toàn cây keo. Loài chọn bằng số băm riêng nên cây sồi
  giữ đúng vị trí / hình dạng như trước 4d.
- Hoa: lưới 12x12, mỗi ô có thể có một đám một loại hoa (đồng cỏ 55%, rừng 40%, núi 15%), bán
  kính 3, 45% ô cỏ trong đám có hoa. Đồng cỏ: bồ công anh, anh túc, hoa ngô xanh; rừng: bồ công
  anh, anh túc, linh lan; núi: bồ công anh, anh túc.
- Xương rồng: lưới 4x4, 8% ô có cây (vị trí 0–2 trong ô nên hai cây không bao giờ sát nhau), cao
  1–3; chỉ sinh khi 4 cột bên cạnh cũng là sa mạc khô và không cao hơn. Random tick tăng tuổi
  0–15, đủ tuổi thì mọc thêm một khúc (tối đa 3). Chạm vào: 1 máu (mỗi 0.5 giây do miễn sát thương).
- Phiên bản bộ sinh thế giới `WORLDGEN_VERSION = 2`.

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

Thông số đã dùng (Giai đoạn 4e):
- Id: 63 gạch đá; 64–73 bậc, 74–83 tấm theo thứ tự đá, đá cuội, đá cuội rêu, sa thạch, đá sâu, gạch
  đá, gỗ sồi, thông, bạch dương, keo; 84–88 tường (đá cuội, đá cuội rêu, sa thạch, đá sâu, gạch đá);
  89–91 hàng rào, 92–94 cửa thông / bạch dương / keo. Id 8 bit còn trống 95–255.
- Bậc / tấm / tường không chặn ánh sáng và không che khuất khối bên cạnh (vẽ bằng ánh sáng của chính
  ô, như đất cày); tấm đôi cũng vậy. Mặt áp sát khối đặc thì không vẽ.
- Bậc: phía cao quay theo hướng người chơi nhìn; lật ngược khi bấm mặt dưới hoặc nửa trên mặt bên
  (client gửi kèm độ cao điểm chạm `fy`). Dạng góc: bậc phía cao vuông góc → góc ngoài, bậc phía thấp
  vuông góc → góc trong (trái / phải theo hướng của bậc kia), trừ khi bậc bên cạnh cùng hướng "khóa" lại.
- Tấm: bấm mặt trên tấm dưới / mặt dưới tấm trên cùng loại, hoặc đặt vào ô đang có tấm đơn cùng loại →
  tấm đôi (tốn 1 tấm). Tấm khác loại không ghép.
- Tường: cột rộng 8/16 cao 1, tay nối rộng 6/16 cao 14/16; không có cột khi chỉ nối hai hướng đối nhau
  và trên đầu không có tường. Đuốc cắm được trên đầu tường như trên đầu hàng rào.
- Hàng rào / cửa theo loài: thông số như bản sồi; mọi loài hàng rào nối với nhau; cửa loài nào mở /
  đóng như cửa sồi. Công thức hàng rào / cửa theo đúng loài ván (không trộn).

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

Thông số đã dùng (Giai đoạn 4f, `/shared/src/decorConstants.ts`, `colors.ts`, `decor.ts`):
- Id: 95 len, 96 thảm, 97 kính màu, 98 tấm kính, 99 tấm kính màu, 100 song sắt, 101 lửa, 102–108 khối than / sắt /
  vàng / kim cương / ngọc lục bảo / sắt thô / vàng thô, 109 lồng đèn, 110 cửa sắt, 111 nút đá, 112 nút gỗ, 113 cần gạt.
  Id 8 bit còn trống 114–255.
- Màu theo thứ tự (giá trị dữ liệu phụ 0–15): trắng, cam, đỏ tía, xanh nhạt, vàng, vàng chanh, hồng, xám, xám nhạt,
  lục lam, tím, xanh dương, nâu, xanh lá, đỏ, đen. Giường: màu ở bit 3–6 (giường đỏ = 14). Vật phẩm theo màu:
  "<màu>_wool", "<màu>_carpet", "<màu>_stained_glass", "<màu>_stained_glass_pane", "<màu>_bed", "<màu>_dye"
  (len trắng đổi khóa "wool" → "white_wool", giường đỏ "bed" → "red_bed").
- Thuốc nhuộm: gốc như trên; đen = 1 than; trộn ra 2 (nâu = đỏ + xanh lá; xám nhạt = xám + trắng; đỏ tía = tím + hồng).
  Nhuộm: thuốc nhuộm + len màu bất kỳ → len màu đó; giường bất kỳ + thuốc nhuộm → giường màu đó.
- Kính màu và tấm kính màu vẽ bán trong suốt có pha trộn (lớp vẽ riêng), không chặn sáng; tấm kính / song sắt nối với
  nhau, với tường và khối đặc; cột giữa rộng 2/16, va chạm cao 1.
- Kéo: độ bền 238; lá / mạng nhện nhanh gấp 15 tay không, len gấp 5; lá, mạng nhện, cỏ cao rơi ra chính nó (mạng nhện
  và cỏ cao đặt lại được).
- Bật lửa: độ bền 64; chỉ đốt lên mặt trên khối đầy; lửa tắt sau 2–6 giây (server hẹn giờ; lửa sót lại khi chunk tải
  lại thì random tick dập), nước chảy vào thì tắt; đứng trong lửa: 1 máu và cháy 8 giây. Không nhắm vào lửa được; đặt
  block vào ô lửa thì đè lên.
- Khối tài nguyên: độ cứng 5 (vàng 3), cuốc cùng cấp với quặng; khối than đốt 80 món. Mảnh sắt: 1 thỏi ↔ 9 mảnh.
- Lồng đèn sáng 15, thân 6x7x6 + nắp 4x2x4; bấm mặt dưới trần thì treo; đứng trên khối đặc / hàng rào / tường, treo
  dưới khối đặc / hàng rào / tường. Cần cuốc mới rơi ra.
- Nút đá bật 1 giây, nút gỗ 1.5 giây, cần gạt bật / tắt; gắn sàn, trần, tường (cần khối đặc). Cửa sắt mở khi có nút /
  cần gạt đang bật cách một nửa cửa ≤ 2 ô (cộng các trục), chuột phải không mở; độ cứng 5, cần cuốc.
- Tấm áp lực (bổ sung 4f theo yêu cầu người dùng 2026-11-13): id 114 đá (2 đá xếp ngang), 115 gỗ (2 ván bất kỳ xếp ngang);
  đặt lên mặt trên khối đặc / hàng rào / tường, đi qua được (không va chạm). Người chơi đứng lên (chân cao hơn mặt
  dưới ô < 0.25) thì bật; tấm gỗ còn bật khi có vật phẩm rơi nằm trên; không còn gì đè 1 giây thì tắt. Mở cửa sắt
  như nút / cần gạt (cách ≤ 2 ô).

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
- Ánh sáng: đuốc 14, dung nham 15; lá cản 1, nước 1 (MECHANICS mục 6), mạng nhện 1; đổi block thì
  tính lại vùng ±15 block. Đường cong độ sáng: (f / (3 − 2f))^1.6, tối thiểu 0.004.
- Client vẽ theo đoạn 16x16x16 và ẩn đoạn khuất (duyệt từ đoạn chứa camera
  qua các mặt thông nhau).

## Lưu thế giới (Giai đoạn 5b)

- Tự lưu mỗi 60 giây và khi tắt server; file vùng 32x32 chunk (zlib); mật khẩu tối thiểu 3, tối đa 64 ký tự (băm scrypt + salt).
- Quản trị viên theo `admins` trong `server/config.json`; danh sách rỗng + `debug` thì mọi người là quản trị viên. Chỉ quản trị viên được bay (và phá tức thì khi bay).
- Thoát lúc đang chết: lưu như đã hồi sinh (điểm hồi sinh, đầy máu / đói; đồ đã rơi tại chỗ chết).

## Mạng, chống gian lận (Giai đoạn 5c)

- Client gửi phím bấm từng bước vật lý (60 bước / giây, gói nhị phân 20 lần / giây); server chạy cùng hàm vật lý
  rồi gửi lại trạng thái thật (vị trí, máu, đói, dưỡng khí...). Client đoán trước, lệch thì lấy trạng thái server
  và chạy lại các bước chưa được xác nhận; lệch dưới 3 block thì trượt dần về (hệ số 12 / giây).
- Mỗi người chơi chạy tối đa 60 bước mỗi giây thật (cho dư 2% vì đồng hồ lệch, dồn tối đa 60 bước = 1 giây).
- Đào: client báo "bắt đầu đào"; server chỉ cho phá khi đã đào ít nhất 70% thời gian đúng công thức, trừ 0,15 giây.
- Chỉ quản trị viên đang bay mới được báo thẳng vị trí (không chạy vật lý).
- Server tính lại ánh sáng tối đa 3 chunk mỗi tick, chỉ khi đổi block làm ánh sáng đổi đáng kể.
- Giả lập mạng xấu khi chạy server: `FAKE_LAG_MS` (ping thêm), `FAKE_LOSS_PCT` (mất gói nhị phân, tối đa 90).
  F3 trong game: ping, gói / KB mỗi giây, số lần bị sửa vị trí, số bước chờ xác nhận, chunk, thời gian tick server.

## Chiến đấu, chat (Giai đoạn 6a, người dùng chọn 2026-11-14)

- Sát thương: tay 1 · kiếm theo cấp (gỗ 4, đá 5, sắt 6, vàng 4, kim cương 7) · rìu = kiếm − 1 · cuốc = kiếm − 2 ·
  xẻng = kiếm − 1.5 · cuốc đất 1. Kiếm mất 1 độ bền mỗi đòn trúng, công cụ khác mất 2.
- Hồi đòn theo vũ khí (tốc độ đánh = đòn đầy lực / giây): tay 4 · kiếm 1.6 · cuốc 1.2 · xẻng 1 · cuốc đất 1 ·
  rìu gỗ / đá 0.8, sắt 0.9, vàng / kim cương 1. Lực = 0.2 + ((t + 0.5 tick) / T)² × 0.8; đổi đồ trên tay thì tính lại.
- Chí mạng ×1.5 khi đang rơi xuống, lực ≥ 84.8%, không chạy nhanh, không ở trong nước / trên thang.
- Đẩy lùi 8 block/giây ngang (đánh lúc chạy nhanh + lực ≥ 84.8%: gấp đôi), hất lên 7.2 block/giây nếu đang đứng.
- Tầm đánh 3 block (server chấp nhận 3.5); không đánh xuyên block có va chạm; bù trễ tua lại tối đa 250 ms.
- Quản trị viên đang bay không bị đánh. PvP mặc định bật (`pvp` trong config.json / `PVP=on|off` / `/pvp`).
- Vùng an toàn: đã bỏ (người dùng chọn 2026-11-23, `COMBAT.SAFE_ZONE_RADIUS = 0`).
- Khi trúng đòn: màn hình nháy đỏ + rung nhẹ; người khác thấy người bị đánh đỏ lên. Không có viền chỉ hướng.
- Giáp mòn theo sức mạnh đòn: mỗi món mất max(1, phần nguyên sát thương ÷ 4) độ bền mỗi đòn trúng giáp.
- Quét kiếm: đòn kiếm lực ≥ 84.8%, đứng trên đất, không chạy nhanh, không chí mạng → mọi người đứng sát mục tiêu
  (hộp mục tiêu nới 1 block ngang, 0.25 dọc; cách người đánh dưới 3 block) mất 1 máu, bị đẩy theo hướng người đánh nhìn.
- Khiên: 6 ván + 1 thỏi sắt, độ bền 336. Giữ chuột phải để giơ (tay phải cầm khiên, hoặc tay trái khi đồ tay phải
  không dùng được); giơ 0.25 giây rồi mới đỡ; đỡ mọi đòn từ nửa phía trước; đang giơ thì đi chậm còn 20%, không chạy
  nhanh. Đỡ đòn ≥ 3 máu: khiên mất 1 + phần nguyên sát thương. Đánh vào khiên: người đánh bị đẩy lùi; dùng rìu thì
  khiên bị khóa 5 giây.
- Tay trái: 1 ô (dưới 4 ô giáp trong túi đồ; cạnh hotbar khi có đồ). F đổi đồ tay phải ↔ tay trái; trong túi đồ trỏ
  vào ô + F; Shift + bấm khiên thì vào tay trái. Bật/tắt bay (quản trị viên): nhấn đúp Space.
- Cung (6b): giữ chuột phải để kéo, lực = (f² + 2f) / 3 với f = giây kéo (đủ lực sau 1 giây); dưới 10% thì không bắn.
  Tên bay tối đa 60 block/giây, trọng lực 20 block/giây², cản 0.99 mỗi tick (trong nước 0.6). Sát thương =
  ⌈tốc độ (block/tick) × 2⌉ (tối đa 6), kéo đủ lực thì chí mạng ×1.5 (9); trong [2, 9]. Kéo cung: đi chậm 20%, góc nhìn
  hẹp lại tối đa 15%; mỗi phát cung mất 1 độ bền. Tên cắm vào block nằm lại 60 giây, nhặt lại được. Khiên chặn được tên.
  Không có âm thanh (người dùng chọn 2026-11-14). Mũi tên chỉ lấy bằng /give tới Giai đoạn 7.
- Hạt: chí mạng (bắn ra quanh người bị chí mạng, vệt sau tên kéo đủ lực), vệt quét kiếm.
- Chat: tối đa 200 ký tự, 5 tin / 4 giây; tin hiện 10 giây. Chết trong 5 giây sau khi bị người khác đánh thì
  thông báo chết nêu tên người đó.

## Ngày đêm, sinh vật, giường (Giai đoạn 7a, người dùng chọn 2026-11-14)

- Người dùng chọn: có phối giống; không làm âm thanh sinh vật (như 6b).
- Giờ: 1 ngày 24000 tick = 20 phút, server tick 20 / giây; thế giới mới bắt đầu ở tick 1000; lưu trong world.json
  (`time` = số tick từ lúc tạo thế giới). Gửi cho client lúc vào game và mỗi 5 giây. Trời tối dần theo công thức góc mặt
  trời của Minecraft: ánh sáng trời bị trừ tối đa 11 mức lúc nửa đêm; khi vẽ, độ sáng trời thấp nhất 0.2.
- Lệnh quản trị: `/time` (xem giờ), `/time set day|noon|night|midnight|<tick>`, `/time add <tick>`; `/summon <loài> [số]`
  gọi sinh vật ra trước mặt (để thử).
- Sinh quái: ánh sáng block 0 và ánh sáng trời (đã trừ theo giờ) ≤ số ngẫu nhiên 0..7; cách mọi người chơi 24–128 block
  (thực tế ≤ 96 vì server chỉ tải 6 chunk quanh người chơi); đàn 1–4 con trong 6 block; 2 lần thử mỗi tick mỗi người;
  tối đa 30 quái quanh mỗi người chơi, đếm trong 128 block (MECHANICS 8.1). Trọng số: nhện 100, xác sống 95 (5% xác
  sống con), bộ xương 100. Gỡ quái cách mọi người > 128 block; từ 32 block, 30 giây không bị đánh: mỗi giây 1/800.
- Động vật: chunk tạo lần đầu (lưu danh sách chunk đã sinh trong entities.json) có 10% sinh một đàn 2–4 con trên cỏ
  (cừu 12, lợn 10, gà 10, bò 8); không ở sa mạc / biển. Lợn, bò, gà có biến thể lạnh (đồng tuyết, núi) / ấm (sa mạc,
  đồng cỏ khô có keo) / ôn hòa. Màu len tự nhiên theo MECHANICS 8.4. Động vật lưu cùng thế giới; chunk gỡ thì cất lại.
- Chỉ số (máu / sát thương / tốc độ đi – chạy, block/giây): xác sống 20, giáp 2 / 3 / 1.6–3.6 (con: ×1.5); bộ xương 20 /
  tên 2–4 mỗi 2 giây, giương cung 1 giây, giữ khoảng cách 5–15 block / 1.6–3.4; nhện 16 / 2 / 2.2–5.2, leo tường, vồ khi
  cách 2–4 block, sáng ≥ 12 thì trung lập (bị đánh thì tức 30 giây); lợn 10, bò 10, cừu 8, gà 4 / – / 1.1–1.2 đi, 2.6–2.8
  chạy. Quái hồi đòn 1 giây. Tầm phát hiện: xác sống 35, bộ xương / nhện 16 (phải nhìn thấy).
- Nắng: ban ngày (tick < 12542 hoặc ≥ 23460), thấy trời, không ở trong nước → xác sống / bộ xương cháy 8 giây (1 máu /
  giây), lặp lại. Sinh vật chết khi đang cháy rơi thịt chín.
- Rơi ra: xác sống thịt thối 0–2 (+0.83% mỗi món: thỏi sắt / cà rốt / khoai tây); bộ xương xương 0–2, tên 0–2, cung đã mòn
  8.5% (người dùng yêu cầu 2026-11-14; độ bền còn lại ngẫu nhiên như Minecraft, thường thấp); nhện sợi
  tơ 0–2, mắt nhện 1/3; lợn thịt 1–3; bò thịt 1–3, da 0–2; cừu thịt 1–2 + len 1 (chưa tỉa); gà thịt 1, lông 0–2.
  Con non không rơi gì. Bộ xương bắn tên không nhặt được.
- Phối giống: bò, cừu ăn lúa mì; lợn ăn cà rốt / khoai tây / củ cải đường; gà ăn hạt (lúa, củ cải, dưa, bí). Cho ăn → muốn
  phối giống 30 giây (có tim), gặp con cùng loài cũng đang muốn trong 8 block → sinh 1 con non (cừu: màu của bố hoặc mẹ),
  mỗi con chờ 5 phút. Con non lớn sau 20 phút, cho ăn thì nhanh hơn 10% thời gian còn lại. Cầm món ưa thích: động vật
  trong 10 block đi theo.
- Gà đẻ trứng mỗi 5–10 phút; ném trứng 30 block/giây, vỡ khi chạm: 1/8 nở gà con (1/32 trong số đó nở 4). Cừu tỉa bằng
  kéo: len 1–3, kéo mất 1 độ bền; cừu đã tỉa ăn cỏ (cỏ → đất, mỗi giây 1/50) thì lông mọc lại. Bò + xô → xô sữa
  (uống: hết hiệu ứng đói, trả lại xô). Bột xương: 1 xương → 3; bột xương → thuốc nhuộm trắng; bón cây trồng / thân dưa
  bí lớn 1 bậc, cây non lên bậc 2 hoặc thành cây.
- Thịt: bò / lợn sống 3 / 1.8, chín 8 / 12.8; gà sống 2 / 1.2 (30% hiệu ứng đói 30 giây), chín 6 / 7.2; cừu sống 2 / 1.2, chín
  6 / 9.6; thịt thối 4 / 0.8 (80% hiệu ứng đói 30 giây). Hiệu ứng đói: +0.1 hao sức mỗi giây, thanh đói màu xanh vàng.
  Mắt nhện chưa ăn được (gây độc — hệ thống hiệu ứng ở 7b).
- Sinh vật trúng đòn: dùng chung công thức người chơi (hồi đòn, chí mạng, đẩy lùi 8 block/giây, quét kiếm trúng sinh
  vật đứng sát mục tiêu 1 máu), miễn sát thương 0.5 giây; bù trễ bằng vị trí 1 giây gần nhất. Sinh vật đánh người chơi
  không phụ thuộc PvP / vùng an toàn; khiên đỡ được. Thông báo chết nêu tên loài.
- Tìm đường A*: 8 hướng, bước / nhảy lên 1 block, nhảy xuống ≤ 3 block, tránh dung nham / lửa / xương rồng, nước tốn gấp 3;
  tối đa 600 nút mỗi lần, 3000 nút mỗi tick cho cả server; đuổi theo thì tìm lại mỗi giây; kẹt 3 giây thì bỏ đường.
  Sinh vật đứng yên trên đất chỉ chạy vật lý mỗi 10 tick (đỡ tốn server).
- Giường: chuột phải → đặt điểm hồi sinh (ô đầu giường, lưu theo tài khoản; cả ban ngày) — đêm (12542–23460) và không có quái
  thù địch trong 8 block ngang / 5 dọc thì nằm xuống. ≥ 50% người online (`sleepPercent` trong config.json) nằm đủ 5 giây →
  sang bình minh hôm sau. Dậy khi: bấm "Rời giường" / Shift, bị mất máu, trời sáng, giường mất. Chết: hồi sinh ở ô trống
  cạnh giường (≤ 2 block); giường mất thì về điểm của thế giới và báo người chơi.

## Quái thêm, hiệu ứng, vụ nổ (Giai đoạn 7b, người dùng chọn 2026-11-14)

- Người dùng chọn: có TNT; quái phá block mặc định bật (`mobGriefing` trong config.json / `MOB_GRIEFING=on|off`). (Vùng an toàn
  quanh điểm hồi sinh đã bỏ 2026-11-23: nổ phá cả ở đó.) Không âm thanh.
- Quái mới (máu / sát thương): quái nổ 20 / nổ sức 3 (tới gần ≤ 3 block thì xì 1.5 giây, người chạy xa > 7 block thì xẹp,
  rơi thuốc súng 0–2); kẻ hư không 40 / 7 (trung lập, bị nhìn vào mặt trong 64 block hoặc bị đánh thì tức, chạy 6.5
  block/giây, dịch chuyển lại gần; né mọi đạn trừ bình; nước làm mất máu + dịch chuyển; lúc yên nhặt cỏ / đất / cát / sỏi /
  hoa / xương rồng / bí / dưa / TNT mang đi và thỉnh thoảng đặt xuống; rơi ngọc hư không 0–1 + khối đang cầm); mọt hư không
  8 / 2 (5% khi ngọc hư không rơi, tự biến mất sau 2 phút); khối nhầy cỡ 1 / 2 / 4: máu 1 / 4 / 16, sát thương 0 / 2 / 4,
  nhảy từng cú, chết thì tách 2–4 con nhỏ hơn, cỡ 1 rơi viên nhầy 0–2; xác khô (như xác sống, không cháy, đánh trúng gây đói
  7 giây); xác đuối (bơi lặn, cháy dưới nắng); bộ xương băng (tên gây chậm 30 giây, có thể rơi cung cũ 8.5%); nhện hang 12 /
  2 + độc 7 giây (cao 0.5, lọt khe 1 block); bóng ma đêm 20 / 6 (bay vòng trên cao, thỉnh thoảng lao xuống cắn, cháy dưới
  nắng, rơi màng bóng ma 0–1); phù thủy 26 (ném bình mỗi 3 giây trong 10 block: chạy nhanh → chậm 90 giây, máu ≥ 8 → độc
  45 giây, gần ≤ 3 block → yếu 90 giây, còn lại → 6 sát thương phép (giáp, khiên không đỡ); bình văng 4 block, xa thì yếu
  hơn; máu dưới nửa thì uống hồi 4 máu (chờ 8 giây); rơi thuốc súng / mắt nhện / que 0–2 mỗi thứ 40%); mọt đá 8 / 1.
- Sinh quái theo biome (MECHANICS 8.2): trên cạn nhện 100, xác sống 95, bộ xương 100, quái nổ 100, khối nhầy 100 (chỉ
  trong chunk nhầy 1/10 và dưới y = 40, bất kể ánh sáng), kẻ hư không 10 — chỉ ở chỗ thấy trời, tức ban đêm trên mặt đất
  (người dùng chọn 2026-11-14); ban ngày ngoài trời kẻ hư không thỉnh thoảng (trung bình 5 giây) bỏ mục tiêu, dịch chuyển đi.
- Phù thủy chỉ sinh ở nhà phù thủy (người dùng chọn 2026-11-14): game chưa có đầm lầy nên nhà đặt trong biome rừng, khoảng 1 nhà
  mỗi vùng 288 × 288 có rừng (70%); nhà sàn gỗ thông 5 × 6 trên cột gỗ sồi cao 3 block, hiên trước, mái ván, bàn chế tạo.
  Nhà trong 96 block quanh người chơi: khoảng 5 giây thử một lần, sinh phù thủy trong lòng nhà khi đủ tối (luật sinh quái),
  tối đa 2 con quanh nhà. WORLDGEN_VERSION 5.
- Quái nổ: chuột phải hoặc đánh bằng bật lửa → châm ngòi (xì 1.5 giây rồi nổ, không xẹp dù người chơi chạy xa), bật lửa mất 1
  độ bền (người dùng yêu cầu 2026-11-14; Minecraft chỉ chuột phải). Sa mạc: xác sống 19 +
  xác khô 80. Đồng tuyết / núi trên đường tuyết: bộ xương 20 + bộ xương băng 80. Điểm sinh dưới nước (đủ 2 ô nước): xác
  đuối, trọng số 100 ở sông / hồ (từng con), 5 ở đại dương. 5% xác sống / xác khô / xác đuối là con.
- Bóng ma đêm: người chơi thức ≥ 3 ngày (3600 giây online; ngủ hoặc chết thì đếm lại; lưu theo tài khoản), ban đêm, đứng chỗ
  thấy trời, y ≥ 62 → mỗi 60–119 giây sinh 1–3 con cao hơn 20–34 block.
- Lồng sinh quái (block mới, không lấy được; loài quái ở dữ liệu phụ: nhện hang / xác sống / bộ xương / nhện): trong hầm mỏ,
  mỗi hành lang 12% (tối đa 3 lồng mỗi hệ thống), mạng nhện dày quanh lồng; loài: nhện hang 60%, xác sống 20%, bộ xương 20%
  (người dùng chọn 2026-11-14 thêm xác sống / bộ xương). Có người trong 16 block: lượt đầu sau 1 giây, sau đó mỗi
  10–40 giây thử 4 chỗ trong 9 × 3 × 9 quanh lồng (chỗ trống đủ thân, nền trong 3 block bên dưới — quái rơi xuống, như Minecraft;
  sửa 2026-11-14 vì trước đó đòi nền ngay dưới chân nên sinh chậm gấp đôi) ở chỗ sáng ≤ 11, tối đa 6 con cùng loài quanh lồng.
  Thông số: `CAGE` (shared/src/mobConstants.ts). Trong lồng có mô hình nhỏ của loài quái (0.75 block, nghiêng 30°, quay) để biết
  lồng sinh gì.
- Hầm quái (người dùng chọn 2026-11-14, như Minecraft): phòng trong lòng đất y = 12–50 (trần dưới mặt đất ≥ 6 block, không ở
  biển), ruột 5–7 × 3 × 5–7, tường và trần đá cuội, sàn đá cuội lẫn 40% đá cuội rêu, lồng giữa phòng (xác sống 50%, bộ xương
  25%, nhện 25%), 1–2 rương sát tường (đồ như rương hầm mỏ). Mỗi chunk 2 lần thử, mỗi lần 5% (khoảng 1 hầm mỗi 23 chunk).
- Đá nhiễm (block mới, trông như đá, độ cứng 0.75, không rơi gì): cụm 9, 7 lần mỗi chunk, chỉ trong đá thường ở biome núi
  dưới y = 64. Phá thì ra mọt đá; mọt đá bị đánh thì mọt trong đá nhiễm quanh 21 × 11 × 21 (tối đa 8) chui ra; mọt rảnh thì
  chui vào đá thường kề bên (khi quái được phá block).
- Sinh thế giới đổi (WORLDGEN_VERSION 3): đá nhiễm và lồng sinh quái dùng chuỗi ngẫu nhiên riêng nên hầm mỏ / quặng / sỏi đã có
  không xê dịch; chunk đã lưu giữ nguyên nội dung.
- Hiệu ứng (MECHANICS 15): độc (1 máu / 1.25 giây, cấp II 0.6 giây, không dưới 1 máu, giáp không giảm), chậm (−15% tốc độ đi
  / cấp), yếu (−4 sát thương cận chiến / cấp), đói (+0.1 hao sức / giây), buồn nôn (góc nhìn co giãn). Cùng loại: cấp cao
  hơn thay, cùng cấp lấy thời gian dài hơn. Xô sữa xóa hết. HUD góc trên phải: biểu tượng + thời gian. Mắt nhện ăn được
  (2 / 3.2) + độc 5 giây.
- Vụ nổ (MECHANICS 16): quái nổ sức 3, TNT sức 4 (châm bằng bật lửa → cháy ngòi 4 giây, bị nổ trúng → ngòi 0.5–1.5 giây).
  Sức chống nổ: khối đá đào bằng cuốc 6, đá vỏ chai 1200, đá nền / chất lỏng không phá; còn lại ≈ độ cứng. Block do quái phá
  rơi 1/3, TNT rơi đủ (đá ra đá cuội như đào bằng cuốc). Rương / lò bị phá: đồ rơi ra. Sát thương ⌊(t² + t) / 2 × 7 × 2P + 1⌋
  (quái nổ sát mặt 43, TNT 57), giáp giảm, khiên giơ về phía vụ nổ thì chặn; đẩy văng theo tác động; vật phẩm rơi trong vùng
  nổ bị phá hủy. Thông báo chết: "nổ tung" / "bị … làm nổ tung", "bị phù thủy giết bằng phép thuật".
- Ngọc hư không: chồng 16, ném 30 block/giây, chờ 1 giây giữa hai lần, chạm đâu dịch chuyển tới đó, KHÔNG mất máu (người dùng
  chọn 2026-11-14; Minecraft mất 5 máu), 5% sinh mọt hư không.
- Danh sách vật phẩm cho `/give`: ITEMS.md (tạo bằng `npm run list-items`); trong game `/items [từ khóa]` tìm theo khóa hoặc tên
  tiếng Việt không cần dấu (xử lý trên máy người chơi, ai cũng dùng được). TNT: 5 thuốc súng + 4 cát (xen kẽ 3×3).

## Đầm lầy, nhà phù thủy (Giai đoạn 7b2, người dùng chọn 2026-11-14)

- Biome thứ 7 "Đầm lầy" (`BIOME.SWAMP` = 6): rất ẩm (độ ẩm từ 0.28, chuyển tiếp trong 0.12), không lạnh, không nóng, đất liền
  (không núi). Mặt đất kéo về sát mực nước (62 ± 1.8 theo noise chi tiết) → nhiều vũng nông (~20–25% diện tích); đáy vũng đất,
  không có bãi cát. Có ở mọi khoảng cách (ban đầu chỉ từ 1600 block để giữ thế giới cũ; bỏ khi người dùng
  làm lại thế giới 2026-11-14). WORLDGEN_VERSION 6.
- Cây: sồi (35% mỗi ô lưới), dây leo rủ từ mặt ngoài lá (35% mỗi mặt, dài 1–4); cỏ cao 30%; không hoa.
- Block mới: dây leo (id 119; leo được như thang, đi xuyên qua; bám khối đặc / lá bên cạnh hoặc dây leo phía trên; chỉ lấy được
  bằng kéo; đặt như thang); lá súng (id 120; tấm 1.5/16 trên mặt nước, đứng lên được; 10% ô nước sâu 1–2; rơi ra chính nó —
  chưa đặt lại lên nước được).
- Khối nhầy còn sinh trên mặt đầm lầy y 51–69 khi đủ tối (luật sinh quái thường), ngoài chunk nhầy dưới y = 40.
- Nhà phù thủy (mỗi nhà có sẵn 1 phù thủy ở nhà khi chunk giữa nhà tải lần đầu, không tự biến mất — 2026-11-14): chỉ ở đầm lầy (5 cột mẫu đều đầm lầy, không hồ lớn, nước dưới cột sâu ≤ 2), khoảng 1 nhà mỗi vùng 256 × 256 có
  đầm lầy; cột gỗ sồi cắm xuống tận đáy. Có bàn chế tạo và một rương: mắt nhện, thuốc súng, bột xương, sợi tơ, viên nhầy, thịt
  thối, lông, xô sữa, ngọc hư không, ngọc lục bảo, táo vàng hiếm (3–6 lượt). Rương hầm quái cũng có bảng riêng (xương, thịt thối,
  thuốc súng, sợi tơ, bánh mì, lúa mì, than, thỏi sắt / vàng, xô, táo vàng, kim cương hiếm).

## Động vật thêm, sinh vật nước, dơi (Giai đoạn 7c, người dùng chọn 2026-11-14: có giáp sói)

- Loài mới: thỏ, sói, cáo, dê, gấu trắng, lạc đà không bướu, tatu, dơi, mực, mực phát sáng, cá tuyết, cá hồi, cá nóc, cá nhiệt đới,
  cá heo (máu, sát thương, đồ rơi: `MOB_DEFS` trong `shared/src/mobTypes.ts`). Hình khối + texture lấy từ client.jar
  (`scripts/gen-mob-models.ts` → `client/src/mobs/mobModelsGen.ts`; con non dùng model lớn thu nhỏ).
- Sinh khi chunk tạo lần đầu, theo bảng `SPAWN_RULES.ANIMAL_BIOMES`: đồng cỏ (cừu, lợn, gà, bò); đồng cỏ khô có keo (thêm lạc đà,
  tatu, ít sói); rừng (thêm sói, thỏ); sa mạc (thỏ); đồng tuyết (thỏ, cáo, sói, gấu trắng, cừu); núi (cừu, lạc đà, thỏ, cáo, sói,
  bò); núi trên đường tuyết (dê); đầm lầy (như đồng cỏ). Sói đàn 1–4, gấu trắng 1–2 (con thứ hai 50% là gấu con).
- Biến thể: thỏ (sa mạc vàng; tuyết trắng 80% / trắng đốm 20%; nơi khác nâu 50%, muối tiêu 40%, đen 10%); sói (rừng: rừng / xám
  nhạt; tuyết: tro / tuyết; núi: đen / hạt dẻ / xám nhạt; đồng cỏ khô: đốm; sa mạc: sọc); cáo tuyết ở vùng tuyết; lạc đà 4 màu;
  cá nhiệt đới: 2 dáng × 6 hoa văn × màu thân / màu hoa văn (cố định theo con).
- Sói: hoang trung lập, đánh 4, săn cừu / thỏ / cáo / bộ xương; đánh một con thì cả đàn (16 block) đánh lại. Thuần bằng xương
  (1/3 mỗi khúc; được: 40 máu, ngồi, tim; trượt: khói). Chủ bấm tay không / món khác: ngồi ↔ đứng; thịt: hồi máu bằng độ no của
  món, đủ máu thì muốn phối giống; thuốc nhuộm: đổi màu vòng cổ (mặc định đỏ); giáp sói (6 vảy tatu, 64 độ bền) chịu thay mọi
  sát thương trừ rơi tới khi hỏng; kéo tháo giáp (rơi ra, giữ độ mòn). Đi theo chủ (cách > 4 thì đuổi), cách > 12 block và chủ
  không bay thì dịch chuyển về trong 3 block quanh chủ. Đánh thứ chủ đánh (trừ quái nổ và sói của chủ) và thứ đánh chủ (cả người
  chơi khác khi PvP). Lưu chủ theo tên tài khoản.
- Cáo: ban ngày ngủ (nằm nghiêng); người không rón rén lại gần (3 block khi ngủ, 8 khi thức) thì chạy; đêm săn gà / thỏ; nhặt vật
  phẩm rơi gần và ngậm, chết thì rơi ra.
- Dê: 30–300 giây húc một lần người chơi cách 4–16 block nhìn thấy được: lao tới, trúng thì 2 sát thương + đẩy rất mạnh; ngã an
  toàn tới 10 block; vắt sữa bằng xô.
- Gấu trắng: trung lập, đánh 6; có gấu con trong 16 block mà người lại gần (6 block) thì tấn công; đánh gấu con thì gấu lớn lao vào.
- Lạc đà không bướu: bị đánh thì nhổ nước bọt (1 sát thương, tầm 10, không đẩy); chưa có chở rương / đi đoàn (7d).
- Tatu: người chạy / bay trong 7 block hoặc bị đánh thì cuộn tròn (đứng yên); tự rụng vảy mỗi 5–10 phút.
- Dơi: bay loạn trong hang; sinh ở chỗ không khí dưới y 63, ánh sáng trời và block ≤ 3.
- Sinh vật nước: bơi loanh quanh trong nước, né người; lên cạn giãy 5 giây rồi mất 1 máu / giây. Cá nóc phồng dần khi người trong
  2.5 block, chạm khi phồng thì độc 3 giây × độ phồng; ăn cá nóc: độc mức 2 60 giây + đói + buồn nôn 15 giây. Cá heo: theo người
  đang bơi, cho hiệu ứng "bơi cùng cá heo" (5 giây, bơi nhanh gấp 3.2 lần), dưỡng khí 240 giây — hết thì mất 2 máu / giây, ngoi lên
  thì đầy lại; bị đánh thì cả đàn (12 block) đánh lại (3). Mực phát sáng không bị tối theo ánh sáng.
- Sinh lại liên tục quanh mỗi người chơi (16–64 block, 2 lần thử / tick), giới hạn trong 64 block: dơi 8, mực + cá heo 5, cá 10,
  mực phát sáng 3. Nước y 50–62 đại dương: 50% mực (đại dương không lạnh 15% là đàn cá heo 1–3), còn lại đàn cá theo nhiệt độ
  (lạnh: cá tuyết / cá hồi; ôn hòa: cá tuyết; ấm: cá nhiệt đới / cá nóc); sông / hồ: cá hồi, mực; nước tối dưới y 30: mực phát
  sáng. Ngoài 64 block: mỗi giây 1/40 bị gỡ; xa hơn 24 block mọi người chơi thì 3 tick mới tính AI / vật lý một lần.
- Xô nước chuột phải vào cá → xô cá (cá biến mất); đổ xô cá → nước + thả con cá đó (không tự biến mất, được lưu).
- Đồ mới: thịt thỏ, cá tuyết, cá hồi (sống / nướng — nung trong lò), cá nóc, cá nhiệt đới, da thỏ (4 → 1 da), chân thỏ, túi mực
  (→ thuốc nhuộm đen), túi mực phát sáng, vảy tatu, giáp sói, 4 loại xô cá. Hiệu ứng mới: bơi cùng cá heo.
- Gói MOBS thêm 1 byte riêng loài (sói: thuần / ngồi / có giáp / màu vòng cổ; cáo ngủ; tatu cuộn; độ phồng cá nóc). PROTOCOL 8.

## Thứ tự công trình (người dùng đồng ý 2026-11-14)

- Đã có: hầm mỏ, hầm quái, nhà phù thủy.
- 7e: công cụ nhập mẫu `.nbt` từ client.jar (đổi tên block, block thiếu thay bằng block gần giống) + lều tuyết, cổng đổ nát,
  kim tự tháp sa mạc (bẫy tấm áp lực + TNT), trại bỏ hoang (chỉ mẫu của biome game có).
- 7f: tàu đắm, tàn tích đại dương lạnh / ấm, kho báu chôn + bản đồ kho báu (bản đơn giản).
- 8a làng, 8b tiền đồn (dùng công cụ 7e).
- Tùy chọn, theo thứ tự: 8c dinh thự rừng, 8d đền rừng rậm, 8e đền đại dương, 8f khảo cổ + tàn tích đường mòn, 8g phòng thử
  thách, 8h thành phố cổ. Pháo đài đi cùng GĐ 10 / 11.

## Công trình: lều tuyết, cổng đổ nát, kim tự tháp sa mạc, trại bỏ hoang (Giai đoạn 7e, 2026-11-15)

- Mẫu lấy từ client.jar: `npm run import-textures` chạy thêm `scripts/import-structures.ts` → `client/public_mc/structures.json`
  (được commit từ 2026-11-23 cùng texture; client và server cùng nạp nên sinh giống hệt). Block Minecraft đổi sang block game theo `scripts/mcBlockMap.ts`;
  block chưa có thì thay gần giống: thùng gỗ / rương đồng → rương, giường rơm → giường vàng, lửa trại → tấm gỗ thông, cửa sập → tấm
  gỗ, đất sét → đất; nấm khổng lồ, bình hoa, vạc, giá pha thuốc, biển → bỏ. Thiếu file: không có 3 loại dùng mẫu (kim tự tháp vẫn
  có vì dựng bằng code).
- Số lượng (người dùng chọn 2026-11-15): kim tự tháp sa mạc, lều tuyết, trại bỏ hoang — cả thế giới mỗi loại chỉ 1–2 cái: rải 6000
  điểm theo seed trong bán kính 4000 block quanh gốc, lấy chỗ hợp lệ gần gốc nhất, cái thứ hai cách cái đầu ≥ 800 block
  (`STRUCT.UNIQUE`). Cổng đổ nát như Minecraft: mỗi vùng 40 × 40 chunk thử 1 chỗ (cách mép ≥ 15 chunk).
- Lều tuyết (người dùng yêu cầu): chỉ ở đồng bằng tuyết — phần lạnh nhất của biome tuyết (nhiệt độ < −0.48, khoảng 40% vùng tuyết),
  không có cây (HUD ghi "Đồng bằng tuyết"); đất quanh chỗ đặt chênh ≤ 2. 50% có hầm: 4–11 đoạn thang (3 block mỗi đoạn) xuống phòng
  thí nghiệm (gạch đá, song sắt, rương luôn có táo vàng). Không hầm thì chỗ cửa sập thành khối tuyết.
- Cổng đổ nát: 5% cổng lớn (3 mẫu), 95% cổng thường (10 mẫu), xoay ngẫu nhiên. Theo nhóm biome: thường (50% dưới đất từ y 15, 50%
  trên mặt đất), sa mạc (nửa chôn, nhô 2–8), đầm lầy (trên mặt đất), núi (50% trong núi, 50% mặt đất), đại dương (đáy biển). Biến
  đổi: khối vàng 30% mất, đá vỏ chai 15% → đá vỏ chai khóc, đá lửa ngục 7% → magma, dung nham 20% → magma (đáy biển: luôn; vùng
  lạnh: dung nham → đá lửa ngục), gạch đá 50% × (1 − rêu) nứt, 50% × rêu thành gạch rêu (rêu: thường 0.2, sa mạc 0, đầm lầy 0.5,
  núi 0.2, đại dương 0.8).
- Kim tự tháp sa mạc (dựng bằng code theo wiki): nền 21 × 21, lún vào cát 1–3; hai tháp góc trước có sọc đất nung cam, mặt tiền +
  lối vào rộng 3; đại sảnh cao 8, sàn ca rô hoa gió đất nung cam, ô đất nung xanh dương ở giữa. Đào xuống dưới ô xanh 11 tầng là
  phòng kín 5 × 5 cao 3: 4 rương ở 4 hốc, tấm áp lực đá giữa sàn, 9 TNT (3 × 3) dưới sàn. Chưa có mạch đá đỏ: tấm áp lực vừa bật
  thì TNT trong 3 × 3 ngay dưới, sâu tới 3 block, cháy ngòi (`TNT.TRAP_DEPTH`).
- Trại bỏ hoang: lều (nhóm theo biome) nối khối ghép với khu lửa trại (45 mẫu chung + 4 riêng). Biome game → mẫu Minecraft: rừng →
  forest / birch_forest, đồng tuyết → snowy_taiga, núi → taiga / windswept_forest, đồng cỏ khô → savanna, đầm lầy → swamp, đồng cỏ
  → meadow. Khối ghép dựng đứng trồng cây của game theo loài. Lấp móng bằng đất chỗ trũng.
- Đồ trong rương (bảng Minecraft, bỏ món game chưa có): lều tuyết (2–8 lượt: táo, than, mảnh sắt, rìu đá, thịt thối, ngọc lục bảo,
  lúa mì + luôn 1 táo vàng); kim tự tháp (2–4 lượt: kim cương, sắt, vàng, ngọc lục bảo, xương, mắt nhện, thịt thối, da, táo vàng;
  + 4 lượt xương / thuốc súng / thịt thối / tơ / cát); cổng đổ nát (4–8 lượt: đá vỏ chai, đá lửa, mảnh sắt, bật lửa, táo vàng, đồ
  vàng, thỏi vàng, khối vàng); trại: rương thường, rương bí mật (kim cương, thỏi sắt / vàng, đồ sắt), thùng.
- Block mới (id 121–134): khối tuyết, băng (trong mờ), gạch đá khắc / nứt / rêu, đá lửa ngục, khối magma (sáng 3), đá vỏ chai khóc
  (sáng 10), đá cát khắc / cắt, đất nung cam / xanh dương, đường đất, bậc len trắng. Công thức: gạch đá khắc (2 tấm gạch đá), gạch
  đá rêu (gạch đá + dây leo), đá cát cắt (4 đá cát → 4), đá cát khắc (2 tấm đá cát), nung gạch đá → gạch đá nứt.

## Công trình dưới nước: tàu đắm, tàn tích đại dương (Giai đoạn 7f, 2026-11-15)

- Người dùng chọn: bỏ kho báu chôn (và bản đồ kho báu); tàu đắm, tàn tích đại dương cũng chỉ 1–2 cái mỗi loại cả thế giới (cùng
  cách đặt với kim tự tháp: chỗ hợp lệ gần gốc nhất, cái thứ hai cách ≥ 800 block).
- Tàu đắm (20 mẫu client.jar: đứng thẳng / nghiêng / lật úp × nguyên chiếc / nửa trước / nửa sau, có cột buồm, bản mục): dưới đáy
  biển sâu ≥ 4 (mọi mẫu, lún 1–2) hoặc mắc cạn trên bãi (cao hơn mặt nước ≤ 2, có biển trong 12 block; chỉ mẫu đứng thẳng / có cột
  buồm, chôn nửa thân). Không vẽ ô không khí của mẫu → nước còn trong thân tàu. Rương: tiếp tế (khoai tây, cà rốt, lúa mì, than,
  thịt thối, bí ngô, thuốc súng, TNT, giáp da), "bản đồ" (bỏ bản đồ kho báu: lông, tơ, than), kho báu (thỏi sắt / vàng, ngọc lục
  bảo, kim cương, mảnh sắt).
- Tàn tích đại dương: biển sâu ≥ 3; biển ấm / hơi ấm (nhiệt độ > 0) → tàn tích đá cát (đá granit → đất nung cam), còn lại → gạch đá
  thường / nứt / rêu (mỗi tàn tích một loại). 30% tàn tích lớn (giữ 90% block), còn lại nhỏ (giữ 80%) — block mất ngẫu nhiên theo vị
  trí, rương luôn còn. Tàn tích lớn 90% kèm cụm 4–8 tàn tích nhỏ cách 12–24 block. Rương ở chỗ khối dữ liệu "chest" (bảng nhỏ: than,
  rìu đá, thịt thối, ngọc lục bảo, lúa mì + giáp da / mũ vàng; bảng lớn thêm thỏi vàng, táo vàng). Xác đuối canh sẵn ở chỗ khối dữ
  liệu "drowned" (tàn tích lớn): sinh khi chunk tải lần đầu, không tự biến mất, mỗi chỗ một lần (lưu SavedEntities.structMobs).
- Block thay thêm: lăng trụ biển → gạch đá rêu, gạch nung → đất nung cam, đất nung tím / xanh nhạt → đất nung xanh dương, cửa gỗ đúng
  loại gỗ (tàu đắm).

## Cưỡi thú, dây dắt (Giai đoạn 7d, 2026-11-15)

- Loài: ngựa (7 màu × 5 kiểu vết; máu 15–30; tốc độ 4.7–14.2 block/giây, nhảy 1.1–5.3 block — ngẫu nhiên lúc sinh, con non lấy
  trung bình bố mẹ ±10%), lừa / la (tốc độ 7.4, nhảy 1.6, mô hình thu nhỏ 0.87 / 0.92), lạc đà không bướu cưỡi được nhưng không điều
  khiển (tốc độ 2). Đồng cỏ: đàn ngựa 2–6 (trọng số 5), lừa 1–3 (trọng số 1); đồng cỏ khô có keo: ngựa 3, lừa 1.
- Cưỡi: chuột phải tay không / món khác. Chưa thuần: sau 1–3 giây thuần với xác suất độ_thuần / 100, không thì hất xuống (+5 độ thuần).
  Cho ăn: lúa mì (+2 máu, +3 độ thuần), táo (+3, +3), táo vàng (+10, +10); con đã thuần đủ máu ăn táo vàng thì muốn phối giống;
  ngựa + lừa → la (la không đẻ). Lạc đà vẫn ăn lúa mì / phối giống như 7c. Con non không cưỡi được.
- Điều khiển: cần đã thuần + có yên (lạc đà không). Đi tới theo tốc độ con thú, đi ngang ×0.5, lùi ×0.25; bước lên 1 block; giữ Space để
  tích lực (1 giây = đầy), nhả ra nhảy 40–100% độ cao tối đa (thanh tích lực trên thanh công cụ); Shift: xuống (đứng cạnh thú, kín
  thì đứng trên lưng). Thú không mất máu khi rơi dưới 3 block (rơi xa hơn: thú mất máu, người cưỡi không). Chỗ ngồi: chân người cao
  hơn chân thú 1.1 (ngựa) / 0.95 (lừa) / 1.0 (la) / 1.25 (lạc đà) — mắt ~2.7 block; người khác thấy người cưỡi ngồi (vẽ thấp 0.55).
- Mạng: trạng thái cưỡi nằm trong trạng thái người chơi; vật lý thú chạy trong bước vật lý người chơi (client đoán, server tính lại như
  5c). Thân thú trên server theo người cưỡi mỗi tick; người khác vẽ thú ngay dưới người cưỡi (gói vị trí người chơi có id thú).
- Yên: đặt lên ngựa / lừa / la đã thuần; kéo để tháo. Rương: đặt lên lừa / la (15 ô) / lạc đà (3 × sức chở 1–5) đã thuần; mở bằng
  Shift + chuột phải hoặc phím túi đồ khi đang cưỡi; thú chết rơi yên, rương và đồ trong rương; lưu cùng thế giới.
- Dây dắt: cầm dây chuột phải con vật (trên cạn, không phải quái) → dắt (tốn 1 dây); xa hơn 4 block thì nó đi theo, xa hơn 10 thì đứt
  (rơi dây); chuột phải lại con mình đang dắt: tháo, lấy lại dây. Đang dắt mà chuột phải hàng rào / tường: buộc vào cọc (lưu cùng thế
  giới); chuột phải cọc đó: lấy về tay; cọc bị phá: rơi dây. Dắt một lạc đà: lạc đà trong 8 block nối đuôi thành đoàn (tối đa 10, mỗi
  con cách con trước 2.5); tháo dây con đầu: đoàn tan.
- Đồ mới: yên (3 da + 1 thỏi sắt; có trong rương hầm mỏ, hầm quái), dây dắt (4 sợi tơ + 1 viên nhầy → 2).

## Làng, dân làng (Giai đoạn 8a, 2026-11-15)

Người dùng chọn: xác sống / dân làng theo bản gốc; mẫu làng lấy từ client.jar; mật độ như Minecraft.
- Làng: mỗi vùng 34 × 34 chunk (544 block) thử một chỗ (cách mép xa ≥ 8 chunk, salt 10387312). Loại theo biome ở tâm: đồng cỏ →
  đồng cỏ (plains), đồng cỏ khô có keo → savanna, sa mạc, đồng bằng tuyết → snowy, rừng tuyết / núi dưới đường tuyết → taiga.
  Cần ≥ 6/9 điểm dò (bán kính 24) trên cạn, chênh cao ≤ 12. Ghép bằng khối ghép: quảng trường → đường → nhà / đường, sâu 6 lớp,
  lớp cuối chỉ dùng đoạn kết đường; trong 80 block từ tâm; mảnh không chồng cột nhau; nhà không đặt lên nước, đoạn đường > 40%
  trên nước thì bỏ; ít hơn 3 nhà thì bỏ làng. Đường bám mặt đất từng cột (qua nước: cầu ván), 10–20% đường lẫn cỏ; nhà đặt sao
  cho cửa ngay trên mặt đất, lấp móng đất (sa mạc: đá cát). Rêu đá cuội 10/20/70%, ruộng trồng xen như Minecraft. Cây / đống rơm,
  dưa, bí, tuyết, băng, xương rồng, hoa theo mẫu; cây tự nhiên không mọc trong 2 block quanh nhà / đường. Chưa có làng bỏ hoang.
- Block mới: đá cát mịn, đất nung (trơn, 16 màu, tráng men 16 màu), khối rơm, giá sách, bàn nghề (thùng ủ phân, thùng gỗ, khung
  dệt, lò hun khói, lò luyện, bàn bản đồ, bàn làm tên, bàn rèn, bục đọc sách, máy cắt đá 9/16, đá mài, vạc, giá pha chế) — chỉ trang
  trí + chọn nghề. Đường đất cao 15/16 như Minecraft. Cửa sập: đóng → tấm gỗ, mở → bỏ; cổng rào → hàng rào.
- Dân làng: 20 máu; nghề theo bàn nghề gần nhất (24 block) lúc sinh, không có thì ngẫu nhiên; ngốc / con không đổi đồ (con lớn
  sau 20 phút thì có nghề). Ban ngày đi lang thang trong 40 block quanh chỗ sinh, đêm về chỗ sinh (trong nhà) đứng yên; xác sống
  trong 8 block thì chạy. Đổi đồ: 2–4 giao dịch cố định theo nghề (shared/src/trades.ts), ngọc lục bảo; mỗi giao dịch 3–16 lần,
  bổ sung sau 10 phút; Shift + bấm: đổi tới khi hết đồ / hàng; số lần dùng lưu ở dân làng (nhiều người thấy như nhau).
- Xác sống (cả xác khô, xác đuối, dân làng xác sống) không có người chơi để đuổi thì săn dân làng trong 32 block. Dân làng bị xác
  sống giết: 50% thành dân làng xác sống (giữ vùng + nghề, không tự biến mất). Dân làng xác sống còn sinh tự nhiên (trọng số 5).
  Chữa: chuột phải bằng táo vàng (chưa có thuốc yếu nên chỉ cần táo vàng) → 2–5 phút sau thành dân làng giữ nghề.
- Người sắt (1 con mỗi làng theo mẫu): 100 máu, tuần tra 24 block quanh giữa làng, đánh quái thù địch trong 16 block (trừ quái nổ)
  7–21 sát thương + hất lên 8 block/giây; người đánh nó / đánh dân làng trong 16 block: giận 60 giây. Rơi 3–5 thỏi sắt, 0–2 anh túc.
- Mèo (theo mẫu, 11 màu): hoang thì né người (trừ người rón rén cầm cá); cho cá tuyết / cá hồi sống 1/3 mỗi con → thuần (ngồi, đi
  theo chủ, nhuộm vòng cổ, phối giống bằng cá). Quái nổ trong 6 block quanh mèo thì chạy, không xì; bóng ma đêm không lao xuống
  người có mèo trong 16 block.
- Thương nhân lang thang: 20 phút thử một lần (25% → 50% → 75%), xuất hiện cách người chơi 24–48 block cùng 2 lạc đà không bướu
  dắt theo; bán 5 món thường + 1 món hiếm; 40–60 phút thì đi (cùng lạc đà). Cả thế giới tối đa 1 người.
- Lạc đà (làng sa mạc): 32 máu, không cần thuần; có yên thì lái (3.9 block/giây), Space: lướt ~4 block (chờ 2.75 giây); người thứ
  hai chuột phải: ngồi sau. Ăn xương rồng.
- /structure save <tên> x1 y1 z1 x2 y2 z2 (quản trị viên, ~ = vị trí mình): chụp vùng (3–48 × ≤ 32 × 3–48) thành nhà; cửa ở mép
  gần mép nhất = lối vào (chân cửa đặt ngay trên mặt đất), không có cửa: mép gần người chơi. Lưu <thế giới>/structures.json; thêm
  vào nhóm nhà mọi loại làng (trọng số 6). Mỗi vùng làng chốt "mốc" số nhà tự lưu lúc sinh lần đầu: làng đã sinh không đổi.
- Sửa thêm (người dùng yêu cầu 2026-11-15): đánh / chuột phải quái nổ bằng bật lửa thì nổ ngay. Đang cưỡi cầm thức ăn chuột phải:
  cho chính con thú ăn (ngựa / lừa / la ăn thêm khối rơm: hồi 20 máu); cho ăn có tim; vừa lên thú hiện gợi ý phím (Shift xuống).

## Kẻ cướp, tiền đồn, tiểu linh, nỏ (Giai đoạn 8b, 2026-11-15)

Người dùng chọn: bỏ điềm xấu và cuộc cướp làng; giữ kẻ cướp ở tiền đồn + đội tuần tra như Minecraft. Đao phủ, pháp sư, tiểu quỷ,
vật tổ bất tử chuyển sang 8c (dinh thự rừng). Quái tàn phá (chỉ có trong cướp làng) bỏ.
- Tiền đồn: mẫu pillager_outpost trong client.jar ghép khối (nền + tháp canh có rương ở đỉnh + 0–3 tấm nền phụ bám mặt đất với lều,
  lồng nhốt người sắt / tiểu linh, đống gỗ, bia tập bắn). Mỗi vùng 32 × 32 chunk thử một chỗ, 20% vùng có, không trong 10 chunk quanh
  làng, biome như làng. Rương: nỏ, lúa / khoai / cà rốt, gỗ, sợi tơ, tên, sắt, ngọc lục bảo.
- Kẻ cướp: 24 máu, bắn nỏ 3–5 sát thương mỗi 2.5 giây trong 12–15 block, không cháy nắng, tầm phát hiện 32. Rơi tên 0–2, nỏ 8.5%
  (mòn). Người chơi trong 48 block quanh tiền đồn: mỗi 4 giây sinh 1 kẻ cướp trên nền tiền đồn (cả ban ngày), tối đa 6 con.
- Đội tuần tra: từ ngày thứ 5, mỗi 10–11 phút 20% xuất hiện 2–5 tên cách người chơi 24–48 block; đội trưởng đội cờ điềm xấu trên đầu,
  đi về một điểm xa ~512 block, lính đi theo đội trưởng; thấy người chơi thì bắn. Thử nhanh: /summon patrol (quản trị viên).
- Tiểu linh (trong lồng ở tiền đồn): bay, 20 máu. Chuột phải bằng một món: nó cầm món đó, đi nhặt món giống thế quanh 32 block (tối
  đa 64) rồi mang về thả cạnh người đưa; tay không chuột phải: lấy lại món + đồ đang mang.
- Nỏ (người chơi): giữ chuột phải 1.25 giây để lên dây (tốn 1 mũi tên) — nỏ thành "Nỏ (đã lên dây)"; chuột phải lần nữa để bắn
  (tên 63 block/giây, 6–11 sát thương); độ bền 465.

## Kinh nghiệm, mía, sách, bàn phù phép (Giai đoạn 8b2, 2026-11-15)

Người dùng chọn: chia phù phép làm 2 phần (8b2 bàn phù phép, 8b3 đe / sách phù phép / đá mài), chết KHÔNG mất XP, mía như Minecraft.
- Kinh nghiệm: cấp theo công thức Minecraft (0–15: 2L + 7; 16–30: 5L − 38; 31+: 9L − 158). Nguồn: quái thù địch 5 (bị mình đánh trong
  5 giây trước khi chết), động vật trưởng thành 1–3, quặng than 0–2, kim cương / ngọc lục bảo 3–7, lưu ly 2–5 (không khi Cảm ứng tơ),
  mỗi lần đổi đồ với dân làng 3–6. Quả cầu XP (vật phẩm rơi đặc biệt) bay về người chơi trong 7.5 block. Thanh XP + cấp trên thanh
  công cụ (khi cưỡi thú điều khiển được: thanh tích lực nhảy thay chỗ). Chưa có XP khi nung đồ / phối giống.
- Mía: mọc tự nhiên ở mép bờ (đất / cát / cỏ ngang mặt nước, có nước ngay cạnh), cao 1–4; trồng được ở chỗ như thế; tự mọc tới 3
  khúc (random tick, 15 lần mới thêm khúc); mất nước cạnh gốc thì gãy. 3 mía → 3 giấy; 3 giấy + 1 da → sách; 6 ván + 3 sách → giá
  sách (phá ra 3 sách); 1 sách + 2 kim cương + 4 hắc diện thạch → bàn phù phép (cao 12/16, sáng 7).
- Lưu ly: quặng (thường / đá sâu) y 1–40, cụm 4–7, 3 cụm mỗi chunk; cuốc đá trở lên, rơi 4–9 viên; 9 viên ↔ khối lưu ly.
- Bàn phù phép: chuột phải mở 2 ô (món chưa phù phép / sách + lưu ly); giá sách quanh bàn (vòng cách 1 ô trống, cao 0–1, tối đa 15)
  nâng mức; 3 lựa chọn mức (1–8 + giá sách...) như Minecraft, hiện một phù phép gợi ý "…?". Chọn lựa chọn i: cần đủ cấp, tốn i + 1
  lưu ly và i + 1 cấp; sách thành sách phù phép (dùng ở 8b3). Hạt giống lựa chọn của từng người, đổi sau mỗi lần phù phép. Đóng bàn:
  đồ trong ô trả về túi. Quản trị viên đang bay: không tốn (để thử).
- Phù phép có hiệu ứng thật: Sắc bén (+0.5 × cấp + 0.5), Phán xét / Khắc tinh chân đốt (+2.5 × cấp với xác sống... / nhện...), Đẩy lùi,
  Lửa (cháy 4 giây × cấp), Cướp bóc (đồ rơi nhiều hơn), Quét; Hiệu suất (+cấp² + 1 tốc độ đào), Cảm ứng tơ (rơi nguyên khối), May mắn
  (quặng than / kim cương / ngọc lục bảo / lưu ly nhiều hơn), Không phá vỡ (mòn 1/(cấp+1), giáp 60% + 40%/(cấp+1)); Bảo vệ / Chống
  lửa / Chống nổ / Chống đạn / Rơi nhẹ (EPF, mỗi điểm −4%, tối đa 80%), Gai (15% × cấp phản 1–4), Hô hấp, Thích nghi nước, Sải chân
  dưới nước; Sức mạnh (+25% × (cấp+1)), Đấm, Lửa (cung), Vô hạn; Nạp nhanh (−0.25 giây / cấp), Bắn ba, Xuyên. Bỏ phù phép của chỉ câu,
  đinh ba; Vá và Đi trên băng là phù phép kho báu (không ra từ bàn — để 8b3).
- Đồ đã phù phép: ánh tím (ô đồ, đồ cầm trên tay, người khác cũng thấy); trỏ chuột vào ô thấy danh sách phù phép.

## Đe, đá mài, sách phù phép, Vá (Giai đoạn 8b3, 2026-11-15)

Theo Minecraft Wiki (bản Java), người dùng yêu cầu làm cùng 8b2 rồi thử một thể.
- Đe (3 khối sắt + 4 thỏi sắt; rơi như cát): 2 ô + ô kết quả xem trước + ô đặt tên (tối đa 35 ký tự), giá bằng cấp kinh nghiệm.
  Gộp phù phép từ sách phù phép hoặc món cùng loại: cùng cấp thì +1 (không quá cấp tối đa), khác cấp lấy cấp cao; phù phép không hợp
  loại đồ / xung đột thì bỏ (+1 giá). Giá mỗi cấp theo độ hiếm: thường 1, ít 2, hiếm 4, rất hiếm 8 (từ sách: một nửa, ít nhất 1).
  Sửa: gộp hai món cùng loại (+12% độ bền, +2 giá) hoặc bằng nguyên liệu (ván / đá cuội / sắt / vàng / kim cương / da: mỗi cái 25%,
  +1 giá). Đổi tên +1. Phạt số lần đã qua đe: 2ⁿ − 1 (cả hai món); món ra có số lần = lớn hơn + 1. Giá ≥ 40: "Quá đắt!". Mỗi lần dùng 12%
  đe sứt một mức: đe → đe sứt → đe hỏng nặng → vỡ. Quản trị viên đang bay: không tốn cấp.
- Đá mài (2 que + 1 tấm đá + 2 ván; khối đã có ở làng): gỡ mọi phù phép (sách phù phép → sách), trả kinh nghiệm ngẫu nhiên từ nửa tới
  đủ tổng "sức mạnh tối thiểu" của các phù phép; hai món cùng loại thì gộp độ bền (+5%). Giữ tên.
- Sách phù phép: từ bàn phù phép; trong rương hầm quái, hầm mỏ, kim tự tháp, tàu đắm (kho báu), tàn tích lớn, tiền đồn (một phù phép
  ngẫu nhiên, cấp ngẫu nhiên, có cả Vá); thủ thư làng bán 1 cuốn riêng từng người (ngọc lục bảo 2 + 3 × cấp + ngẫu nhiên 0..5 + 10 × cấp,
  Vá ×2, tối đa 64, kèm 1 sách).
- Vá (phù phép kho báu, không ra từ bàn): nhặt quả cầu kinh nghiệm thì sửa đồ có Vá đang cầm / mặc (2 độ bền mỗi điểm), phần dư mới
  cộng vào XP.
- Tên đặt ở đe hiện khi trỏ chuột vào ô đồ: "Tên (loại đồ)".

## Rừng sồi tối, dinh thự rừng, đao phủ, pháp sư, tiểu quỷ, vật tổ bất tử (Giai đoạn 8c, 2026-11-15)

Người dùng yêu cầu làm sau 8b (chọn 2026-11-15): dinh thự dựng theo thuật toán lưới phòng của Minecraft từ 73 mẫu trong client.jar,
cả thế giới 1–2 cái gần gốc. Tiểu linh đã có từ 8b. WORLDGEN_VERSION 11, PROTOCOL 15.
- Rừng sồi tối: một phần biome rừng (trường noise riêng tần số 1/600 > 0.15, khoảng 1/3 diện tích rừng); HUD "Rừng sồi tối". Cây: 95%
  ô lưới có cây, 80% sồi tối, 10% bạch dương, 10% sồi. Động vật, trại bỏ hoang dùng chung bảng rừng. Chưa có nấm khổng lồ (game chưa
  có khối nấm).
- Gỗ sồi tối (id 162–169): thân, lá, ván, cây non, bậc, tấm, hàng rào, cửa; công thức như các loài khác. Cây sồi tối thân 2 × 2 cao
  6–8 (50% nửa trên lệch 1 block), tán dẹt bán kính 3. Cây non sồi tối chỉ lớn khi đủ 4 cây xếp 2 × 2 (như Minecraft).
- Dinh thự: chép thuật toán WoodlandMansionPieces của Minecraft (đối chiếu bytecode trong client.jar): lưới 11 × 11 ô 8 block, hành
  lang mọc đệ quy từ sảnh, phòng 1 × 1 / 1 × 2 / 2 × 2 cho tầng 1, 2; tầng 3 mọc từ phòng cầu thang; tường ngoài, tường / cửa trong,
  thảm hành lang, mái. Mẫu có lật (Mirror) — bộ vẽ công trình nay hỗ trợ lật trục X / Z (bậc đổi góc trái ↔ phải, cửa đổi bản lề).
  Chỗ đặt: như kim tự tháp (STRUCT.UNIQUE: rải điểm theo seed, lấy chỗ hợp lệ gần gốc nhất, cái thứ hai cách ≥ 800 block); điểm gốc ở
  rừng sồi tối, nền = mặt đất thấp nhất trong 4 góc ô 5 × 5 (≥ y 60); thêm (game): ≥ 85% chân các mảnh tầng 1 trên cạn, đất không cao
  hơn nền quá 8. Móng đá cuội lấp xuống tới đất (tối đa 48). Cây tự nhiên không mọc trong hộp dinh thự + 5 block.
  Seed hiện tại (dat-moi-mbgwo2): một dinh thự ở x 744..804, z −151..−73 (nền y 66).
- Khối dữ liệu trong mẫu: "Chest<Hướng>" → rương bảng woodland_mansion (dây dắt, táo vàng, cuốc kim cương, áo giáp kim cương, sách phù
  phép; sắt, vàng, bánh mì, lúa, xô, than, hạt; xương / thuốc súng / thịt thối / tơ); "Warrior" → đao phủ, "Mage" → pháp sư, "Group of
  Allays" → 1–3 tiểu linh (sinh khi chunk tải lần đầu, không tự biến mất). Lồng sinh quái nhện của mẫu giữ nguyên. Block thay: đá
  andesit mài → đá, đá cuội nhiễm → đá cuội, đất thô → đất, cổng rào → hàng rào; chậu hoa, cờ, dây đỏ, nấm → bỏ.
- Đao phủ: 24 máu, rìu sắt 13 sát thương, tầm phát hiện 12, chạy nhanh hơn xác sống; khoanh tay, đuổi đánh thì giơ rìu. Rơi ngọc lục
  bảo 0–1, rìu sắt 8.5% (mòn). 5 kinh nghiệm.
- Pháp sư: 24 máu, tầm 12; người chơi trong 8 block thì chạy ra xa. Có mục tiêu: gọi 3 tiểu quỷ (mỗi 17 giây, làm phép 5 giây; gọi khi
  rng·8 + 1 > số tiểu quỷ trong 16 block) hoặc tung nanh (mỗi 5 giây, làm phép 2 giây; cần nhìn thấy). Phép có hiệu lực sau 1 giây làm
  phép; đang làm phép thì đứng yên, giang tay, có hạt phép. Nanh: mục tiêu cách < 3 block → 2 vòng (5 nanh bán kính 1.5 + 8 nanh bán kính
  2.5); xa hơn → hàng 16 nanh cách nhau 1.25 về phía mục tiêu, mỗi nanh trễ thêm 1 tick; nanh mọc ở mặt đất gần nhất giữa hai độ cao;
  cắn sau trễ + 8 tick: 6 sát thương phép (bỏ qua giáp) cho người chơi và sinh vật không thuộc phe kẻ cướp. Rơi vật tổ bất tử + ngọc
  lục bảo 0–1, 10 kinh nghiệm. Chưa làm phép đổi màu cừu ("wololo").
- Tiểu quỷ: 14 máu, kiếm sắt 9 sát thương, bay xuyên block, chép mục tiêu của pháp sư; thỉnh thoảng lao thẳng vào mục tiêu (cách > 2
  block) — đang lao: ảnh vex_charging, giơ kiếm — chạm thì đánh. Do pháp sư gọi: sống 30–119 giây rồi mất 1 máu mỗi giây. 3 kinh nghiệm.
- Vật tổ bất tử: cầm tay chính hoặc tay phụ; đòn chết người thì sống lại 1 máu, mất mọi hiệu ứng, được Hồi phục II 45 giây, Hấp thụ II
  5 giây (4 tim vàng), Kháng lửa 40 giây (lửa / dung nham không gây sát thương); vật tổ mất (tay chính trước). Mình thấy vật tổ to bay
  lên giữa màn hình, người xung quanh thấy hạt xanh vàng.

## Vực Lửa (Giai đoạn 10 — người dùng chọn 2026-11-15, làm trước Giai đoạn 9)

- Sinh vật: bộ client.jar (bảng "Vực Lửa" ở mục 2.7), cơ chế theo Minecraft. Phạm vi đầy đủ như Minecraft: 5 biome, pháo đài Vực Lửa,
  tàn tích pháo đài lợn, netherite; có Quỷ héo và Ma bay hiền.
- Chia 5 phần: 10a thế giới thứ hai + cổng + hoang mạc Vực Lửa; 10b 4 biome còn lại + sinh vật cơ bản; 10c pháo đài + quỷ lửa, bộ xương
  héo; 10d người lợn, tàn tích pháo đài lợn, netherite; 10e Quỷ héo, Ma bay hiền. Chi tiết từng phần: PLAN.md Giai đoạn 10.
- 2026-11-16 (người dùng chọn): Giai đoạn 10 coi như xong sau 10d2; BỎ 10e — không có Quỷ héo, Ma bay hiền.

## Hoàn thiện (Giai đoạn 9 — người dùng chọn 2026-11-16)

- Chia 5 phần 9a menu + /admin → 9b độ bền → 9c tối ưu → 9d cảm giác game + cài đặt → 9e phát hành. Chi tiết: PLAN.md Giai đoạn 9.
- KHÔNG làm âm thanh / nhạc nền (giữ như lựa chọn ở 6b). Menu cài đặt không có mục âm lượng.
- CÓ bản đồ nhỏ (9d). Trước mắt chạy server trên máy nhà + Cloudflare tunnel.
- Menu chính = danh sách server (link, kiểu Minecraft), không tạo thế giới mới trong game.
- Người mới vào tay trắng (không bộ đồ thử). Thế giới mới: seed + điểm khởi đầu ngẫu nhiên (chọn khi tạo, lưu lại). Tạo thế giới mới =
  đổi "world" trong server/config.json sang tên mới (thế giới cũ vẫn còn trong server/data).
- /admin: ai cũng bật / tắt được cho chính mình (cả server được báo). Chỉ khi bật mới có: bay, bảng thông số, F3, N, F4, kho đồ sáng tạo,
  /give, /summon, /tp, /nether, /xp, /time set, /kick, /pvp, /structure. Người thường vẫn có /help, /time, /locate, /items.

### 10a — Cõi thứ hai, cổng, hoang mạc Vực Lửa (2026-11-15)

- Server chạy song song hai cõi (server/src/realm.ts): mỗi cõi có thế giới, rương / lò, vật phẩm rơi, chất lỏng, sinh vật, đánh nhau,
  cung tên, vụ nổ riêng; Vực Lửa lưu ở <thế giới>/nether (region, entities). Tài khoản, người chơi (lưu kèm cõi), chat, giờ, giường, nhà
  tự lưu dùng chung. Người chơi chỉ thấy người / sinh vật / vật phẩm cùng cõi. Seed Vực Lửa = băm(seed, muối) — riêng nhưng suy ra được.
- Cổng: khung đá vỏ chai đứng (dọc X hoặc Z), lòng rộng 2–21, cao 3–21, không cần 4 góc; bật lửa bấm vào khung (ô trống trong khung) thì
  cả lòng thành khối cổng (sáng 11, không va chạm, không đào được). Khung vỡ: cổng tắt dần (luật chỗ bám). Đứng trong cổng 4 giây (quản
  trị viên đang bay: ngay) thì sang cõi kia ở x, z × 8 / ÷ 8 (độ cao ở Vực Lửa giới hạn 32–112). Tìm cổng có sẵn trong 128 block (thế giới
  chính) / 16 block (Vực Lửa), không có thì dựng cổng 4 × 5 ở chỗ đứng được gần nhất (16 block quanh, lòng 4 × 4 trống trên nền đặc), không
  có chỗ thì dựng nền đá vỏ chai. Tới nơi mà vẫn đứng trong cổng thì không quay lại — phải bước ra rồi vào lại. Cổng đổ nát sửa đủ khung
  (đá vỏ chai thường) thì châm được.
- Lệnh quản trị viên /nether: sang cõi kia như đi qua cổng (để thử).
- Địa hình hoang mạc Vực Lửa (shared/src/worldgen/netherGen.ts): noise 3D lấy mẫu lưới 4 × 8 × 4 rồi nội suy; sàn đặc dần dưới y 24,
  trần đặc dần trên y 100; ô trống y ≤ 31 thành dung nham; đá nền y 0 và y 127, lởm chởm y 1–4 và 123–126; bãi cát linh hồn / sỏi quanh
  mực dung nham (y 28–36); quặng thạch anh (16 cụm ≤ 14 / chunk), quặng vàng Vực Lửa (10 cụm ≤ 10), magma (y 27–36); dòng dung nham chảy
  từ vách (8 / chunk); chùm đá phát sáng treo trần (mỗi ô 12 × 12 có 55% một chùm bán kính 3, rủ tới 5).
- Block mới (170–175): cát linh hồn (cao 14/16, đi chậm × 0.4), đá phát sáng (sáng 15, rơi 2–4 bụi; 4 bụi → 1), quặng thạch anh Vực Lửa
  (rơi thạch anh, 2–5 kinh nghiệm, May mắn), quặng vàng Vực Lửa (rơi 2–6 mảnh vàng, 0–1 kinh nghiệm), khối thạch anh (4 thạch anh), khối
  cổng. Mảnh vàng: 9 ↔ 1 thỏi vàng. Nung quặng (lấy bằng Cảm ứng tơ): thạch anh / thỏi vàng.
- Vực Lửa: không ngày đêm (trời / sương đỏ sẫm, sương dày, không mặt trời / mặt trăng), ánh sáng nền 0.12; đổ nước: bốc hơi (xô thành xô
  rỗng); ngủ giường: nổ (sức nổ 5); lửa trên đá lửa ngục / magma không tắt (cả thế giới chính). Chưa có sinh vật tự sinh (10b); /summon vẫn
  được. Chết ở Vực Lửa: hồi sinh ở thế giới chính (giường / điểm hồi sinh).

### 10b — 4 biome còn lại, sinh vật cơ bản (2026-11-16)

- Biome (shared/src/worldgen/netherBiomes.ts): chọn theo 2 noise nhiệt độ / độ ẩm như Minecraft (biome có điểm + độ lệch gần nhất),
  nên rừng đỏ thẫm không giáp đồng bằng bazan, rừng cong vênh không giáp thung lũng. Tỉ lệ đo được ~ hoang mạc 36 / thung lũng 18 / rừng
  đỏ thẫm 23 / cong vênh 8 / bazan 16% (Minecraft 36.3 / 17.1 / 22.2 / 8.5 / 15.9). Màu sương theo biome (NETHER_BIOMES.FOG).
- Thung lũng cát linh hồn: sàn cát / đất linh hồn, cột bazan trần → sàn, hóa thạch khối xương (30% chunk), lửa linh hồn, đá phát sáng
  chỉ còn 30%. Rừng đỏ thẫm / cong vênh: nylium, nấm khổng lồ (lưới ô 7 × 7, 85%; thân 4–13, 1/12 gấp đôi, 6% thân 3 × 3; vắt qua chunk
  vẫn liền), rễ / nấm nhỏ / mầm, dây leo rủ (đỏ thẫm) / dây xoắn (cong vênh), đèn nấm. Đồng bằng bazan: bazan / đá đen, cột bazan, cục
  bazan / đá đen, vũng dung nham viền magma.
- Block mới (176–201): đất linh hồn, bazan (+ mài, nhẵn), đá đen (+ mài, gạch), nylium 2 loại (đào thường ra đá lửa ngục; Cảm ứng tơ ra
  nylium; khối đặc đè lên thì thành đá lửa ngục), thân / ván nấm 2 loại (không cháy; bậc, tấm, hàng rào, cửa...), khối mụn đỏ / cong
  vênh, đèn nấm (sáng 15), nấm / rễ 2 loại, mầm Vực Lửa (chỉ lấy bằng kéo), dây leo rủ / xoắn (rơi 33%, kéo: luôn), khối xương, mụn cóc
  Vực Lửa (trên cát linh hồn, mỗi random tick 1/10 lên 1 tuổi tới 3, chín rơi 2–4), lửa linh hồn (trên cát / đất linh hồn, cháy mãi).
- Bột xương: nấm trên đúng loại nylium 40% thành nấm khổng lồ; lên nylium mọc cỏ quanh đó; lên dây leo dài thêm. Công thức: ván nấm,
  đuốc linh hồn, cần câu nấm cong vênh, khối xương ↔ bột xương, bazan mài...
- Sinh vật (bộ client.jar, mức Thường), sinh theo biome (NETHER_SPAWNS; quanh người chơi 24–128 block, giới hạn chung):
  - Ma bay: 10 máu, bay lang thang ±16; nhắm người chơi lệch độ cao ≤ 4 trong 64 block, há miệng 1 giây rồi bắn cầu lửa mỗi 3 giây
    (bay thẳng 16 block/giây; trúng thẳng 6 rồi nổ sức 1 có lửa). Vung tay trúng cầu lửa trong 4 block: đánh bật theo hướng nhìn, trúng
    ma bay thì ma bay chết ngay.
  - Người lợn xác sống: 20 máu, giáp 2, trung lập; đánh một con thì cả bầy trong 35 × 10 block tức 20–39 giây; không sợ lửa / dung nham.
  - Khối nhầy dung nham: như khối nhầy (to 16 máu → tách 2–4 con vừa...), giáp 3 mỗi cỡ, đánh 3 / 4 / 6, nhảy cao, không sợ lửa.
  - Kẻ lội dung nham: 20 máu, đi trên mặt dung nham; lên cạn thì lạnh (ảnh strider_cold), chậm, tìm về dung nham; nước / mưa làm mất máu.
    Yên → cưỡi; cầm cần câu nấm cong vênh thì tự đi theo hướng nhìn (4.2 block/giây trên dung nham, 1.8 trên cạn); chuột phải: tăng tốc
    7–49 giây (nhanh nhất +115%), cần câu mất 1 độ bền. Chunk mới có dung nham lộ thiên: đàn 1–2 con.
  - Lợn rừng lửa: 40 máu, đuổi húc 3–8 và hất lên, kháng đẩy lùi 60%; tránh nấm cong vênh / cổng trong 7 block; cho ăn nấm đỏ thẫm
    thì phối giống.
  - Bộ xương (thung lũng), kẻ hư không (thung lũng, rừng cong vênh, hoang mạc): dùng lại sinh vật thế giới chính.
- Cổng (bổ sung 2026-11-16, người dùng yêu cầu): bật lửa bấm vào bất kỳ mặt nào của khối khung đá vỏ chai đã đủ (cả khối góc) đều thành
  cổng, không cần nhắm đúng ô trống trong lòng khung.

### 10c — Pháo đài Vực Lửa, quỷ lửa, bộ xương héo (2026-11-16)

- Người dùng chọn (2026-11-16): làm hết 10c một lần; thêm giáp ngựa (đeo được), /locate fortress, bóng tuyết (tuyết đào bằng xẻng ra bóng
  tuyết; ném trúng quỷ lửa làm nó mất máu). Thông số: shared/src/fortressConstants.ts.
- Pháo đài (shared/src/worldgen/fortressPlan.ts, fortressPaint.ts; lệnh dựng từng mảnh đọc từ client.jar bằng scripts/mc-fortress-dump.ts →
  fortressPiecesGen.ts): lưới ô 27 × 27 chunk, mỗi ô một công trình cách mép ≥ 4 chunk, 2/5 pháo đài, 3/5 để dành tàn tích pháo đài lợn (10d).
  Mảnh đầu: ngã tư cầu 19 × 10 × 19 ở y 64, rồi nối mảnh theo trọng số Minecraft — cầu: thẳng 30, ngã tư 10 (≤ 4), phòng ngã tư 10 (≤ 4),
  phòng cầu thang 10 (≤ 3), ngai quỷ lửa 5 (≤ 2), cổng lâu đài 5 (≤ 1); lâu đài: hành lang 25, ngã tư 15 (≤ 5), rẽ phải / trái 5 (≤ 10),
  cầu thang 10 (≤ 3), ban công 7 (≤ 2), phòng mụn cóc 5 (≤ 2). Tối đa 30 lớp, xa ≤ 112 block, không chồng nhau, đáy > 10; hết chỗ thì đầu cầu
  cụt; cuối cùng dời cả pháo đài vào y 48–70. Cột chống kéo xuống qua ô trống / chất lỏng tới nền. Hành lang rẽ có rương (1/3).
- Rương pháo đài (nether_bridge, 2–4 lượt): kim cương 1–3, sắt 1–5, vàng 1–3, kiếm vàng, áo giáp vàng, bật lửa, mụn cóc 3–7, yên, giáp ngựa
  vàng / sắt / kim cương, đá vỏ chai 2–4 (bỏ giáp ngựa đồng, mẫu trang trí).
- Quái tự sinh trong mảnh pháo đài (thay bảng biome): quỷ lửa 10 (2–3), bộ xương héo 8 (5), người lợn xác sống 5 (4), khối nhầy dung nham 3 (4),
  bộ xương 2 (5). Lồng ở ngai: quỷ lửa (ánh sáng ≤ 11 như lồng khác).
- Quỷ lửa: 20 máu, giáp 6, 0.6 × 1.8, bay lơ lửng hạ chậm, mục tiêu cao hơn thì bay lên; theo dõi 48 block; mục tiêu < 2 block: đánh 6; thấy
  mục tiêu: nạp lửa 3 giây (bốc cháy) → 3 cầu lửa nhỏ cách 0.3 giây → nghỉ 5 giây; không thấy thì bay lại gần. Cầu lửa nhỏ: 5 sát thương,
  cháy 5 giây, không nổ, đốt ô trước block trúng (khi quái được phá block), không đánh bật được. Nước: mất máu; bóng tuyết: 3. Rơi que quỷ lửa
  0–1 (chỉ khi người chơi giết), 10 kinh nghiệm. Luôn sáng.
- Bộ xương héo: 20 máu, 0.7 × 2.4, kiếm đá 8 + Héo I 10 giây, không sợ lửa; rơi than (1/3), xương 0–2, sọ 2,5% (chỉ khi người chơi giết; Cướp
  bóc +1%), kiếm đá 8,5%. 5 kinh nghiệm.
- Héo: mất 1 máu mỗi 2 giây (cấp II: 1 giây), bỏ qua giáp và thời gian miễn sát thương, có thể chết; tim đen; thông báo "héo mòn đến chết".
- Block mới (211–222): gạch Vực Lửa, nứt (nung gạch), khắc (2 tấm), đỏ (2 mụn cóc + 2 viên gạch), hàng rào gạch (đào bằng cuốc), bậc / tấm /
  tường gạch Vực Lửa thường và đỏ, sọ bộ xương héo (đặt trên sàn, quay 4 hướng). Vật phẩm: viên gạch Vực Lửa (nung đá lửa ngục), que quỷ lửa
  (nhiên liệu 12 món; → 2 bột), bột quỷ lửa, cầu lửa nhỏ (bột + than + thuốc súng → 3; châm lửa / cổng như bật lửa, mỗi lần mất 1), bóng
  tuyết (chồng 16, ném), lớp tuyết (3 khối tuyết → 6), giáp ngựa sắt 5 / vàng 7 / kim cương 11 điểm.
- Tuyết: lớp tuyết đào bằng xẻng ra 1 bóng tuyết, khối tuyết ra 4 (tay không: không rơi); 4 bóng tuyết → khối tuyết. Bóng tuyết: quỷ lửa mất
  3 máu, sinh vật khác chỉ bị đẩy nhẹ.
- Giáp ngựa: chuột phải vào ngựa đã thuần (không lừa / la), kéo tháo ra (giáp trước, yên sau), chết thì rơi; giảm sát thương như giáp.
- /locate fortress (quản trị viên): pháo đài gần nhất (ở Vực Lửa: tọa độ + khoảng cách; ở thế giới chính: tọa độ Vực Lửa và × 8).


### 10d1 — Người lợn, đổi vàng, người lợn vệ binh, lợn rừng xác sống (2026-11-16)

- Người dùng chọn (2026-11-16): chia 10d thành 10d1 / 10d2; bàn rèn kiểu 1.20 (10d2); thêm /locate bastion, mỏ neo hồi sinh, đá nam châm
  (10d2); thêm thuốc kháng lửa, chai nước, Tốc độ linh hồn, mũi tên quang phổ để bảng đổi vàng đủ như Minecraft. Thông số:
  shared/src/piglinConstants.ts.
- Người lợn: 16 máu, nửa cầm kiếm vàng (đánh 8), nửa cầm nỏ (bắn như kẻ cướp: tầm 12, lùi khi gần hơn 4, lên dây 1.25 giây); con non 20%
  (không đánh, bị đánh thì chạy). Đánh người chơi không mặc món giáp vàng nào (tầm 16). Tức 30 giây (đánh cả người mặc vàng) khi: bị
  đánh (người lợn trong 16 block tức theo); người chơi mở rương hoặc đào khối vàng / quặng vàng / quặng vàng Vực Lửa / khối vàng thô
  trong 16 block mà nó thấy. Sinh ở hoang mạc Vực Lửa (trọng số 15, đàn 4) và rừng đỏ thẫm (5, đàn 3–4).
- Đổi vàng: chuột phải đưa thỏi vàng (hoặc ném thỏi vàng xuống trong 9 block — nó tự đi nhặt): cầm tay trái ngắm 6 giây rồi ném về phía
  người đưa một món theo bảng piglin_bartering (tổng trọng số 459): sách Tốc độ linh hồn 5, ủng sắt Tốc độ linh hồn 8, thuốc kháng lửa 8,
  thuốc kháng lửa ném 8, chai nước 10, mảnh sắt 10–36 ×10, ngọc ender 2–4 ×10, tơ 3–9 ×20, thạch anh 5–12 ×20, và 40 mỗi món: đá vỏ chai 1,
  đá vỏ chai khóc 1–3, cầu lửa nhỏ 1, da 2–4, cát linh hồn 2–8, viên gạch Vực Lửa 2–8, mũi tên quang phổ 6–12, sỏi 8–16, đá đen 8–16. Đồ
  vàng khác (mảnh vàng, khối vàng, táo vàng, đồ / giáp vàng...) thì ngắm rồi cất vào túi (8 chồng), chết thì rơi ra; mảnh vàng cất ngay.
  Người cầm đồ vàng trong 8 block: người lợn nhìn chằm chằm.
- Người lợn tránh lửa / đuốc linh hồn trong 8 block, chạy khỏi người lợn xác sống / lợn rừng xác sống trong 6 block, chạy khi lợn rừng
  lửa (lớn) đông hơn người lợn trong 10 block; đánh bộ xương héo trong 16 block; cả bầy săn lợn rừng lửa (mới sinh / vừa săn: nghỉ
  30–120 giây). Lợn rừng lửa bị đánh thì đánh trả. Rơi: vũ khí 8,5% (đã mòn), đồ trong túi. 5 kinh nghiệm.
- Người lợn vệ binh: 50 máu, rìu vàng 13, luôn đánh người chơi (vàng không có tác dụng), đánh bộ xương héo; rơi rìu vàng 8,5%; 20 kinh
  nghiệm. Chỉ /summon (tự sinh trong tàn tích ở 10d2).
- Lợn rừng xác sống: 40 máu, húc 3–8 hất lên, kháng đẩy lùi 60%; đánh người chơi và mọi sinh vật trừ quái nổ / đồng loại (bỏ sinh vật nước,
  sinh vật bay); rơi thịt thối 1–3; 5 kinh nghiệm.
- Ngoài Vực Lửa 15 giây (run khi sắp đổi): người lợn / vệ binh → người lợn xác sống, lợn rừng lửa → lợn rừng xác sống (đồ trong túi rơi ra).
- Thuốc: chai thủy tinh (3 kính → 3); chai nước (uống: không gì); thuốc kháng lửa (uống: Kháng lửa 3 phút, trả chai); thuốc kháng lửa ném
  (vỡ khi chạm, bán kính 4, trúng thẳng 2 phút 15 giây, xa hơn ít hơn). Chưa có giá pha chế dùng được, chưa múc nước vào chai.
- Mũi tên quang phổ (4 bụi đá phát sáng + 1 tên → 2): bắn bằng cung (lấy mũi tên đầu tiên: tay trái, rồi túi), trúng thì Phát sáng 10 giây
  (sinh vật: vẽ sáng, thấy xuyên tường; người chơi: biểu tượng hiệu ứng). Vô hạn không áp cho mũi tên quang phổ.
- Tốc độ linh hồn (ủng, cấp 1–3, chỉ từ đổi vàng; không có ở bàn phù phép / sách ngẫu nhiên): đứng trên cát / đất linh hồn nhanh thêm
  40,5 / 51 / 61,5% và cát linh hồn không làm chậm; mỗi tick đang đi trên đó 4% ủng mất 1 độ bền.

### 10d2 — Tàn tích pháo đài lợn, phế tích cổ, netherite, bàn rèn, mỏ neo hồi sinh, đá nam châm (2026-11-16)

- Người dùng chọn (2026-11-16): bàn rèn kiểu 1.20 (cần khuôn nâng cấp); thêm /locate bastion, mỏ neo hồi sinh, đá nam châm (+ la bàn).
- Tàn tích (shared/src/worldgen/bastionPlan.ts; mẫu, nhóm ghép, bộ biến đổi ô, rương, sinh vật đọc từ client.jar bằng import-structures):
  cùng lưới ô 27 × 27 chunk với pháo đài — ô bốc ra "tàn tích" (3/5) có tàn tích nếu tâm không ở đồng bằng bazan (Minecraft; ô đó để
  trống, vị trí pháo đài không đổi). Mảnh đầu bốc từ bastion/starts (khu nhà ở, chuồng lợn rừng, kho báu, cầu) ở y 33, ghép như
  Minecraft JigsawPlacement: hàng đợi tới 6 lớp, trong 80 block; vùng trống — khối ghép quay vào trong mảnh cha thì mảnh con nằm trọn
  trong mảnh cha, quay ra ngoài thì dùng vùng mà mảnh cha được cấp; khớp dọc "aligned" phải cùng hướng đỉnh. Đo được: khu nhà ở ~84 mảnh,
  chuồng lợn rừng ~95, kho báu ~173, cầu ~48. Bộ biến đổi ô theo nhóm (gạch nứt 30%, khối vàng → gạch nứt, đá đen ↔ đá đen mạ vàng...).
- Rương: bastion_treasure / other / bridge / hoglin_stable (shared/src/bastionLoot.ts; bỏ giáo, mẫu trang trí giáp, hoa văn cờ, đĩa
  nhạc, cà rốt vàng; táo vàng phù phép → táo vàng; đồ kim cương chưa phù phép ngẫu nhiên). Khuôn nâng cấp netherite: kho báu luôn có, còn
  lại 10%. Kho báu có lồng sinh khối nhầy dung nham.
- Sinh vật canh sẵn (chunk tải lần đầu): người lợn kiếm / nỏ, người lợn vệ binh, lợn rừng lửa — không tự biến mất.
- Block mới (223–239): gạch đá đen mài nứt (nung gạch đá đen mài), đá đen mài khắc (2 tấm), đá đen mạ vàng (10% rơi 2–5 mảnh vàng — May
  mắn tăng), bậc / tấm / tường đá đen, đá đen mài, gạch đá đen mài; xích (mảnh sắt + thỏi sắt + mảnh sắt); phế tích cổ (độ cứng 30, cuốc
  kim cương, chống nổ 1200); khối netherite; đá nam châm; mỏ neo hồi sinh (dữ liệu phụ = số lần nạp, sáng 0 / 3 / 7 / 11 / 15).
- Phế tích cổ: mỗi chunk một cụm ≤ 3 (y 8–24, dồn về giữa) + một cụm ≤ 2 (y 8–119), trong đá lửa ngục / bazan / đá đen, ô kề không khí
  thì bỏ (luôn bị giấu). Nung → mảnh netherite (2 kinh nghiệm); 4 mảnh + 4 thỏi vàng → thỏi netherite; 9 thỏi ↔ khối.
- Netherite: công cụ (độ bền 2031, tốc độ 9, cấp đào 4, kiếm 8), giáp (3 / 8 / 6 / 3, độ cứng 3, độ bền 555, kháng đẩy lùi 10% mỗi món);
  sửa ở đe bằng thỏi netherite; đồ netherite + phế tích cổ không cháy trong dung nham (nổi lên).
- Bàn rèn (Minecraft 1.20): ô khuôn nâng cấp netherite + đồ kim cương + thỏi netherite → đồ netherite (giữ phù phép, tên, độ bền đã
  dùng); tiêu 1 khuôn + 1 thỏi. Nhân bản khuôn: 7 kim cương + khuôn + đá lửa ngục → 2.
- Mỏ neo hồi sinh (6 đá vỏ chai khóc + 3 đá phát sáng): khối đá phát sáng nạp (tối đa 4); ở Vực Lửa chuột phải → điểm hồi sinh; chết thì
  hồi sinh cạnh mỏ neo ở Vực Lửa, mất 1 lần nạp (hết nạp / mất: về điểm của thế giới, báo); ở thế giới chính chuột phải khi đã nạp → nổ
  sức 5 có lửa.
- La bàn (4 thỏi sắt + 1 mảnh sắt ở giữa — chưa có bụi đá đỏ): kim chỉ điểm hồi sinh của thế giới (thế giới chính), quay loạn ở Vực Lửa;
  chuột phải đá nam châm (8 gạch đá khắc + thỏi netherite) → la bàn đá nam châm (lấp lánh) chỉ về đá đó khi cùng cõi (túi đầy: rơi ra).
  Ảnh kim 32 khung (compass_00..31) như Minecraft.
- /locate bastion (quản trị viên): như /locate fortress.
- (Người dùng yêu cầu 2026-11-16) /locate cho công trình thế giới chính (quản trị viên): village, outpost, witch_hut (swamp_hut), mansion,
  desert_pyramid (pyramid), igloo, camp, shipwreck, ocean_ruin, ruined_portal — gần nhất trong 8192 block quanh vị trí (ở Vực Lửa: quanh
  tọa độ × 8, báo kèm tọa độ Vực Lửa ÷ 8). Tính từ seed bằng đúng bộ sinh (shared/src/worldgen/locate.ts), khớp DIA-DIEM.md.
