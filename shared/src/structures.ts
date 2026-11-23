// Mẫu công trình (Giai đoạn 7e): dữ liệu nhập từ client.jar (npm run import-textures → client/public_mc/structures.json, không
// commit). Client (worker sinh thế giới) và server cùng nạp file này rồi gọi setStructureData — hai bên sinh giống hệt nhau.
// Chưa có file: không có lều tuyết / cổng đổ nát / trại bỏ hoang (kim tự tháp sa mạc dựng bằng code nên vẫn có).

/** Đổi khi định dạng file đổi (công cụ nhập ghi kèm; nạp file khác số này thì bỏ qua). */
export const STRUCTURE_DATA_VERSION = 1;

/** Khối ghép: [x, y, z, hướng ("west_up"...), tên, đích, nhóm, ô thay vào chỗ khối ghép, (10d2) 1 = khớp xoay tự do (rollable)]. */
export type Jig = [number, number, number, string, string, string, string, number, number?];

export interface StructTemplate {
  size: [number, number, number];
  pal: number[]; // ô của game (id | dữ liệu phụ << 8)
  cells: number[]; // [x, y, z, chỉ số trong pal, ...] — ô không có trong danh sách: giữ nguyên địa hình
  loot: [number, number, number, string][]; // rương / thùng có bảng đồ
  jig: Jig[];
  /** (7f) Sinh vật canh sẵn (xác đuối ở tàn tích): [x, y, z, loài]. (8a) dân làng: "villager:<nghề>:<vùng>", "villager:baby:<vùng>". */
  mobs?: [number, number, number, string][];
  /** (8a) Mảnh bám mặt đất (đường làng): mỗi cột đặt theo độ cao mặt đất ở cột đó. */
  terrain?: 1;
  /** (8a) Bộ biến đổi ô của Minecraft: "mossify_10_percent", "street_plains", "farm_desert"... */
  proc?: string;
}

export interface StructureData {
  version: number;
  templates: Record<string, StructTemplate>;
  /** Nhóm ghép: [tên mẫu (hoặc "tree:<loài>", (8a) "feat:<tên>", "empty"), trọng số]. */
  pools: Record<string, [string, number][]>;
  /** (8a) Nhóm dự phòng khi không đặt được mảnh nào của nhóm (đường cụt → đoạn kết). */
  fallback?: Record<string, string>;
  /** (10d2) Bộ biến đổi ô theo luật của Minecraft (tàn tích): tên → [ô vào (−1 = mọi ô), xác suất, ô ra, 1 = xác suất tăng dần theo độ cao]. */
  procs?: Record<string, [number, number, number, number][]>;
}

/** Biome của game → các biome Minecraft có mẫu trại bỏ hoang dùng ở đó (người dùng chọn 2026-11-15: bám wiki). */
export const CAMP_BIOME_POOLS: Readonly<Record<string, readonly string[]>> = {
  forest: ["forest", "birch_forest"],
  snowy: ["snowy_taiga"],
  mountains: ["taiga", "windswept_forest"],
  plains_warm: ["savanna"],
  swamp: ["swamp"],
  plains: ["meadow"],
};

let data: StructureData | null = null;

/** Nạp dữ liệu mẫu (null = không có). Sai phiên bản thì bỏ qua. */
export function setStructureData(d: StructureData | null): void {
  data = d && d.version === STRUCTURE_DATA_VERSION ? d : null;
}

export function structureData(): StructureData | null {
  return data;
}

export function template(name: string): StructTemplate | null {
  return data?.templates[name] ?? null;
}
