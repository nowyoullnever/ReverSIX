import { expect, it } from "vitest";
import { emptyBoard } from "../src/game/board";
import { createGame, playMove, settlePasses } from "../src/game/gameState";
import { getMoveOptions } from "../src/game/rules";
import { applyMove, getLegalMoves } from "../src/game/reversi";
import { getSixLines } from "../src/game/six";
import type { GameState } from "../src/game/types";

const state = (checkBy: "black" | "white" | "" = "") => ({
  ...createGame(), board: emptyBoard(), turnStartBoard: emptyBoard(), turn: 1, checkBy,
});
const captureTurnStart = (s: GameState) => { s.turnStartBoard = [...s.board]; return s; };
const fill = (board: GameState["board"], indices: number[], color: "black" | "white" = "white") =>
  indices.forEach((index) => (board[index] = color));
function opponentSixFixture() {
  const s = state();
  fill(s.board, [40, 41, 42, 43, 44, 45, 46]);
  s.board[30] = "black";
  return captureTurnStart(s);
}

it("allows a first placement that temporarily creates an opponent SIX when a clean second placement exists", () => {
  const s = opponentSixFixture();
  expect(getMoveOptions(s).legal).toContain(50);
  const afterFirst = playMove(s, "black", 50);
  expect(getSixLines(afterFirst.board, "white")).toEqual([[41, 42, 43, 44, 45, 46]]);
  expect(getMoveOptions(afterFirst).legal.length).toBeGreaterThan(0);
});

it("forbids a second placement that leaves a new opponent Exact SIX", () => {
  const s = opponentSixFixture();
  s.moveNumberInTurn = 2;
  s.firstPlacedStone = 99;
  expect(getMoveOptions(s).forbidden).toContain(50);
  expect(() => playMove(s, "black", 50)).toThrow("FORBIDDEN MOVE");
});

it("applies the final-board rule to Black's one-placement opening turn", () => {
  const s = opponentSixFixture();
  s.turn = 0;
  expect(getMoveOptions(s).forbidden).toContain(50);
});

it("excludes a first placement when every possible turn completion is forbidden", () => {
  const s = state();
  s.board.fill("black");
  fill(s.board, [40, 41, 42, 43, 44, 45, 46, 32, 23, 14, 5]);
  s.board[1] = "white";
  s.board[0] = "";
  s.board[50] = "";
  captureTurnStart(s);
  expect(getLegalMoves(s.board, "black")).toEqual([0, 50]);
  expect(getMoveOptions(s)).toEqual({ legal: [], forbidden: [0, 50] });
  const afterFirst = applyMove(s.board, "black", 0);
  const secondState = { ...s, board: afterFirst, moveNumberInTurn: 2 as const, firstPlacedStone: 0 };
  expect(getLegalMoves(afterFirst, "black")).toEqual([50]);
  expect(getMoveOptions(secondState)).toEqual({ legal: [], forbidden: [50] });
});

it("passes when raw first placements exist but none can complete a legal turn", () => {
  const s = state();
  s.board.fill("black");
  fill(s.board, [40, 41, 42, 43, 44, 45, 46, 32, 23, 14, 5]);
  s.board[50] = "";
  captureTurnStart(s);
  expect(getLegalMoves(s.board, "black")).toEqual([50]);
  expect(getMoveOptions(s)).toEqual({ legal: [], forbidden: [50] });
  expect(settlePasses(s).events).toContain("BLACK PASS");
});

it("allows an Exact SIX that existed at turn start to reappear at turn end", () => {
  const s = state("white");
  fill(s.turnStartBoard, [41, 42, 43, 44, 45, 46]);
  s.board = [...s.turnStartBoard];
  s.board[40] = "white";
  s.board[30] = "black";
  s.moveNumberInTurn = 2;
  s.firstPlacedStone = 99;
  expect(getMoveOptions(s).legal).toContain(50);
  const result = playMove(s, "black", 50);
  expect(getSixLines(result.board, "white")).toEqual([[41, 42, 43, 44, 45, 46]]);
  expect(result.winner).toBe("white");
  expect(result.events).toContain("CHECK DEFENSE FAILED");
});

it("still forbids a new SIX B when baseline SIX A exists", () => {
  const s = state("white");
  fill(s.turnStartBoard, [70, 71, 72, 73, 74, 75]);
  s.board = [...s.turnStartBoard];
  fill(s.board, [40, 41, 42, 43, 44, 45, 46]);
  s.board[30] = "black";
  s.moveNumberInTurn = 2;
  s.firstPlacedStone = 99;
  expect(getMoveOptions(s).forbidden).toContain(50);
});

it("keeps own SIX and overline outcomes outside the opponent-line restriction", () => {
  const own = state();
  fill(own.board, [41, 42, 43, 44, 45], "black");
  own.board[40] = "white";
  own.board[30] = "black";
  own.moveNumberInTurn = 2;
  captureTurnStart(own);
  expect(getMoveOptions(own).legal).toContain(50);
  const overline = state();
  fill(overline.board, [40, 41, 42, 43, 44, 45, 46, 47]);
  overline.board[30] = "black";
  overline.moveNumberInTurn = 2;
  captureTurnStart(overline);
  expect(getMoveOptions(overline).legal).toContain(50);
});
