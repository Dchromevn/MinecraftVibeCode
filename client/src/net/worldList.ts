// App desktop: danh sách thế giới ("Chơi một mình") / server của bạn ("Tạo server") — hai danh sách riêng. Chọn rồi chơi
// (bấm đúp để chơi nhanh), tạo mới (tên + seed tùy chọn, tạo xong vào luôn), xóa (thư mục vào Thùng rác). Danh sách trống thì
// mở thẳng màn hình tạo mới.
import { NET } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { STR_MENU as M } from "../stringsMenu.js";
import type { DesktopApi, WorldInfo, WorldKind } from "./desktop.js";
import { rememberedName, storeName } from "./joinScreen.js";

export type Render = (html: string, acts: Record<string, () => void>) => void;

export interface WorldListOpts {
  api: DesktopApi;
  kind: WorldKind;
  box: HTMLElement;
  render: Render;
  /** Đã chọn / vừa tạo thế giới w, tên người chơi hợp lệ. */
  onPlay: (w: WorldInfo, name: string) => void;
  onBack: () => void;
}

const fmt = (s: string, ...a: (string | number)[]): string => s.replace(/\{(\d)\}/g, (_, i: string) => String(a[Number(i)] ?? ""));
const when = (t: number): string => (t ? fmt(M.lastPlayed, new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })) : M.neverPlayed);
const nameField = `<label>${STR.joinName}</label><input class="pname" maxlength="${NET.NAME_MAX}" spellcheck="false">`;

/** Tên người chơi trong ô .pname: hợp lệ thì nhớ lại và trả về, không thì báo lỗi ở .msg. */
function playerName(box: HTMLElement): string | null {
  const name = box.querySelector<HTMLInputElement>(".pname")!.value.trim();
  if (/^[A-Za-z0-9_]+$/.test(name)) {
    storeName(name);
    return name;
  }
  box.querySelector(".msg")!.textContent = STR.joinErrors.name ?? "";
  return null;
}

export async function showWorldList(o: WorldListOpts): Promise<void> {
  const list = (await o.api.worlds(o.kind)) ?? [];
  if (!list.length) return showCreate(o, 0, o.onBack);
  const solo = o.kind === "solo";
  let sel = list[0]!.id;
  o.render(`<h2>${solo ? M.worldsTitle : M.serversTitle}</h2><div class="list"></div>${nameField}
    <div class="row"><button data-a="play">${solo ? M.playWorld : M.openServer}</button><button data-a="create">${solo ? M.createWorld : M.createServer}</button></div>
    <div class="row"><button data-a="delete">${M.deleteWorld}</button><button data-a="back">${M.back}</button></div><div class="err msg"></div>`, {
    play: () => go(),
    create: () => void showCreate(o, list.length, () => void showWorldList(o)),
    delete: () => {
      const w = list.find((e) => e.id === sel);
      if (!w || !confirm(fmt(M.confirmDeleteWorld, w.name))) return;
      void o.api.deleteWorld(w.id).then(() => showWorldList(o)); // đang chạy thế giới này: app tải lại trang về danh sách
    },
    back: o.onBack,
  });
  const box = o.box, rows = box.querySelector(".list")!;
  const go = (): void => {
    const w = list.find((e) => e.id === sel), name = playerName(box);
    if (!w) return void (box.querySelector(".msg")!.textContent = M.pickWorld);
    if (name) o.onPlay(w, name);
  };
  const draw = (): void => rows.replaceChildren(...list.map((w) => {
    const row = document.createElement("div");
    row.className = "srv" + (w.id === sel ? " sel" : "");
    const [n, u] = ["b", "span"].map((t) => document.createElement(t));
    n!.textContent = w.name;
    u!.textContent = [when(w.lastPlayed), w.seed ? fmt(M.seedShow, w.seed) : ""].filter(Boolean).join(" · ");
    row.append(n!, u!);
    row.addEventListener("click", () => ((sel = w.id), draw()));
    row.addEventListener("dblclick", go);
    return row;
  }));
  draw();
  const input = box.querySelector<HTMLInputElement>(".pname")!;
  input.value = rememberedName();
  input.addEventListener("keydown", (e) => e.key === "Enter" && go());
}

/** Tạo thế giới / server mới: tên (mặc định "Thế giới N"), seed tùy chọn; tạo xong chơi luôn. */
function showCreate(o: WorldListOpts, count: number, onCancel: () => void): void {
  const solo = o.kind === "solo";
  o.render(`<h2>${solo ? M.createWorld : M.createServer}</h2><label>${solo ? M.worldName : M.serverWorldName}</label>
    <input class="wname" maxlength="32" spellcheck="false"><label>${M.seedLabel}</label><input class="wseed" maxlength="32" spellcheck="false">
    ${nameField}<div class="row"><button data-a="make">${M.create}</button><button data-a="cancel">${M.cancel}</button></div>
    <div class="err msg"></div>`, {
    make: () => void make(),
    cancel: onCancel,
  });
  const box = o.box, wname = box.querySelector<HTMLInputElement>(".wname")!;
  wname.value = fmt(solo ? M.newWorldName : M.newServerName, count + 1);
  box.querySelector<HTMLInputElement>(".pname")!.value = rememberedName();
  wname.select();
  wname.focus();
  let busy = false;
  const make = async (): Promise<void> => {
    const name = playerName(box);
    if (!name || busy) return;
    busy = true;
    const w = await o.api.createWorld(o.kind, wname.value, box.querySelector<HTMLInputElement>(".wseed")!.value);
    busy = false;
    if (w) o.onPlay(w, name);
  };
  box.querySelectorAll("input").forEach((i) => i.addEventListener("keydown", (e) => e.key === "Enter" && void make()));
}
