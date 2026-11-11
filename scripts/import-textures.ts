// Giai đoạn 0: chỗ giữ chỗ. Giai đoạn 1 sẽ viết script sao chép/ghép texture
// từ assets-src/REFI_Textures theo bảng ánh xạ scripts/texture-map.json.
import { existsSync } from "node:fs";

const src = "assets-src/REFI_Textures/textures";
if (!existsSync(src)) {
  console.log(`[import-textures] Chưa thấy thư mục ${src}. Hãy tải REFI_Textures về trước.`);
} else {
  console.log(`[import-textures] Thấy ${src}. Script nhập texture sẽ được viết ở Giai đoạn 1.`);
}
