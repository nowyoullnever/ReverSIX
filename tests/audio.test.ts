// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  AudioManager,
  soundPlan,
} from "../src/audio/audio";
import { BGM_KEY, BgmManager } from "../src/audio/bgm";

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

it("plans one place sound only for a new move, regardless of flip count", () => {
  expect(soundPlan(undefined)).toEqual([]);
  expect(soundPlan({ placed: [], flipped: [1], removed: [2] })).toEqual([]);
  expect(soundPlan({ placed: [34], flipped: [44, 54, 64], removed: [] })).toEqual([
    { type: "place", delayMs: 0 },
  ]);
});

it("restores the sound setting and skips all playback while disabled", () => {
  localStorage.setItem("reversix-sound-enabled", "false");
  const audio = new AudioManager();
  expect(audio.isEnabled()).toBe(false);
  audio.playChange({ placed: [34], flipped: [44], removed: [] });
  audio.setEnabled(true);
  expect(localStorage.getItem("reversix-sound-enabled")).toBe("true");
});

it("keeps one looping BGM element at a low volume and resumes its position", async () => {
  const play=vi.fn().mockResolvedValue(undefined),pause=vi.fn();
  class FakeAudio {
    loop=false;preload="";volume=1;currentTime=102;
    constructor(public src:string) {}
    play=play;pause=pause;
  }
  vi.stubGlobal("Audio",FakeAudio);
  const bgm=new BgmManager();
  expect(bgm.isEnabled()).toBe(true);
  bgm.setEnabled(false);expect(pause).toHaveBeenCalledOnce();expect(localStorage.getItem(BGM_KEY)).toBe("false");
  bgm.setEnabled(true);await Promise.resolve();expect(play).toHaveBeenCalledOnce();expect(localStorage.getItem(BGM_KEY)).toBe("true");
});

it("does not play BGM when its independent setting is restored as off", async () => {
  const play=vi.fn().mockResolvedValue(undefined);
  class FakeAudio { loop=false;preload="";volume=1; constructor(_:string){} play=play;pause=vi.fn(); }
  vi.stubGlobal("Audio",FakeAudio);localStorage.setItem(BGM_KEY,"false");
  const bgm=new BgmManager();expect(bgm.isEnabled()).toBe(false);await bgm.unlock();expect(play).not.toHaveBeenCalled();
});
