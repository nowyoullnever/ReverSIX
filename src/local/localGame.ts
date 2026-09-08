import { createGame, playMove } from "../game/gameState";
import { DEFAULT_SETTINGS, initialClock, mayUndo, remainingAt, replayMoves, type ClockState, type GameSettings, type MoveRecord } from "../game/session";
import type { GameState, Player } from "../game/types";
import { compareBoards, type BoardChange } from "../ui/transitions";

export interface LocalMoveResult { before: GameState; after: GameState; change: BoardChange }
export class LocalGameSession {
  game = createGame();
  clock: ClockState;
  moveLog: MoveRecord[] = [];
  lastPlaced = -1;
  constructor(public readonly settings: GameSettings = DEFAULT_SETTINGS, now = Date.now()) {
    this.clock = initialClock(settings, now, true);
  }
  play(index: number, now = Date.now()): LocalMoveResult {
    const before = this.game, player = before.currentPlayer;
    if (remainingAt(this.clock, player, now) <= 0) { this.tick(now); throw new Error("TIME EXPIRED"); }
    const elapsedMs = Math.max(0, now - this.clock.activeSince);
    const after = playMove(before, player, index);
    const change = compareBoards(before.board, after.board);
    this.moveLog.push({ index, player, elapsedMs });
    if (player === "black") this.clock.blackRemainingMs = Math.max(0, this.clock.blackRemainingMs - elapsedMs);
    else this.clock.whiteRemainingMs = Math.max(0, this.clock.whiteRemainingMs - elapsedMs);
    this.clock.activeSince = now;
    this.clock.running = !after.winner;
    this.game = after;
    this.lastPlaced = change.placed.length === 1 ? change.placed[0] : -1;
    return { before, after, change };
  }
  canUndo() { return mayUndo(this.game, this.moveLog, this.settings.undoMode); }
  undo(now = Date.now()) {
    if (!this.canUndo()) throw new Error("UNDO IS NOT AVAILABLE");
    this.moveLog.pop();
    const rebuilt = replayMoves(this.settings, this.moveLog, this.game.revision + 1);
    this.game = rebuilt.game;
    this.clock = { blackRemainingMs: rebuilt.blackRemainingMs, whiteRemainingMs: rebuilt.whiteRemainingMs, activeSince: now, running: true };
    this.lastPlaced = this.moveLog.at(-1)?.index ?? -1;
    return this.game;
  }
  tick(now = Date.now()) {
    if (!this.clock.running || this.game.winner) return false;
    const player = this.game.currentPlayer;
    if (remainingAt(this.clock, player, now) > 0) return false;
    if (player === "black") this.clock.blackRemainingMs = 0; else this.clock.whiteRemainingMs = 0;
    this.game = { ...this.game, winner: player === "black" ? "white" : "black", revision: this.game.revision + 1, events: [`${player.toUpperCase()} TIMEOUT`] };
    this.clock.running = false;
    return true;
  }
  rematch(now = Date.now()) { this.game = createGame(); this.clock = initialClock(this.settings, now, true); this.moveLog = []; this.lastPlaced = -1; }
  remaining(player: Player, now = Date.now()) { return remainingAt(this.clock, player, now, this.game.currentPlayer); }
  get historyLength() { return this.moveLog.length; }
}
