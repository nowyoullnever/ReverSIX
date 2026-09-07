// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import {
  CHAT_PRESETS,
  CHAT_PRESET_IDS,
  isChatPresetId,
} from "../src/online/chatPresets";
import {
  isQuickChatCoolingDown,
  QUICK_CHAT_COOLDOWN_MS,
} from "../src/online/chatCooldown";
import { quickChatView } from "../src/ui/quickChatView";
import { setLocale } from "../src/i18n/i18n";

beforeEach(() => setLocale("en"));

it("keeps the exact 14-message preset list in one source of truth", () => {
  expect(CHAT_PRESET_IDS).toHaveLength(14);
  expect(CHAT_PRESETS).toEqual({
    wellPlayed: "Well playe!",
    goodMove: "Good move!",
    bruh: "Bruh.",
    illTakeThat: "I'll take that.",
    damn: "Damn!",
    misclicked: "I misclicked...",
    makeMove: "Please make a move...",
    wait: "Wait a second please...",
    thinking: "Sorry, I'm thinking...",
    goodLuck: "Good Luck!",
    thanks: "Thanks!",
    wow: "Wow!",
    fellAsleep: "I almost fell asleep because you were not moving!",
    stfu: "stfu.",
  });
  expect(isChatPresetId("goodMove")).toBe(true);
  expect(isChatPresetId("hello")).toBe(false);
  expect(isChatPresetId("toString")).toBe(false);
});

it("renders preset-only chat and sends a selected ID immediately", () => {
  const slot = document.createElement("div");
  const send = vi.fn();
  quickChatView(
    slot,
    { black: "a", white: "b" },
    {
      enabled: true,
      disabled: false,
      messages: [
        { id: "1", uid: "a", presetId: "goodMove", createdAt: 1 },
        { id: "2", uid: "b", presetId: "bruh", createdAt: 2 },
      ],
      send,
    },
  );
  expect(slot.querySelector("input, textarea")).toBeNull();
  expect(slot.querySelectorAll(".quick-chat-preset")).toHaveLength(14);
  expect(slot.textContent).toContain("BLACKGood move!");
  expect(slot.textContent).toContain("WHITEBruh.");
  slot.querySelector<HTMLButtonElement>(".quick-chat-choose")!.click();
  slot.querySelector<HTMLButtonElement>('[data-preset-id="goodMove"]')!.click();
  expect(send).toHaveBeenCalledOnce();
  expect(send).toHaveBeenCalledWith("goodMove");
  expect(slot.querySelector<HTMLElement>(".quick-chat-menu")!.hidden).toBe(true);
});

it("localizes only chat chrome and removes the panel when disabled", () => {
  setLocale("ko");
  const slot = document.createElement("div");
  quickChatView(slot, { black: "a", white: "b" }, {
    enabled: true,
    disabled: false,
    messages: [{ id: "1", uid: "a", presetId: "thanks", createdAt: 1 }],
    send: vi.fn(),
  });
  expect(slot.textContent).toContain("채팅");
  expect(slot.textContent).toContain("메시지 선택...");
  expect(slot.textContent).toContain("흑Thanks!");
  quickChatView(slot, { black: "a", white: "b" }, {
    enabled: false,
    disabled: true,
    messages: [],
    send: vi.fn(),
  });
  expect(slot.hidden).toBe(true);
  expect(slot.childElementCount).toBe(0);
});

it("enforces the one-second client cooldown boundary", () => {
  const sentAt = 10_000;
  const until = sentAt + QUICK_CHAT_COOLDOWN_MS;
  expect(isQuickChatCoolingDown(sentAt, until)).toBe(true);
  expect(isQuickChatCoolingDown(until - 1, until)).toBe(true);
  expect(isQuickChatCoolingDown(until, until)).toBe(false);
});
