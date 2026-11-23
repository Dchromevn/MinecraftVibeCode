// Menu chính (Giai đoạn 9a; thay màn hình vào game của 5b): danh sách server kiểu Minecraft — "Server này" (địa chỉ trang) + server
// tự thêm (tên + link, thêm / sửa / xóa, lưu localStorage), trạng thái từng server (đang chạy + số người / không kết nối được / khác
// phiên bản); chọn server, nhập tên (nhớ lần trước) + mật khẩu (lần đầu dùng tên thì tạo tài khoản trên server đó) rồi vào.
// ?name=...&pass=... thì vào luôn "Server này" (kiểm tra tự động; thiếu pass thì dùng "test"); ?server=<link> chọn server khác.
import { NET, SAVE } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { STR_MENU as M } from "../stringsMenu.js";
import { Connection } from "./connection.js";
import { fetchStatus, loadSelected, loadServers, mixedBlocked, normalizeUrl, saveSelected, saveServers, wsUrl, type ServerEntry, type ServerStatus } from "./serverList.js";

const NAME_KEY = "voxel.name";

function store(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // trình duyệt chặn lưu: bỏ qua
  }
}

function remembered(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

const fmt = (s: string, ...a: (string | number)[]): string => s.replace(/\{(\d)\}/g, (_, i: string) => String(a[Number(i)] ?? ""));

function statusText(s: ServerStatus | undefined): string {
  if (!s) return M.statusChecking;
  if (s.state === "ok") return fmt(M.statusOk, s.players);
  return s.state === "version" ? M.statusVersion : s.state === "mixed" ? M.statusMixed : M.statusDown;
}

export function joinGame(params: URLSearchParams): ReturnType<typeof Connection.open> {
  const auto = params.get("name");
  const box = document.createElement("div");
  box.id = "join";
  box.innerHTML = `<div class="panel menu"><h2>${STR.title}</h2><div class="sub">${M.servers}</div><div class="list"></div>
    <div class="row"><button data-a="add">${M.add}</button><button data-a="edit">${M.edit}</button><button data-a="remove">${M.remove}</button>
    <button data-a="refresh">${M.refresh}</button></div>
    <div class="editor" hidden><label>${M.serverName}</label><input class="sname" maxlength="32"><label>${M.serverUrl}</label>
    <input class="surl" maxlength="200" spellcheck="false"><div class="row"><button data-a="save">${M.save}</button>
    <button data-a="cancel">${M.cancel}</button></div></div>
    <label>${STR.joinName}</label><input class="pname" maxlength="${NET.NAME_MAX}" spellcheck="false"><label>${STR.joinPassword}</label>
    <input class="ppass" type="password" maxlength="${SAVE.PASSWORD_MAX}"><button class="go">${M.join}</button><div class="err"></div>
    <div class="tip">${STR.joinHint}<br>${M.menuTip}</div></div>`;
  document.body.appendChild(box);
  const q = <T extends HTMLElement>(s: string): T => box.querySelector<T>(s)!;
  const list = q<HTMLDivElement>(".list"), editor = q<HTMLDivElement>(".editor"), err = q<HTMLDivElement>(".err");
  const sname = q<HTMLInputElement>(".sname"), surl = q<HTMLInputElement>(".surl");
  const input = q<HTMLInputElement>(".pname"), pass = q<HTMLInputElement>(".ppass"), btn = q<HTMLButtonElement>(".go");

  let servers = loadServers();
  const all = (): ServerEntry[] => [{ name: M.thisServer, url: "" }, ...servers];
  const fromParam = normalizeUrl(params.get("server") ?? "");
  let selected = fromParam ?? (auto ? "" : loadSelected()); // ?name= (kiểm tra tự động): vào "Server này" trừ khi có ?server=
  if (!all().some((e) => e.url === selected)) selected = "";
  const status = new Map<string, ServerStatus>();
  let editing: number | null = null; // chỉ số trong servers; -1 = đang thêm mới

  const render = (): void => {
    list.replaceChildren(...all().map((e) => {
      const row = document.createElement("div");
      row.className = "srv" + (e.url === selected ? " sel" : "");
      const s = status.get(e.url);
      const [n, u, st] = ["b", "span", "i"].map((t) => document.createElement(t));
      n!.textContent = e.name;
      u!.textContent = e.url || M.thisServerUrl;
      st!.textContent = statusText(s);
      st!.className = s?.state === "ok" ? "ok" : s ? "bad" : "";
      row.append(n!, u!, st!);
      row.addEventListener("click", () => {
        selected = e.url;
        saveSelected(selected);
        err.textContent = "";
        render();
      });
      row.addEventListener("dblclick", () => go());
      return row;
    }));
    const custom = selected !== "";
    q<HTMLButtonElement>("[data-a=edit]").disabled = q<HTMLButtonElement>("[data-a=remove]").disabled = !custom;
  };
  const refresh = (): void => {
    status.clear();
    render();
    for (const e of all()) void fetchStatus(e.url).then((s) => {
      status.set(e.url, s);
      render();
    });
  };
  const openEditor = (i: number): void => {
    editing = i;
    const e = servers[i];
    sname.value = e?.name ?? "";
    surl.value = e?.url ?? "";
    editor.hidden = false;
    err.textContent = "";
    sname.focus();
  };
  const saveEditor = (): void => {
    const name = sname.value.trim(), url = normalizeUrl(surl.value);
    if (!name) return void (err.textContent = M.errName);
    if (!url) return void (err.textContent = M.errUrl);
    if (editing === -1) {
      if (servers.length >= NET.SERVERS_MAX) return void (err.textContent = fmt(M.errFull, NET.SERVERS_MAX));
      servers = [...servers, { name, url }];
    } else if (editing !== null) servers = servers.map((e, i) => (i === editing ? { name, url } : e));
    saveServers(servers);
    selected = url;
    saveSelected(selected);
    editor.hidden = true;
    editing = null;
    err.textContent = "";
    refresh();
  };
  const actions: Record<string, () => void> = {
    add: () => openEditor(-1),
    edit: () => openEditor(servers.findIndex((e) => e.url === selected)),
    remove: () => {
      const i = servers.findIndex((e) => e.url === selected);
      if (i < 0 || !confirm(fmt(M.confirmRemove, servers[i]!.name))) return;
      servers = servers.filter((_, j) => j !== i);
      saveServers(servers);
      selected = "";
      saveSelected(selected);
      render();
    },
    refresh,
    save: saveEditor,
    cancel: () => {
      editor.hidden = true;
      editing = null;
      err.textContent = "";
    },
  };
  box.querySelectorAll<HTMLButtonElement>("[data-a]").forEach((b) => b.addEventListener("click", () => actions[b.dataset.a!]?.()));
  for (const el of [sname, surl]) el.addEventListener("keydown", (e) => e.key === "Enter" && saveEditor());

  input.value = auto ?? remembered();
  if (auto) pass.value = params.get("pass") ?? "test";
  let go: () => void = () => undefined;
  const result: ReturnType<typeof Connection.open> = new Promise((resolve) => {
    go = (): void => {
      if (btn.disabled) return;
      const name = input.value.trim();
      if (!/^[A-Za-z0-9_]+$/.test(name)) return void (err.textContent = STR.joinErrors.name ?? "");
      if (pass.value.length < SAVE.PASSWORD_MIN) return void (err.textContent = STR.joinErrors.pwshort ?? "");
      if (mixedBlocked(selected)) return void (err.textContent = M.statusMixed);
      btn.disabled = true;
      err.textContent = STR.joinConnecting;
      Connection.open(wsUrl(selected), name, pass.value).then(
        (r) => {
          store(name);
          box.remove();
          resolve(r);
        },
        (e: unknown) => {
          btn.disabled = false;
          const code = e instanceof Error ? e.message : "connect";
          err.textContent = STR.joinErrors[code] ?? STR.joinErrors.connect ?? "";
        },
      );
    };
  });
  btn.addEventListener("click", () => go());
  for (const el of [input, pass]) el.addEventListener("keydown", (e) => e.key === "Enter" && go());
  refresh();
  if (auto) go();
  else (input.value ? pass : input).focus();
  return result;
}
