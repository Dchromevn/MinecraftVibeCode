// Tên tiếng Việt của vật phẩm và danh sách vật phẩm cho lệnh /items (Giai đoạn 7b). Không dùng DOM để script
// scripts/list-items.ts (tạo ITEMS.md) dùng chung được.
import { allItems, itemDef } from "../../../shared/src/index.js";
import { STR } from "../strings.js";

/** Tên tiếng Việt của vật phẩm. */
export function itemName(key: string): string {
  const d = itemDef(key);
  if (STR.items[key]) return STR.items[key]!; // tên riêng (kéo...) trước tên ghép theo công cụ
  if (d?.tool) return `${STR.toolKinds[d.tool.kind] ?? d.tool.kind} ${STR.tiers[d.tool.tier] ?? d.tool.tier}`;
  if (d?.armor) return `${STR.armorPieces[d.armor.piece] ?? d.armor.piece} ${STR.tiers[d.armor.tier] ?? d.armor.tier}`;
  return STR.items[key] ?? STR.blocks[key] ?? key;
}

/** Bỏ dấu tiếng Việt, chữ thường (tìm "thit bo" ra "Thịt bò"). */
const plain = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();

/** Vật phẩm có khóa hoặc tên chứa từ khóa (không phân biệt dấu); rỗng = tất cả. Sắp theo khóa. */
export function findItems(query: string): { key: string; name: string }[] {
  const q = plain(query.trim());
  return allItems()
    .map((d) => ({ key: d.key, name: itemName(d.key) }))
    .filter((it) => !q || it.key.includes(q) || plain(it.name).includes(q))
    .sort((a, b) => a.key.localeCompare(b.key));
}
