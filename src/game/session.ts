import { createGame, playMove } from "./gameState";
import type { GameState, Player } from "./types";

export type UndoMode = "all" | "turn";
export interface GameSettings {
  initialTimeMs: number;
  clockEnabled: boolean;
  undoMode: UndoMode;
  checkRingEnabled: boolean;
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
export interface TimeoutState {
  pendingFor: "" | Player;
  continueWithoutClock: boolean;
}
export const COUNTDOWN_MS = 3_000;
export const EMPTY_TIMEOUT: TimeoutState = { pendingFor: "", continueWithoutClock: false };
export function countdownValue(endsAt: number, now: number) {
  const remaining=endsAt-now;
  return remaining>0?Math.min(3,Math.ceil(remaining/1_000)):0;
}
export const BASE_DEFAULT_SETTINGS: Omit<GameSettings,"clockEnabled"> = {
  initialTimeMs: 300_000,
  undoMode: "all",
  checkRingEnabled: true,
};
export const LOCAL_DEFAULT_SETTINGS: GameSettings = {
  ...BASE_DEFAULT_SETTINGS,
  clockEnabled: true,
};
export const ROOM_DEFAULT_SETTINGS: GameSettings = { ...LOCAL_DEFAULT_SETTINGS };
export const COMPUTER_DEFAULT_SETTINGS: GameSettings = { ...BASE_DEFAULT_SETTINGS, clockEnabled: false };
/** Compatibility alias for local and online defaults. */
export const DEFAULT_SETTINGS = ROOM_DEFAULT_SETTINGS;
export function validSettings(settings: GameSettings) {
  return Number.isInteger(settings.initialTimeMs) &&
    settings.initialTimeMs >= 6_000 && settings.initialTimeMs <= 3_600_000 &&
    settings.initialTimeMs % 6_000 === 0 &&
    typeof settings.clockEnabled === "boolean" &&
    (settings.undoMode === "all" || settings.undoMode === "turn") &&
    typeof settings.checkRingEnabled === "boolean";
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
