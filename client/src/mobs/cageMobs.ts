// Mô hình quái nhỏ quay trong lồng sinh quái (như Minecraft): cho biết lồng sinh loài nào (dữ liệu phụ của block = chỉ số trong
// SPAWNER_MOBS). Mỗi giây quét các chunk quanh camera tìm lồng; model nhỏ lại cho vừa lồng, nghiêng 30°, quay liên tục.
import * as THREE from "three";
import { B, CHUNK_VOLUME, MOB_DEFS, SPAWNER_MOBS, mobIndex, type World } from "../../../shared/src/index.js";
import { buildMobModel, type MobModel } from "./mobModels.js";

const SCAN_S = 1;
const CHUNK_R = 2; // quét 5 × 5 chunk quanh camera
const FIT = 0.75; // cạnh lớn nhất của model trong lồng (block) — to hơn Minecraft (0.53) để ló rõ ra ngoài lõi đặc giữa texture lồng
const SPIN = 1.6; // rad / giây

interface Caged { model: MobModel; kind: number; x: number; y: number; z: number }

export class CageMobs {
  private readonly cages = new Map<string, Caged>();
  private scanT = 0;
  private spin = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: World,
    private readonly skin: (name: string) => THREE.Texture,
    private readonly light: (x: number, y: number, z: number) => number,
  ) {}

  update(dt: number, cam: THREE.Vector3): void {
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = SCAN_S;
      this.scan(cam);
    }
    this.spin += dt * SPIN;
    for (const c of this.cages.values()) {
      c.model.root.rotation.y = this.spin;
      const L = this.light(c.x + 0.5, c.y + 0.5, c.z + 0.5);
      for (const m of c.model.materials) m.color.setScalar(L);
    }
  }

  /** Tìm lồng trong các chunk quanh camera; thêm model cho lồng mới, gỡ lồng đã mất / ở xa. */
  private scan(cam: THREE.Vector3): void {
    const seen = new Set<string>(), ccx = Math.floor(cam.x) >> 4, ccz = Math.floor(cam.z) >> 4;
    for (let cx = ccx - CHUNK_R; cx <= ccx + CHUNK_R; cx++)
      for (let cz = ccz - CHUNK_R; cz <= ccz + CHUNK_R; cz++) {
        const ch = this.world.getChunk(cx, cz);
        if (!ch) continue;
        for (let i = 0; i < CHUNK_VOLUME; i++) {
          if (ch.data[i] !== B.SPAWNER) continue;
          const x = cx * 16 + (i & 15), y = i >> 8, z = cz * 16 + ((i >> 4) & 15), k = `${x},${y},${z}`;
          const key = SPAWNER_MOBS[ch.meta[i]! & 7] ?? "cave_spider", kind = mobIndex(key);
          seen.add(k);
          const old = this.cages.get(k);
          if (old && old.kind === kind) continue;
          if (old) this.drop(k, old);
          const model = buildMobModel(key, this.skin(key), this.skin), def = MOB_DEFS[kind]!;
          // cho vừa lồng, nghiêng như Minecraft; gốc model ở chân nên hạ xuống để tâm thân ở giữa lồng
          const s = FIT / Math.max(def.width, def.height);
          model.root.scale.setScalar(s);
          model.root.position.set(x + 0.5, y + 0.5 - def.height * s * 0.5, z + 0.5);
          model.body.rotation.x = -Math.PI / 6;
          this.scene.add(model.root);
          this.cages.set(k, { model, kind, x, y, z });
        }
      }
    for (const [k, c] of this.cages) if (!seen.has(k)) this.drop(k, c);
  }

  private drop(k: string, c: Caged): void {
    this.scene.remove(c.model.root);
    c.model.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    for (const m of c.model.materials) m.dispose();
    this.cages.delete(k);
  }
}
