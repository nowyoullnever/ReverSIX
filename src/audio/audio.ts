import type { BoardChange } from "../ui/transitions";

export const PLACE_GAIN = 0.8;
const SETTING_KEY = "reversix-sound-enabled";

export type SoundEvent = { type: "place"; delayMs: 0 };

export function soundPlan(change: BoardChange | undefined): SoundEvent[] {
  if (!change || change.placed.length !== 1) return [];
  return [{ type: "place", delayMs: 0 }];
}

export class AudioManager {
  private context: AudioContext | undefined;
  private placeBuffer: AudioBuffer | undefined;
  private loading: Promise<void> | undefined;
  private enabled = this.readSetting();

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try {
      localStorage.setItem(SETTING_KEY, enabled ? "true" : "false");
    } catch {
      // Storage can be unavailable in private browser contexts.
    }
    if (enabled) void this.unlock();
  }

  async unlock() {
    if (!this.enabled) return;
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;
    this.context ??= new AudioContextConstructor();
    if (this.context.state === "suspended")
      await this.context.resume().catch(() => undefined);
    void this.preload();
  }

  playChange(change: BoardChange | undefined) {
    for (const event of soundPlan(change)) {
      this.play(this.placeBuffer, PLACE_GAIN, event.delayMs);
    }
  }

  private readSetting() {
    try {
      return localStorage.getItem(SETTING_KEY) !== "false";
    } catch {
      return true;
    }
  }

  private preload() {
    if (this.loading || this.placeBuffer || !this.context) return this.loading;
    this.loading = fetch(`${import.meta.env.BASE_URL}audio/put.mp3`)
      .then((response) => {
        if (!response.ok) throw new Error(`Sound load failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => this.context!.decodeAudioData(data))
      .then((buffer) => {
        this.placeBuffer = buffer;
      })
      .catch((error) => {
        console.warn("REVERSIX sound unavailable", error);
      })
      .finally(() => {
        this.loading = undefined;
      });
    return this.loading;
  }

  private play(buffer: AudioBuffer | undefined, gain: number, delayMs = 0) {
    if (!this.enabled || !this.context || !buffer) return;
    const source = this.context.createBufferSource();
    const volume = this.context.createGain();
    source.buffer = buffer;
    volume.gain.value = gain;
    source.connect(volume).connect(this.context.destination);
    source.start(this.context.currentTime + delayMs / 1000);
  }
}
