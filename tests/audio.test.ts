// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import {
  AudioManager,
  FLIP_START_MS,
  FLIP_STAGGER_MS,
  reverseChannels,
  soundPlan,
} from "../src/audio/audio";

afterEach(() => localStorage.clear());

it("reverses every decoded audio channel without changing the original data", () => {
  const left = new Float32Array([0.1, 0.2, 0.3]);
  const right = new Float32Array([0.4, 0.5, 0.6]);
  expect(reverseChannels([left, right])).toEqual([
    new Float32Array([0.3, 0.2, 0.1]),
    new Float32Array([0.6, 0.5, 0.4]),
  ]);
  expect(left).toEqual(new Float32Array([0.1, 0.2, 0.3]));
});

it("plans one place and staggered flip sounds only for a new move", () => {
  expect(soundPlan(undefined)).toEqual([]);
  expect(soundPlan({ placed: [], flipped: [1], removed: [2] })).toEqual([]);
  expect(soundPlan({ placed: [34], flipped: [44, 54, 64], removed: [] })).toEqual([
    { type: "place", delayMs: 0 },
    { type: "flip", delayMs: FLIP_START_MS },
    { type: "flip", delayMs: FLIP_START_MS + FLIP_STAGGER_MS },
    { type: "flip", delayMs: FLIP_START_MS + FLIP_STAGGER_MS * 2 },
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
