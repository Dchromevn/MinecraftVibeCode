// Giai đoạn 1: thế giới voxel, camera bay, HUD debug. Seed lấy từ ?seed=
import * as THREE from "three";
import {
  allBlockTextureNames,
  generateWorld,
  seedFromString,
  CHUNK_HEIGHT,
  MAP_SIZE,
} from "../../shared/src/index.js";
import { STR } from "./strings.js";
import { buildAtlas } from "./atlas.js";
import { ChunkRenderer } from "./chunkRenderer.js";
import { FlyCamera } from "./flyCamera.js";
import { createFog, createSky } from "./sky.js";
import { Hud, FpsCounter } from "./hud.js";

const VIEW_DISTANCE = 260; // đủ thấy toàn bản đồ 256 block
const MESH_BUDGET_MS = 6; // thời gian dựng mesh mỗi khung
const MESH_BULK_BUDGET_MS = 40;
const CRACK_TEXTURES = ["crack_0", "crack_1", "crack_2", "crack_3", "crack_4"];

async function main(): Promise<void> {
  const hud = new Hud();
  const params = new URLSearchParams(location.search);
  const seedText = params.get("seed") ?? "voxel";
  const seed = seedFromString(seedText);

  hud.setCenter(STR.loadingWorld);
  await new Promise((r) => requestAnimationFrame(r));
  const tGen = performance.now();
  const world = generateWorld(seed);
  const genMs = performance.now() - tGen;

  hud.setCenter(STR.loadingTextures);
  const atlas = await buildAtlas([...allBlockTextureNames(), ...CRACK_TEXTURES]);

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = createFog(VIEW_DISTANCE);
  const sky = createSky(VIEW_DISTANCE * 2);
  scene.add(sky.mesh);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, VIEW_DISTANCE * 3);
  const spawnX = MAP_SIZE / 2 + 0.5;
  const spawnZ = MAP_SIZE / 2 + 0.5;
  camera.position.set(spawnX, world.heightAt(MAP_SIZE / 2, MAP_SIZE / 2) + 12, spawnZ);
  const fly = new FlyCamera(camera, renderer.domElement);
  fly.pitch = -0.35;
  // debug: ?pos=x,y,z&look=yaw,pitch
  const pos = params.get("pos")?.split(",").map(Number);
  if (pos && pos.length === 3 && pos.every(Number.isFinite)) camera.position.set(pos[0]!, pos[1]!, pos[2]!);
  const look = params.get("look")?.split(",").map(Number);
  if (look && look.length === 2 && look.every(Number.isFinite)) {
    fly.yaw = look[0]!;
    fly.pitch = look[1]!;
  }

  const chunks = new ChunkRenderer(scene, world, atlas);
  chunks.markAll();

  // debug: mặt cắt ngang, ẩn mọi block cao hơn cutY để thấy quặng bên trong
  // (?cut=Y, PageUp/PageDown chỉnh, End tắt). Mỗi lần đổi thì dựng lại toàn bộ chunk.
  let cutY: number | null = params.has("cut") ? Number(params.get("cut")) : null;
  if (cutY !== null && !Number.isFinite(cutY)) cutY = null;
  chunks.cutY = cutY;
  document.addEventListener("keydown", (e) => {
    const start = cutY ?? Math.min(CHUNK_HEIGHT - 1, Math.floor(camera.position.y));
    if (e.code === "PageUp") cutY = Math.min(CHUNK_HEIGHT - 1, start + 1);
    else if (e.code === "PageDown") cutY = Math.max(0, start - 1);
    else if (e.code === "End") cutY = null;
    else return;
    e.preventDefault();
    chunks.cutY = cutY;
    chunks.markAll();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const fps = new FpsCounter();
  let prev = performance.now();
  let drawn = 0;
  let firstFrame = true;

  function frame(now: number): void {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;

    // dựng hàng loạt (lúc tải / đổi mặt cắt) thì cho nhiều thời gian hơn
    chunks.update(chunks.pending > 32 ? MESH_BULK_BUDGET_MS : MESH_BUDGET_MS);
    fly.update(dt);
    sky.follow(camera);

    chunks.drawnThisFrame.clear();
    renderer.render(scene, camera);
    drawn = chunks.drawnThisFrame.size;

    if (fps.tick(now) || firstFrame) {
      firstFrame = false;
      const p = camera.position;
      hud.setInfo([
        `${STR.title} — ${STR.stage}`,
        `${STR.hudFps}: ${fps.fps}`,
        `${STR.hudPos}: ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}`,
        `${STR.hudChunks}: ${drawn} / ${world.chunks.length}${chunks.pending ? ` (${STR.hudPending} ${chunks.pending})` : ""}`,
        `${STR.hudTriangles}: ${renderer.info.render.triangles}`,
        `${STR.hudSeed}: ${seedText} (${seed})`,
        `${STR.hudGenTime}: ${genMs.toFixed(0)} ms · ${STR.hudMeshTime}: ${chunks.totalMeshMs.toFixed(0)} ms`,
        cutY === null ? STR.hudCutHint : `${STR.hudCut}: y ≤ ${cutY}`,
        atlas.missing.length ? `${STR.hudMissingTextures}: ${atlas.missing.join(", ")}` : "",
      ]);
      hud.setCenter(fly.locked ? null : STR.clickToControl);
    }
    requestAnimationFrame(frame);
  }
  hud.setCenter(STR.clickToControl);
  requestAnimationFrame(frame);
}

main().catch((err: unknown) => {
  console.error(err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = String(err);
});
