// Nhà người chơi tự lưu (Giai đoạn 8a, lệnh /structure save): thêm vào nhóm nhà của mọi loại làng. Danh sách chỉ thêm vào cuối.
// Để làng đã sinh không đổi khi có nhà mới, mỗi vùng làng ghi lại "mốc" = số nhà tự lưu lúc vùng đó được sinh lần đầu (server lưu
// cùng thế giới, gửi cho client); làng chỉ dùng các nhà có số thứ tự < mốc. Vùng chưa có mốc: dùng hết danh sách hiện tại.
import type { StructTemplate } from "./structures.js";
import { VILLAGE } from "./villageConstants.js";

export interface CustomStructure { name: string; t: StructTemplate }

let customs: CustomStructure[] = [];
const cuts = new Map<string, number>();
const key = (rx: number, rz: number): string => `${rx},${rz}`;

export function setCustomStructures(list: readonly CustomStructure[]): void {
  customs = [...list];
}

export function customStructures(): readonly CustomStructure[] {
  return customs;
}

/** Ghi mốc cho các vùng: [rx, rz, mốc, ...]. */
export function setVillageCuts(list: readonly number[]): void {
  for (let i = 0; i + 2 < list.length; i += 3) cuts.set(key(list[i]!, list[i + 1]!), list[i + 2]!);
}

/** Số nhà tự lưu mà làng ở vùng (rx, rz) được dùng. */
export function villageCut(rx: number, rz: number): number {
  return Math.min(cuts.get(key(rx, rz)) ?? customs.length, customs.length);
}

/** Vùng làng có thể chạm chunk (cx, cz). */
export function villageRegionsNear(cx: number, cz: number): [number, number][] {
  const span = VILLAGE.SPACING * 16, r = VILLAGE.MAX_DIST + 24, out: [number, number][] = [];
  for (let rx = Math.floor((cx * 16 - r) / span); rx <= Math.floor((cx * 16 + 15 + r) / span); rx++)
    for (let rz = Math.floor((cz * 16 - r) / span); rz <= Math.floor((cz * 16 + 15 + r) / span); rz++) out.push([rx, rz]);
  return out;
}

/** (server) Trước khi sinh chunk: chốt mốc cho các vùng quanh nó chưa có mốc. Trả về mốc mới [rx, rz, mốc, ...]. */
export function pinVillageCuts(cx: number, cz: number): number[] {
  const out: number[] = [];
  for (const [rx, rz] of villageRegionsNear(cx, cz)) {
    const k = key(rx, rz);
    if (cuts.has(k)) continue;
    cuts.set(k, customs.length);
    out.push(rx, rz, customs.length);
  }
  return out;
}

/** Mọi mốc [rx, rz, mốc, ...] (lưu thế giới); below = chỉ mốc nhỏ hơn số nhà hiện có (cần gửi cho client). */
export function villageCuts(below = false): number[] {
  const out: number[] = [];
  for (const [k, n] of cuts) {
    if (below && n >= customs.length) continue;
    const [rx, rz] = k.split(",").map(Number);
    out.push(rx!, rz!, n);
  }
  return out;
}

/** (kiểm thử) xóa hết. */
export function resetVillageCustoms(): void {
  customs = [];
  cuts.clear();
}
