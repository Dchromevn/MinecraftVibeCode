# MECHANICS.md — Cơ chế gameplay tham khảo

File này bổ sung cơ chế chi tiết cho `PLAN.md`. Các con số được tổng hợp từ tài
liệu mô tả cơ chế của Minecraft Java (minecraft.wiki và các trang tính toán dẫn
nguồn từ đó), có thể lấy mã nguồn. Đây là thông số thiết kế:
được phép chỉnh cho hợp game.

## Cách agent dùng file này

1. Không làm hết một lần. Mỗi mục có ghi "Giai đoạn" áp dụng. Khi bắt đầu một
   giai đoạn, đọc các mục thuộc giai đoạn đó và làm theo.
2. Khi gộp vào dự án: chép con số sang `DESIGN.md`, đặt hằng số trong
   `/shared/constants.ts`. Không viết số cứng rải rác.
3. Khi file này khác `PLAN.md`: theo file này, TRỪ KHI người dùng đã tự chỉnh
   giá trị đó trong `DESIGN.md`. Mục nào ghi "LỰA CHỌN" thì hỏi người dùng.
4. Các mục đã làm xong ở giai đoạn trước: chỉ sửa nếu người dùng đồng ý (ghi
   vào danh sách "đề xuất chỉnh sửa" khi báo cáo, không tự sửa).
5. Thế giới của dự án cao 0–127, khác Minecraft. Độ cao trong file này đã quy
   đổi sẵn.

---

## 1. Thời gian và tick — Giai đoạn 2 (nền tảng), dùng từ Giai đoạn 4

- Tick logic server: 20 tick/giây. Mọi thời gian "tick" dưới đây theo đơn vị này.
  (Vật lý người chơi vẫn chạy 60 Hz như PLAN; tốc độ ghi bằng block/giây.)
- **Random tick**: mỗi tick, với mỗi đoạn 16x16x16 của mỗi chunk đang được mô
  phỏng, chọn ngẫu nhiên 3 vị trí và gọi hàm `onRandomTick` của block ở đó.
  Trung bình một block nhận random tick khoảng 68 giây một lần.
  Giá trị 3 là `RANDOM_TICK_SPEED`, cấu hình được (lệnh quản trị để tăng khi thử).
- Các hệ thống dùng random tick (xem mục 9): lúa, cây non, lá rụng, cỏ lan,
  đất cày khô/ẩm.
- Trước Giai đoạn 5 (chưa có server) thì client tự chạy random tick cho các
  chunk quanh người chơi.

## 2. Di chuyển — Giai đoạn 3

| Kiểu | Tốc độ (block/giây) |
|---|---|
| Đi bộ | 4.317 |
| Chạy nhanh | 5.612 (= đi bộ × 1.3) |
| Ngồi | 1.295 (= 30% đi bộ) |
| Chạy + nhảy liên tục | trung bình khoảng 7.1 |
| Bay (debug) | khoảng 10.9 |
| Rơi tối đa | 78.4 |

- Hộp va chạm 0.6 × 1.8. Khi ngồi: cao 1.5, mắt hạ thấp tương ứng.
- Ngồi thì không bước khỏi mép nếu chênh lệch độ cao từ 5/8 block trở lên.
- Chạy nhanh + nhảy vượt được khoảng 4 block ngang; đi bộ + nhảy khoảng 2.
- Không chạy nhanh được khi đói ≤ 6 (giữ như PLAN), khi đang ngồi, khi đang ăn
  hoặc kéo cung.
- Vừa hồi sinh: miễn sát thương 3 giây.

## 3. Đói, độ no, hao sức — Giai đoạn 4

THAY THẾ mô tả đói trong PLAN mục 2.6 bằng hệ ba biến:

- **Đói** (hiển thị): 0–20.
- **Độ no** (ẩn): 0 đến giá trị đói hiện tại. Lúc mới vào game: 5.
- **Hao sức** (ẩn): 0–4. Khi đạt 4 thì trừ 4, rồi trừ 1 độ no; nếu độ no đã
  bằng 0 thì trừ 1 đói.

Hành động cộng hao sức:

| Hành động | Hao sức |
|---|---|
| Đi bộ, ngồi, đứng yên | 0 |
| Chạy nhanh | 0.1 mỗi block |
| Nhảy | 0.05 mỗi lần |
| Chạy nhanh + nhảy | 0.2 mỗi lần nhảy |
| Bơi | 0.01 mỗi block (ước lượng, chỉnh được) |
| Đào xong một block | 0.005 |
| Đánh trúng | 0.1 |
| Bị trúng đòn (loại giáp chặn được) | 0.1 |
| Hồi 1 máu tự nhiên | 6 |

Hồi máu và đói:
- Đói = 20 và độ no > 0: hồi 1 máu mỗi 0.5 giây (mỗi lần tốn 6 hao sức).
- Đói ≥ 18: hồi 1 máu mỗi 4 giây (tốn 6 hao sức).
- Đói = 0: mất 1 máu mỗi 4 giây, dừng khi còn 1 máu.

Thức ăn (đói hồi / độ no hồi) — giá trị tham khảo:

| Món | Đói | Độ no | Ghi chú |
|---|---|---|---|
| Táo | 4 | 2.4 | |
| Bánh mì | 5 | 6 | |
| Thịt bò sống / chín | 3 / 8 | 1.8 / 12.8 | |
| Thịt lợn sống / chín | 3 / 8 | 1.8 / 12.8 | |
| Thịt gà sống / chín | 2 / 6 | 1.2 / 7.2 | gà sống: 30% bị hiệu ứng đói 30 giây |
| Thịt cừu sống / chín | 2 / 6 | 1.2 / 9.6 | |
| Thịt thối | 4 | 0.8 | 80% bị hiệu ứng đói 30 giây |
| Táo vàng | 4 | 9.6 | hồi máu thêm như PLAN |

- Hiệu ứng đói: cộng 0.1 hao sức mỗi giây, thanh đói đổi màu xanh vàng.
- Không ăn được khi đói = 20 (trừ táo vàng).
- Giao diện: thanh đói rung nhẹ khi độ no = 0 để người chơi biết sắp tụt.

