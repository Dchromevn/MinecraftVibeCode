// Nhà người chơi tự lưu (Giai đoạn 8a): lệnh /structure save chụp vùng block thành mẫu, thêm vào nhóm nhà của mọi loại làng (làng
// sinh sau đó mới có). Lưu ở <thế giới>/structures.json cùng "mốc" của từng vùng làng (số nhà tự lưu lúc vùng đó sinh lần đầu —
// làng đã sinh không bị đổi). Gửi cho client lúc vào game và khi có nhà mới; gửi cho luồng sinh chunk của server.
import {
  captureStructure, customStructures, pinVillageCuts, setCustomStructures, setVillageCuts, villageCuts, type CustomStructure, type ServerMsg,
} from "../../shared/src/index.js";
import type { GenPool } from "./genPool.js";
import type { ServerPlayer } from "./player.js";
import type { ServerWorld } from "./serverWorld.js";
import type { WorldStorage } from "./storage.js";

export class CustomStructs {
  private dirty = false;

  constructor(private readonly storage: WorldStorage, private readonly w: ServerWorld, private readonly pool: () => GenPool | null) {
    const c = storage.loadCustoms();
    setCustomStructures(c.list);
    setVillageCuts(c.cuts);
    w.beforeGen = (cx, cz) => {
      if (pinVillageCuts(cx, cz).length) this.dirty = true;
    };
  }

  /** Gửi cho luồng sinh chunk (gọi sau khi tạo GenPool). */
  syncWorkers(): void {
    this.pool()?.customs([...customStructures()], villageCuts());
  }

  /** Gói cho client: danh sách + các mốc nhỏ hơn số nhà hiện có. */
  forClient(): Extract<ServerMsg, { t: "customs" }> {
    return { t: "customs", list: [...customStructures()], cuts: villageCuts(true) };
  }

  /** /structure save: lỗi ("name", "exists", "size", "unloaded") hoặc null nếu xong. */
  save(p: ServerPlayer, name: string, a: [number, number, number], b: [number, number, number], online: readonly ServerPlayer[]): string | null {
    if (!/^[a-z0-9_-]{1,24}$/.test(name)) return "name";
    if (customStructures().some((c) => c.name === name)) return "exists";
    const t = captureStructure((x, y, z) => this.w.getCell(x, y, z), a, b, p.x, p.y, p.z);
    if (typeof t === "string") return t;
    // chốt mốc mọi vùng quanh các chunk người chơi đang xem trước khi thêm (làng đang thấy không đổi)
    for (const o of online) for (const k of o.subs) pinVillageCuts(Math.floor(k / 0x10000) - 0x8000, (k % 0x10000) - 0x8000);
    const list: CustomStructure[] = [...customStructures(), { name, t }];
    setCustomStructures(list);
    this.dirty = true;
    this.save_();
    this.syncWorkers();
    const msg = this.forClient();
    for (const o of online) o.send(msg);
    return null;
  }

  private save_(): void {
    this.storage.saveCustoms({ list: customStructures(), cuts: villageCuts() });
    this.dirty = false;
  }

  /** Lưu định kỳ (mốc mới). */
  flush(): void {
    if (this.dirty) this.save_();
  }
}
