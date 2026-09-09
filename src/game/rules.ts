import { applyMove, getLegalMoves } from "./reversi";
import { getSixLines } from "./six";
import { other, type Board, type GameState, type Player } from "./types";

const sixSignatures = (board: Board, player: Player): Set<string> =>
  new Set(getSixLines(board, player).map((line) => line.join(",")));

/** A turn may not finish with a new opponent Exact SIX. */
export function givesNewOpponentSix(
  turnStartBoard: Board,
  candidateBoard: Board,
  player: Player,
): boolean {
  const opponent = other(player);
  const baseline = sixSignatures(turnStartBoard, opponent);
  return hasNewOpponentSix(candidateBoard, opponent, baseline);
}

function hasNewOpponentSix(
  candidateBoard: Board,
  opponent: Player,
  baseline: Set<string>,
): boolean {
  return getSixLines(candidateBoard, opponent).some(
    (line) => !baseline.has(line.join(",")),
  );
}

function canCompleteTurnAfterFirst(
  state: GameState,
  first: number,
  opponent: Player,
  baseline: Set<string>,
): boolean {
  const player = state.currentPlayer;
  const boardAfterFirst = applyMove(state.board, player, first);
  const rawSecondMoves = getLegalMoves(boardAfterFirst, player);
  if (!rawSecondMoves.length)
    return !hasNewOpponentSix(boardAfterFirst, opponent, baseline);
  return rawSecondMoves.some((second) =>
    !hasNewOpponentSix(applyMove(boardAfterFirst, player, second), opponent, baseline),
  );
}
export function getMoveOptions(state: GameState): {
  legal: number[];
  forbidden: number[];
} {
  if (state.winner) return { legal: [], forbidden: [] };
  const player = state.currentPlayer;
  const opponent = other(player);
  const baseline = sixSignatures(state.turnStartBoard, opponent);
  const turnEndingPlacement = state.turn === 0 || state.moveNumberInTurn === 2;
  const legal: number[] = [];
  const forbidden: number[] = [];
  for (const index of getLegalMoves(state.board, player)) {
    const allowed = turnEndingPlacement
      ? !hasNewOpponentSix(applyMove(state.board, player, index), opponent, baseline)
      : canCompleteTurnAfterFirst(state, index, opponent, baseline);
    (allowed ? legal : forbidden).push(index);
  }
  return { legal, forbidden };
}
