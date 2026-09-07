import { initialBoard } from "./board";
import { applyMove, getLegalMoves } from "./reversi";
import { getMoveOptions } from "./rules";
import { getSixLines } from "./six";
import { other, type GameState, type Player } from "./types";
export function createGame(): GameState {
  return {
    board: initialBoard(),
    currentPlayer: "black",
    turn: 0,
    moveNumberInTurn: 1,
    firstPlacedStone: -1,
    checkBy: "",
    winner: "",
    consecutivePasses: 0,
    revision: 0,
    events: [],
  };
}
// CHECK defense always takes precedence over a counter-check or a count finish.
function finishTurn(s: GameState): void {
  if (s.checkBy && getSixLines(s.board, s.checkBy).length) {
    s.winner = s.checkBy;
    s.events.push("CHECK DEFENSE FAILED");
    return;
  }
  s.checkBy = getSixLines(s.board, s.currentPlayer).length
    ? s.currentPlayer
    : "";
  if (s.checkBy) s.events.push(`${s.checkBy.toUpperCase()} CHECK!`);
  s.currentPlayer = other(s.currentPlayer);
  s.turn++;
  s.moveNumberInTurn = 1;
  s.firstPlacedStone = -1;
}
export function settlePasses(state: GameState): GameState {
  const s = { ...state, events: [...state.events] };
  while (!s.winner && !getLegalMoves(s.board, s.currentPlayer).length) {
    s.events.push(`${s.currentPlayer.toUpperCase()} PASS`);
    s.consecutivePasses++;
    finishTurn(s);
    if (!s.winner && s.consecutivePasses >= 2 && !s.checkBy) {
      const black = s.board.filter((c) => c === "black").length;
      const white = s.board.filter((c) => c === "white").length;
      s.winner = black === white ? "draw" : black > white ? "black" : "white";
    }
  }
  return s;
}
export function playMove(
  state: GameState,
  player: Player,
  index: number,
): GameState {
  if (state.winner || player !== state.currentPlayer)
    throw new Error("NOT YOUR TURN");
  if (!getMoveOptions(state).legal.includes(index))
    throw new Error("ILLEGAL MOVE");
  const s: GameState = {
    ...state,
    board: applyMove(state.board, player, index),
    revision: state.revision + 1,
    consecutivePasses: 0,
    events: [],
  };
  if (s.turn === 0 || s.moveNumberInTurn === 2) finishTurn(s);
  else {
    s.firstPlacedStone = index;
    s.moveNumberInTurn = 2;
    if (!getMoveOptions(s).legal.length) {
      s.events.push(`${player.toUpperCase()} SECOND MOVE SKIPPED`);
      finishTurn(s);
    }
  }
  return s.moveNumberInTurn === 1 ? settlePasses(s) : s;
}
