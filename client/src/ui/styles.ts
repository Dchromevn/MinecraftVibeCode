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
#inv { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: #0009; z-index: 5;
  font: 14px monospace; color: #404040; }
#inv .wrap { display: flex; gap: 6px; align-items: flex-start; }
#inv .panel, #inv .book { background: #c6c6c6; padding: 10px 12px; border: 3px solid; border-color: #fff #555 #555 #fff;
  border-radius: 4px; box-shadow: 0 0 0 2px #000; }
#inv .slot { background: #8b8b8b center / 32px 32px no-repeat; border: 2px solid; border-color: #373737 #fff #fff #373737; }
#inv .slot.drag { background-color: #a8a8a8; }
#inv .label { margin: 2px 0 4px; }
#inv .top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; min-height: 172px; }
#inv .grid { display: grid; gap: 0; }
#inv .grid.g2 { grid-template-columns: repeat(2, 40px); }
#inv .grid.g3 { grid-template-columns: repeat(3, 40px); }
#inv .grid.g9 { grid-template-columns: repeat(9, 40px); }
#inv .grid.hot { margin-top: 10px; }
#inv .armor { display: grid; grid-template-columns: 40px; }
#inv .preview { width: 104px; height: 150px; background: #000; border: 2px solid; border-color: #373737 #fff #fff #373737; }
#inv .craftbox { margin-left: 8px; }
#inv.workbench .craftbox { margin-left: 30px; }
#inv .craftrow { display: flex; align-items: center; gap: 14px; }
#inv .arrow { font-size: 30px; color: #8b8b8b; }
#inv .slot.result { width: 52px; height: 52px; }
#inv .slot.result img { left: 8px; top: 8px; }
#inv .side { display: flex; flex-direction: column; justify-content: flex-end; height: 150px; }
#inv .bookbtn { width: 44px; height: 44px; padding: 4px; cursor: pointer; background: #c6c6c6; border: 2px solid;
  border-color: #fff #555 #555 #fff; align-self: center; }
#inv .bookbtn img { width: 32px; height: 32px; image-rendering: pixelated; }
#inv.workbench .bookbtn { margin-top: 48px; }
#inv .book { width: 300px; color: #303030; }
#inv .container { min-width: 378px; }
#inv .furnace { display: flex; align-items: center; gap: 22px; margin-left: 70px; }
#inv .fcol { display: flex; flex-direction: column; align-items: center; gap: 4px; }
#inv .fire { position: relative; width: 28px; height: 28px; }
#inv .fire img { position: absolute; inset: 0; width: 28px; height: 28px; image-rendering: pixelated; }
#inv .progress { width: 48px; height: 16px; background: #8b8b8b; border: 2px solid; border-color: #373737 #fff #fff #373737; }
#inv .progress .fill { height: 100%; width: 0; background: #e8e8e8; }
#inv h3 { margin: 0 0 6px; font-size: 14px; }
#inv .recipes { max-height: 380px; overflow-y: auto; background: #8b8b8b; border: 2px solid; border-color: #373737 #fff #fff #373737; }
#inv .rec { display: flex; align-items: center; gap: 6px; padding: 2px 4px; cursor: pointer; border-bottom: 1px solid #0003; color: #fff; }
#inv .rec.off { opacity: 0.4; cursor: default; }
#inv .rec img { width: 24px; height: 24px; image-rendering: pixelated; }
#inv .rec .ing { color: #e0e0e0; font-size: 11px; }
#inv .tip { color: #404040; font-size: 11px; margin-top: 6px; white-space: pre-line; }
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
