// Biome Vực Lửa (Giai đoạn 10b): chọn theo 2 noise (nhiệt độ, độ ẩm) — biome có điểm (cộng độ lệch) gần nhất, như Minecraft
// MultiNoiseBiomeSource của Vực Lửa (nên rừng đỏ thẫm không giáp bazan, rừng cong vênh không giáp thung lũng: luôn có hoang mạc
// xen giữa). Biome theo cột (x, z); client dùng để đổi màu sương và hiện tên biome.
import { NB, NETHER_BIOMES, type NetherBiome } from "../netherBiomeConstants.js";
import { NETHER } from "../netherConstants.js";
import { SimplexNoise2D } from "../noise.js";
import { hashInts, mulberry32 } from "../rng.js";

/** Seed của Vực Lửa suy ra từ seed thế giới. */
export const netherSeed = (worldSeed: number): number => hashInts(worldSeed, NETHER.SEED_SALT);

export class NetherBiomes {
  private readonly temp: SimplexNoise2D;
  private readonly humid: SimplexNoise2D;

  /** seed: seed Vực Lửa (netherSeed). */
  constructor(seed: number) {
    this.temp = new SimplexNoise2D(mulberry32(hashInts(seed, NETHER_BIOMES.SEED_SALT, 1)));
    this.humid = new SimplexNoise2D(mulberry32(hashInts(seed, NETHER_BIOMES.SEED_SALT, 2)));
  }

  /** Biome ở cột (x, z). */
  at(x: number, z: number): NetherBiome {
    const B = NETHER_BIOMES, f = B.FREQ;
    const t = this.temp.fbm(x * f, z * f, B.OCTAVES) * B.SCALE, h = this.humid.fbm(x * f + 311, z * f - 173, B.OCTAVES) * B.SCALE;
    let best: NetherBiome = NB.WASTES, bd = Infinity;
    B.POINTS.forEach(([pt, ph, off], i) => {
      const d = (t - pt) ** 2 + (h - ph) ** 2 + off * off;
      if (d < bd) {
        bd = d;
        best = i as NetherBiome;
      }
    });
    return best;
  }
}
