# CREDITS.md — Ghi công tài nguyên

## Texture và icon

- Lấy từ file client.jar của Minecraft (© Mojang Studios / Microsoft), người dùng tự tải về máy.
  `npm run import-textures` đọc jar, sao chép / ghép / cắt / nhân màu theo `scripts/mc-texture-map.json`
  vào `client/public_mc`. Ảnh KHÔNG được commit vào git và chỉ dùng để chơi riêng (trên máy, hoặc
  bạn bè qua link của chính người dùng); không phát hành công khai kèm các ảnh này.
- Từ 2026-11-13 dự án không còn dùng REFI_Textures (MysticTempest, CC BY-SA 4.0).

## Thư viện mã nguồn

- Three.js (MIT), Vite (MIT), ws (MIT), TypeScript (Apache-2.0),
  tsx (MIT), concurrently (MIT), pngjs (MIT, chỉ dùng trong script nhập texture).
