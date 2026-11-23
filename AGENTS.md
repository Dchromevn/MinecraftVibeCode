# AGENTS.md — Hướng dẫn cho agent trong dự án Voxel Survival

Dự án: game voxel sinh tồn thế giới mở nhiều người chơi, góc nhìn thứ nhất,
chạy trên trình duyệt. Toàn bộ đặc tả và kế hoạch nằm trong `docs/PLAN.md`. File này
chỉ chứa quy tắc làm việc.

## Đầu mỗi phiên làm việc

1. Đọc `docs/PLAN.md` (đặc tả + các giai đoạn).
2. Đọc `docs/PROGRESS.md` để biết giai đoạn nào đã xong, giai đoạn nào đang làm.
   Nếu chưa có file này thì dự án chưa bắt đầu: làm Giai đoạn 0.
3. Nếu có `docs/DESIGN.md` thì đó là nguồn sự thật về thông số game (do người dùng
   có thể đã chỉnh). Khi `docs/DESIGN.md` và `docs/PLAN.md` khác nhau, theo `docs/DESIGN.md`.
4. Đầu mỗi giai đoạn, đọc các mục trong `docs/MECHANICS.md` thuộc giai đoạn đó (bảng
   ở mục 13 của file) và làm theo phần "Cách agent dùng file này".

## Quy tắc quan trọng nhất: mỗi lần chỉ làm MỘT giai đoạn

- Khi người dùng nói "tiếp", "làm tiếp", "giai đoạn tiếp theo" hoặc tương tự:
  làm đúng giai đoạn chưa xong kế tiếp trong `docs/PROGRESS.md`, không hơn.
- Khi người dùng nói "làm giai đoạn N": chỉ làm giai đoạn N. Nếu giai đoạn
  trước đó chưa được đánh dấu xong, hỏi lại trước khi làm.
- KHÔNG tự chuyển sang giai đoạn sau, kể cả khi còn thời gian. Người dùng phải
  tự chơi thử và xác nhận trước.
- Không thêm tính năng nằm ngoài giai đoạn đang làm.
- Giai đoạn 10, 11 và các giai đoạn công trình lớn 8c–8h là tùy chọn: chỉ làm khi người dùng yêu cầu rõ.
- Nếu `docs/PLAN.md` có thay đổi so với lần trước (ví dụ có ghi chú chuyển hướng),
  cập nhật `docs/DESIGN.md` và `docs/PROGRESS.md` cho khớp trước khi làm tiếp, giữ lại
  các chỉnh sửa người dùng đã làm trong `docs/DESIGN.md`.

## Khi làm xong một giai đoạn

1. Chạy `npm run typecheck` và `npm run build`; sửa hết lỗi.
2. Tự kiểm tra từng mục NGHIỆM THU của giai đoạn đó trong `docs/PLAN.md` ở mức có
   thể kiểm bằng code/lệnh. Mục nào chỉ người chơi thử mới kiểm được thì ghi rõ.
3. Cập nhật `docs/PROGRESS.md`: đánh dấu giai đoạn là "chờ người dùng test", liệt kê
   file đã tạo/sửa và các vấn đề còn tồn tại.
4. KHÔNG git commit (người dùng chọn 2026-11-13: làm trên máy, không cần commit).
5. Báo cho người dùng bằng tiếng Việt: cách chạy, danh sách những gì cần chơi
   thử (lấy từ mục NGHIỆM THU), và những gì chưa chắc chắn. Rồi DỪNG.
6. Chỉ đánh dấu "xong" trong `docs/PROGRESS.md` khi người dùng xác nhận đã test đạt.

## Khi người dùng báo lỗi

- Chỉ sửa lỗi được báo. Không tái cấu trúc, không đụng vào phần đang chạy tốt.
- Lỗi khó (đồng bộ mạng, va chạm, giật hình): trước khi sửa, nêu 2–3 nguyên
  nhân có thể và cách kiểm tra từng cái, rồi mới sửa nguyên nhân đã xác nhận.
