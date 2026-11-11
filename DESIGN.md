# DESIGN.md — Thông số game (nguồn sự thật)

File này chép từ mục 2 của `PLAN.md` ở Giai đoạn 0. Từ đây trở đi, khi cần
đổi thông số thì sửa ở đây (và trong `/shared/src/constants.ts`). Khi `DESIGN.md`
và `PLAN.md` khác nhau, theo `DESIGN.md`.

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
- Thông số chi tiết (chỉnh được): tần số noise 1/64;
  số cụm quặng thử đặt mỗi chunk: than 16, sắt 12, kim cương 4, sỏi 3 (chỉ thay ô đá);
  12% mặt cỏ có cỏ cao. Giá trị nằm trong `shared/src/constants.ts` (WORLD).

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