## 4. Đào block — Giai đoạn 3 (công thức), Giai đoạn 4 (công cụ)

Công thức (thay cho "độ cứng = số giây" trong PLAN, kết quả khớp các giá trị cũ):

```
tốc_độ = tốc độ công cụ nếu đúng loại công cụ, ngược lại 1
tiến_độ_mỗi_tick = tốc_độ / độ_cứng / (30 nếu đào được ra đồ, ngược lại 100)
phá xong khi tổng tiến độ ≥ 1
```

- Ở dưới nước (đầu chìm): tốc độ ÷ 5. Không đứng trên mặt đất (đang nhảy, bơi,
  leo): tốc độ ÷ 5.
- Nếu `tốc_độ / độ_cứng ≥ 30`: phá ngay lập tức, không có vết nứt.
- Độ cứng 0: phá ngay. Độ cứng vô hạn: không phá được.
- Sau khi phá xong một block, chờ 5 tick mới bắt đầu đào block kế tiếp
  (trừ block phá ngay).

Tốc độ công cụ: tay 1 · gỗ 2 · đá 4 · sắt 6 · kim cương 8 · vàng 12.
Kiếm với mạng nhện: 15. Kéo với lá và len: 15 (nếu có kéo).

Độ cứng (thay cột "độ cứng" trong PLAN mục 2.2):

| Block | Độ cứng | Block | Độ cứng |
|---|---|---|---|
| đất, cát | 0.5 | đá | 1.5 |
| cỏ, sỏi, đất cày | 0.6 | đá cuội, đá cuội rêu | 2 |
| lá | 0.2 | thân gỗ, ván gỗ, hàng rào | 2 |
| kính | 0.3 | bàn chế tạo, rương | 2.5 |
| thang | 0.4 | cửa gỗ | 3 |
| sa thạch | 0.8 | các loại quặng | 3 |
| giường | 0.2 | đá sâu | 3 |
| quặng trong đá sâu | 4.5 | | |
| lò nung | 3.5 | đá vỏ chai | 50 |
| mạng nhện | 4 | đá nền | không phá được |
| đường ray | 0.7 | đuốc, cỏ cao, lúa, cây non | 0 |

Độ bền công cụ (thay PLAN mục 2.3): gỗ 59 · đá 131 · sắt 250 · vàng 32 ·
kim cương 1561. Công cụ mất 1 độ bền mỗi block (block độ cứng 0 thì không mất);
kiếm mất 2 khi dùng để đào.

## 5. Chiến đấu và sát thương — Giai đoạn 6 (một phần dùng từ Giai đoạn 3–4)

### 5.1 Hồi đòn

- Mỗi vũ khí có **tốc độ đánh** (số đòn đầy lực mỗi giây). Thời gian hồi
  `T = 20 / tốc_độ_đánh` tick.
- Hệ số sát thương khi đánh sau `t` tick: `0.2 + ((t + 0.5) / T)² × 0.8`,
  giới hạn trong [0.2, 1]. Đổi vật phẩm trên tay cũng reset hồi đòn.
- Đánh hụt cũng reset hồi đòn.

| Vũ khí | Sát thương | Tốc độ đánh | Hồi đòn |
|---|---|---|---|
| Tay không | 1 | 4 | 0.25 giây |
| Kiếm (mọi cấp) | gỗ 4 · vàng 4 · đá 5 · sắt 6 · kim cương 7 | 1.6 | 0.625 giây |
| Rìu | gỗ 7 · vàng 7 · đá 9 · sắt 9 · kim cương 9 | gỗ/đá 0.8 · sắt 0.9 · vàng/kim cương 1.0 | 1–1.25 giây |
| Cuốc, xẻng | tham khảo: 2–5 | 1–1.2 | |

LỰA CHỌN cho người dùng: rìu kiểu trên (đòn nặng, chậm, phong cách PvP hiện đại)
hay rìu = kiếm − 1 như PLAN (đơn giản hơn).
ĐÃ CHỌN (người dùng, 2026-11-12): rìu = kiếm cùng cấp − 1.

### 5.2 Chí mạng và knockback

- Chí mạng ×1.5 khi: đang rơi xuống, hồi đòn ≥ 84.8%, không chạy nhanh, không ở
  trong nước, không đang leo thang.
- Đòn đẩy lùi mạnh khi chạy nhanh cũng cần hồi đòn ≥ 84.8%, và làm mất trạng
  thái chạy nhanh của người đánh.

### 5.3 Miễn sát thương

- Sau khi nhận sát thương: 10 tick (0.5 giây) miễn sát thương.
- Trong thời gian đó, nếu đòn mới mạnh hơn đòn trước thì chỉ gây phần chênh lệch.
- Nhờ vậy các nguồn sát thương liên tục (dung nham, xương rồng) thực tế chỉ
  gây sát thương khoảng 2 lần/giây.

### 5.4 Giáp

LỰA CHỌN cho người dùng: giữ công thức đơn giản 4%/điểm như PLAN, hoặc dùng
công thức có độ cứng giáp:

```
giảm = min(20, max(giáp / 5, giáp − 4 × sát_thương / (độ_cứng_giáp + 8))) / 25
sát_thương_nhận = sát_thương × (1 − giảm)
```

- Đòn nhỏ: mỗi điểm giáp giảm khoảng 4%, tối đa 80% ở 20 điểm.
- Đòn lớn xuyên giáp nhiều hơn; độ cứng giáp làm giảm hiệu ứng này.
- Tổng điểm giáp cả bộ: da 7 · vàng 11 · sắt 15 · kim cương 20.
  Độ cứng giáp: chỉ kim cương, 2 mỗi món (8 cả bộ).
- Giáp không giảm sát thương rơi, chết đuối, đói, dung nham (lửa vẫn giảm).

### 5.5 Các nguồn sát thương môi trường

