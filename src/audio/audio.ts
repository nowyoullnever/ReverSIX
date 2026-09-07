import type { BoardChange } from "../ui/transitions";

export const PLACE_GAIN = 0.8;
export const FLIP_GAIN = 0.28;
export const FLIP_START_MS = 120;
export const FLIP_STAGGER_MS = 25;
export const FLIP_STAGGER_MAX_MS = 180;
const SETTING_KEY = "reversix-sound-enabled";

export type SoundEvent = { type: "place" | "flip"; delayMs: number };

export function soundPlan(change: BoardChange | undefined): SoundEvent[] {
  if (!change || change.placed.length !== 1) return [];
  return [
    { type: "place", delayMs: 0 },
    ...change.flipped.map((_, index) => ({
      type: "flip" as const,
      delayMs: FLIP_START_MS + Math.min(index * FLIP_STAGGER_MS, FLIP_STAGGER_MAX_MS),
    })),
  ];
}

export function reverseChannels(channels: Float32Array[]) {
  return channels.map((channel) => Float32Array.from(channel).reverse());
}

export class AudioManager {
  private context: AudioContext | undefined;
  private placeBuffer: AudioBuffer | undefined;
  private flipBuffer: AudioBuffer | undefined;
  private loading: Promise<void> | undefined;
  private activeVoices = 0;
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
      if (event.type === "place") this.play(this.placeBuffer, PLACE_GAIN);
      else this.play(this.flipBuffer, FLIP_GAIN, event.delayMs);
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
        const reversed = this.context!.createBuffer(
          buffer.numberOfChannels,
          buffer.length,
          buffer.sampleRate,
        );
        reverseChannels(
          Array.from({ length: buffer.numberOfChannels }, (_, index) =>
            buffer.getChannelData(index),
          ),
        ).forEach((channel, index) => reversed.copyToChannel(channel, index));
        this.flipBuffer = reversed;
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
    if (!this.enabled || !this.context || !buffer || this.activeVoices >= 8) return;
    const source = this.context.createBufferSource();
    const volume = this.context.createGain();
    source.buffer = buffer;
    volume.gain.value = gain;
    source.connect(volume).connect(this.context.destination);
    this.activeVoices++;
    source.onended = () => this.activeVoices--;
    source.start(this.context.currentTime + delayMs / 1000);
  }
}
