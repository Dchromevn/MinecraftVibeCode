// Lớp phủ thông tin góc màn hình và thông báo giữa màn hình.
export class Hud {
  private readonly info: HTMLDivElement;
  private readonly center: HTMLDivElement;

  constructor() {
    this.info = document.getElementById("hud") as HTMLDivElement;
    this.center = document.getElementById("center") as HTMLDivElement;
  }

  setInfo(lines: readonly string[]): void {
    this.info.textContent = lines.join("\n");
  }

  setCenter(text: string | null): void {
    this.center.textContent = text ?? "";
    this.center.style.display = text ? "block" : "none";
  }
}

export class FpsCounter {
  private frames = 0;
  private last = performance.now();
  fps = 0;

  tick(now: number): boolean {
    this.frames++;
    if (now - this.last >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.last));
      this.frames = 0;
      this.last = now;
      return true;
    }
    return false;
  }
}
