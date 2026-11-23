// Bể Web Worker: giao việc cho worker đang rảnh nhất, gọi lại khi xong.
import type { FromWorker, ToWorker } from "./protocol.js";

type Callback = (msg: FromWorker) => void;

interface Slot {
  worker: Worker;
  busy: number;
}

export class WorkerPool {
  private readonly slots: Slot[] = [];
  private readonly callbacks = new Map<number, { cb: Callback; slot: Slot }>();
  private nextId = 1;
  /** Thời gian xử lý (ms) gần đây, để HUD hiển thị. */
  lastGenMs = 0;
  lastMeshMs = 0;

  constructor(count: number, init: ToWorker) {
    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL("./worldWorker.ts", import.meta.url), { type: "module" });
      const slot: Slot = { worker, busy: 0 };
      worker.onmessage = (e: MessageEvent<FromWorker>) => this.onMessage(e.data);
      worker.onerror = (e) => console.error("[worker]", e.message);
      worker.postMessage(init);
      this.slots.push(slot);
    }
  }

  get size(): number {
    return this.slots.length;
  }

  get inFlight(): number {
    return this.callbacks.size;
  }

  /** (8a) Gửi cho mọi worker (không chờ trả lời). */
  broadcast(msg: Extract<ToWorker, { type: "customs" | "dim" }>): void {
    for (const s of this.slots) s.worker.postMessage(msg);
  }

  /** Gửi việc; job.id được gán tự động. */
  run(job: DistributiveOmit<Exclude<ToWorker, { type: "init" | "customs" | "dim" }>, "id">, cb: Callback, transfer: Transferable[] = []): void {
    const id = this.nextId++;
    let slot = this.slots[0]!;
    for (const s of this.slots) if (s.busy < slot.busy) slot = s;
    slot.busy++;
    this.callbacks.set(id, { cb, slot });
    slot.worker.postMessage({ ...job, id }, transfer);
  }

  private onMessage(msg: FromWorker): void {
    const entry = this.callbacks.get(msg.id);
    if (!entry) return;
    this.callbacks.delete(msg.id);
    entry.slot.busy--;
    if (msg.type === "gen") this.lastGenMs = msg.ms;
    else if (msg.type === "mesh") this.lastMeshMs = msg.ms;
    else console.error("[worker] lỗi:", msg.message);
    entry.cb(msg);
  }

  dispose(): void {
    for (const s of this.slots) s.worker.terminate();
  }
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
