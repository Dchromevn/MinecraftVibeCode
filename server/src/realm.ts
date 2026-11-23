// Một cõi trên server (Giai đoạn 10a): thế giới chính hoặc Vực Lửa chạy song song — mỗi cõi có thế giới, rương / lò, vật phẩm rơi,
// random tick + chất lỏng, di chuyển, đánh nhau, cung tên, vụ nổ, sinh vật và nơi lưu riêng. Chỉ thấy người chơi đang ở cõi đó.
// Phần dùng chung (tài khoản, người chơi, chat, ngày đêm + giường, nhà tự lưu) nằm ở Game.
import {
  B, BastionLocator, BlockEntities, DIM, NetherBiomes, DUNGEON_LOOT, FortressLocator, NET, netherSeed, STRUCTURE_LOOT, TerrainSampler, WITCH_HUT_LOOT, chunkKey, createItemEntity, dungeonChestAt, hutsIn,
  inSafeZone, structureLootAt, type MobKey, type Rng,
} from "../../shared/src/index.js";
import { Actions } from "./actions.js";
import { useSpecialBlock } from "./anchors.js";
import { Archery } from "./archery.js";
import type { ServerConfig } from "./config.js";
import { Combat } from "./combat.js";
import { Containers } from "./containers.js";
import { Explosions } from "./explosions.js";
import { isFencePost } from "./mobs/leashes.js";
import { MobSystem } from "./mobs/mobSystem.js";
import { Movement } from "./movement.js";
import type { ServerPlayer } from "./player.js";
import { ServerItems } from "./serverItems.js";
import { ServerTicker } from "./ticker.js";
import { ServerWorld } from "./serverWorld.js";
import type { WorldStorage } from "./storage.js";
import { sendTick } from "./sync.js";

export interface RealmHost {
  readonly cfg: ServerConfig;
  online(): ServerPlayer[];
  time(): number;
  respawnPos(p: ServerPlayer): { x: number; y: number; z: number };
  died(p: ServerPlayer): void;
  bed(p: ServerPlayer, x: number, y: number, z: number, cell: number): void;
}

export class Realm {
  readonly w: ServerWorld;
  readonly entities: BlockEntities;
  readonly items: ServerItems;
  readonly ticker: ServerTicker;
  readonly containers: Containers;
  readonly actions: Actions;
  readonly movement: Movement;
  readonly combat: Combat;
  readonly archery: Archery;
  readonly explosions: Explosions;
  readonly life: MobSystem;

