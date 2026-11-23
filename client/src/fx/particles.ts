// Hạt hiệu ứng (Giai đoạn 6b): hạt chí mạng (bắn ra quanh người bị chí mạng, theo sau mũi tên kéo đủ lực), vệt quét
// kiếm (ảnh động 8 khung). Ảnh từ client.jar (particles/); chưa nhập thì vẽ ô màu. Hình luôn quay về phía camera.
// 7a: lửa trên sinh vật đang cháy, tim khi động vật muốn phối giống. 7b: vụ nổ (ảnh động 16 khung + khói), bình vỡ,
// hạt tím khi dịch chuyển (ngọc hư không, kẻ hư không).
// 8c: hạt phép của pháp sư, hạt vật tổ bất tử, nanh pháp sư (fangs.ts).
import * as THREE from "three";
import { showTotem } from "../ui/totemOverlay.js";
import { FangsFx } from "./fangs.js";

interface Particle {
  sprite: THREE.Sprite;
  vx: number; vy: number; vz: number;
  life: number;
  max: number;
  gravity: number;
  frames: THREE.Texture[] | null; // ảnh động (vệt quét)
}

const MAX = 400;

function loadTex(url: string, fallback: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = fallback;
  ctx.fillRect(0, 0, 2, 2);
  const tex = new THREE.CanvasTexture(c);
  new THREE.TextureLoader().load(url, (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Particles {
  private readonly list: Particle[] = [];
  private readonly crit = loadTex("/particles/crit.png", "#ddd");
  private readonly sweep = Array.from({ length: 8 }, (_, i) => loadTex(`/particles/sweep_${i}.png`, "#eee"));
  private readonly flameTex = loadTex("/particles/flame.png", "#f80");
  private readonly heartTex = loadTex("/particles/heart.png", "#f44");
  private readonly boomTex = Array.from({ length: 16 }, (_, i) => loadTex(`/particles/explosion_${i}.png`, "#ccc"));
  private readonly smokeTex = loadTex("/particles/smoke.png", "#888");
  private readonly spellTex = Array.from({ length: 8 }, (_, i) => loadTex(`/particles/spell_${7 - i}.png`, "#ccc")); // 8c
  readonly fangs: FangsFx;

  constructor(private readonly scene: THREE.Scene) {
    this.fangs = new FangsFx(scene);
  }

  /** (8c) Hạt phép (pháp sư làm phép, vật tổ): ảnh động 8 khung, màu tint, bay lên. */
  spell(x: number, y: number, z: number, tint: number, v: number[] = [0, 0.6, 0]): void {
    const p = this.add(this.spellTex[0]!, x, y, z, 0.2, 0.6 + Math.random() * 0.4, v, -0.3, tint);
    if (p) p.frames = this.spellTex;
  }

  /** (8c) Vật tổ bất tử: hạt xanh lá / vàng bung quanh người. */
  totem(x: number, y: number, z: number): void {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
      this.spell(x + (Math.random() - 0.5) * 0.6, y + 0.4 + Math.random() * 1.4, z + (Math.random() - 0.5) * 0.6,
        Math.random() < 0.5 ? 0x9be33a : 0xf0d040, [Math.cos(a) * s, 1 + Math.random() * 3, Math.sin(a) * s]);
    }
  }

  private add(tex: THREE.Texture, x: number, y: number, z: number, size: number, life: number, v: number[], gravity: number, tint = 0xffffff): Particle | null {
    if (this.list.length >= MAX) return null;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.1, color: tint, depthWrite: false }));
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(size);
    this.scene.add(sprite);
    const p: Particle = { sprite, vx: v[0]!, vy: v[1]!, vz: v[2]!, life, max: life, gravity, frames: null };
    this.list.push(p);
    return p;
  }

  /** Chí mạng: hạt bắn ra quanh thân người ở (x, y, z) (chân). */
  critBurst(x: number, y: number, z: number): void {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 3;
      const tint = new THREE.Color().setHSL(0.1, 0.25, 0.65 + Math.random() * 0.3).getHex(); // trắng ngà như Minecraft
      this.add(this.crit, x + (Math.random() - 0.5) * 0.6, y + 0.4 + Math.random() * 1.2, z + (Math.random() - 0.5) * 0.6, 0.18,
        0.4 + Math.random() * 0.3, [Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s], 6, tint);
    }
  }

  /** Vệt hạt sau mũi tên kéo đủ lực. */
  critTrail(x: number, y: number, z: number): void {
    this.add(this.crit, x, y, z, 0.12, 0.35, [0, 0.3, 0], 0, 0xf0e6d0);
  }

  /** (7a) Ngọn lửa nhỏ bay lên (sinh vật đang cháy). */
  flame(x: number, y: number, z: number): void {
    this.add(this.flameTex, x, y, z, 0.2, 0.5, [0, 0.6, 0], -0.5);
  }

  /** (7a) Trái tim (động vật muốn phối giống). */
  heart(x: number, y: number, z: number): void {
    this.add(this.heartTex, x, y, z, 0.3, 1, [0, 0.4, 0], 0);
  }

  /** (7b) Vụ nổ sức power ở (x, y, z): đám nổ + khói. */
  boom(x: number, y: number, z: number, power: number): void {
    for (let i = 0; i < 6 + power * 3; i++) {
      const r = power * 0.6, p = this.add(this.boomTex[0]!, x + (Math.random() - 0.5) * r * 2, y + (Math.random() - 0.5) * r, z + (Math.random() - 0.5) * r * 2,
        1.5 + Math.random() * power * 0.5, 0.5 + Math.random() * 0.3, [0, 0, 0], 0);
      if (p) p.frames = this.boomTex;
    }
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * power;
      this.add(this.smokeTex, x, y, z, 0.5, 1 + Math.random(), [Math.cos(a) * s, Math.random() * 2, Math.sin(a) * s], -0.5, 0x777777);
    }
  }

  /** (7b) Bình vỡ: hạt màu bắn ra. */
  splash(x: number, y: number, z: number, color: number): void {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
      this.add(this.smokeTex, x, y + 0.2, z, 0.25, 0.8, [Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s], 4, color);
    }
  }

  /** (7b) Hạt tím khi dịch chuyển. */
  portal(x: number, y: number, z: number): void {
    for (let i = 0; i < 20; i++)
      this.add(this.smokeTex, x + (Math.random() - 0.5), y + Math.random() * 2, z + (Math.random() - 0.5), 0.15, 0.8,
        [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2], 0, 0xb050ff);
  }

  /** Gói "fx" từ server: vệt quét kiếm, vụ nổ (n = sức nổ), bình vỡ (n = màu), dịch chuyển, (7c) tim / khói khi thuần sói. */
  fx(kind: "sweep" | "boom" | "splash" | "portal" | "hearts" | "smoke" | "totem" | "snowball", x: number, y: number, z: number, n?: number): void {
    if (kind === "totem") { // (8c) n = 1: chính mình được cứu
      this.totem(x, y, z);
      if (n === 1) showTotem();
    } else if (kind === "hearts") for (let i = 0; i < 7; i++) this.heart(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.8);
    else if (kind === "smoke") this.splash(x, y, z, 0x555555); // (7c) thuần sói chưa được: khói xám
    else if (kind === "snowball") this.splash(x, y, z, 0xf4fbff); // (10c) bóng tuyết vỡ: bụi tuyết trắng
    else if (kind === "boom") this.boom(x, y, z, n ?? 3);
    else if (kind === "splash") this.splash(x, y, z, n ?? 0xffffff);
    else if (kind === "portal") this.portal(x, y, z);
    else this.sweepAt(x, y, z);
  }

  /** Vệt quét kiếm ở (x, y, z). */
  sweepAt(x: number, y: number, z: number): void {
    const p = this.add(this.sweep[0]!, x, y, z, 1.8, 0.3, [0, 0, 0], 0);
    if (p) p.frames = this.sweep;
  }

  update(dt: number): void {
    this.fangs.update(dt);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.list.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      const k = Math.exp(-3 * dt); // cản không khí
      p.vx *= k;
      p.vz *= k;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      const f = 1 - p.life / p.max;
      if (p.frames) p.sprite.material.map = p.frames[Math.min(p.frames.length - 1, Math.floor(f * p.frames.length))]!;
      else p.sprite.material.opacity = Math.min(1, p.life / p.max * 2);
    }
  }
}
