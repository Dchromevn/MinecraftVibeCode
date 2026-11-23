// (7e) Nạp mẫu công trình nhập từ client.jar (client/public_mc/structures.json — cùng file client dùng) cho bộ sinh thế giới
// của server. Chưa có file (chưa chạy npm run import-textures): không có lều tuyết / cổng đổ nát / trại bỏ hoang.
import { readFileSync } from "node:fs";
import { setStructureData, structureData, type StructureData } from "../../shared/src/index.js";
import { findPath } from "./config.js";

let tried = false;

/** Nạp một lần (gọi lại thì bỏ qua). Trả về true nếu có dữ liệu. */
export function loadStructures(): boolean {
  if (!tried) {
    tried = true;
    // chạy bằng tsx (server/src) hoặc bản build (server/dist/server/src); bản build của client cũng có file này
    const f = findPath("../../client/public_mc/structures.json", "../../../../client/public_mc/structures.json",
      "../../client/dist/structures.json", "../../../../client/dist/structures.json");
    try {
      if (f) setStructureData(JSON.parse(readFileSync(f, "utf8")) as StructureData);
    } catch (err) {
      console.error("[server] không đọc được mẫu công trình:", err);
    }
  }
  return structureData() !== null;
}
