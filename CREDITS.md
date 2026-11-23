# CREDITS.md — Ghi công tài nguyên

## Texture, icon, mẫu công trình

- Lấy từ file client.jar của Minecraft (© Mojang Studios / Microsoft), người dùng tự tải về máy.
  `npm run import-textures` đọc jar, sao chép / ghép / cắt / nhân màu theo `scripts/mc-texture-map.json`
  vào `client/public_mc`. Từ 2026-11-23 thư mục này được commit vào repo **riêng tư** (không công khai repo).
- Logo app desktop (`desktop/resources/icon.png`) vẽ từ texture khối cỏ ở trên (`npm run make-icon`).
- Từ 2026-11-13 dự án không còn dùng REFI_Textures (MysticTempest, CC BY-SA 4.0).

## Thư viện mã nguồn

- Three.js (MIT), Vite (MIT), ws (MIT), TypeScript (Apache-2.0),
  tsx (MIT), concurrently (MIT), pngjs (MIT, chỉ dùng trong script nhập texture / vẽ logo).
- Electron (MIT), electron-builder (MIT) — app desktop.