| Nguồn | Quy tắc |
|---|---|
| Rơi | `floor(khoảng_rơi − 3)`. Rơi vào nước, thang, mạng nhện: reset khoảng rơi. Rơi lên cỏ khô/lá không giảm. |
| Chết đuối | Dưỡng khí 15 giây (300 tick). Hết thì mất 2 máu mỗi giây. Ngoi đầu lên thì hồi đầy nhanh. |
| Dung nham | 4 máu mỗi lần chạm (thực tế mỗi 0.5 giây do miễn sát thương), bị cháy 15 giây, đếm lại từ đầu mỗi tick còn trong dung nham. |
| Đang cháy | 1 máu mỗi giây. Nhảy xuống nước thì tắt. |
| Đói | xem mục 3 |
| Quái xác sống/bộ xương dưới nắng | bốc cháy 8 giây mỗi lần, lặp lại khi còn dưới nắng |

## 6. Ánh sáng — Giai đoạn 2

- Mức 0–15. Ánh sáng giảm 1 cho mỗi bước theo khoảng cách cộng các trục
  (khoảng cách Manhattan), không giảm theo đường chéo thật.
  Ví dụ đuốc 14: block kề bên 13, block chéo trên mặt sàn 12.
- Ánh sáng trời 15 đi thẳng xuống qua không khí và block trong suốt không giảm;
  lan ngang hoặc lên thì giảm 1 mỗi bước.
- Lá và nước làm ánh sáng trời giảm thêm 1 khi đi qua.
- Nguồn sáng: đuốc 14 · dung nham 15 · lò nung đang cháy 13.
- Độ sáng hiển thị ban đêm: ánh sáng trời được nhân hệ số theo giờ (mục 7), còn
  ánh sáng block không đổi.

## 7. Ngày và đêm — Giai đoạn 7a

Một ngày 24000 tick = 20 phút.

| Tick | Thời điểm |
|---|---|
| 0 | bình minh (6 giờ sáng) |
| 1000 | sáng hẳn (lệnh `/time set day`) |
| 6000 | giữa trưa |
| 12000 | hoàng hôn bắt đầu |
| 12542 | quái xác sống/bộ xương hết bị cháy |
| 13000 | bắt đầu đêm (lệnh `/time set night`) |
| khoảng 13188–22812 | quái sinh được ngoài trời khi trời quang |
| 18000 | nửa đêm |
| 23000 | bình minh bắt đầu |
| 23460 | quái xác sống/bộ xương bắt đầu bị cháy |

Ngủ:
- Ngủ được từ tick 12542 đến 23460.
- Không ngủ được nếu có quái thù địch trong 8 block ngang, 5 block dọc.
- Nằm giường đặt điểm hồi sinh, kể cả khi bị từ chối vì quái gần.
- Tua sáng khi tỉ lệ người chơi online đang ngủ ≥ `SLEEP_PERCENT`
  (mặc định 50, cấu hình server).

## 8. Sinh quái và sinh vật — Giai đoạn 7a–7d, 8a–8b (danh sách đủ ở PLAN mục 2.7)

Số liệu tham khảo bản Java mức Thường; kiểm lại minecraft.wiki khi bắt đầu từng giai đoạn nếu cần.

### 8.1 Luật sinh chung (7a)

THAY THẾ luật sinh quái trong PLAN mục 2.7:

- Quái thù địch chỉ sinh khi: ánh sáng block = 0 VÀ ánh sáng trời (đã nhân theo
  giờ) ≤ một số ngẫu nhiên 0–7. (Luật mới, nên chỉ cần thắp đuốc là an toàn.)
- Khoảng cách tới người chơi gần nhất: 24–128 block.
- Quái cách mọi người chơi > 128 block: gỡ ngay. Từ 32 block trở ra và không
  bị đánh trong 30 giây: mỗi giây có xác suất nhỏ (1/800) bị gỡ.
- Sinh theo đàn: chọn một loại, sinh tối đa 4 con quanh một điểm.
- Giới hạn số quái: 30 quanh mỗi người chơi, đếm trong cả vùng sinh (128 block). (7a, 2026-11-14: PLAN ghi đếm trong
  64 block, nhưng quái sinh tới 128 block nên quái ở 64–128 block tích dần không giới hạn — thử 4 người: 229 quái.)
- Quái đã bị đặt tên hoặc nhặt đồ của người chơi thì không bị gỡ.
- Động vật trên cạn: chủ yếu sinh lúc tạo chunk, trên cỏ (thỏ: cả cát / tuyết; dê: đá / tuyết trên núi),
  nơi ánh sáng ≥ 9. Không sinh lại liên tục (giữ như PLAN). Động vật đã thuần / có yên / bị dắt không bao giờ bị gỡ.

Giới hạn riêng mỗi người chơi (bán kính 64 block), từ 7c — các nhóm này sinh lại liên tục:

| Nhóm | Tối đa | Luật |
|---|---|---|
| Dơi | 8 | trong hang, ánh sáng block ≤ 3, ánh sáng trời = 0, dưới y = 63 |
| Mực, cá heo | 5 | trong nước, mực ở y = 50–62; cá heo ở đại dương không lạnh |
| Cá | 10 | trong nước; nhóm: cá tuyết 3–7, cá hồi 1–5, cá nhiệt đới 8, cá nóc 1–3 |
| Mực phát sáng | 3 | nước không có ánh sáng trời, dưới y = 30 |

### 8.2 Chọn loài khi sinh quái (7a, mở rộng ở 7b)

Mỗi lần sinh, bốc thăm theo trọng số của biome tại điểm sinh:

| Biome | Trọng số |
|---|---|
| Mọi biome trên cạn (mặc định) | nhện 100 · xác sống 95 · bộ xương 100 · quái nổ 100 · khối nhầy 100 (chỉ trong chunk nhầy, dưới y = 40) · kẻ hư không 10 (7b, người dùng chọn: chỉ nơi thấy trời) · dân làng xác sống 5 (từ 8a). Phù thủy: chỉ ở nhà phù thủy (người dùng chọn 2026-11-14) |
| Sa mạc | xác sống 19 + xác khô 80 thay cho xác sống 95 |
| Đồng tuyết, núi trên đường tuyết | bộ xương 20 + bộ xương băng 80 thay cho bộ xương 100 |
| Sông (trong nước) | xác đuối 100, nhóm 1 |
| Đại dương (trong nước) | xác đuối 5, nhóm 1–4 |