- Sửa xong ghi lại trong `docs/PROGRESS.md` (không git commit).

## Quy ước code

- TypeScript strict cho cả client, server, shared.
- Cấu trúc: `/client` (Vite + Three.js), `/server` (Node.js + ws),
  `/shared` (kiểu dữ liệu, hằng số, bảng block/item/công thức, vật lý dùng chung).
- Mỗi file dưới 300 dòng; tách module theo chức năng.
- Mọi con số gameplay (máu, sát thương, tốc độ, thời gian) đặt trong `/shared`,
  không viết cứng rải rác.
- Từ Giai đoạn 5 trở đi: server là nguồn sự thật. Client không bao giờ tự
  quyết định sát thương, túi đồ, thay đổi block hay nội dung chunk.
- Sinh địa hình, công trình (hầm mỏ, làng) phải xác định theo seed + tọa độ,
  sinh được độc lập từng chunk mà vẫn liền mạch qua ranh giới chunk.
- Không bao giờ xóa hay ghi đè `/server/data` (thế giới đã lưu) khi sửa code.
  Đổi định dạng lưu thì phải viết bước chuyển đổi dữ liệu cũ.
- Không thêm thư viện mới nếu chưa nêu lý do với người dùng.
- Chú thích trong code viết bằng tiếng Việt hoặc tiếng Anh đều được, ngắn gọn.

## Lệnh

- `npm install` — cài phụ thuộc (workspace gồm client, server, shared)
- `npm run dev` — chạy client và server cùng lúc
- `npm run typecheck` — kiểm tra kiểu toàn dự án
- `npm run build` — build client và server
- `npm run list-items` — tạo docs/ITEMS.md (khóa vật phẩm cho lệnh /give, kèm tên tiếng Việt); chạy lại khi thêm vật phẩm
- `npm run list-places` — tạo docs/DIA-DIEM.md (tọa độ làng, công trình, pháo đài Vực Lửa, tàn tích pháo đài lợn của thế giới đang chơi, tính từ seed); chạy lại khi thêm loại công trình
- `npm run import-textures` — nhập texture từ client.jar (có từ Giai đoạn 1; `npm run import-mc` là tên cũ, giống hệt); từ 7e
  nhập thêm mẫu công trình (`client/public_mc/structures.json`)

- `npm run desktop` — build rồi chạy thử app desktop (Electron) trên máy (2026-11-23)
- `npm run dist-desktop` — build bản cài `desktop/release/VoxelSurvival-Setup-<bản>.exe` + bản portable (không commit,
  đăng ở GitHub Releases). App tự chạy server trong máy; thế giới / config.json / server.log ở `%APPDATA%/Voxel Survival`
  (khác `server/data` của bản web). Code vỏ app ở `/desktop/src`, gom file bằng `scripts/stage-desktop.ts`.
- `npm run make-icon` — vẽ logo app (khối cỏ) từ texture public_mc vào `desktop/resources/icon.png`

Giai đoạn 0 phải tạo đủ các lệnh này.

## Tài nguyên hình ảnh

- Nguồn duy nhất (người dùng chọn 2026-11-13, bỏ REFI_Textures): file client.jar của Minecraft do
  người dùng tự tải vào `/assets-src/minecraft` (© Mojang). `npm run import-textures` nhập theo
  `scripts/mc-texture-map.json` vào `client/public_mc`. `assets-src` KHÔNG commit; `client/public_mc` ĐƯỢC commit (người dùng chọn
  2026-11-23: repo riêng tư, người được mời tải repo về là có đủ texture / mẫu công trình). Không công khai repo.
- Thêm texture / icon mới: thêm mục vào `scripts/mc-texture-map.json` rồi chạy lại lệnh nhập.
- Nếu chưa nhập client.jar hoặc thiếu file: tự vẽ texture tạm bằng canvas để
  game vẫn chạy, và báo người dùng file nào thiếu.


## Ngôn ngữ

- Trả lời người dùng bằng tiếng Việt.
- Văn bản hiển thị trong game bằng tiếng Việt, gom vào một file để dễ dịch.
