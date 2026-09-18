import { initialBoard } from "./board";
import { applyMove, getLegalMoves } from "./reversi";
import {
  getMoveOptions,
  getTurnOptions,
  mustPass,
  placementsNeeded,
  stonesPerTurn,
  turnComplete,
} from "./rules";
import { getSixLines } from "./six";
import { other, type GameState, type Player } from "./types";
export function createGame(): GameState {
  const board = initialBoard();
  return {
    board,
    turnStartBoard: [...board],
    currentPlayer: "black",
    turn: 0,
    moveNumberInTurn: 1,
    firstPlacedStone: -1,
    turnPlacements: [],
    checkBy: "",
    winner: "",
    consecutivePasses: 0,
    revision: 0,
    events: [],
  };
}
// CHECK defense always takes precedence over a counter-check or a count finish.
function finishTurn(s: GameState): void {
  const mover = s.currentPlayer;
  s.turnPlacements = [];
  s.moveNumberInTurn = 1;
  s.firstPlacedStone = -1;
  s.turnStartBoard = [...s.board];
  if (s.checkBy && getSixLines(s.board, s.checkBy).length) {
    s.winner = s.checkBy;
    s.events.push("CHECK DEFENSE FAILED");
    return;
  }
  s.checkBy = getSixLines(s.board, mover).length ? mover : "";
  if (s.checkBy) s.events.push(`${s.checkBy.toUpperCase()} CHECK!`);
  s.currentPlayer = other(mover);
  s.turn++;
}
/** Adds one stone to the turn in progress. The turn is not handed over. */
function afterPlacement(
  state: GameState,
  player: Player,
  index: number,
): GameState {
  const board = applyMove(state.board, player, index);
  const turnPlacements = [...state.turnPlacements, index];
  const events: string[] = [];
  if (
    stonesPerTurn(state) === 2 &&
    turnPlacements.length === 1 &&
    !getLegalMoves(board, player).length
  )
    events.push(`${player.toUpperCase()} SECOND MOVE SKIPPED`);
  return {
    ...state,
    board,
    turnPlacements,
    moveNumberInTurn: turnPlacements.length ? 2 : 1,
    firstPlacedStone: turnPlacements[0] ?? -1,
    revision: state.revision + 1,
    consecutivePasses: 0,
    events,
  };
}
function assertMover(state: GameState, player: Player): void {
  if (state.winner || player !== state.currentPlayer)
    throw new Error("NOT YOUR TURN");
}
/**
 * Places one provisional stone. The first stone of a two-stone turn is judged only by
 * the Reversi rule — see `getMoveOptions` — so a dead end can be entered and undone.
 */
export function placeStone(
  state: GameState,
  player: Player,
  index: number,
): GameState {
  assertMover(state, player);
  if (state.turnPlacements.length >= placementsNeeded(state))
    throw new Error("TURN IS ALREADY COMPLETE");
  const options = getMoveOptions(state);
  if (options.forbidden.includes(index)) throw new Error("FORBIDDEN MOVE");
  if (!options.legal.includes(index)) throw new Error("ILLEGAL MOVE");
  return afterPlacement(state, player, index);
}
/** Takes back the most recent provisional stone of the turn in progress. */
export function undoLastPlacement(state: GameState): GameState {
  if (state.winner) throw new Error("GAME IS OVER");
  if (!state.turnPlacements.length) throw new Error("UNDO IS NOT AVAILABLE");
  const turnPlacements = state.turnPlacements.slice(0, -1);
  let board = [...state.turnStartBoard];
  for (const cell of turnPlacements)
    board = applyMove(board, state.currentPlayer, cell);
  return {
    ...state,
    board,
    turnPlacements,
    moveNumberInTurn: turnPlacements.length ? 2 : 1,
    firstPlacedStone: turnPlacements[0] ?? -1,
    revision: state.revision + 1,
    events: [],
  };
}
/**
 * Hands the turn over. With no stone placed this is a pass, which only a turn that
 * cannot be completed is allowed to make.
 */
export function commitTurn(state: GameState): GameState {
  if (state.winner) throw new Error("GAME IS OVER");
  if (!turnComplete(state)) throw new Error("INCOMPLETE TURN");
  const passed = !state.turnPlacements.length;
  const s: GameState = {
    ...state,
    board: [...state.board],
    revision: state.revision + 1,
    consecutivePasses: passed ? state.consecutivePasses + 1 : 0,
    events: state.events.filter((event) => event.endsWith("SECOND MOVE SKIPPED")),
  };
  if (passed) s.events.push(`${s.currentPlayer.toUpperCase()} PASS`);
  finishTurn(s);
  if (passed && !s.winner && s.consecutivePasses >= 2 && !s.checkBy) {
    const black = s.board.filter((cell) => cell === "black").length;
    const white = s.board.filter((cell) => cell === "white").length;
    s.winner = black === white ? "draw" : black > white ? "black" : "white";
  }
  return s;
}
/** Hands over every turn that has no legal move at all, until someone can play. */
export function settlePasses(state: GameState): GameState {
  if (!mustPass(state)) return state;
  let s = state;
  const events = [...state.events];
  while (mustPass(s)) {
    s = commitTurn(s);
    events.push(...s.events);
  }
  return { ...s, events };
}
/**
 * Plays one stone and carries the turn as far as it goes on its own: it hands the turn
 * over as soon as the stone count is met and passes for anyone left without a move.
 * This is the automatic path — replays and the computer player use it. Interactive play
 * goes through `placeStone` and `commitTurn`, which wait for the player to confirm.
 */
export function playMove(
  state: GameState,
  player: Player,
  index: number,
): GameState {
  assertMover(state, player);
  if (state.turnPlacements.length >= placementsNeeded(state))
    throw new Error("TURN IS ALREADY COMPLETE");
  const options = getTurnOptions(state);
  if (options.forbidden.includes(index)) throw new Error("FORBIDDEN MOVE");
  if (!options.legal.includes(index)) throw new Error("ILLEGAL MOVE");
  let s = afterPlacement(state, player, index);
  // the placement came out of `getTurnOptions`, so this turn is known to be completable:
  // the stone count alone decides whether it is over, with no second rules pass
  if (s.turnPlacements.length >= placementsNeeded(s)) s = settlePasses(commitTurn(s));
  return { ...s, revision: state.revision + 1 };
}
