import { createGame, playMove } from "./gameState";
import type { GameState, Player } from "./types";

export type UndoMode = "all" | "turn";
export interface GameSettings {
  initialTimeMs: number;
  clockEnabled: boolean;
  undoMode: UndoMode;
}
export interface ClockState {
  blackRemainingMs: number;
  whiteRemainingMs: number;
  activeSince: number;
  running: boolean;
}
export interface MoveRecord {
  index: number;
  player: Player;
  elapsedMs: number;
}
export const DEFAULT_SETTINGS: GameSettings = {
  initialTimeMs: 420_000,
  clockEnabled: true,
  undoMode: "all",
};
export function validSettings(settings: GameSettings) {
  return Number.isInteger(settings.initialTimeMs) &&
    settings.initialTimeMs >= 60_000 && settings.initialTimeMs <= 3_600_000 &&
    typeof settings.clockEnabled === "boolean" &&
    (settings.undoMode === "all" || settings.undoMode === "turn");
}
export function initialClock(settings: GameSettings, activeSince = 0, running = false): ClockState {
  return {
    blackRemainingMs: settings.initialTimeMs,
    whiteRemainingMs: settings.initialTimeMs,
    activeSince,
    running,
  };
}
export function remainingAt(clock: ClockState, player: Player, now: number, activePlayer: Player = player) {
  const stored = player === "black" ? clock.blackRemainingMs : clock.whiteRemainingMs;
  return Math.max(0, stored - (clock.running && player === activePlayer ? Math.max(0, now - clock.activeSince) : 0));
}
export function commitElapsed(clock: ClockState, player: Player, now: number) {
  const elapsed = clock.running ? Math.max(0, now - clock.activeSince) : 0;
  const next = { ...clock, activeSince: now };
  if (player === "black") next.blackRemainingMs = Math.max(0, clock.blackRemainingMs - elapsed);
  else next.whiteRemainingMs = Math.max(0, clock.whiteRemainingMs - elapsed);
  return { clock: next, elapsedMs: elapsed };
}
export function replayMoves(settings: GameSettings, records: MoveRecord[], revision: number) {
  let game = createGame();
  let black = settings.initialTimeMs;
  let white = settings.initialTimeMs;
  for (const record of records) {
    if (game.currentPlayer !== record.player) throw new Error("INVALID MOVE HISTORY");
    game = playMove(game, record.player, record.index);
    if (record.player === "black") black -= record.elapsedMs;
    else white -= record.elapsedMs;
  }
  game.revision = revision;
  return { game, blackRemainingMs: Math.max(0, black), whiteRemainingMs: Math.max(0, white) };
}
export function mayUndo(game: GameState, records: MoveRecord[], mode: UndoMode) {
  if (game.winner || !records.length) return false;
  if (mode === "all") return true;
  const last = records.at(-1)!;
  return last.player === game.currentPlayer;
}
