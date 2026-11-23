// Block Giai đoạn 8c: bậc, tấm, hàng rào, cửa gỗ sồi tối (thân, lá, ván, cây non dùng woodDefs chung trong blockTable.ts).
// Lấy độ cứng / công cụ / hình dạng của bản cùng loại đã có (bậc, tấm theo ván sồi tối; hàng rào, cửa theo bản gỗ sồi).
// Không import B (blocks.ts nạp bảng này — vòng import): id ghi số, khớp B.DARK_OAK_*.
import type { BlockDef, BlockDrop, BlockId } from "./blocks.js";

type Shaped = (id: number, key: string, src: number, extra: Partial<BlockDef>) => BlockDef;
const FENCE = 22, DOOR = 29, PLANKS = 164;

export function darkOakShapes(table: readonly BlockDef[], shaped: Shaped, drop: (item: string) => BlockDrop): BlockDef[] {
  return [
    shaped(166, "dark_oak_stairs", PLANKS, { render: "stairs", meta: "stairs" }),
    shaped(167, "dark_oak_slab", PLANKS, { render: "slab", meta: "slab" }),
    { ...table[FENCE]!, id: 168 as BlockId, key: "dark_oak_fence", drops: [drop("dark_oak_fence")],
      tex: { top: "dark_oak_planks", bottom: "dark_oak_planks", side: "dark_oak_planks" } },
    { ...table[DOOR]!, id: 169 as BlockId, key: "dark_oak_door", drops: [drop("dark_oak_door")],
      tex: { top: "dark_oak_door_upper", bottom: "dark_oak_door_lower", side: "dark_oak_door_lower" } },
  ];
}
