# MECHANICS.md — Cơ chế gameplay tham khảo

File này bổ sung cơ chế chi tiết cho `PLAN.md`. Các con số được tổng hợp từ tài
liệu mô tả cơ chế của Minecraft Java (minecraft.wiki và các trang tính toán dẫn
nguồn từ đó), viết lại bằng lời, KHÔNG lấy từ mã nguồn. Đây là thông số thiết kế:
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

## 7. Ngày và đêm — Giai đoạn 7

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

## 8. Sinh quái và sinh vật — Giai đoạn 7

THAY THẾ luật sinh quái trong PLAN mục 2.7:

- Quái thù địch chỉ sinh khi: ánh sáng block = 0 VÀ ánh sáng trời (đã nhân theo
  giờ) ≤ một số ngẫu nhiên 0–7. (Luật mới, nên chỉ cần thắp đuốc là an toàn.)
- Khoảng cách tới người chơi gần nhất: 24–128 block.
- Quái cách mọi người chơi > 128 block: gỡ ngay. Từ 32 block trở ra và không
  bị đánh trong 30 giây: mỗi giây có xác suất nhỏ (1/800) bị gỡ.
- Sinh theo đàn: chọn một loại, sinh tối đa 4 con quanh một điểm.
- Giới hạn số quái: giữ như PLAN (30 quanh mỗi người chơi trong 64 block).
- Quái đã bị đặt tên hoặc nhặt đồ của người chơi thì không bị gỡ.

Chỉ số:

| Sinh vật | Máu | Sát thương | Tốc độ | Tầm phát hiện | Rơi ra | XP |
|---|---|---|---|---|---|---|
| Xác sống | 20, giáp 2 | 3 | chậm hơn người đi bộ một chút | 35 block | thịt thối (66%) | 5 |
| Bộ xương | 20 | tên 2–4 | | 16 block | 0–2 xương, 0–2 tên | 5 |
| Nhện | 16 | 2 | nhanh hơn người đi bộ | 16 block | 0–2 sợi tơ | 5 |
| Lợn, bò, cừu | 10, 10, 8 | – | chậm | – | thịt 1–3, da 0–2 (bò), len 1 (cừu) | 1–3 |
| Gà | 4 | – | | – | thịt 1, lông 0–2 | 1–3 |

- Kích thước: xác sống và bộ xương 0.6 × 1.95; nhện 1.4 × 0.9 (lọt khe 1 block
  cao nhưng không lọt khe hẹp 1 block ngang).
- Nhện: ban ngày (ánh sáng ≥ 12 tại chỗ nó) trung lập, chỉ đánh khi bị đánh;
  leo được tường thẳng đứng.
- Xác sống/bộ xương dưới nắng: cháy trừ khi đứng trong bóng râm, nước, hoặc đội
  mũ (mũ mất độ bền thay).
- Động vật: chủ yếu sinh lúc tạo chunk, trên cỏ, nơi ánh sáng ≥ 9. Không sinh
  lại liên tục (giữ như PLAN).

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
| 7 | 7 (ngày đêm), 8 (sinh quái) |
| sau 9 | 12 (XP, nếu có phù phép) |

## 14. Không áp dụng

- Không có độ khó Dễ/Khó: toàn bộ số liệu là mức Thường.
- Không làm các sinh vật mang thiết kế riêng của Minecraft (xem `AGENTS.md`).
- Không làm mạch điện kiểu redstone, phù phép, thuốc trong phạm vi file này.
