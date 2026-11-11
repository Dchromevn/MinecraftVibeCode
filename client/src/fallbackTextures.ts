// Vẽ texture tạm bằng canvas khi thiếu file. Màu theo tên, nhiễu theo seed từ tên.
import { hashString, mulberry32 } from "../../shared/src/index.js";

type Palette = [base: string, accent: string];

const PALETTE: Record<string, Palette> = {
  grass_top: ["#5fa83a", "#4d8f2f"],
  grass_side: ["#8b5a2b", "#5fa83a"],
  dirt: ["#8b5a2b", "#7a4e24"],
  stone: ["#8a8a8a", "#777777"],
  cobble: ["#7d7d7d", "#5f5f5f"],
  bedrock: ["#444444", "#222222"],
  sand: ["#dcd08f", "#cfc27f"],
  log_side: ["#6b4a2a", "#55391f"],
  log_top: ["#a07a4a", "#6b4a2a"],
  leaves: ["#3f8f2a", "#2f7020"],
  planks: ["#b58b4c", "#9c7640"],
  ore_coal: ["#8a8a8a", "#222222"],
  ore_iron: ["#8a8a8a", "#d8a37a"],
  ore_diamond: ["#8a8a8a", "#5ce8e0"],
  workbench_top: ["#b58b4c", "#6b4a2a"],
  workbench_side: ["#b58b4c", "#8c6a3a"],
  workbench_front: ["#b58b4c", "#444444"],
  chest_top: ["#a8743a", "#6b4a2a"],
  chest_side: ["#a8743a", "#6b4a2a"],
  chest_front: ["#a8743a", "#333333"],
  tallgrass: ["#5fa83a", "#4d8f2f"],
  gravel: ["#857f7a", "#5f5955"],
  mossy_cobble: ["#7d7d7d", "#4f7a3a"],
  water: ["#2f5fd0", "#3a6ee0"],
  lava: ["#e05a10", "#f8b020"],
  fence: ["#b58b4c", "#9c7640"],
  rail: ["#6b4a2a", "#9a9a9a"],
  cobweb: ["#dddddd", "#ffffff"],
  torch: ["#6b4a2a", "#ffd040"],
  missing: ["#ff00ff", "#000000"],
};

export function drawFallbackTile(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
): void {
  const rng = mulberry32(hashString(name));
  const px = size / 16;
  const dot = (i: number, j: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x + i * px, y + j * px, px, px);
  };

  ctx.clearRect(x, y, size, size);

  if (name === "missing") {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) dot(i, j, (i >> 3) + (j >> 3) === 1 ? "#000" : "#f0f");
    return;
  }

  if (name.startsWith("crack_")) {
    const level = Number(name.slice(6)) || 0;
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    for (let k = 0; k < (level + 1) * 4; k++) {
      let i = Math.floor(rng() * 16);
      let j = Math.floor(rng() * 16);
      for (let s = 0; s < 4; s++) {
        dot(i, j, "rgba(0,0,0,0.85)");
        i = Math.max(0, Math.min(15, i + (rng() < 0.5 ? -1 : 1)));
        j = Math.max(0, Math.min(15, j + (rng() < 0.5 ? -1 : 1)));
      }
    }
    return;
  }

  const [base, accent] = PALETTE[name] ?? PALETTE.missing!;

  if (name === "tallgrass") {
    for (let k = 0; k < 6; k++) {
      const i0 = 2 + Math.floor(rng() * 12);
      for (let j = 15; j >= 4 + Math.floor(rng() * 6); j--) dot(i0 + ((15 - j) >> 2) * (rng() < 0.5 ? 1 : -1), j, rng() < 0.5 ? base : accent);
    }
    return;
  }

  // nền + nhiễu
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) dot(i, j, rng() < 0.3 ? accent : base);
  }

  if (name === "grass_side") {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 3 + (i % 3 === 0 ? 1 : 0); j++) dot(i, j, accent);
  } else if (name === "leaves") {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (rng() < 0.2) ctx.clearRect(x + i * px, y + j * px, px, px);
  } else if (name === "log_side" || name === "planks") {
    const vertical = name === "log_side";
    for (let k = 0; k < 16; k += 4) for (let t = 0; t < 16; t++) (vertical ? dot(k, t, accent) : dot(t, k, accent));
  } else if (name === "log_top") {
    for (let r = 2; r < 8; r += 2) for (let a = 0; a < 32; a++) {
      dot(Math.round(8 + r * Math.cos(a / 5)), Math.round(8 + r * Math.sin(a / 5)), accent);
    }
  } else if (name.startsWith("ore_")) {
    for (let k = 0; k < 7; k++) {
      const i = 1 + Math.floor(rng() * 13);
      const j = 1 + Math.floor(rng() * 13);
      dot(i, j, accent); dot(i + 1, j, accent); dot(i, j + 1, accent);
    }
  } else if (name.endsWith("_front")) {
    for (let i = 4; i < 12; i++) for (let j = 5; j < 11; j++) dot(i, j, accent);
  }
}
