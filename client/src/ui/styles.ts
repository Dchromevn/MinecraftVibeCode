// CSS cho giao diện vật phẩm (hotbar, thanh sinh tồn, túi đồ, màn hình chết).
const CSS = `
.slot { width: 40px; height: 40px; position: relative; box-sizing: border-box; background: url(/ui/slot.png) center / 100% 100%;
  image-rendering: pixelated; border: 1px solid #00000055; }
.slot img { position: absolute; left: 4px; top: 4px; width: 32px; height: 32px; image-rendering: pixelated; pointer-events: none; }
.slot .cnt { position: absolute; right: 2px; bottom: 0; color: #fff; font: bold 13px monospace; text-shadow: 1px 1px 0 #000; pointer-events: none; }
.slot .dur { position: absolute; left: 4px; right: 4px; bottom: 3px; height: 3px; background: #000; pointer-events: none; }
.slot .dur i { display: block; height: 100%; }
#hotbar { position: fixed; left: 50%; bottom: 6px; transform: translateX(-50%); display: flex; gap: 2px; pointer-events: none; }
#hotbar .slot.sel { outline: 3px solid #fff; outline-offset: -1px; }
#bars { position: fixed; left: 50%; bottom: 50px; transform: translateX(-50%); width: 370px; pointer-events: none; }
#bars .row { display: flex; height: 18px; gap: 0; }
#bars .row.right { flex-direction: row-reverse; float: right; }
#bars .row.left { float: left; clear: left; }
#bars .ic { width: 18px; height: 18px; position: relative; image-rendering: pixelated; }
#bars .ic img { position: absolute; inset: 0; width: 18px; height: 18px; image-rendering: pixelated; }
#inv { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: #0008; z-index: 5;
  font: 13px monospace; color: #eee; }
#inv .panel { display: flex; gap: 18px; background: #3b3b3bee; padding: 14px; border: 2px solid #111; border-radius: 4px; }
#inv h3 { margin: 0 0 6px; font-size: 14px; }
#inv .grid { display: grid; grid-template-columns: repeat(9, 40px); gap: 2px; }
#inv .armor { display: grid; grid-template-columns: 40px; gap: 2px; margin-right: 24px; }
#inv .top { display: flex; align-items: center; }
#inv .craft { display: flex; align-items: center; gap: 10px; }
#inv .grid.g2 { grid-template-columns: repeat(2, 40px); }
#inv .grid.g3 { grid-template-columns: repeat(3, 40px); }
#inv .arrow { font-size: 26px; color: #ccc; }
#inv .slot.result { width: 48px; height: 48px; }
#inv .slot.result img { left: 8px; top: 8px; }
#inv .recipes { width: 300px; max-height: 420px; overflow-y: auto; }
#inv .rec { display: flex; align-items: center; gap: 6px; padding: 2px 4px; cursor: pointer; border-bottom: 1px solid #0004; }
#inv .rec.off { opacity: 0.35; cursor: default; }
#inv .rec img { width: 24px; height: 24px; image-rendering: pixelated; }
#inv .rec .ing { color: #bbb; font-size: 11px; }
#inv .tip { color: #aaa; font-size: 11px; margin-top: 6px; white-space: pre; }
#cursor { position: fixed; pointer-events: none; z-index: 6; width: 40px; height: 40px; background: none; border: none; }
#death { position: fixed; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center;
  background: #7a0000aa; z-index: 7; color: #fff; font: bold 32px monospace; gap: 24px; }
#death button { font: 18px monospace; padding: 8px 28px; cursor: pointer; }
`;

export function injectStyles(): void {
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
}
