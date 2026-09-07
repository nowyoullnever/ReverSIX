import type { GameState, Player } from "./types";

export interface MoveHistory {
  player: Player;
  turn: number;
  revision: number;
  before: GameState[];
}
export function recordMove(
  history: MoveHistory | undefined,
  before: GameState,
  after: GameState,
): MoveHistory {
  const continuing =
    history?.player === before.currentPlayer &&
    history.turn === before.turn &&
    history.revision === before.revision;
  return {
    player: before.currentPlayer,
    turn: before.turn,
    revision: after.revision,
    before: [
      ...(continuing ? history.before : []),
      structuredClone(before),
    ].slice(-2),
  };
}
export function restoreSnapshot(
  current: GameState,
  before: GameState,
): GameState {
  // State is restored completely, but the network revision must never go back.
  return {
    ...structuredClone(before),
    events: [...before.events],
    revision: current.revision + 1,
  };
}
export function canUndo(
  state: GameState,
  player: Player,
  history: MoveHistory | undefined,
): boolean {
  return Boolean(
    history &&
    !state.winner &&
    state.currentPlayer === player &&
    history.player === player &&
    history.turn === state.turn &&
    history.revision === state.revision &&
    history.before.length &&
    history.before.at(-1)!.currentPlayer === player,
  );
}
export function undoMove(
  state: GameState,
  player: Player,
  history: MoveHistory,
): { game: GameState; history: MoveHistory | undefined } {
  if (state.revision !== history.revision)
    throw new Error("STATE CHANGED — TRY AGAIN");
  if (!canUndo(state, player, history))
    throw new Error("UNDO IS NOT AVAILABLE");
  const game = restoreSnapshot(state, history.before.at(-1)!);
  const before = history.before.slice(0, -1);
  return {
    game,
    history: before.length
      ? { ...history, before, revision: game.revision }
      : undefined,
  };
}
