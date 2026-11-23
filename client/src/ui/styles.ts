// CSS cho giao diện vật phẩm (hotbar, thanh sinh tồn, túi đồ, màn hình chết).
const CSS = `
.slot { width: 40px; height: 40px; position: relative; box-sizing: border-box; background: url(/ui/slot.png) center / 100% 100%;
  image-rendering: pixelated; border: 1px solid #00000055; }
.slot img { position: absolute; left: 4px; top: 4px; width: 32px; height: 32px; image-rendering: pixelated; pointer-events: none; }
.slot .cnt { position: absolute; right: 2px; bottom: 0; color: #fff; font: bold 13px monospace; text-shadow: 1px 1px 0 #000; pointer-events: none; }
.slot .dur { position: absolute; left: 4px; right: 4px; bottom: 3px; height: 3px; background: #000; pointer-events: none; }
.slot .dur i { display: block; height: 100%; }
#hotbar { position: fixed; left: 50%; bottom: 6px; transform: translateX(-50%); display: flex; gap: 2px; pointer-events: none; }
#xpbar { position: fixed; left: 50%; bottom: 50px; width: 364px; height: 10px; margin-left: -182px; pointer-events: none;
  background: url(/ui/xp_bar_bg.png) 0 0 / 100% 100%; image-rendering: pixelated; }
#xpbar .fill { height: 100%; width: 0; background: url(/ui/xp_bar_fill.png) 0 0 / 364px 100%; image-rendering: pixelated; }
#xpbar span { position: absolute; left: 0; right: 0; top: -14px; text-align: center; color: #80ff20; font: bold 15px monospace;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000; }
.slot.glint img { filter: drop-shadow(0 0 2px #c070ff) drop-shadow(0 0 1px #a040ff); animation: glint 2.5s ease-in-out infinite; }
@keyframes glint { 50% { filter: drop-shadow(0 0 4px #e0a0ff) drop-shadow(0 0 2px #b060ff) brightness(1.25); } }
#hotbar .slot.sel { outline: 3px solid #fff; outline-offset: -1px; }
#hotbar .slot.off { margin-right: 14px; } /* tay trái (6a), chỉ hiện khi có đồ */
#bars { position: fixed; left: 50%; bottom: 62px; transform: translateX(-50%); width: 370px; pointer-events: none; }
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
#inv .armor .offhand { margin-top: 6px; } /* ô tay trái (6a) dưới 4 ô giáp */
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
#join { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #1d2a3a; z-index: 20;
  font: 15px monospace; color: #404040; }
#join .panel { background: #c6c6c6; padding: 18px 22px; border: 3px solid; border-color: #fff #555 #555 #fff; width: 340px;
  box-shadow: 0 0 0 2px #000; display: flex; flex-direction: column; gap: 8px; }
#join h2 { margin: 0 0 6px; font-size: 20px; }
#join input { font: 16px monospace; padding: 6px; }
#join button { font: 16px monospace; padding: 6px; cursor: pointer; }
#join .err { color: #a00; min-height: 1.2em; }
#join .tip { font-size: 12px; color: #555; }
#join .menu { width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; }
#join .sub { font-weight: bold; }
#join .list { display: flex; flex-direction: column; gap: 4px; background: #8b8b8b; padding: 4px; max-height: 240px; overflow-y: auto; }
#join .srv { display: grid; grid-template-columns: 1fr auto; gap: 0 10px; background: #a9a9a9; padding: 5px 8px; cursor: pointer;
  border: 2px solid transparent; }
#join .srv.sel { border-color: #fff; background: #bdbdbd; }
#join .srv span { grid-column: 1; font-size: 12px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#join .srv i { grid-column: 2; grid-row: 1 / 3; align-self: center; font-style: normal; font-size: 12px; text-align: right; }
#join .srv i.ok { color: #1a6b1a; }
#join .srv i.bad { color: #a00; }
#join .row { display: flex; gap: 6px; flex-wrap: wrap; }
#join .row button { flex: 1; font-size: 14px; }
#join .editor { display: flex; flex-direction: column; gap: 6px; border-top: 2px solid #888; padding-top: 6px; }
#join .editor[hidden] { display: none; }
#pause { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: #0008; z-index: 8;
  font: 15px monospace; color: #404040; }
#pause .panel { background: #c6c6c6; padding: 18px 22px; border: 3px solid; border-color: #fff #555 #555 #fff; box-shadow: 0 0 0 2px #000;
  display: flex; flex-direction: column; gap: 10px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow: auto; }
#pause h2 { margin: 0; font-size: 20px; text-align: center; }
#pause button { font: 16px monospace; padding: 8px; cursor: pointer; }
#pause pre { margin: 6px 0 0; font: 12px/1.5 monospace; white-space: pre-wrap; color: #333; max-width: 900px; }
#disconnected { position: fixed; left: 50%; top: 40%; transform: translateX(-50%); background: #000c; color: #fff; z-index: 30;
  font: 18px monospace; padding: 14px 22px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
#disconnected button { font: 16px monospace; padding: 6px 18px; cursor: pointer; }
`;

export function injectStyles(): void {
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
}
