// Tạo ITEMS.md: danh sách mọi vật phẩm (khóa dùng cho lệnh /give) kèm tên tiếng Việt, chia nhóm (Giai đoạn 7b).
//   npm run list-items
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { allItems } from "../shared/src/index.js";
import { itemName } from "../client/src/ui/itemNames.js";

const groups: [string, (d: ReturnType<typeof allItems>[number]) => boolean][] = [
  ["Công cụ, vũ khí", (d) => !!d.tool || d.key === "bow" || d.key === "shield" || d.key === "flint_and_steel"],
  ["Giáp", (d) => !!d.armor],
  ["Thức ăn", (d) => !!d.food],
  ["Khối đặt được", (d) => d.places !== undefined],
  ["Nguyên liệu, vật phẩm khác", () => true],
];
const left = allItems().slice().sort((a, b) => a.key.localeCompare(b.key));
let md = "# ITEMS.md — Danh sách vật phẩm\n\n" +
  "Tạo tự động bằng `npm run list-items` (đừng sửa tay). Dùng khóa ở cột đầu cho lệnh quản trị:\n\n" +
  "```\n/give <tên người chơi> <khóa> [số lượng]\n```\n\n" +
  "Ví dụ: `/give An diamond_sword`, `/give An tnt 16`. Trong game gõ `/items <từ khóa>` để tìm (tìm được theo tên tiếng Việt, " +
  "không cần dấu: `/items thit`).\n";
for (const [title, test] of groups) {
  const list = left.filter(test);
  if (!list.length) continue;
  for (const d of list) left.splice(left.indexOf(d), 1);
  md += `\n## ${title} (${list.length})\n\n| Khóa | Tên |\n|---|---|\n` + list.map((d) => `| \`${d.key}\` | ${itemName(d.key)} |`).join("\n") + "\n";
}
writeFileSync(join(process.cwd(), "docs", "ITEMS.md"), md);
console.log(`[list-items] đã ghi docs/ITEMS.md (${allItems().length} vật phẩm)`);