  constructor(
    host: RealmHost, readonly dim: number, readonly seed: number, readonly storage: WorldStorage, rng: Rng,
    readonly safe: { x: number; z: number; r: number },
  ) {
    const players = (): ServerPlayer[] => this.players(host);
    this.w = new ServerWorld(seed, dim);
    this.entities = new BlockEntities(seed);
    if (dim === DIM.OVERWORLD) {
      const terrain = new TerrainSampler(seed); // (7b) rương nhà phù thủy / hầm quái, (7e) công trình
      this.entities.lootAt = (x, y, z) => STRUCTURE_LOOT[structureLootAt(terrain, x, y, z) ?? ""] ??
        (hutsIn(terrain, x, z, x, z).length ? WITCH_HUT_LOOT : dungeonChestAt(terrain, x, y, z) ? DUNGEON_LOOT : null);
    } else if (dim === DIM.NETHER) { // (10c) rương pháo đài Vực Lửa
      const ns = netherSeed(seed), forts = new FortressLocator(ns), biomes = new NetherBiomes(ns), bastions = new BastionLocator(ns, (x, z) => biomes.at(x, z));
      this.entities.lootAt = (x, y, z) => (forts.chestAt(x, y, z) ? STRUCTURE_LOOT.nether_bridge ?? null : STRUCTURE_LOOT[bastions.chestAt(x, y, z) ?? ""] ?? null); // (10d2) tàn tích
    }
    this.items = new ServerItems(this.w, rng);
    this.ticker = new ServerTicker(this.w, this.entities, this.items, rng, (x, y, z, cell) => {
      for (const p of players()) if (p.subs.has(chunkKey(x >> 4, z >> 4))) p.send({ t: "fall", x, y, z, cell });
    });
    this.containers = new Containers(this.w, this.entities);
    this.actions = new Actions(this.w, this.ticker, this.entities, this.containers, this.items);
    this.actions.dim = dim;
    this.movement = new Movement(this.w, this.ticker, this.actions, (p) => host.respawnPos(p), (p) => host.died(p), dim);
    const cfg = host.cfg;
    this.combat = new Combat(this.w, players, safe, cfg.pvp ?? true, (p) => host.died(p));
    this.archery = new Archery(this.w, players, this.combat, rng);
    this.explosions = new Explosions({
      w: this.w, ticker: this.ticker, entities: this.entities, containers: this.containers, items: this.items, combat: this.combat,
      mobs: () => this.life.mobs, online: players, safe, rng,
    });
    this.explosions.mobGriefing = cfg.mobGriefing ?? true;
    this.life = new MobSystem({
      w: this.w, items: this.items, combat: this.combat, archery: this.archery, explosions: this.explosions, rng, seed, safe,
      online: players, time: () => host.time(), containers: this.containers, dim,
    });
    this.actions.onBed = (p, x, y, z, cell) => host.bed(p, x, y, z, cell);
    this.actions.onThrow = (p) => void (this.life.riding.boost(p) || this.archery.throwHeld(p)); // (10b) cần câu nấm: kẻ lội tăng tốc
    this.movement.onSwing = (p) => this.archery.deflect(p);
    this.actions.onBroken = (p, id, x, y, z) => {
      if (id === B.INFESTED_STONE) this.life.infestedBroken(x, y, z);
      this.life.piglinAlarm(p, x, y, z, id); // (10d1) đào khối vàng gần người lợn
    };
    this.actions.onSpecial = (p, x, y, z, cell) => useSpecialBlock(p, x, y, z, cell, dim, this.w, this.explosions, (s) => this.items.throwFrom(s, p)); // (10d2) mỏ neo, đá nam châm
    this.actions.onOpen = (p, id, x, y, z) => this.life.piglinAlarm(p, x, y, z, id); // (10d1) mở rương gần người lợn
    this.actions.onTnt = (p, x, y, z) => this.explosions.prime(x, y, z, undefined, p.name);
    this.ticker.onPlate = (x, y, z) => this.explosions.trap(x, y, z); // (7e) chưa có mạch đá đỏ: tấm áp lực châm TNT ngay dưới
    this.combat.onPvp = (a, v) => (this.life.mobs.rally(v, a), this.life.mobs.rally(a, v));
    this.actions.onFence = (p, x, y, z, id) => isFencePost(id) && this.life.leashes.useFence(p, x, y, z); // (7d)
    this.actions.onFish = (key, x, y, z) => void (this.life.mobs.spawn(key as MobKey, x, y, z).persistent = true);
    this.actions.canEdit = (p, x, z) => { // vùng an toàn: người thường không sửa block quanh điểm hồi sinh
      if (p.admin || !inSafeZone(x + 0.5, z + 0.5, safe)) return true;
      if (performance.now() - p.noticeAt > 3000) {
        p.noticeAt = performance.now();
        p.send({ t: "chat", kind: "error", key: "safeZone", args: [] });
      }
      return false;
    };
  }

  players(host: { online(): ServerPlayer[] }): ServerPlayer[] {
    return host.online().filter((p) => p.dim === this.dim);
  }

  /** Nạp chunk, rương / lò, vật phẩm, sinh vật đã lưu. true = có chunk vừa chuyển sang bộ sinh mới (lưu ngay). */
  load(): boolean {
    const converted = this.w.loadSaved(this.storage.loadAllChunks());
    const ents = this.storage.loadEntities();
    this.entities.load(ents.blocks);
    this.life.load(ents);
    for (const it of ents.items) {
      const e = createItemEntity(it.stack, it.x, it.y, it.z, 0, 0, 0, 0);
      e.age = it.age;
      this.items.list.push(e);
    }
    return converted > 0;
  }

  /** Lưu chunk đã sửa (nền: không chặn luồng chính) + rương / vật phẩm / sinh vật. Trả về số chunk đã lưu. */
  save(background: boolean): number {
    const chunks = this.w.takeSaves();
    if (background) void this.storage.saveChunksAsync(chunks);
    else this.storage.saveChunks(chunks);
    const items = this.items.list.map((e) => ({ stack: e.stack, x: e.x, y: e.y, z: e.z, age: e.age }));
    this.storage.saveEntities({ blocks: this.entities.all(), items, ...this.life.save() });
    return chunks.length;
  }

  /** Một tick của cõi (cõi không có người chơi: chunk gỡ hết, gần như không tốn gì). */
  tick(host: { online(): ServerPlayer[] }, tickNo: number, beforeLife: () => void): void {
    const all = this.players(host);
    const centers = all.map((p) => ({ cx: Math.floor(p.x / 16), cz: Math.floor(p.z / 16) }));
    this.w.updateLoaded(centers);
    this.w.updateLight();
    this.ticker.tick(centers);
    this.items.step(1 / NET.SERVER_TICK_RATE, all);
    this.ticker.stepPlates(all.filter((p) => !p.dead), this.items.list); // tấm áp lực (4f)
    this.containers.tick(tickNo);
    this.combat.record(all); // vị trí 1 giây gần nhất cho bù trễ khi đánh
    this.archery.tick();
    this.explosions.tick();
    beforeLife();
    this.life.tick();
    sendTick(all, this.w.takeChanges(), this.movement, this.items, (p) => {
      this.archery.sync(p);
      this.life.mobs.sync(p);
    });
  }
}
