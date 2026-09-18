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

/** Stones a turn is made of: one on Black's opening turn, two from then on. */
export const stonesPerTurn = (state: GameState): number =>
  state.turn === 0 ? 1 : 2;

/**
 * Stones this turn still expects. Two, except on Black's opening turn and except
 * when the second stone has to be skipped because nothing legal is left.
 */
export function placementsNeeded(state: GameState): number {
  const base = stonesPerTurn(state);
  if (
    base === 2 &&
    state.turnPlacements.length === 1 &&
    !getLegalMoves(state.board, state.currentPlayer).length
  )
    return 1;
  return base;
}

/** Would a stone played now end the turn? Only then does the forbidden rule apply. */
export const completesTurn = (state: GameState): boolean =>
  state.turnPlacements.length + 1 >= stonesPerTurn(state);

/** Has the turn so far left the opponent a SIX it did not have when the turn began? */
function turnGivesSix(state: GameState): boolean {
  const opponent = other(state.currentPlayer);
  return hasNewOpponentSix(
    state.board,
    opponent,
    sixSignatures(state.turnStartBoard, opponent),
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

/**
 * Cells the side to move may put a stone on right now.
 *
 * The forbidden rule judges a whole TURN, so only the stone that ENDS one is filtered
 * here. The first of two stones stays open even when every second stone after it turns
 * out to be forbidden: the player may try it and watch the follow-ups light up as
 * forbidden, which is the only way to see WHY a position has no move. Such a turn simply
 * cannot be committed — see `turnComplete` — so the set of turns the game accepts is
 * unchanged.
 */
export function getMoveOptions(state: GameState): {
  legal: number[];
  forbidden: number[];
} {
  if (state.winner || state.turnPlacements.length >= placementsNeeded(state))
    return { legal: [], forbidden: [] };
  const player = state.currentPlayer;
  const raw = getLegalMoves(state.board, player);
  if (!completesTurn(state)) return { legal: raw, forbidden: [] };
  const opponent = other(player);
  const baseline = sixSignatures(state.turnStartBoard, opponent);
  const legal: number[] = [];
  const forbidden: number[] = [];
  for (const index of raw)
    (!hasNewOpponentSix(applyMove(state.board, player, index), opponent, baseline)
      ? legal
      : forbidden
    ).push(index);
  return { legal, forbidden };
}

/**
 * Placements from which the whole TURN can still be brought to a legal end.
 *
 * This is the stricter set `getMoveOptions` deliberately does not enforce on a first
 * stone. Automatic players use it so they never walk into a turn they cannot finish,
 * and an empty `legal` list here is what makes a turn a pass.
 */
export function getTurnOptions(state: GameState): {
  legal: number[];
  forbidden: number[];
} {
  if (state.winner || state.turnPlacements.length >= placementsNeeded(state))
    return { legal: [], forbidden: [] };
  const player = state.currentPlayer;
  const opponent = other(player);
  const baseline = sixSignatures(state.turnStartBoard, opponent);
  const turnEndingPlacement = completesTurn(state);
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

/** Can the turn still be brought to a legal end from where it stands? */
export function canCompleteTurn(state: GameState): boolean {
  if (state.winner) return false;
  if (state.turnPlacements.length >= placementsNeeded(state))
    return !turnGivesSix(state);
  return getTurnOptions(state).legal.length > 0;
}

/**
 * What the turn in hand can do right now. Both answers come out of one `canCompleteTurn`,
 * which is the expensive question, so views ask this rather than the two separately.
 */
export function turnStatus(state: GameState): { canCommit: boolean; mustPass: boolean } {
  if (state.winner) return { canCommit: false, mustPass: false };
  const untouched = !state.turnPlacements.length;
  if (canCompleteTurn(state))
    return { canCommit: state.turnPlacements.length >= placementsNeeded(state), mustPass: false };
  // this turn leads nowhere: only an untouched one may be handed over, and that is a pass
  return { canCommit: untouched, mustPass: untouched };
}

/** Whether the turn may be handed over right now — as a played turn or as a pass. */
export const turnComplete = (state: GameState): boolean => turnStatus(state).canCommit;

/** No legal turn exists, so the only move left is to hand the turn over unplayed. */
export const mustPass = (state: GameState): boolean => turnStatus(state).mustPass;
