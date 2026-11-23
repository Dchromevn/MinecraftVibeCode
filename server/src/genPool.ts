// Nhóm luồng phụ sinh chunk / tính ánh sáng cho server (sửa ping 2026-11-14; worker_threads có sẵn của Node). Chỉ server thật
// dùng (index.ts); bài kiểm tra vẫn sinh đồng bộ để tick xong là có chunk ngay.
import { Worker } from "node:worker_threads";
import type { ChunkData, CustomStructure, Region } from "../../shared/src/index.js";

export type GenJob =
  | { t: "gen"; id: number; cx: number; cz: number; dim: number } // (10a) cõi: 0 thế giới chính, 1 Vực Lửa
  | { t: "light"; id: number; blocks: Uint8Array; meta: Uint8Array }
  | { t: "customs"; id: number; list: CustomStructure[]; cuts: number[] }; // (8a) nhà tự lưu + mốc vùng làng
export interface GenResult { id: number; data?: Uint8Array; meta?: Uint8Array; light?: Uint8Array }

interface Slot { w: Worker; busy: number }

export class GenPool {
  private readonly slots: Slot[] = [];
  private readonly waiting = new Map<number, { slot: Slot; done: (r: GenResult) => void }>();
  private nextId = 1;

  constructor(seed: number, count: number) {
    // chạy bằng tsx (dev): file .ts; bản build: .js cạnh file này
    const file = new URL(import.meta.url.endsWith(".ts") ? "./genWorker.ts" : "./genWorker.js", import.meta.url);
    for (let i = 0; i < count; i++) {
      const slot: Slot = { w: new Worker(file, { workerData: { seed } }), busy: 0 };
      slot.w.on("message", (r: GenResult) => {
        const job = this.waiting.get(r.id);
        if (!job) return;
        this.waiting.delete(r.id);
        job.slot.busy--;
        job.done(r);
      });
      slot.w.on("error", (err) => console.error("[server] lỗi luồng sinh chunk:", err));
      slot.w.unref(); // không giữ tiến trình khi tắt server
      this.slots.push(slot);
    }
  }

  private send(job: GenJob, done: (r: GenResult) => void, transfer: ArrayBuffer[] = []): void {
    const slot = this.slots.reduce((a, b) => (b.busy < a.busy ? b : a));
    slot.busy++;
    this.waiting.set(job.id, { slot, done });
    slot.w.postMessage(job, transfer);
  }

  /** Sinh chunk (cx, cz) ở luồng phụ. */
  generate(cx: number, cz: number, done: (c: ChunkData) => void, dim = 0): void {
    this.send({ t: "gen", id: this.nextId++, cx, cz, dim }, (r) => done({ data: r.data!, meta: r.meta! }));
  }

  /** Tính ánh sáng của chunk giữa vùng 3x3 (region đã chép riêng, chuyển hẳn sang luồng phụ). */
  light(region: Region, done: (light: Uint8Array) => void): void {
    this.send({ t: "light", id: this.nextId++, blocks: region.blocks, meta: region.meta }, (r) => done(r.light!),
      [region.blocks.buffer as ArrayBuffer, region.meta.buffer as ArrayBuffer]);
  }

  /** (8a) Gửi danh sách nhà tự lưu + mốc cho mọi luồng (trước các chunk sinh sau đó). */
  customs(list: CustomStructure[], cuts: number[]): void {
    for (const s of this.slots) s.w.postMessage({ t: "customs", id: 0, list, cuts } satisfies GenJob);
  }

  close(): void {
    for (const s of this.slots) void s.w.terminate();
  }
}
