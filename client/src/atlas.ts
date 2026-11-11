// Gộp mọi texture block thành một atlas. Thiếu file thì vẽ tạm bằng canvas.
import * as THREE from "three";
import { drawFallbackTile } from "./fallbackTextures.js";

export interface TileUV {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export class Atlas {
  constructor(
    readonly texture: THREE.CanvasTexture,
    private readonly uvs: Map<string, TileUV>,
    readonly missing: readonly string[],
  ) {}

  uv(name: string): TileUV {
    return this.uvs.get(name) ?? this.uvs.get("missing")!;
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * @param names tên texture (không có .png), tìm trong /textures/
 * @param tileSize kích thước tile, mặc định 16
 */
export async function buildAtlas(names: readonly string[], tileSize = 16): Promise<Atlas> {
  const all = ["missing", ...new Set(names.filter((n) => n !== "" && n !== "missing"))];
  const images = await Promise.all(
    all.map((n) => (n === "missing" ? Promise.resolve(null) : loadImage(`/textures/${n}.png`))),
  );

  const cols = Math.ceil(Math.sqrt(all.length));
  const rows = Math.ceil(all.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const uvs = new Map<string, TileUV>();
  const missing: string[] = [];
  // lùi vào 1/128 texel để nearest sampling không lấy nhầm tile kề
  const epsU = 1 / (128 * canvas.width);
  const epsV = 1 / (128 * canvas.height);

  all.forEach((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * tileSize;
    const y = row * tileSize;
    const img = images[i] ?? null;
    if (img) {
      ctx.drawImage(img, 0, 0, img.width, img.height, x, y, tileSize, tileSize);
    } else {
      drawFallbackTile(ctx, name, x, y, tileSize);
      if (name !== "missing") missing.push(name);
    }
    uvs.set(name, {
      u0: x / canvas.width + epsU,
      u1: (x + tileSize) / canvas.width - epsU,
      v1: 1 - y / canvas.height - epsV,
      v0: 1 - (y + tileSize) / canvas.height + epsV,
    });
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return new Atlas(texture, uvs, missing);
}