- Ở 7a chỉ có nhện, xác sống, bộ xương; loài nào chưa làm thì bỏ khỏi bảng.
- Kẻ hư không sinh nhóm 1–4; phù thủy nhóm 1.
- Chunk nhầy: `hash(seed, cx, cz) % 10 == 0`; khối nhầy ở đó sinh bất kể ánh sáng.

### 8.3 Chỉ số

| Sinh vật | Máu | Sát thương | Kích thước (rộng × cao) | Tốc độ | Tầm phát hiện | Rơi ra | XP |
|---|---|---|---|---|---|---|---|
| Xác sống | 20, giáp 2 | 3 | 0.6 × 1.95 | chậm hơn người đi bộ một chút | 35 | thịt thối 0–2 | 5 |
| Xác sống con | 20 | 3 | 0.3 × 0.975 | nhanh hơn người chạy | 35 | như trên | 12 |
| Bộ xương | 20 | tên 2–4, mỗi 2 giây | 0.6 × 1.99 | | 16 | xương 0–2, tên 0–2 | 5 |
| Nhện | 16 | 2 | 1.4 × 0.9 | nhanh hơn người đi bộ | 16 | sợi tơ 0–2, mắt nhện 1/3 | 5 |
| Quái nổ | 20 | nổ, tối đa ~43 ở tâm (mục 16) | 0.6 × 1.7 | như người đi bộ | 16 | thuốc súng 0–2 | 5 |
| Kẻ hư không | 40 | 7 | 0.6 × 2.9 | nhanh khi tức | 64 (nhìn vào mặt) | ngọc hư không 0–1 | 5 |
| Mọt hư không | 8 | 2 | 0.4 × 0.3 | | 16 | – | 3 |
| Khối nhầy to / vừa / nhỏ | 16 / 4 / 1 | 4 / 2 / 0 | 2.04 / 1.02 / 0.51 (khối vuông) | nhảy | 16 | (nhỏ) viên nhầy 0–2 | 4 / 2 / 1 |
| Xác khô | 20, giáp 2 | 3 + đói 7 giây | 0.6 × 1.95 | như xác sống | 35 | thịt thối 0–2 | 5 |
| Xác đuối | 20, giáp 2 | 3 | 0.6 × 1.95 | bơi nhanh | 35 | thịt thối 0–2 | 5 |
| Bộ xương băng | 20 | tên 2–4 + chậm 30 giây | 0.6 × 1.99 | | 16 | xương 0–2, tên 0–2 | 5 |
| Nhện hang | 12 | 2 + độc 7 giây | 0.7 × 0.5 | nhanh | 16 | sợi tơ 0–2, mắt nhện 1/3 | 5 |
| Bóng ma đêm | 20 | 6 | 0.9 × 0.5 | bay nhanh | 64 | màng bóng ma 0–1 | 5 |
| Phù thủy | 26 | bình 6 / độc / chậm / yếu | 0.6 × 1.95 | chậm | 16 | 1–3 lần: thuốc súng, mắt nhện, que 0–2 | 5 |
| Mọt đá | 8 | 1 | 0.4 × 0.3 | nhanh | 16 | – | 5 |
| Lợn, bò, cừu | 10, 10, 8 | – | 0.9 × 0.9 / 0.9 × 1.4 / 0.9 × 1.3 | chậm | – | thịt 1–3, da 0–2 (bò), len 1 (cừu) | 1–3 |
| Gà | 4 | – | 0.4 × 0.7 | | – | thịt 1, lông 0–2 | 1–3 |
| Thỏ | 3 | – | 0.4 × 0.5 | nhảy nhanh | – | thịt thỏ 0–1, da thỏ 0–1, chân thỏ 10% | 1–3 |
| Sói | 8 (thuần 40) | 4 | 0.6 × 0.85 | nhanh | 16 | – | 1–3 |
| Cáo | 10 | 2 | 0.6 × 0.7 | nhanh | 16 | món đang ngậm | 1–3 |
| Dê | 10 | húc 2, đẩy mạnh | 0.9 × 1.3 | nhảy cao 5 block | – | – | 1–3 |
| Gấu trắng | 30 | 6 | 1.4 × 1.4 | | 20 | cá tuyết 0–2 (75%) / cá hồi 0–2 (25%) | 1–3 |
| Lạc đà không bướu | 15–30 | nhổ 1 | 0.9 × 1.87 | | – | da 0–2 | 1–3 |
| Tatu | 12 | – | 0.7 × 0.65 | | – | vảy tatu (tự rụng 5–10 phút) | 1–3 |
| Dơi | 6 | – | 0.5 × 0.9 | bay | – | – | 0 |
| Ngựa / lừa / la | 15–30 | – | 1.4 × 1.6 / 1.4 × 1.5 / 1.4 × 1.6 | ngựa 4.7–14.2 block/giây ngẫu nhiên; lừa / la ~7.4 | – | da 0–2 | 1–3 |
| Mực / mực phát sáng | 10 | – | 0.8 × 0.8 | bơi | – | túi mực / túi mực sáng 1–3 | 1–3 |
| Cá tuyết, cá hồi, cá nóc, cá nhiệt đới | 3 | cá nóc: chạm gây độc | 0.5 × 0.3 – 0.7 × 0.4 | bơi | – | món cá tương ứng | 1–3 |
| Cá heo | 10 | 3 | 0.9 × 0.6 | bơi rất nhanh | 10 | cá tuyết 0–1 | 1–3 |
| Người sắt | 100 | 7–21, hất lên | 1.4 × 2.7 | chậm | 16 | thỏi sắt 3–5, anh túc 0–2 | 0 |
| Mèo | 10 | 3 | 0.6 × 0.7 | | – | sợi tơ 0–2 | 1–3 |
| Lạc đà | 32 | – | 1.7 × 2.375 | lướt 4 block | – | – | 1–3 |
| Kẻ cướp / đao phủ / pháp sư | 24 | nỏ 4 / rìu 13 / nanh 6 | 0.6 × 1.95 | | 32 / 12 / 12 | xem PLAN 2.7 | 5 / 5 / 10 |
| Tiểu quỷ | 14 | 9 | 0.4 × 0.8 | bay xuyên block | – | – | 3 |
| Quái tàn phá | 100 | 12 | 1.95 × 2.2 | | 32 | yên | 20 |
| Tiểu linh | 20 | – | 0.35 × 0.6 | bay | – | – | 0 |

