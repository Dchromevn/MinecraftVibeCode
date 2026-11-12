// Màn hình vào game: nhập tên (nhớ lần trước), kết nối server, báo lỗi (trùng tên, tên sai, khác phiên
// bản, không kết nối được). ?name=... thì vào luôn (dùng cho kiểm tra tự động).
import { NET } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { Connection } from "./connection.js";

const KEY = "voxel.name";

function store(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // trình duyệt chặn lưu: bỏ qua
  }
}

function remembered(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function joinGame(params: URLSearchParams): ReturnType<typeof Connection.open> {
  const auto = params.get("name");
  const box = document.createElement("div");
  box.id = "join";
  box.innerHTML = `<div class="panel"><h2>${STR.title}</h2><label>${STR.joinName}</label>
    <input maxlength="${NET.NAME_MAX}" spellcheck="false"><button>${STR.joinButton}</button><div class="err"></div>
    <div class="tip">${STR.joinHint}</div></div>`;
  document.body.appendChild(box);
  const input = box.querySelector("input")!, btn = box.querySelector("button")!, err = box.querySelector<HTMLDivElement>(".err")!;
  input.value = auto ?? remembered();
  return new Promise((resolve) => {
    const go = (): void => {
      const name = input.value.trim();
      if (!/^[A-Za-z0-9_]+$/.test(name)) {
        err.textContent = STR.joinErrors.name ?? "";
        return;
      }
      btn.disabled = true;
      err.textContent = STR.joinConnecting;
      Connection.open(name).then(
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
    btn.addEventListener("click", go);
    input.addEventListener("keydown", (e) => e.key === "Enter" && go());
    if (auto) go();
    else input.focus();
  });
}
