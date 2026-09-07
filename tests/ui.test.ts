// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { boardView } from "../src/ui/boardView";
import { gameView } from "../src/ui/gameView";
import { lobby } from "../src/ui/lobby";
import { createGame } from "../src/game/gameState";
import { emptyBoard } from "../src/game/board";
import type { Room } from "../src/online/rooms";
const cells = (board: HTMLElement) =>
  board.querySelectorAll<HTMLButtonElement>(":scope > .cell");
it("renders 100 cells and only legal moves can be clicked", () => {
  const move = vi.fn(),
    board = boardView(createGame(), true, move);
  expect(cells(board)).toHaveLength(100);
  expect(board.querySelectorAll("button:not(:disabled)")).toHaveLength(4);
  cells(board)[34].click();
  expect(move).toHaveBeenCalledWith(34);
  cells(board)[0].click();
  expect(move).toHaveBeenCalledTimes(1);
});
it("does not mark Reversi-legal cells as forbidden", () => {
  const s = createGame();
  s.board = emptyBoard();
  s.turn = 1;
  s.moveNumberInTurn = 2;
  s.firstPlacedStone = 40;
  [40, 41, 44, 45].forEach((i) => (s.board[i] = "black"));
  s.board[43] = "white";
  const move = vi.fn(),
    board = boardView(s, true, move);
  expect(cells(board)[42].textContent).toBe("");
  expect(cells(board)[42].disabled).toBe(false);
  expect(cells(board)[99].textContent).toBe("");
  cells(board)[42].click();
  expect(move).toHaveBeenCalledWith(42);
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
it("keeps sound controls out of the active game screen", () => {
  const root = document.createElement("main");
  gameView(root, {
    status: "playing", createdAt: 1, players: { black: "a", white: "b" }, game: createGame(),
  }, "ABC234", "black", true, true, false, vi.fn(), vi.fn());
  expect(root.querySelector(".sound")).toBeNull();
});
it("uses accessible fixed-width animated dots for waiting and reconnecting states", () => {
  const root = document.createElement("main");
  const waiting = { status: "waiting" as const, createdAt: 1, players: { black: "a" }, game: createGame() };
  gameView(root, waiting, "ABC234", "black", true, false, false, vi.fn(), vi.fn());
  const dots = root.querySelector(".animated-dots");
  expect(root.querySelector("h2")?.textContent).toBe("WAITING FOR PLAYER");
  expect(dots?.getAttribute("aria-hidden")).toBe("true");
  gameView(root, { ...waiting, status: "playing", players: { black: "a", white: "b" } }, "ABC234", "black", false, true, false, vi.fn(), vi.fn());
  expect(root.querySelector(".notice")?.textContent).toBe("CONNECTION LOST — RECONNECTING");
  expect(root.querySelector(".notice .animated-dots")?.getAttribute("aria-hidden")).toBe("true");
});
it("shows the lobby activity status with shared animated dots", () => {
  const root = document.createElement("main");
  lobby(root, true, true, vi.fn(), vi.fn(), "creating");
  expect(root.querySelector(".lobby-status")?.textContent).toBe("CREATING ROOM");
  expect(root.querySelector(".lobby-status .animated-dots")?.getAttribute("aria-hidden")).toBe("true");
});
function failedRoom(stones: number[]): Room {
  const game = createGame();
  game.board = emptyBoard();
  stones.forEach((index) => (game.board[index] = "black"));
  game.winner = "black";
  game.events = ["CHECK DEFENSE FAILED"];
  return {
    status: "finished",
    createdAt: 1,
    players: { black: "a", white: "b" },
    game,
  };
}
it.each([
  [[40, 41, 42, 43, 44, 45], "40", "45"],
  [[4, 14, 24, 34, 44, 54], "4", "54"],
  [[11, 22, 33, 44, 55, 66], "11", "66"],
  [[81, 72, 63, 54, 45, 36], "81", "36"],
])(
  "draws a persistent exact-SIX result line from %s to %s",
  (stones, start, end) => {
    const root = document.createElement("main");
    gameView(
      root,
      failedRoom(stones),
      "ABC234",
      "white",
      true,
      true,
      false,
      vi.fn(),
      vi.fn(),
    );
    const line = root.querySelector<SVGLineElement>(".defeat-six-line")!;
    expect(line.getAttribute("data-start")).toBe(start);
    expect(line.getAttribute("data-end")).toBe(end);
    expect(root.querySelectorAll(".defeat-six")).toHaveLength(6);
    expect(root.textContent).toContain("YOU LOSE");
    expect(root.textContent).toContain("SIX REMAINED");
    expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(0);
  },
);
it("draws every remaining exact SIX for both players at the same coordinates", () => {
  const room = failedRoom([0, 1, 2, 3, 4, 5, 20, 30, 40, 50, 60, 70]);
  const black = document.createElement("main"),
    white = document.createElement("main");
  gameView(black, room, "ABC234", "black", true, true, false, vi.fn(), vi.fn());
  gameView(white, room, "ABC234", "white", true, true, false, vi.fn(), vi.fn());
  const segments = (root: HTMLElement) =>
    [...root.querySelectorAll(".defeat-six-line")].map((line) => [
      line.getAttribute("data-start"),
      line.getAttribute("data-end"),
    ]);
  expect(segments(black)).toEqual([
    ["0", "5"],
    ["20", "70"],
  ]);
  expect(segments(white)).toEqual(segments(black));
  expect(black.textContent).toContain("SIX SURVIVED");
  expect(white.textContent).toContain("SIX REMAINED");
});
it("excludes seven-stone overlines and does not show permanent lines during CHECK", () => {
  const seven = document.createElement("main");
  gameView(
    seven,
    failedRoom([0, 1, 2, 3, 4, 5, 6]),
    "ABC234",
    "white",
    true,
    true,
    false,
    vi.fn(),
    vi.fn(),
  );
  expect(seven.querySelectorAll(".defeat-six-line")).toHaveLength(0);
  const mixed = document.createElement("main");
  gameView(
    mixed,
    failedRoom([0, 1, 2, 3, 4, 5, 6, 40, 41, 42, 43, 44, 45]),
    "ABC234",
    "white",
    true,
    true,
    false,
    vi.fn(),
    vi.fn(),
  );
  expect(mixed.querySelectorAll(".defeat-six-line")).toHaveLength(1);
  const checking = failedRoom([40, 41, 42, 43, 44, 45]);
  checking.status = "playing";
  checking.game.winner = "";
  checking.game.checkBy = "black";
  checking.game.events = [];
  const root = document.createElement("main");
  gameView(
    root,
    checking,
    "ABC234",
    "white",
    true,
    true,
    false,
    vi.fn(),
    vi.fn(),
  );
  expect(root.querySelectorAll(".defeat-six-line")).toHaveLength(0);
});
it("uses a responsive SVG viewBox for result lines", () => {
  const root = document.createElement("main");
  gameView(
    root,
    failedRoom([40, 41, 42, 43, 44, 45]),
    "ABC234",
    "white",
    true,
    true,
    false,
    vi.fn(),
    vi.fn(),
  );
  const overlay = root.querySelector<SVGSVGElement>(".six-lines")!;
  expect(overlay.getAttribute("viewBox")).toBe("0 0 100 100");
  expect(overlay.getAttribute("preserveAspectRatio")).toBe("none");
});
it("marks a live defense-failure presentation for one-time SIX sequencing", () => {
  const root = document.createElement("main");
  gameView(root, failedRoom([40, 41, 42, 43, 44, 45]), "ABC234", "white", true, true, false, vi.fn(), vi.fn(), { defeatSequence: true });
  expect(root.querySelector(".board")?.classList.contains("defeat-sequence")).toBe(true);
  expect(root.querySelector(".result-detail")?.classList.contains("result-enter")).toBe(true);
  expect(root.querySelector(".defeat-six-line")?.getAttribute("pathLength")).toBe("1");
});
it("without Firebase, lobby explains setup and disables online controls", () => {
  const root = document.createElement("main");
  lobby(root, false, false, vi.fn(), vi.fn());
  expect(root.textContent).toContain("ONLINE PLAY IS NOT CONFIGURED");
  expect(
    root.querySelectorAll("#create:not(:disabled), form button:not(:disabled)"),
  ).toHaveLength(0);
  expect(root.textContent).not.toContain("COMPUTER");
  expect(root.textContent).not.toContain("REVERSI × SIX");
});