### 8.4 Cơ chế riêng

7a:
- Nhện: ban ngày (ánh sáng ≥ 12 tại chỗ nó) trung lập, chỉ đánh khi bị đánh; leo được tường thẳng đứng.
  Lọt khe 1 block cao nhưng không lọt khe hẹp 1 block ngang.
- Xác sống / bộ xương (và xác đuối, bộ xương băng ở 7b) dưới nắng: cháy trừ khi đứng trong bóng râm, nước, hoặc
  đội mũ (mũ mất độ bền thay). Xác khô không cháy.
- Xác sống con: 5% số xác sống; vẫn cháy dưới nắng; không bao giờ lớn lên.
- Biến thể skin theo nhiệt độ (lợn, bò, gà): lạnh = đồng tuyết, núi; ấm = sa mạc, đồng cỏ khô có keo;
  còn lại ôn hòa. Biến thể chọn lúc sinh, lưu theo con.
- Màu len tự nhiên: trắng 81.836% · đen 5% · xám 5% · xám nhạt 5% · nâu 3% · hồng 0.164%. Cừu đã tỉa ăn cỏ
  (cỏ → đất) thì lông mọc lại. Tỉa bằng kéo: 1–3 len, kéo mất 1 độ bền.
- Gà đẻ trứng mỗi 5–10 phút (rơi xuống đất như vật phẩm). Ném trứng: 1/8 nở 1 gà con, 1/256 nở 4.
- ĐÃ CHỌN (người dùng, 2026-11-14): có phối giống — cho 2 con trưởng thành cùng loài ăn món ưa thích → 1 con non; mỗi con chờ 5 phút mới
  phối tiếp; con non lớn sau 20 phút (cho ăn thì nhanh hơn 10%). Món: bò / cừu / dê — lúa mì; gà — hạt giống;
  lợn — cà rốt / khoai tây / củ cải đường (đã có từ 4b); thỏ — bồ công anh; sói thuần — thịt bất kỳ;
  ngựa / lừa — táo vàng; lạc đà không bướu — chưa có cỏ khô nên tạm dùng lúa mì; mèo — cá sống;
  tatu — mắt nhện. Ngựa + lừa → la.

7b:
- Quái nổ: người chơi trong 3 block và nhìn thấy được thì bắt đầu xì (phồng, nhấp nháy trắng); 1.5 giây sau nổ
  sức nổ 3 (mục 16); người chơi ra xa > 7 block thì dừng xì. Nổ xong biến mất (không rơi đồ). Tránh mèo trong 6 block (8a).
- Kẻ hư không: tức khi người chơi nhìn vào đầu nó (tia nhìn trúng hộp đầu, trong 64 block) hoặc khi bị đánh;
  tức thì đuổi đánh, dịch chuyển ngẫu nhiên trong 32 block khi bị trúng tên (tên không gây sát thương) hoặc
  đứng trong nước; nước gây 1 máu mỗi giây. Thỉnh thoảng nhặt block (cỏ, đất, cát, sỏi, hoa, xương rồng —
  chỉ những block có trong game) và đặt xuống chỗ khác; chết thì rơi block đang cầm. Tắt khi `MOB_GRIEFING=off`.
- Ngọc hư không: chồng 16, ném (tốc độ như quả trứng), chạm đất thì người ném dịch chuyển tới đó, mất 5 máu
  (giáp không giảm), hồi chiêu 1 giây; 5% sinh mọt hư không.
- Khối nhầy: nhảy về phía người chơi mỗi 0.5–1 giây (lang thang 1–3 giây); cỡ ngẫu nhiên to / vừa / nhỏ (đều nhau); chết thì sinh
  2–4 con cỡ nhỏ hơn một bậc. Cỡ nhỏ không gây sát thương.
- Xác đuối: sinh trong nước, bơi theo người chơi trong nước, lên bờ đuổi như xác sống. (Đinh ba bỏ.)
- Nhện hang: chỉ sinh từ lồng sinh quái. Lồng sinh quái (block mới, độ cứng 5, đào không rơi gì, không đặt được):
  trong hầm mỏ, 1–3 lồng mỗi hệ thống, ở đoạn hành lang có mạng nhện dày. Khi có người chơi trong 16 block:
  mỗi 10–40 giây sinh 1–4 nhện hang trong vùng 9 × 3 × 9 quanh lồng, nếu chỗ đó ánh sáng ≤ 11 và quanh lồng
  chưa có quá 6 nhện hang. Hạt lửa nhỏ quay trong lồng.
- Bóng ma đêm: mỗi người chơi có bộ đếm thời gian kể từ lần ngủ / chết gần nhất (lưu theo tài khoản). Từ 3 ngày
  (72000 tick) trở lên, ban đêm, người chơi đứng chỗ thấy trời và y ≥ 62: mỗi 1–2 phút thử sinh 1–3 bóng ma đêm
  cách 20–34 block phía trên. Bóng ma bay vòng rồi lao xuống cắn, cắn xong bay lên. Tránh mèo (8a).
- Phù thủy (7b: bình phép không bị khiên chặn; uống bình hồi máu chờ 8 giây): giữ khoảng cách 10 block; ném bình mỗi 3 giây: người chơi đang chạy nhanh → chậm (1.5 phút);
  máu ≥ 8 và chưa bị độc → độc (45 giây); chưa bị yếu và đứng gần → yếu (1.5 phút); còn lại → 6 sát thương tức thì.
  Máu dưới 50% thì uống bình hồi 4 máu (hồi chiêu vài giây). Giảm 85% sát thương phép.
