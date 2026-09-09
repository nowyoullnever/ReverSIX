export const BGM_KEY = "reversix-bgm-enabled";

export class BgmManager {
  private readonly audio: HTMLAudioElement;
  private enabled = this.readSetting();

  constructor() {
    this.audio = new Audio(`${import.meta.env.BASE_URL}audio/bgm.mp3`);
    this.audio.loop = true;
    this.audio.preload = "auto";
    this.audio.volume = 1;
  }

  isEnabled() { return this.enabled; }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try { localStorage.setItem(BGM_KEY, String(enabled)); } catch {}
    if (enabled) void this.unlock();
    else this.audio.pause();
  }

  async unlock() {
    if (!this.enabled) return;
    await this.audio.play().catch(() => undefined);
  }

  private readSetting() {
    try { return localStorage.getItem(BGM_KEY) === "true"; } catch { return false; }
  }
}
