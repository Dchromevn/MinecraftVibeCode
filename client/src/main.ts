// Giai đoạn 1/1b: thế giới voxel có hang động, hầm mỏ, ánh sáng; camera bay, HUD debug.
// Tham số URL: ?seed= ?pos=x,y,z ?look=yaw,pitch ?cut=y ?nocull=1 ?nomsg=1 ?nv=1
import * as THREE from "three";
import { allBlockTextureNames, generateWorld, seedFromString, CHUNK_HEIGHT, MAP_SIZE } from "../../shared/src/index.js";
import { STR } from "./strings.js";
import { buildAtlas } from "./atlas.js";
import { FlyCamera } from "./flyCamera.js";
import { createFog, createSky } from "./sky.js";
import { Hud, FpsCounter } from "./hud.js";
import { LightMap, MAP_CHUNKS, SECTIONS_Y } from "./light/lightMap.js";
import { computeAllLight } from "./light/lighting.js";
import { SectionRenderer } from "./mesh/sectionRenderer.js";

const VIEW_DISTANCE = 260; // đủ thấy toàn bản đồ 256 block
const MESH_BUDGET_MS = 6; // thời gian dựng mesh mỗi khung
const MESH_BULK_BUDGET_MS = 40;
const CRACK_TEXTURES = ["crack_0", "crack_1", "crack_2", "crack_3", "crack_4"];
const TOTAL_SECTIONS = MAP_CHUNKS * MAP_CHUNKS * SECTIONS_Y;
const NIGHT_VISION = 0.45; // độ sáng tối thiểu khi bật nhìn đêm (debug)

function readVec(params: URLSearchParams, name: string, n: number): number[] | null {
  const v = params.get(name)?.split(",").map(Number);
  return v && v.length === n && v.every(Number.isFinite) ? v : null;
}

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

  hud.setCenter(STR.loadingLight);
  await new Promise((r) => requestAnimationFrame(r));
  const tLight = performance.now();
  const light = new LightMap();
  computeAllLight(world, light);
  const lightMs = performance.now() - tLight;

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
  camera.position.set(MAP_SIZE / 2 + 0.5, world.heightAt(MAP_SIZE / 2, MAP_SIZE / 2) + 12, MAP_SIZE / 2 + 0.5);
  const fly = new FlyCamera(camera, renderer.domElement);
  fly.pitch = -0.35;
  const pos = readVec(params, "pos", 3);
  if (pos) camera.position.set(pos[0]!, pos[1]!, pos[2]!);
  const look = readVec(params, "look", 2);
  if (look) {
    fly.yaw = look[0]!;
    fly.pitch = look[1]!;
  }

  const sections = new SectionRenderer(scene, world, light, atlas);
  sections.culling = params.get("nocull") !== "1";
  if (params.get("nv") === "1") sections.minLight.value = NIGHT_VISION;
  sections.markAll();

  // debug: mặt cắt ngang, ẩn mọi block cao hơn cutY (?cut=Y, PageUp/PageDown chỉnh, End tắt)
  let cutY: number | null = params.has("cut") ? Number(params.get("cut")) : null;
  if (cutY !== null && !Number.isFinite(cutY)) cutY = null;
  sections.cutY = cutY;
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyN") {
      sections.minLight.value = sections.minLight.value > 0 ? 0 : NIGHT_VISION;
      return;
    }
    if (e.code === "F4") {
      e.preventDefault();
      sections.culling = !sections.culling;
      return;
    }
    const start = cutY ?? Math.min(CHUNK_HEIGHT - 1, Math.floor(camera.position.y));
    if (e.code === "PageUp") cutY = Math.min(CHUNK_HEIGHT - 1, start + 1);
    else if (e.code === "PageDown") cutY = Math.max(0, start - 1);
    else if (e.code === "End") cutY = null;
    else return;
    e.preventDefault();
    sections.cutY = cutY;
    sections.markAll();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const hideMsg = params.get("nomsg") === "1"; // debug: ẩn dòng hướng dẫn (chụp ảnh)
  const fps = new FpsCounter();
  let prev = performance.now();
  let firstFrame = true;

  function frame(now: number): void {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;

    // dựng hàng loạt (lúc tải / đổi mặt cắt) thì cho nhiều thời gian hơn
    sections.update(sections.pending > 64 ? MESH_BULK_BUDGET_MS : MESH_BUDGET_MS);
    fly.update(dt);
    sky.follow(camera);
    camera.updateMatrixWorld();
    sections.cull(camera);

    sections.drawn.clear();
    renderer.render(scene, camera);

    if (fps.tick(now) || firstFrame) {
      firstFrame = false;
      const p = camera.position;
      const pending = sections.pending ? ` (${STR.hudPending} ${sections.pending})` : "";
      hud.setInfo([
        `${STR.title} — ${STR.stage}`,
        `${STR.hudFps}: ${fps.fps}`,
        `${STR.hudPos}: ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}`,
        `${STR.hudChunks}: ${sections.drawnChunks()} / ${MAP_CHUNKS * MAP_CHUNKS} · ${STR.hudSections}: ${sections.drawn.size} / ${TOTAL_SECTIONS}${pending}`,
        `${STR.hudTriangles}: ${renderer.info.render.triangles} · ${STR.hudDrawCalls}: ${renderer.info.render.calls}`,
        `${STR.hudSeed}: ${seedText} (${seed})`,
        `${STR.hudGenTime}: ${genMs.toFixed(0)} ms · ${STR.hudLightTime}: ${lightMs.toFixed(0)} ms · ${STR.hudMeshTime}: ${sections.totalMeshMs.toFixed(0)} ms`,
        `${STR.hudMineshafts}: ${world.mineshafts.map((m) => `${m.x},${m.z}`).join(" · ")}`,
        `${STR.hudCulling}: ${sections.culling ? STR.on : STR.off} (F4) · ${STR.hudNightVision}: ${sections.minLight.value > 0 ? STR.on : STR.off} (N)`,
        cutY === null ? STR.hudCutHint : `${STR.hudCut}: y ≤ ${cutY}`,
        atlas.missing.length ? `${STR.hudMissingTextures}: ${atlas.missing.join(", ")}` : "",
      ]);
      hud.setCenter(fly.locked || hideMsg ? null : STR.clickToControl);
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
