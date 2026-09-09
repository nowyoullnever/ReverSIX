// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { boardView, boardWithCoordinates } from "../src/ui/boardView";
import { gameView } from "../src/ui/gameView";
import { lobby } from "../src/ui/lobby";
import { createGame } from "../src/game/gameState";
import { emptyBoard } from "../src/game/board";
import type { Room } from "../src/online/rooms";
import { formatClock } from "../src/ui/clockView";
import { DEFAULT_SETTINGS } from "../src/game/session";
const cells = (board: HTMLElement) =>
  board.querySelectorAll<HTMLButtonElement>(":scope > .cell");
it.each([[300000,"05:00:000"],[372481,"06:12:481"],[5027,"00:05:027"],[1,"00:00:001"],[0,"00:00:000"]] as const)("formats %i milliseconds as %s",(ms,formatted)=>{const value=formatClock(ms);expect(value).toBe(formatted);expect(value).not.toContain(".")});
it("renders A-J and 1-10 coordinates around the board",()=>{const frame=boardWithCoordinates(createGame(),true,vi.fn());expect([...frame.querySelectorAll(".board-column-coordinates span")].map(el=>el.textContent).join("")).toBe("ABCDEFGHIJ");expect([...frame.querySelectorAll(".board-row-coordinates span")].map(el=>el.textContent).join(",")).toBe("1,2,3,4,5,6,7,8,9,10");expect(frame.querySelectorAll(".board > .cell")[0].getAttribute("aria-label")).toContain("column A")});
it("renders 100 cells and only legal moves can be clicked", () => {
  const move = vi.fn(),
    board = boardView(createGame(), true, move);
  expect(cells(board)).toHaveLength(100);
  expect(cells(board)[0].style.backgroundColor).toBe("var(--board-color-a)");
  expect(cells(board)[1].style.backgroundColor).toBe("var(--board-color-b)");
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
  s.turnStartBoard = [...s.board];
  const move = vi.fn(),
    board = boardView(s, true, move);
  expect(cells(board)[42].textContent).toBe("");
  expect(cells(board)[42].disabled).toBe(false);
  expect(cells(board)[99].textContent).toBe("");
  cells(board)[42].click();
  expect(move).toHaveBeenCalledWith(42);
});
it("marks turn-ending opponent-SIX moves with a disabled accessible symbol",()=>{const s=createGame();s.board=emptyBoard();s.turn=1;s.moveNumberInTurn=2;s.firstPlacedStone=99;for(let i=40;i<=46;i++)s.board[i]="white";s.board[30]="black";s.turnStartBoard=[...s.board];const move=vi.fn(),board=boardView(s,true,move);expect(cells(board)[50].textContent).toBe("🚫");expect(cells(board)[50].disabled).toBe(true);expect(cells(board)[50].getAttribute("aria-label")).toContain("Forbidden move: leaves a new opponent SIX at turn end");cells(board)[50].click();expect(move).not.toHaveBeenCalled()});
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
it("shows REMATCH after a result and displays the waiting vote state",()=>{const root=document.createElement("main"),rematch=vi.fn(),game={...createGame(),winner:"black" as const};gameView(root,{status:"finished",createdAt:1,players:{black:"a",white:"b"},game},"ABC234","black",true,true,false,vi.fn(),vi.fn(),{rematch});const button=root.querySelector<HTMLButtonElement>(".rematch")!;expect(button.hidden).toBe(false);button.click();expect(rematch).toHaveBeenCalledOnce();gameView(root,{status:"finished",createdAt:1,players:{black:"a",white:"b"},game,rematch:{black:true,white:false,generation:0}},"ABC234","black",true,true,false,vi.fn(),vi.fn(),{rematch});expect(button.disabled).toBe(true);expect(button.textContent).toContain("WAITING FOR OPPONENT")});
it("shows CHANGE OPTIONS only after the game finishes",()=>{const active=document.createElement("main"),change=vi.fn();gameView(active,{status:"playing",createdAt:1,players:{black:"a",white:"b"},game:createGame()},"ABC234","black",true,true,false,vi.fn(),vi.fn(),{changeOptions:change});expect(active.querySelector<HTMLButtonElement>(".change-options")!.hidden).toBe(true);const finished=document.createElement("main"),game={...createGame(),winner:"black" as const};gameView(finished,{status:"finished",createdAt:1,players:{black:"a",white:"b"},game},"ABC234","black",true,true,false,vi.fn(),vi.fn(),{changeOptions:change});const button=finished.querySelector<HTMLButtonElement>(".change-options")!;expect(button.hidden).toBe(false);expect(button.textContent).toBe("CHANGE OPTIONS");button.click();expect(change).toHaveBeenCalledOnce()});
it("shows timeout as the result cause without a defeat SIX line",()=>{const root=document.createElement("main"),game={...createGame(),winner:"white" as const,events:["BLACK TIMEOUT"]};gameView(root,{status:"finished",createdAt:1,players:{black:"a",white:"b"},game},"ABC234","black",true,true,false,vi.fn(),vi.fn());expect(root.querySelector(".turn-status")?.textContent).toContain("BLACK TIME OUT!");expect(root.querySelectorAll(".defeat-six-line")).toHaveLength(0)});
it("locks online play during countdown and restores role-specific timeout UI",()=>{const root=document.createElement("main"),decide=vi.fn(),base={status:"playing" as const,createdAt:1,players:{black:"a",white:"b"},game:createGame(),countdownEndsAt:4000};gameView(root,base,"ABC234","black",true,true,false,vi.fn(),vi.fn(),{now:1000,timeoutDecision:decide});expect(root.querySelector(".countdown-overlay")?.textContent).toBe("3");expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(0);const pending={...base,countdownEndsAt:0,timeout:{pendingFor:"black" as const,continueWithoutClock:false}};gameView(root,pending,"ABC234","black",true,true,false,vi.fn(),vi.fn(),{now:5000,timeoutDecision:decide});expect(root.querySelector(".timeout-dialog")?.hasAttribute("open")).toBe(true);expect(root.querySelector(".timeout-dialog")?.textContent).toContain("CONTINUE?");root.querySelectorAll<HTMLButtonElement>(".timeout-actions button")[0].click();expect(decide).toHaveBeenCalledWith(true);const opponentRoot=document.createElement("main");gameView(opponentRoot,pending,"ABC234","white",true,true,false,vi.fn(),vi.fn(),{now:5000,timeoutDecision:decide});expect(opponentRoot.querySelector(".timeout-dialog")?.textContent).toContain("Waiting for their response");expect(opponentRoot.querySelector(".timeout-actions")).toBeNull()});
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
it("renders chess clocks and no quick chat controls",()=>{const root=document.createElement("main");gameView(root,{status:"playing",createdAt:1,players:{black:"a",white:"b"},game:createGame()},"ABC234","black",true,true,false,vi.fn(),vi.fn(),{now:0});expect(root.querySelectorAll(".player-clock")).toHaveLength(2);expect(root.textContent).toContain("05:00");expect(root.textContent).not.toContain("CHAT")});
it("hides online clocks without leaving infinity or a settings summary",()=>{const root=document.createElement("main");gameView(root,{status:"playing",createdAt:1,players:{black:"a",white:"b"},settings:{...DEFAULT_SETTINGS,clockEnabled:false},game:createGame()},"ABC234","black",true,true,false,vi.fn(),vi.fn(),{now:0});expect(root.querySelector(".clock-board-layout")?.classList.contains("no-clock")).toBe(true);expect(root.textContent).not.toContain("∞");expect(root.querySelector(".game-settings-summary")).toBeNull()});
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
  lobby(root, true, true, vi.fn(), vi.fn(), vi.fn(), vi.fn(), "creating");
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
it("without Firebase, lobby keeps NEW GAME available", () => {
  const root = document.createElement("main");
  lobby(root, false, false, vi.fn(), vi.fn(), vi.fn(), vi.fn());
  expect(root.querySelector<HTMLButtonElement>("#new-game")?.disabled).toBe(false);
  expect(root.querySelector("input, form")).toBeNull();
  expect(root.textContent).not.toContain("COMPUTER");
  expect(root.textContent).not.toContain("REVERSI × SIX");
  expect(root.querySelector(".home-shell > h1")?.textContent).toBe("ReverSix!");
  expect(root.dataset.mode).toBe("lobby");
  expect(root.querySelector(".home-shell > .lobby #new-game")).not.toBeNull();
});
