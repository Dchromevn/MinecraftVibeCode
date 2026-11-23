// Giao diện các menu (màn hình mở đầu, chơi nhiều người, danh sách server, cài đặt, menu Esc, mất kết nối, màn hình chết):
// chung một kiểu — chữ trắng đổ bóng trên nền mờ, nút xám kiểu khối, ô nhập nền đen, khung danh sách tối trong suốt.
const MENUS = "#join, #settings, #pause, #disconnected, #death";
const BUTTONS = "#join button, #settings button, #pause button, #disconnected button, #death button";

export const MENU_CSS = `
${MENUS} { font: 16px monospace; color: #fff; text-shadow: 2px 2px #3f3f3f; }
${BUTTONS} { min-height: 40px; padding: 0 14px; font: 17px monospace; color: #fff; text-shadow: 2px 2px #383838; cursor: pointer;
  background: linear-gradient(#8b8b8b, #6b6b6b); border: 2px solid; border-color: #b5b5b5 #3a3a3a #3a3a3a #b5b5b5; outline: 2px solid #000;
  outline-offset: 0; }
${BUTTONS.split(", ").map((b) => `${b}:hover`).join(", ")} { background: linear-gradient(#9aa7c9, #7383ad); color: #ffffa0; }
${BUTTONS.split(", ").map((b) => `${b}:disabled`).join(", ")} { background: #2c2c2c; color: #a0a0a0; border-color: #3a3a3a; cursor: default; }
${MENUS.split(", ").map((m) => `${m} h2`).join(", ")} { margin: 0 0 6px; font-size: 20px; font-weight: normal; text-align: center; }

#death { position: fixed; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center;
  background: #7a0000aa; z-index: 7; font: 32px monospace; gap: 24px; }
#death button { width: min(400px, calc(100vw - 32px)); }

#join { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #1d2a3a; z-index: 20; }
#join .panel { display: flex; flex-direction: column; gap: 8px; }
#join .menu { width: min(580px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; padding: 14px 18px;
  background: #0008; border: 2px solid #0008; }
#join label, #join .sub { color: #e0e0e0; font-size: 15px; }
#join input { font: 16px monospace; padding: 8px; color: #fff; background: #000; border: 2px solid #a0a0a0; outline: none; }
#join input:focus { border-color: #fff; }
#join .err { color: #ff5555; min-height: 1.2em; }
#join .tip, #join .hint { font-size: 13px; color: #b0b0b0; }
#join .hint { margin: -4px 0 6px; text-align: center; }
#join .list { display: flex; flex-direction: column; gap: 4px; background: #0009; border: 2px solid #000; padding: 4px;
  max-height: 240px; overflow-y: auto; }
#join .srv { display: grid; grid-template-columns: 1fr auto; gap: 0 10px; padding: 5px 8px; cursor: pointer; border: 2px solid transparent; }
#join .srv:hover { background: #ffffff14; }
#join .srv.sel { border-color: #fff; background: #0006; }
#join .srv span { grid-column: 1; font-size: 13px; color: #a0a0a0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#join .srv i { grid-column: 2; grid-row: 1 / 3; align-self: center; font-style: normal; font-size: 13px; text-align: right; color: #a0a0a0; }
#join .srv i.ok { color: #55ff55; }
#join .srv i.bad { color: #ff5555; }
#join .row { display: flex; gap: 8px; flex-wrap: wrap; }
#join .row button { flex: 1 1 auto; padding: 0 8px; font-size: 15px; white-space: nowrap; }
#join .editor { display: flex; flex-direction: column; gap: 6px; background: #0008; border: 2px solid #000; padding: 8px; }
#join .editor[hidden] { display: none; }
#join .big { font-size: 17px; }
#join .addr { display: flex; gap: 8px; align-items: center; background: #0009; border: 2px solid #000; padding: 4px 4px 4px 10px; }
#join .addr b { flex: 1; font-size: 17px; font-weight: normal; user-select: text; }
#join .addr button { min-height: 32px; font-size: 14px; }
#join .title { display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(420px, calc(100vw - 32px)); }
#join .logo { position: relative; margin-bottom: 28px; }
#join .logo canvas { display: block; width: min(660px, calc(100vw - 32px)); image-rendering: pixelated; filter: drop-shadow(0 4px 6px #0008); }
#join .splash { position: absolute; right: -10px; bottom: -14px; color: #ff0; font: bold 18px monospace; text-shadow: 2px 2px #3f3f00;
  transform: rotate(-18deg); white-space: nowrap; animation: splash 0.5s ease-in-out infinite alternate; pointer-events: none; }
@keyframes splash { from { transform: rotate(-18deg) scale(1); } to { transform: rotate(-18deg) scale(1.08); } }
#join .tbtn { width: 100%; }
#join .trow { display: flex; gap: 10px; width: 100%; margin-top: 12px; }
#join .trow button { flex: 1; }
#join .ver { position: fixed; left: 6px; bottom: 4px; font-size: 14px; }

#pause { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: #000a; z-index: 8; }
#pause .panel { display: flex; flex-direction: column; gap: 10px; width: min(400px, calc(100vw - 32px)); max-height: calc(100vh - 32px);
  overflow: auto; }
#pause .share { font-size: 14px; text-align: center; color: #ffff55; user-select: text; }
#pause pre { margin: 6px 0 0; font: 12px/1.5 monospace; white-space: pre-wrap; color: #d0d0d0; background: #0008; border: 2px solid #000;
  padding: 8px; }

#settings { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000c; z-index: 40; }
#settings .panel { display: flex; flex-direction: column; gap: 14px; width: min(640px, calc(100vw - 32px)); }
#settings .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px 12px; }
#settings .slider { position: relative; display: block; height: 40px; }
#settings .slider span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;
  font-size: 15px; z-index: 1; }
#settings input[type=range] { -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 40px; margin: 0;
  background: linear-gradient(#3c3c3c, #2a2a2a); border: 2px solid; border-color: #222 #5a5a5a #5a5a5a #222; outline: 2px solid #000;
  box-sizing: border-box; cursor: pointer; }
#settings input[type=range]::-webkit-slider-runnable-track { height: 100%; background: transparent; }
#settings input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 36px; background: linear-gradient(#a8a8a8, #7a7a7a);
  border: 2px solid; border-color: #d8d8d8 #444 #444 #d8d8d8; box-sizing: border-box; }
#settings input[type=range]:hover::-webkit-slider-thumb { border-color: #fff; }
#settings .grid button { font-size: 15px; }
#settings .done { width: min(400px, 100%); align-self: center; }

#disconnected { position: fixed; left: 50%; top: 40%; transform: translateX(-50%); background: #000c; border: 2px solid #000; z-index: 30;
  font-size: 18px; padding: 16px 24px; display: flex; flex-direction: column; gap: 14px; align-items: center; }
#fps { position: fixed; right: 8px; top: 6px; color: #fff; font: bold 14px monospace; text-shadow: 1px 1px #000; z-index: 6; pointer-events: none; }
`;
