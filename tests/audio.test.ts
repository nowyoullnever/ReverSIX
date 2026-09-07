// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import {
  AudioManager,
  soundPlan,
} from "../src/audio/audio";

afterEach(() => localStorage.clear());

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