- Mọt đá: đá nhiễm (block mới, trông như đá; độ cứng bằng nửa đá; đào không rơi gì mà sinh 1 mọt đá) sinh như
  quặng ở biome núi, y < 64, cụm 9, 7 lần mỗi chunk. Mọt đá bị đánh (không chết ngay) thì đánh thức mọt trong
  đá nhiễm ở vùng 21 × 11 × 21 xung quanh. Mọt không bị nhìn thấy một lúc thì chui vào đá thường gần đó (đá →
  đá nhiễm; tắt khi `MOB_GRIEFING=off`).
- Mọt hư không: tự gỡ sau 2 phút; kẻ hư không đánh mọt hư không.

7c:
- Thỏ: skin theo biome — sa mạc: vàng; đồng tuyết: trắng 80% / trắng đốm 20%; nơi khác: nâu 50%, muối tiêu 40%,
  đen 10%. Chạy khỏi người chơi, sói, cáo.
- Sói: đàn 4 (rừng), 2–4 nơi khác. Skin theo biome — rừng: woods; đồng tuyết (rừng thông): ashen; chân núi rừng
  thông: pale; núi trên đường tuyết: snowy; đồng cỏ khô có keo: spotted. Các skin chestnut, black, rusty,
  striped chưa dùng (cần biome). Thuần: chuột phải bằng xương, 1/3 mỗi xương; thuần rồi đeo vòng cổ (đỏ, đổi
  màu bằng thuốc nhuộm). Sói hoang đánh cừu, thỏ, cáo, bộ xương; bị người đánh thì cả đàn tức. Sói thuần không
  đánh quái nổ. Cho ăn thịt hồi máu.
- Cáo: skin đỏ (chân núi rừng thông) hoặc tuyết (đồng tuyết). Ngủ ban ngày (skin `fox_sleep`), đêm đi săn gà,
  thỏ; nhặt vật phẩm rơi ngậm trong miệng; né người chơi đang không ngồi.
- Dê: 2% là "dê hét" (chỉ khác tiếng). Mỗi 30–300 giây húc một thực thể cách 4–16 block (sát thương 2, đẩy lùi
  mạnh). Nhảy cao, không mất máu khi rơi < 10 block. Vắt sữa bằng xô.
- Gấu trắng: trung lập; tấn công nếu bị đánh hoặc có gấu con trong 16 block và người chơi tới gần.
  Gấu con (skin baby) chiếm 10%.
- Lạc đà không bướu: 4 skin ngẫu nhiên; nhổ nước bọt 1 khi bị đánh; đàn 4–6. Chở rương 3–15 ô (cần 7d).
- Tatu: cuộn tròn khi người chơi chạy nhanh / đang cưỡi tới gần hoặc khi bị đánh (giảm sát thương).
- Cá: lên cạn thì giãy, mất 1 máu mỗi giây. Múc bằng xô nước → xô cá; đổ xô cá ra thì thả cá + nước.
  Cá nhiệt đới: 2 dáng (a, b) × 6 hoa văn × 2 màu (thân, hoa văn) trong 16 màu.
- Cá nóc: phồng 3 cấp khi người chơi trong 2 block; chạm vào lúc phồng → độc 3 giây (theo cấp phồng, tối đa 6s).
- Cá heo: cần lên thở (4 phút không khí); người chơi bơi trong 9 block → hiệu ứng bơi nhanh 5 giây; bị đánh
  thì cả đàn đánh lại.
- Mực: phun mực (hạt đen) khi bị đánh rồi bơi nhanh đi. Mực phát sáng: tự phát sáng (hiển thị, không là nguồn sáng).
- Đại dương nóng / lạnh: dùng trường nhiệt độ biome — lạnh (giáp đồng tuyết): cá hồi, cá tuyết, mực;
  ấm (giáp sa mạc / đồng cỏ khô): cá nóc, cá nhiệt đới, cá heo; còn lại: cá tuyết, mực, cá heo.

7d:
- Ngựa: 7 màu (white, creamy, chestnut, brown, black, gray, darkbrown) × 5 kiểu vết (không vết, white,
  whitefield, whitedots, blackdots). Máu 15–30, tốc độ 4.7–14.2 block/giây, nhảy 1.1–5.3 block, chọn ngẫu nhiên
  lúc sinh (con non lấy trung bình của bố mẹ có dao động).
- Thuần: chuột phải tay không để cưỡi; mỗi lần cưỡi có xác suất thuần = độ_thuần / 100 (độ_thuần bắt đầu 0, cộng
  5 mỗi lần bị hất xuống, cộng thêm khi cho ăn: lúa mì 3, táo 3, táo vàng 10); không thuần thì bị hất xuống.
- Ăn để hồi máu: lúa mì 2, táo 3, táo vàng 10. Ngựa con không cưỡi được.
- Đang cưỡi: thú cưỡi không bị sát thương rơi tới 3 block; người cưỡi không bị đẩy lùi riêng.

8a / 8b: dùng số trong bảng 8.3; cơ chế cướp làng chốt khi bắt đầu 8b (số đợt, thành phần đợt).

### 8.5 Thức ăn mới (dùng chung bảng mục 3)

| Món | Đói | Độ no | Ghi chú |
|---|---|---|---|
| Thịt thỏ sống / chín | 3 / 5 | 1.8 / 6 | |
| Cá tuyết sống / chín | 2 / 5 | 0.4 / 6 | |
| Cá hồi sống / chín | 2 / 6 | 0.4 / 9.6 | |
| Cá nhiệt đới | 1 | 0.2 | không nung được |
| Cá nóc | 1 | 0.2 | độc 60 giây, đói 15 giây, buồn nôn 15 giây |
| Mắt nhện | 2 | 3.2 | độc 5 giây |
| Xô sữa | – | – | xóa mọi hiệu ứng, trả lại xô rỗng |

## 9. Hệ thống dùng random tick — Giai đoạn 4 (trồng trọt), Giai đoạn 2/4 (lá, cỏ)

THAY THẾ "lúa lớn 8 giai đoạn" và "cây non lớn sau 5–10 phút" trong PLAN:

