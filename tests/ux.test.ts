// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createGame, playMove } from "../src/game/gameState";
import type { Room } from "../src/online/rooms";
import {
  compareBoards,
  moveTransition,
  PresenceEvents,
  roomEvents,
} from "../src/ui/transitions";
import { RoomPresenter, MOVE_ANIMATION_MS } from "../src/ui/presenter";
import { boardView, updateBoard } from "../src/ui/boardView";
import { openTutorial, tutorialSteps } from "../src/ui/tutorial";
import { Toast } from "../src/ui/toast";
import { setLocale } from "../src/i18n/i18n";
const initial = (): Room => ({
  status: "playing",
  createdAt: 1,
  players: { black: "a", white: "b" },
  game: createGame(),
});
const move = (room: Room, index: number): Room => ({
  ...room,
  game: playMove(room.game, room.game.currentPlayer, index),
});
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});
it("detects the new stone and all flips for local or remote state", () => {
  const before = initial(),
    after = move(before, 34);
  expect(compareBoards(before.game.board, after.game.board)).toEqual({
    placed: [34],
    flipped: [44],
    removed: [],
  });
  expect(moveTransition(before, JSON.parse(JSON.stringify(after)))).toEqual(
    moveTransition(before, after),
  );
});
it("does not animate initial snapshots, unchanged revisions, gaps, or undo", () => {
  const before = initial(),
    after = move(before, 34);
  expect(moveTransition(null, after)).toBeUndefined();
  expect(moveTransition(after, after)).toBeUndefined();
  expect(
    moveTransition(before, { ...after, game: { ...after.game, revision: 3 } }),
  ).toBeUndefined();
  expect(
    moveTransition(after, { ...before, game: { ...before.game, revision: 2 } }),
  ).toBeUndefined();
});
it("queues rapid remote moves and locks input through all animations", () => {
  vi.useFakeTimers();
  const changed = vi.fn(),
    unlocked = vi.fn();
  const presenter = new RoomPresenter(changed, unlocked, () => false);
  const a = initial(),
    b = move(a, 34),
    c = move(b, 33);
  presenter.receive(a);
  unlocked.mockClear();
  presenter.receive(b);
  presenter.receive(c);
  expect(presenter.locked).toBe(true);
  expect(presenter.room?.game.revision).toBe(1);
  vi.advanceTimersByTime(MOVE_ANIMATION_MS);
  expect(presenter.room?.game.revision).toBe(2);
  expect(presenter.locked).toBe(true);
  vi.advanceTimersByTime(MOVE_ANIMATION_MS);
  expect(presenter.locked).toBe(false);
  expect(unlocked).toHaveBeenCalledTimes(1);
});
it("duplicate/stale snapshots do not replay and reset cancels timers", () => {
  vi.useFakeTimers();
  const changed = vi.fn();
  const p = new RoomPresenter(changed, vi.fn(), () => false);
  const a = initial(),
    b = move(a, 34);
  p.receive(a);
  p.receive(b);
  p.receive(b);
  p.receive(a);
  expect(changed).toHaveBeenCalledTimes(2);
  p.reset();
  vi.runAllTimers();
  expect(p.room).toBeNull();
  expect(p.locked).toBe(false);
});
it("reduced motion applies state immediately without input delay", () => {
  const changed = vi.fn();
  const p = new RoomPresenter(changed, vi.fn(), () => true);
  const a = initial();
  p.receive(a);
  p.receive(move(a, 34));
  expect(p.locked).toBe(false);
  expect(changed.mock.calls.at(-1)?.[2]).toBeUndefined();
});
it("same-revision UI updates preserve animated DOM and input remains locked", () => {
  const a = initial(),
    b = move(a, 34);
  const click = vi.fn();
  const board = boardView(a.game, true, click);
  updateBoard(board, b.game, false, click, {
    change: moveTransition(a, b),
    lastPlaced: 34,
  });
  const stone = board.querySelectorAll(".cell")[44].firstChild;
  expect((stone as HTMLElement).classList.contains("stone-flip")).toBe(true);
  updateBoard(board, b.game, false, click);
  expect(board.querySelectorAll(".cell")[44].firstChild).toBe(stone);
  expect(board.querySelectorAll("button:not(:disabled)")).toHaveLength(0);
});
it("emits join once, CHECK, defense, counter-check and PASS transitions", () => {
  const a = initial(),
    b = { ...a, game: { ...a.game, revision: 1, checkBy: "black" as const } };
  expect(
    roomEvents({ ...a, status: "waiting", players: { black: "a" } }, a),
  ).toEqual(["PLAYER JOINED"]);
  expect(roomEvents(a, a)).toEqual([]);
  expect(roomEvents(a, b)).toContain("CHECK!");
  expect(
    roomEvents(b, { ...b, game: { ...b.game, revision: 2, checkBy: "" } }),
  ).toContain("CHECK DEFENDED");
  expect(
    roomEvents(b, { ...b, game: { ...b.game, revision: 2, checkBy: "white" } }),
  ).toContain("COUNTER CHECK!");
  expect(
    roomEvents(a, {
      ...a,
      game: { ...a.game, revision: 1, events: ["WHITE PASS"] },
    }),
  ).toContain("WHITE PASS");
  expect(roomEvents(null, b)).toEqual([]);
});
it("emits opponent disconnect/reconnect only on changes while locally connected", () => {
  const p = new PresenceEvents();
  expect(p.update(true, true, true)).toEqual([]);
  expect(p.update(true, false, true)).toEqual(["OPPONENT DISCONNECTED"]);
  expect(p.update(true, false, true)).toEqual([]);
  expect(p.update(true, true, true)).toEqual(["OPPONENT RECONNECTED"]);
  p.update(false, false, true);
  expect(p.update(true, true, true)).toEqual([]);
});
it("toast messages are queued and disappear automatically", () => {
  vi.useFakeTimers();
  const toast = new Toast();
  toast.show(["PLAYER JOINED", "CHECK!"]);
  expect(toast.element.textContent).toBe("PLAYER JOINED");
  vi.advanceTimersByTime(2180);
  expect(toast.element.textContent).toBe("CHECK!");
  expect(toast.element.classList.contains("toast-check")).toBe(true);
  vi.advanceTimersByTime(2180);
  expect(toast.element.hidden).toBe(true);
});
it("tutorial supports English navigation across all five translated steps", () => {
  vi.useFakeTimers();
  setLocale("en");
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const dialog = openTutorial();
  expect(dialog.textContent).toContain("HOW TO PLAY · 1 / 5");
  const close = dialog.querySelector<HTMLButtonElement>(".tutorial-close")!;
  expect(close.parentElement).toBe(dialog);
  expect(close.getAttribute("aria-label")).toBe("Close how to play");
  expect(dialog.textContent).toContain("1. FLIP");
  const button = (label: string) =>
    [...dialog.querySelectorAll("button")].find(
      (b) => b.textContent === label,
    )!;
  button("NEXT").click();
  expect(dialog.querySelector(".tutorial-close")).toBe(close);
  expect(dialog.textContent).toContain("2. TWO MOVES");
  button("BACK").click();
  for (let i = 0; i < 4; i++)
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
  expect(dialog.textContent).toContain("5. BREAK THE SIX");
  expect(tutorialSteps).toHaveLength(5);
  button("PLAY").click();
  vi.advanceTimersByTime(180);
  expect(dialog.isConnected).toBe(false);
});
it("renders every tutorial step and controls in Korean", () => {
  setLocale("ko");
  const dialog = openTutorial();
  expect(dialog.textContent).toContain("게임 방법 · 1 / 5");
  expect(dialog.textContent).toContain("1. 뒤집기");
  expect(dialog.textContent).toContain("돌을 놓아 상대 돌 하나 이상을 내 돌 사이에 끼우면");
  expect(dialog.textContent).toContain("놓기 전 → 놓은 후");
  expect(dialog.textContent).toContain("이전");
  expect(dialog.textContent).toContain("다음");
  expect(dialog.querySelector(".tutorial-close")?.getAttribute("aria-label")).toBe("게임 방법 닫기");
  for (let page = 2; page <= 5; page++) {
    [...dialog.querySelectorAll("button")].find((b) => b.textContent === "다음")?.click();
    expect(dialog.textContent).toContain(`게임 방법 · ${page} / 5`);
  }
  expect(dialog.textContent).toContain("5. SIX 방어하기");
  expect(dialog.textContent).toContain("둘 수 있는 곳이 없으면 패스합니다.");
  expect(dialog.textContent).toContain("완료");
  expect(dialog.textContent).not.toContain("CLOSE");
  dialog.remove();
  setLocale("en");
});
it("tutorial escape restores focus to its opener", () => {
  vi.useFakeTimers();
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const dialog = openTutorial();
  dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  vi.advanceTimersByTime(180);
  expect(document.activeElement).toBe(opener);
  expect(dialog.isConnected).toBe(false);
});
