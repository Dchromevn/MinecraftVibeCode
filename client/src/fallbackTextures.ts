// Vẽ texture tạm bằng canvas khi thiếu file. Màu theo tên, nhiễu theo seed từ tên.
import { hashString, mulberry32 } from "../../shared/src/index.js";

type Palette = [base: string, accent: string];

const FLOWERS = new Set(["dandelion", "poppy", "cornflower", "lily_of_the_valley"]);

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
  ore_gold: ["#8a8a8a", "#f2d24a"],
  ore_gold_deep: ["#4a4a50", "#f2d24a"],
  ore_emerald: ["#8a8a8a", "#2fd36a"],
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
  sandstone: ["#d8c88a", "#c9b878"],
  snow: ["#f4f8ff", "#e2ebf5"],
  snow_side: ["#8b5a2b", "#f4f8ff"],
  deepslate: ["#4a4a50", "#38383d"],
  deepslate_top: ["#4a4a50", "#2f2f33"],
  sapling: ["#3f8f2a", "#6b4a2a"],
  rail_curved: ["#6b4a2a", "#9a9a9a"],
  rail_t: ["#6b4a2a", "#9a9a9a"],
  rail_cross: ["#6b4a2a", "#9a9a9a"],
  furnace_front: ["#7d7d7d", "#333333"],
  furnace_side: ["#7d7d7d", "#5f5f5f"],
  furnace_top: ["#7d7d7d", "#5f5f5f"],
  glass: ["#d8f0ff", "#ffffff"],
  ladder: ["#9c7640", "#6b4a2a"],
  door_lower: ["#9c7640", "#6b4a2a"],
  door_upper: ["#9c7640", "#6b4a2a"],
  farmland: ["#5a3a1a", "#4a2e14"],
  wheat_7: ["#d8b84a", "#a88a2a"],
  bed_head_top: ["#c03030", "#f0f0f0"],
  bed_foot_top: ["#c03030", "#a02020"],
  bed_head_side: ["#c03030", "#9c7640"],
  bed_foot_side: ["#c03030", "#9c7640"],
  spruce_log: ["#3d2b1a", "#2c1f12"],
  spruce_log_top: ["#7a5a38", "#3d2b1a"],
  spruce_leaves: ["#2f5f3a", "#244a2d"],
  spruce_planks: ["#7a5a38", "#664a2e"],
  spruce_sapling: ["#2f5f3a", "#3d2b1a"],
  birch_log: ["#e8e4d8", "#3a3a3a"],
  birch_log_top: ["#c8b47a", "#e8e4d8"],
  birch_leaves: ["#6a9a45", "#557d37"],
  birch_planks: ["#d4c48a", "#c0ae74"],
  birch_sapling: ["#6a9a45", "#e8e4d8"],
  acacia_log: ["#6e6862", "#57524d"],
  acacia_log_top: ["#b05a32", "#6e6862"],
  acacia_leaves: ["#5a8a2a", "#4a7322"],
  acacia_planks: ["#b05a32", "#9a4d2a"],
  acacia_sapling: ["#5a8a2a", "#6e6862"],
  dark_oak_log: ["#3c2e1a", "#2e2312"], dark_oak_log_top: ["#4a3420", "#3c2e1a"], dark_oak_leaves: ["#3f6b22", "#33591b"], // 8c
  dark_oak_planks: ["#4a3420", "#3e2b1a"], dark_oak_sapling: ["#3f6b22", "#3c2e1a"],
  dark_oak_door_upper: ["#4a3420", "#3e2b1a"], dark_oak_door_lower: ["#4a3420", "#3e2b1a"],
  soul_sand: ["#51402f", "#3d2f22"], glowstone: ["#f0c060", "#a87a30"], nether_quartz_ore: ["#723232", "#e8e0d8"], // 10a
  nether_gold_ore: ["#723232", "#f0c040"], quartz_block_top: ["#ece6dc", "#dcd4c8"], quartz_block_bottom: ["#ece6dc", "#dcd4c8"],
  quartz_block_side: ["#ece6dc", "#dcd4c8"], nether_portal: ["#6a1fd0", "#3c0a90"],
  soul_soil: ["#4b3a2c", "#3a2c20"], basalt_top: ["#575760", "#3e3e46"], basalt_side: ["#4e4e56", "#3a3a42"], // 10b
  polished_basalt_top: ["#5e5e66", "#4a4a52"], polished_basalt_side: ["#5a5a62", "#46464e"], smooth_basalt: ["#48484e", "#3c3c42"],
  blackstone: ["#2e262c", "#1f1a1e"], blackstone_top: ["#33292f", "#241e22"], polished_blackstone: ["#36303a", "#2a252c"],
  polished_blackstone_bricks: ["#302a32", "#1f1b20"], crimson_nylium: ["#8a1c1c", "#6a1414"], crimson_nylium_side: ["#6e2e2e", "#8a1c1c"],
  warped_nylium: ["#2b7a6a", "#1f5a50"], warped_nylium_side: ["#6e2e2e", "#2b7a6a"], crimson_stem: ["#6a2a3e", "#4a1a2a"],
  crimson_stem_top: ["#7a3a4a", "#5a2a3a"], warped_stem: ["#3a5a5a", "#2a8a7a"], warped_stem_top: ["#3a6a6a", "#2a5050"],
  crimson_planks: ["#6a3048", "#56263a"], warped_planks: ["#2b6a62", "#225650"], nether_wart_block: ["#7a0a0a", "#5a0606"],
  warped_wart_block: ["#167a78", "#0e5a58"], shroomlight: ["#f0a050", "#c87030"], crimson_fungus: ["#00000000", "#a02020"],
  warped_fungus: ["#00000000", "#20a090"], crimson_roots: ["#00000000", "#a02030"], warped_roots: ["#00000000", "#20a090"],
  nether_sprouts: ["#00000000", "#20a090"], weeping_vines: ["#00000000", "#a02020"], weeping_vines_plant: ["#00000000", "#a02020"],
  twisting_vines: ["#00000000", "#20a090"], twisting_vines_plant: ["#00000000", "#20a090"], bone_block_top: ["#e4e0cc", "#c8c4b0"],
  bone_block_side: ["#e4e0cc", "#d2cdb8"], soul_fire: ["#00000000", "#40d0e0"], soul_torch: ["#00000000", "#40d0e0"],
  nether_bricks: ["#2c1418", "#3e1c22"], cracked_nether_bricks: ["#2a1216", "#1a0a0c"], chiseled_nether_bricks: ["#341a1e", "#24100f"], // 10c
  red_nether_bricks: ["#4a0a0c", "#2e0607"], wither_skull_front: ["#00000000", "#2a2a2a"], wither_skull_side: ["#00000000", "#303030"],
  wither_skull_top: ["#00000000", "#303030"], wither_skull_bottom: ["#00000000", "#262626"],
  nether_wart_stage0: ["#00000000", "#a02020"], nether_wart_stage1: ["#00000000", "#a02020"], nether_wart_stage2: ["#00000000", "#c02020"],
  crimson_door_upper: ["#6a3048", "#56263a"], crimson_door_lower: ["#6a3048", "#56263a"], warped_door_upper: ["#2b6a62", "#225650"],
  warped_door_lower: ["#2b6a62", "#225650"],
  dandelion: ["#3f8f2a", "#f2d22a"],
  poppy: ["#3f8f2a", "#d0302a"],
  cornflower: ["#3f8f2a", "#4a6ae0"],
  lily_of_the_valley: ["#3f8f2a", "#f4f4f4"],
  cactus_side: ["#2f8a2a", "#1f6a1f"],
  cactus_top: ["#3a9a32", "#2f8a2a"],
  cactus_bottom: ["#3a9a32", "#2f8a2a"],
  stone_bricks: ["#8a8a8a", "#666666"],
  spruce_door_upper: ["#6a4a2a", "#3d2b1a"], spruce_door_lower: ["#6a4a2a", "#3d2b1a"],
  birch_door_upper: ["#e0d6a8", "#c0ae74"], birch_door_lower: ["#e0d6a8", "#c0ae74"],
  acacia_door_upper: ["#b05a32", "#8a4426"], acacia_door_lower: ["#b05a32", "#8a4426"],
  lantern: ["#3a3a40", "#f2c060"],
  lever: ["#6b4a2a", "#9c7640"],
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

  const [base, accent] = PALETTE[name] ?? (name.endsWith("pane_top") ? PALETTE.glass! : PALETTE.missing!);

  if (FLOWERS.has(name)) {
    // thân xanh + bông hoa nhỏ màu accent
    for (let j = 8; j < 16; j++) dot(7, j, base);
    for (let i = 5; i <= 9; i++) for (let j = 3; j <= 7; j++) if ((i - 7) ** 2 + (j - 5) ** 2 <= 5) dot(i, j, accent);
    return;
  }

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
  } else if (name.endsWith("leaves")) {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (rng() < 0.2) ctx.clearRect(x + i * px, y + j * px, px, px);
  } else if (name === "log_side" || name.endsWith("planks") || /_log$/.test(name)) {
    const vertical = !name.endsWith("planks");
    for (let k = 0; k < 16; k += 4) for (let t = 0; t < 16; t++) (vertical ? dot(k, t, accent) : dot(t, k, accent));
  } else if (name.endsWith("log_top")) {
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
