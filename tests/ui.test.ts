// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { boardView } from "../src/ui/boardView";
import { gameView } from "../src/ui/gameView";
import { lobby } from "../src/ui/lobby";
import { createGame } from "../src/game/gameState";
import { emptyBoard } from "../src/game/board";
import type { Room } from "../src/online/rooms";
it("renders 100 cells and only legal moves can be clicked", () => {
  const move = vi.fn(),
    board = boardView(createGame(), true, move);
  expect(board.children).toHaveLength(100);
  expect(board.querySelectorAll("button:not(:disabled)")).toHaveLength(4);
  (board.children[34] as HTMLButtonElement).click();
  expect(move).toHaveBeenCalledWith(34);
  (board.children[0] as HTMLButtonElement).click();
  expect(move).toHaveBeenCalledTimes(1);
});
it("shows 🚫 only on Reversi-legal Double-Six forbidden cells", () => {
  const s = createGame();
  s.board = emptyBoard();
  s.turn = 1;
  s.moveNumberInTurn = 2;
  s.firstPlacedStone = 40;
  [40, 41, 44, 45].forEach((i) => (s.board[i] = "black"));
  s.board[43] = "white";
  const move = vi.fn(),
    board = boardView(s, true, move);
  expect(board.children[42].textContent).toBe("🚫");
  expect((board.children[42] as HTMLButtonElement).disabled).toBe(true);
  expect(board.children[99].textContent).toBe("");
  (board.children[42] as HTMLButtonElement).click();
  expect(move).not.toHaveBeenCalled();
});
it("disables board on opponent turn, waiting, disconnect and pending writes", () => {
  const r: Room = {
    status: "playing",
    createdAt: 1,
    players: { black: "a", white: "b" },
    game: createGame(),
  };
  for (const [player, connected, opponent, busy, status] of [
    ["white", true, true, false, "playing"],
    ["black", false, true, false, "playing"],
    ["black", true, false, false, "playing"],
    ["black", true, true, true, "playing"],
    ["black", true, true, false, "waiting"],
  ] as const) {
    const root = document.createElement("main");
    gameView(
      root,
      { ...r, status },
      "ABC234",
      player,
      connected,
      opponent,
      busy,
      vi.fn(),
      vi.fn(),
    );
    expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(0);
  }
});
it.each([
  ["black", "YOU WIN"],
  ["white", "YOU LOSE"],
  ["draw", "DRAW"],
] as const)("shows result %s", (winner, label) => {
  const root = document.createElement("main");
  const game = { ...createGame(), winner };
  gameView(
    root,
    {
      status: "finished",
      createdAt: 1,
      players: { black: "a", white: "b" },
      game,
    },
    "ABC234",
    "black",
    true,
    true,
    false,
    vi.fn(),
    vi.fn(),
  );
  expect(root.querySelector("h2")?.textContent).toBe(label);
  expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(0);
});
it("shows CHECK and disconnect states", () => {
  const root = document.createElement("main");
  gameView(
    root,
    {
      status: "playing",
      createdAt: 1,
      players: { black: "a", white: "b" },
      game: { ...createGame(), checkBy: "white" },
    },
    "ABC234",
    "black",
    true,
    false,
    false,
    vi.fn(),
    vi.fn(),
  );
  expect(root.textContent).toContain("YOU ARE IN CHECK");
  expect(root.textContent).toContain("OPPONENT DISCONNECTED");
});
it("without Firebase, lobby explains setup and disables online controls", () => {
  const root = document.createElement("main");
  lobby(root, false, false, vi.fn(), vi.fn());
  expect(root.textContent).toContain("ONLINE PLAY IS NOT CONFIGURED");
  expect(
    root.querySelectorAll("#create:not(:disabled), form button:not(:disabled)"),
  ).toHaveLength(0);
  expect(root.textContent).not.toContain("COMPUTER");
});
