// Khung chat (Giai đoạn 6a): góc dưới-trái trên hotbar. T mở ô nhập (thả chuột), "/" mở sẵn dấu "/" để gõ lệnh,
// Enter gửi, Esc đóng. Tin mới hiện CHAT.SHOW_S giây rồi mờ đi; mở chat thì thấy lại các tin gần đây.
// (9a) Mở chat thì cuộn lên xem lịch sử (lăn chuột / PageUp / PageDown); đang đọc tin cũ thì tin mới không kéo xuống cuối.
import { CHAT } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { STR_NETHER } from "../stringsNether.js";
import { findItems } from "./itemNames.js";

const CSS = `
#chat { position: fixed; left: 8px; bottom: 120px; width: min(560px, calc(100vw - 16px)); z-index: 20;
  font: 14px/1.35 monospace; color: #fff; pointer-events: none; }
#chat .log { max-height: 40vh; overflow-y: hidden; display: flex; flex-direction: column; overscroll-behavior: contain; }
#chat .log > :first-child { margin-top: auto; } /* dồn tin xuống đáy mà vẫn cuộn lên được (justify-content: flex-end thì không cuộn được) */
#chat.open .log { overflow-y: auto; scrollbar-width: thin; scrollbar-color: #888 transparent; }
#chat .ln { background: rgba(0,0,0,.45); padding: 1px 6px; text-shadow: 1px 1px 0 #000; white-space: pre-wrap; word-break: break-word;
  transition: opacity .6s; }
#chat .ln.old { opacity: 0; }
#chat.open .ln.old { opacity: 1; }
#chat.open { pointer-events: auto; }
#chat.open .log { background: rgba(0,0,0,.25); }
#chat .info { color: #ffe066; } #chat .death { color: #ff8080; } #chat .error { color: #ff5555; }
#chat .from { color: #9fd3ff; }
#chat input { display: none; width: 100%; box-sizing: border-box; margin-top: 4px; font: inherit; color: #fff;
  background: rgba(0,0,0,.65); border: 1px solid #888; padding: 4px 6px; outline: none; }
#chat.open input { display: block; }
`;

export type ChatKind = "chat" | "info" | "death" | "error";

export class ChatBox {
  private readonly root: HTMLDivElement;
  private readonly log: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private openNow = false;

  constructor(
    private readonly send: (text: string) => void,
    /** Được mở chat không (đang điều khiển, không mở túi đồ / chết). */
    private readonly canOpen: () => boolean,
    private readonly onClose: () => void,
  ) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement("div");
    this.root.id = "chat";
    this.log = document.createElement("div");
    this.log.className = "log";
    this.input = document.createElement("input");
    this.input.maxLength = CHAT.MAX_LEN;
    this.input.placeholder = STR.chatPlaceholder;
    this.root.append(this.log, this.input);
    document.body.appendChild(this.root);
    document.addEventListener("keydown", (e) => {
      if (this.openNow || !(e.code === "KeyT" || e.key === "/") || !this.canOpen()) return;
      e.preventDefault(); // không gõ chữ "t" vào ô nhập
      this.show(e.key === "/" ? "/" : "");
    });
    this.input.addEventListener("keydown", (e) => {
      e.stopPropagation(); // phím gõ chữ không điều khiển nhân vật / mở túi đồ
      if (e.key === "Enter") {
        const t = this.input.value.trim();
        if (t) this.send(t);
        this.close();
      } else if (e.key === "Escape") this.close();
      else if (e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        this.log.scrollTop += (e.key === "PageUp" ? -1 : 1) * this.log.clientHeight * 0.8;
      }
    });
    this.input.addEventListener("keyup", (e) => e.stopPropagation());
  }

  get open(): boolean {
    return this.openNow;
  }

  private show(prefill: string): void {
    this.openNow = true;
    this.root.classList.add("open");
    document.exitPointerLock();
    this.input.value = prefill;
    this.input.focus();
    this.log.scrollTop = this.log.scrollHeight;
  }

  close(): void {
    if (!this.openNow) return;
    this.openNow = false;
    this.root.classList.remove("open");
    this.input.blur();
    this.onClose();
  }

  /** Thêm một dòng (from: tên người gửi nếu là tin chat). */
  add(kind: ChatKind, text: string, from?: string): void {
    const ln = document.createElement("div");
    ln.className = `ln ${kind}`;
    if (from) {
      const f = document.createElement("span");
      f.className = "from";
      f.textContent = `<${from}> `;
      ln.appendChild(f);
    }
    ln.appendChild(document.createTextNode(text));
    const l = this.log, atBottom = l.scrollHeight - l.scrollTop - l.clientHeight < 24;
    l.appendChild(ln);
    while (l.childElementCount > CHAT.KEEP) l.firstElementChild?.remove();
    if (!this.openNow || atBottom) l.scrollTop = l.scrollHeight; // đang cuộn xem tin cũ: giữ nguyên chỗ
    setTimeout(() => ln.classList.add("old"), CHAT.SHOW_S * 1000);
  }
}

/** (7b) Lệnh /items [từ khóa]: liệt kê khóa vật phẩm (cho /give) kèm tên tiếng Việt, tối đa ITEM_LIST_MAX dòng. */
export function itemListToChat(chat: ChatBox, query: string): void {
  const list = findItems(query);
  if (!list.length) return chat.add("error", formatChat("itemsNone", [query.trim()]));
  if (!query.trim()) return chat.add("info", formatChat("itemsAll", [String(list.length)]));
  for (const it of list.slice(0, ITEM_LIST_MAX)) chat.add("info", `${it.key} — ${it.name}`);
  if (list.length > ITEM_LIST_MAX) chat.add("info", formatChat("itemsMore", [String(list.length - ITEM_LIST_MAX)]));
}
const ITEM_LIST_MAX = 30;

/** Ghép mẫu "{0} ... {1}" với tham số. */
export function formatChat(key: string, args: readonly string[]): string {
  const tpl = STR.chat[key] ?? key;
  // (7a) tham số "mob:<loài>" là sinh vật: đổi sang tên tiếng Việt
  return tpl.replace(/\{(\d)\}/g, (_, i: string) => {
    const s = args[Number(i)] ?? "";
    if (s.startsWith("place:")) return STR_NETHER.places[s.slice(6)] ?? s.slice(6); // /locate: tên công trình
    return s.startsWith("mob:") ? (STR.mobs[s.slice(4)] ?? s.slice(4)) : s;
  });
}
