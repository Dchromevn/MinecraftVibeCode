// (8c) Vật tổ bất tử vừa cứu mạng mình: vật tổ to bay lên giữa màn hình rồi mờ dần (như Minecraft), khoảng 2 giây.
export function showTotem(): void {
  const img = document.createElement("img");
  img.src = "/icons/totem_of_undying.png";
  Object.assign(img.style, {
    position: "fixed", left: "50%", top: "50%", width: "40vmin", height: "40vmin", marginLeft: "-20vmin", marginTop: "-20vmin",
    imageRendering: "pixelated", pointerEvents: "none", zIndex: "50",
  });
  document.body.appendChild(img);
  const anim = img.animate(
    [
      { transform: "translateY(30vh) scale(0.3) rotate(-20deg)", opacity: 1 },
      { transform: "translateY(0) scale(1.1) rotate(8deg)", opacity: 1, offset: 0.35 },
      { transform: "translateY(-4vh) scale(1) rotate(0deg)", opacity: 1, offset: 0.7 },
      { transform: "translateY(-20vh) scale(0.6) rotate(0deg)", opacity: 0 },
    ],
    { duration: 2000, easing: "ease-out" },
  );
  anim.onfinish = () => img.remove();
}
