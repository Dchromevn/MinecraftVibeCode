// Nanh pháp sư (Giai đoạn 8c): model EvokerFangs đọc từ client.jar (mobModelsGen.ts), ảnh evoker_fangs. Như Minecraft: chờ `delay`
// tick, trồi lên khỏi đất với hai hàm há rộng, cắn khép lại (lúc server gây sát thương: delay + 8 tick), rồi lặn xuống — sống 1.1 giây.
import * as THREE from "three";
import { buildMobModel, type MobModel } from "../mobs/mobModels.js";

interface Fang { model: MobModel; delayS: number; t: number; y: number }
const LIFE_S = 1.1;
const OPEN = 0.35 * Math.PI;

function texture(name: string): THREE.Texture {
  const t = new THREE.TextureLoader().load(`/entities/mobs/${name}.png`);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FangsFx {
  private readonly list: Fang[] = [];
  private tex: THREE.Texture | null = null;

  constructor(private readonly scene: THREE.Scene) {}

  add(x: number, y: number, z: number, yaw: number, delay: number): void {
    this.tex ??= texture("evoker_fangs");
    const model = buildMobModel("evoker_fangs", this.tex, () => this.tex!);
    model.root.position.set(x, y, z);
    model.root.rotation.y = Math.PI / 2 - yaw; // yaw: góc atan2(dz, dx) như Minecraft
    model.root.scale.setScalar(0.5 * 1.6);
    model.root.visible = false;
    this.scene.add(model.root);
    this.list.push({ model, delayS: delay / 20, t: 0, y });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]!;
      f.t += dt;
      const t = f.t - f.delayS;
      if (t < 0) continue;
      if (t > LIFE_S) {
        this.scene.remove(f.model.root);
        for (const m of f.model.materials) m.dispose();
        this.list.splice(i, 1);
        continue;
      }
      f.model.root.visible = true;
      // độ há: mở rộng lúc trồi lên, khép lại ở 0.4 giây (cắn); thân trồi lên rồi lặn xuống cuối đời
      const open = t < 0.4 ? 1 - (t / 0.4) ** 3 : 0;
      const rise = Math.min(1, t / 0.15) * (t > LIFE_S - 0.35 ? Math.max(0, (LIFE_S - t) / 0.35) : 1);
      f.model.root.position.y = f.y + (rise - 1) * 0.9;
      const up = f.model.parts.get("upper_jaw"), lo = f.model.parts.get("lower_jaw");
      // dáng gốc (mobModelsGen) là lúc há rộng nhất; khép dần về π như Minecraft EvokerFangsModel
      if (up) up.rotation.z = (up.userData.rest as THREE.Euler).z + (1 - open) * OPEN;
      if (lo) lo.rotation.z = (lo.userData.rest as THREE.Euler).z - (1 - open) * OPEN;
    }
  }
}
