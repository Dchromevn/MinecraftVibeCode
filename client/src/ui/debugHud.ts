// Bảng thông số chữ trắng góc trái (tách khỏi main.ts — Giai đoạn 9a): chỉ hiện khi bật chế độ quản trị (/admin).
import type * as THREE from "three";
import { PLAYER, isSnowyPlains, type TerrainSampler, type World } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { DayNight } from "../game/dayNight.js";
import type { FpsCounter } from "../hud.js";
import type { ClientMobs } from "../mobs/clientMobs.js";
import type { NetClient } from "../net/netClient.js";
import type { PlayerController } from "../player/playerController.js";
import { STR } from "../strings.js";
import { STR_NETHER } from "../stringsNether.js";
import type { WorkerPool } from "../workers/workerPool.js";
import type { ChunkManager } from "../world/chunkManager.js";
import type { ChunkMeshes } from "../world/chunkMeshes.js";
import type { NetDebug } from "./netDebug.js";

export interface DebugHudDeps {
  camera: THREE.Camera; renderer: THREE.WebGLRenderer; fps: FpsCounter; sampler: TerrainSampler; day: DayNight;
  netherBiome: (x: number, z: number) => number; world: World; meshes: ChunkMeshes; chunks: ChunkManager; pool: WorkerPool;
  seed: number; net: NetClient; myName: string; mobs: ClientMobs; player: PlayerController; netDebug: NetDebug; atlas: Atlas;
}

/** Dòng HUD về người chơi: chế độ, trạng thái vật lý, máu. */
function playerLine(p: PlayerController): string {
  if (p.flying) return `${STR.hudMode}: ${STR.modeFlying} (Space ×2)`;
  const s = p.state;
  const flags = [
    s.frozen && STR.stateFrozen, s.onGround && STR.stateGround, s.inWater && STR.stateWater,
    s.inLava && STR.stateLava, s.onLadder && STR.stateLadder, s.inWeb && STR.stateWeb, s.burnS > 0 && STR.stateBurning,
    s.sneaking && STR.stateSneaking,
  ].filter(Boolean);
  return `${STR.hudMode}: ${STR.modeWalking} (Space ×2) · ${flags.join(", ") || STR.stateAir} · ${STR.hudHealth}: ${s.health.toFixed(1)}/${PLAYER.MAX_HEALTH} · ${STR.hudHunger}: ${s.hunger} (${s.saturation.toFixed(1)}) · ${STR.hudAir}: ${s.air.toFixed(1)} s`;
}

function heapMb(): string {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : "–";
}

/** Các dòng của bảng thông số (gọi ~2 lần / giây). nv: đang bật nhìn đêm. */
export function debugLines(d: DebugHudDeps, nv: boolean): string[] {
  const p = d.camera.position;
  const col = d.sampler.column(Math.floor(p.x), Math.floor(p.z));
  const info = d.renderer.info.render;
  return [
    `${STR.title} — ${STR.stage}`,
    `${STR.hudFps}: ${d.fps.fps}`,
    `${STR.hudPos}: ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)} · ${STR.hudChunk}: ${Math.floor(p.x / 16)}, ${Math.floor(p.z / 16)}`,
    d.day.dim === 1 ? `${STR.hudBiome}: ${STR_NETHER.biomes[d.netherBiome(Math.floor(p.x), Math.floor(p.z))]}` : `${STR.hudBiome}: ${isSnowyPlains(col) ? STR.snowyPlains : STR.biomes[col.biome]} (${STR.hudGround} y=${col.height})`,
    `${STR.hudLoaded}: ${d.world.chunks.size} · ${STR.hudMeshed}: ${d.meshes.count} · ${STR.hudSections}: ${d.meshes.drawnSections} · ${STR.hudModified}: ${d.chunks.modifiedCount()}`,
    `${STR.hudJobs}: ${d.chunks.pendingGen} / ${d.chunks.pendingMesh} · ${d.pool.size} ${STR.hudWorkers} (${d.pool.lastGenMs.toFixed(1)} / ${d.pool.lastMeshMs.toFixed(1)} ms)`,
    `${STR.hudViewDistance}: ${d.chunks.viewDistance} chunk ([ ]) · ${STR.hudCulling}: ${d.meshes.culling ? STR.on : STR.off} (F4) · ${STR.hudNightVision}: ${nv ? STR.on : STR.off} (N)`,
    `${STR.hudTriangles}: ${info.triangles} · ${STR.hudDrawCalls}: ${info.calls} · ${STR.hudMemory}: ${heapMb()}`,
    `${STR.hudSeed}: ${d.seed} · ${STR.hudPlayers}: ${d.net.remote.count + 1} (${[d.myName, ...d.net.remote.names()].join(", ")})`,
    `${STR.hudTime}: ${Math.floor(d.day.time % 24000)} · ${STR.hudMobs}: ${d.mobs.count}`,
    playerLine(d.player),
    ...d.netDebug.lines(),
    d.atlas.missing.length ? `${STR.hudMissingTextures}: ${d.atlas.missing.join(", ")}` : "",
  ];
}
