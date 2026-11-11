# AGENTS.md — Hướng dẫn cho agent trong dự án Voxel PvP

Dự án: game voxel sinh tồn PvP nhiều người chơi, góc nhìn thứ nhất, chạy trên
trình duyệt. Toàn bộ đặc tả và kế hoạch nằm trong `PLAN.md`. File này chỉ chứa
quy tắc làm việc.

## Đầu mỗi phiên làm việc

1. Đọc `PLAN.md` (đặc tả + các giai đoạn).
2. Đọc `PROGRESS.md` để biết giai đoạn nào đã xong, giai đoạn nào đang làm.
   Nếu chưa có file này thì dự án chưa bắt đầu: làm Giai đoạn 0.
3. Nếu có `DESIGN.md` thì đó là nguồn sự thật về thông số game (do người dùng
   có thể đã chỉnh). Khi `DESIGN.md` và `PLAN.md` khác nhau, theo `DESIGN.md`.

## Quy tắc quan trọng nhất: mỗi lần chỉ làm MỘT giai đoạn

- Khi người dùng nói "tiếp", "làm tiếp", "giai đoạn tiếp theo" hoặc tương tự:
  làm đúng giai đoạn chưa xong kế tiếp trong `PROGRESS.md`, không hơn.
- Khi người dùng nói "làm giai đoạn N": chỉ làm giai đoạn N. Nếu giai đoạn
  trước đó chưa được đánh dấu xong, hỏi lại trước khi làm.
- KHÔNG tự chuyển sang giai đoạn sau, kể cả khi còn thời gian. Người dùng phải
  tự chơi thử và xác nhận trước.
- Không thêm tính năng nằm ngoài giai đoạn đang làm.

## Khi làm xong một giai đoạn

1. Chạy `npm run typecheck` và `npm run build`; sửa hết lỗi.
2. Tự kiểm tra từng mục NGHIỆM THU của giai đoạn đó trong `PLAN.md` ở mức có
   thể kiểm bằng code/lệnh. Mục nào chỉ người chơi thử mới kiểm được thì ghi rõ.
3. Cập nhật `PROGRESS.md`: đánh dấu giai đoạn là "chờ người dùng test", liệt kê
   file đã tạo/sửa và các vấn đề còn tồn tại.
4. Commit: `git commit -am "giai doan N: <mô tả ngắn>"`.
5. Báo cho người dùng bằng tiếng Việt: cách chạy, danh sách những gì cần chơi
   thử (lấy từ mục NGHIỆM THU), và những gì chưa chắc chắn. Rồi DỪNG.
6. Chỉ đánh dấu "xong" trong `PROGRESS.md` khi người dùng xác nhận đã test đạt.

## Khi người dùng báo lỗi

- Chỉ sửa lỗi được báo. Không tái cấu trúc, không đụng vào phần đang chạy tốt.
- Lỗi khó (đồng bộ mạng, va chạm, giật hình): trước khi sửa, nêu 2–3 nguyên
  nhân có thể và cách kiểm tra từng cái, rồi mới sửa nguyên nhân đã xác nhận.
- Sửa xong thì commit riêng: `git commit -am "sua: <mô tả>"`.

## Quy ước code

- TypeScript strict cho cả client, server, shared.
- Cấu trúc: `/client` (Vite + Three.js), `/server` (Node.js + ws),
  `/shared` (kiểu dữ liệu, hằng số, bảng block/item/công thức, vật lý dùng chung).
- Mỗi file dưới 300 dòng; tách module theo chức năng.
- Mọi con số gameplay (máu, sát thương, tốc độ, thời gian) đặt trong `/shared`,
  không viết cứng rải rác.
- Từ Giai đoạn 4 trở đi: server là nguồn sự thật. Client không bao giờ tự
  quyết định sát thương, túi đồ hay thay đổi block.
- Không thêm thư viện mới nếu chưa nêu lý do với người dùng.
- Chú thích trong code viết bằng tiếng Việt hoặc tiếng Anh đều được, ngắn gọn.

## Lệnh

- `npm install` — cài phụ thuộc (workspace gồm client, server, shared)
- `npm run dev` — chạy client và server cùng lúc
- `npm run typecheck` — kiểm tra kiểu toàn dự án
- `npm run build` — build client và server
- `npm run import-textures` — nhập texture (có từ Giai đoạn 1)

Giai đoạn 0 phải tạo đủ các lệnh này.

## Tài nguyên hình ảnh

- Nguồn: `/assets-src/REFI_Textures` (người dùng tự tải về, CC BY-SA 4.0,
  tác giả MysticTempest). Thư mục này KHÔNG commit vào git.
- Bảng ánh xạ file nằm trong `PLAN.md`, mục 3.
- Nếu thư mục nguồn chưa có hoặc thiếu file: tự vẽ texture tạm bằng canvas để
  game vẫn chạy, và báo người dùng file nào thiếu.
- TUYỆT ĐỐI không tải, sao chép hay dùng texture, model, âm thanh, tên riêng
  hoặc logo của Minecraft/Mojang. Không đặt tên game hay tên vật phẩm trùng
  thương hiệu của họ.
- Mọi tài nguyên bên ngoài phải được ghi vào `CREDITS.md` kèm giấy phép.

## Ngôn ngữ

- Trả lời người dùng bằng tiếng Việt.
- Văn bản hiển thị trong game bằng tiếng Việt, gom vào một file để dễ dịch.