### 9.1 Lúa
- Cần ánh sáng ≥ 9 ở block phía trên để lớn; < 8 thì bị bật ra.
- Mỗi random tick, xác suất lên 1 giai đoạn = `1 / (floor(25 / điểm) + 1)`.
- Điểm: 1 cơ bản + đất cày bên dưới (khô 1, ẩm 3) + mỗi ô đất cày trong 8 ô
  xung quanh (khô 0.25, ẩm 0.75). Chia đôi nếu cùng loại cây trồng mọc sát
  theo đường chéo hoặc kín cả hai phía.
- Tốt nhất khoảng 1/3 mỗi random tick → một ruộng tưới đủ chín sau khoảng
  20–30 phút. Có thể tăng `RANDOM_TICK_SPEED` nếu thấy quá chậm.

### 9.2 Đất cày
- Ẩm nếu có nước trong phạm vi 4 block ngang (cùng tầng hoặc cao hơn 1).
- Khô và không có cây trồng: random tick có thể biến về đất.
- Nhảy hoặc rơi lên đất cày: có xác suất biến về đất (người và sinh vật lớn).

### 9.3 Cây non
- Cần ánh sáng ≥ 9. Có 2 giai đoạn ẩn; mỗi random tick có xác suất 1/7 tiến
  1 giai đoạn; qua giai đoạn cuối thì mọc thành cây nếu đủ chỗ trống.
- Khi mọc cây: block cỏ bên dưới thành đất.

### 9.4 Lá
- Mỗi lá lưu khoảng cách tới thân gỗ gần nhất (1–7, đi qua lá liền nhau, đo theo
  khoảng cách Manhattan). Dùng lớp dữ liệu phụ của block.
- Khoảng cách 7 (không nối với thân gỗ trong 6 bước): random tick làm lá rụng.
- Lá do người chơi đặt: không bao giờ rụng (cờ trong dữ liệu phụ).
- Lá bị phá/rụng rơi ra: cây non 5%, que 2%, táo 0.5%.
  LỰA CHỌN: PLAN đang để táo 5% vì táo là thức ăn sớm duy nhất; giữ 5% hay
  theo 0.5%.

### 9.5 Cỏ
- Cỏ lan sang đất trong phạm vi 3x5x3 nếu ánh sáng phía trên đất ≥ 9.
- Cỏ bị block đặc che phía trên: random tick biến thành đất.

## 10. Chất lỏng — Giai đoạn 4

Bổ sung cho PLAN mục 2.10 (dùng lớp dữ liệu phụ để lưu mức):

- **Nước**: lan ngang tối đa 7 block từ nguồn, mỗi bước mất 5 tick
  (khoảng 4 block/giây); chảy xuống không giới hạn và nước chảy xuống luôn ở
  mức đầy.
- **Tìm đường xuống**: trước khi lan ra 4 hướng, tìm chỗ trũng gần nhất trong
  phạm vi 4 block; nếu có thì chỉ chảy về hướng đó (đường ngắn nhất).
  Nước "tìm lỗ trước" chứ không loang đều.
- **Nguồn vô hạn**: ô trống có ít nhất 2 nguồn nước kề ngang và bên dưới là
  block đặc hoặc nguồn nước thì tự thành nguồn. (Ví dụ hố 2x2 đổ 2 xô chéo.)
- **Dung nham**: lan 3 block, mỗi bước 30 tick (1.5 giây), không tạo nguồn vô
  hạn. Phát sáng 15.
- **Tương tác**: nước chảy vào nguồn dung nham → đá vỏ chai; nước gặp dung nham
  đang chảy → đá cuội; dung nham chảy xuống nước → đá.
- Nước và dung nham phá các block không chặn chất lỏng (đuốc, cỏ cao, lúa,
  đường ray, cây non) và rơi chúng ra thành vật phẩm.
- Chất lỏng chặn ánh sáng trời: nước giảm 1 (mục 6), dung nham như block đặc.

## 11. Vật phẩm rơi — Giai đoạn 4

- Biến mất sau 6000 tick (5 phút) — như PLAN.
- Không nhặt được ngay: vật phẩm rơi từ block phá 10 tick (0.5 giây); vật phẩm
  người chơi vứt bằng Q 40 tick (2 giây), để không tự nhặt lại.
- Hai đống cùng loại nằm gần nhau (< 0.5 block) thì gộp, giới hạn 64.
- Rơi ra khi chết: văng ngẫu nhiên quanh chỗ chết.
- Vật phẩm trôi theo dòng nước chảy.

## 12. Kinh nghiệm (XP) — TÙY CHỌN, chỉ làm khi có hệ thống dùng XP

XP chỉ có ý nghĩa khi có phù phép hoặc đe sửa đồ. Nếu người dùng muốn:

- XP để lên cấp tiếp theo: cấp 0–15: `2L + 7`; cấp 16–30: `5L − 38`;
  cấp 31+: `9L − 158`.
- Nguồn: quặng than 0–2 · quặng kim cương / ngọc lục bảo 3–7 · quặng sắt và vàng
  không cho XP khi đào (cho chút XP khi nung) · quái thù địch 5 · động vật 1–3.
- Chết: rơi XP bằng `7 × cấp`, tối đa 100.
- Thanh XP hiện trên hotbar, quả cầu XP bay về người chơi.

## 13. Bảng tóm tắt theo giai đoạn

| Giai đoạn | Mục cần đọc |
|---|---|
| 2 | 1 (random tick), 6 (ánh sáng) |
| 3 | 2 (di chuyển), 4 (công thức đào), 5.5 (sát thương rơi, chết đuối — chỉ lưu số) |
| 4 | 3 (đói), 4 (công cụ), 9 (trồng trọt, lá, cỏ), 10 (chất lỏng), 11 (vật phẩm rơi) |
| 5 | Chuyển toàn bộ mục 1, 3, 9, 10 lên server |
| 6 | 5 (chiến đấu) |
| 7a | 7 (ngày đêm), 8.1–8.3 và phần 7a của 8.4, 8.5 |
| 7b | 8.2, 8.3, phần 7b của 8.4, 15 (hiệu ứng), 16 (vụ nổ) |
| 7c | 8.1 (giới hạn nhóm dưới nước / dơi), 8.3, phần 7c của 8.4, 8.5 |
| 7d | 8.3, phần 7d của 8.4 |
| 8a / 8b | 8.2 (dân làng xác sống), 8.3, 15 (điềm xấu) |
| 10 / 11 | 15 (héo, bay lên), 16 (cầu lửa, quỷ héo) |
| sau 9 | 12 (XP, nếu có phù phép) |

