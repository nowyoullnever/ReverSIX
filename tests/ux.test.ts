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
  const stone = board.children[44].firstChild;
  expect((stone as HTMLElement).classList.contains("stone-flip")).toBe(true);
  updateBoard(board, b.game, false, click);
  expect(board.children[44].firstChild).toBe(stone);
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
  vi.advanceTimersByTime(2000);
  expect(toast.element.textContent).toBe("CHECK!");
  vi.advanceTimersByTime(2000);
  expect(toast.element.hidden).toBe(true);
});
it("tutorial supports next/back, keyboard navigation, all six steps and close", () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const dialog = openTutorial();
  expect(dialog.textContent).toContain("1. FLIP");
  const button = (label: string) =>
    [...dialog.querySelectorAll("button")].find(
      (b) => b.textContent === label,
    )!;
  button("NEXT").click();
  expect(dialog.textContent).toContain("2. TWO MOVES");
  button("BACK").click();
  for (let i = 0; i < 5; i++)
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
  expect(dialog.textContent).toContain("6. NO DOUBLE-SIX");
  expect(dialog.textContent).toContain("🚫");
  expect(dialog.textContent).toContain(
    "both new stones belong to the same SIX",
  );
  expect(tutorialSteps).toHaveLength(6);
  button("PLAY").click();
  expect(dialog.isConnected).toBe(false);
});
it("tutorial escape restores focus to its opener", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const dialog = openTutorial();
  dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  expect(document.activeElement).toBe(opener);
  expect(dialog.isConnected).toBe(false);
});