## 14. Không áp dụng

- Không có độ khó Dễ/Khó: toàn bộ số liệu là mức Thường.
- Không làm mạch điện kiểu redstone, phù phép, thuốc trong phạm vi file này. "Bình" phù thủy ném chỉ là đạn
  mang hiệu ứng (mục 15), không phải vật phẩm thuốc.

## 15. Hiệu ứng trạng thái — Giai đoạn 7b (dùng tiếp ở 7c, 8b, 10, 11)

Hệ thống chung: mỗi người chơi / sinh vật có danh sách hiệu ứng {loại, cấp, tick còn lại}; server tính, gửi cho
client để vẽ biểu tượng + thời gian trên HUD (icon `textures/mob_effect/<tên>.png`). Hiệu ứng mới cùng loại: lấy
cấp cao hơn; cùng cấp thì lấy thời gian dài hơn. Chết thì mất hết. Uống xô sữa: xóa hết.
Hiệu ứng "đói" của Giai đoạn 4 chuyển sang hệ thống này (giữ nguyên số).

| Hiệu ứng (icon) | Tác dụng | Nguồn |
|---|---|---|
| Độc (poison) | mất 1 máu mỗi 1.25 giây ở cấp I (cấp II: mỗi 0.6 giây); không làm máu dưới 1; thanh máu đổi màu xanh vàng | nhện hang, phù thủy, cá nóc, mắt nhện |
| Chậm (slowness) | −15% tốc độ đi mỗi cấp; góc nhìn hẹp lại nhẹ | bộ xương băng (30 giây), phù thủy |
| Yếu (weakness) | −4 sát thương cận chiến mỗi cấp (không dưới 0) | phù thủy |
| Đói (hunger) | +0.1 hao sức mỗi giây mỗi cấp (đã có từ GĐ 4) | thịt thối, gà sống, xác khô, cá nóc |
| Buồn nôn (nausea) | màn hình lắc lư méo nhẹ (chỉ hiển thị) | cá nóc |
| Bơi nhanh (dolphins_grace) | tốc độ bơi gấp khoảng 2.5 lần | cá heo (7c) |
| Điềm xấu (bad_omen) | không tác dụng trực tiếp; vào làng thì bắt đầu cướp làng | hạ đội trưởng kẻ cướp (8b) |
| Héo (wither) | mất 1 máu mỗi 2 giây, CÓ THỂ chết; thanh máu đen | bộ xương héo, quỷ héo (GĐ 10) |
| Bay lên (levitation) | bị đẩy lên 0.9 block/giây mỗi cấp, không điều khiển độ cao | sò hư không (GĐ 11) |

- Thời gian ở bảng mục 8 là mức Thường.
- Giáp không giảm sát thương từ độc và héo (như đói, chết đuối).

## 16. Vụ nổ — Giai đoạn 7b (quái nổ; dùng tiếp cho TNT nếu chọn, cầu lửa ma bay, quỷ héo ở GĐ 10)

Sức nổ P: quái nổ 3 · cầu lửa ma bay 1 · TNT 4 (nếu làm) · sọ quỷ héo 1 · quỷ héo khi được triệu hồi 7.

Phá block (tính trên server):
- Bắn tia từ tâm theo các hướng trên mặt ngoài một khối lưới 16 × 16 × 16 (1352 tia). Mỗi tia có cường độ
  ban đầu (0.7–1.3 ngẫu nhiên) × P, đi từng bước 0.3 block; mỗi bước trừ 0.225, và nếu ô đang đi qua có block
  thì trừ thêm (sức_chống_nổ + 0.3) × 0.3. Cường độ còn > 0 khi tới ô nào thì ô đó bị phá.
- Ghi chú 7b: trên nền đá, quái nổ chỉ vỡ 1–2 ô (đá chống nổ 6, như Minecraft); hố lớn khi nổ trên đất / cỏ / cát.
- Sức chống nổ (hàm `blastResistance` trong `/shared/src/explosion.ts`): lá 0.2 · kính 0.3 · đất, cát, cỏ, đất cày 0.5–0.6 · sỏi 0.6 ·
  len, thảm 0.8 · cát kết 0.8 · gỗ, ván, rương, cửa gỗ 3 · quặng 3 · đá, đá cuội, gạch đá, đá sâu 6 · lò, bàn
  chế tạo 3.5 / 2.5 · sắt (cửa, khối) 5–6 · đá vỏ chai 1200 · đá nền, nước, dung nham: không phá được.
- Block bị phá: nổ do quái thì mỗi block rơi ra với xác suất 1/P (quái nổ: 1/3); TNT rơi đủ. Nổ phá rương thì
  đồ trong rương rơi ra hết. Nước / dung nham không bị ảnh hưởng (nổ trong nước không phá block).
- (Vùng an toàn quanh điểm hồi sinh đã bỏ 2026-11-23.) Không phá gì khi `MOB_GRIEFING=off` (chỉ tắt phá
  block do quái; TNT vẫn phá).

Sát thương và đẩy văng (người chơi, sinh vật, vật phẩm rơi):
- Trong bán kính 2P: `d` = khoảng cách tới tâm / 2P; `thấy` = tỉ lệ điểm trên hộp va chạm nhìn thẳng được
  tới tâm (không bị block chắn), 0–1. `tác_động = (1 − d) × thấy`.
- Sát thương = `floor((tác_động² + tác_động) / 2 × 7 × 2P + 1)`. Quái nổ sát mặt ≈ 43, TNT ≈ 57.
  Giáp giảm như đòn thường; khiên đang giơ về phía vụ nổ chặn được.
- Đẩy văng theo hướng từ tâm ra, độ lớn = tác_động (block/tick).
- Vật phẩm rơi trong vùng nổ bị phá hủy nếu nhận sát thương.
- Hiển thị: hạt khói + chớp sáng; không có âm thanh nếu người dùng vẫn chọn không âm thanh.
