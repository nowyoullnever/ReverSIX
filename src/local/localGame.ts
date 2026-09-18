import { commitTurn, createGame, placeStone, undoLastPlacement } from "../game/gameState";
import { turnStatus } from "../game/rules";
import { COUNTDOWN_MS, DEFAULT_SETTINGS, EMPTY_TIMEOUT, initialClock, lastCompletedTurnPlacements, mayUndo, remainingAt, replayTurns, type ClockState, type GameSettings, type TurnRecord, type TimeoutState } from "../game/session";
import type { GameState, Player } from "../game/types";
import { compareBoards, type BoardChange } from "../ui/transitions";

export interface LocalMoveResult { before: GameState; after: GameState; change: BoardChange }
export class LocalGameSession {
  game = createGame();
  clock: ClockState;
  turnLog: TurnRecord[] = [];
  countdownEndsAt: number;
  timeout: TimeoutState = { ...EMPTY_TIMEOUT };
  constructor(public readonly settings: GameSettings = DEFAULT_SETTINGS, now = Date.now()) {
    this.countdownEndsAt=now+COUNTDOWN_MS;
    this.clock = initialClock(settings, this.countdownEndsAt, settings.clockEnabled);
  }
  private assertPlayable(now:number){
    if(now<this.countdownEndsAt)throw new Error("GAME IS COUNTING DOWN");
    if(this.timeout.pendingFor)throw new Error("TIMEOUT DECISION PENDING");
    if (this.settings.clockEnabled && !this.timeout.continueWithoutClock && remainingAt(this.clock, this.game.currentPlayer, now) <= 0) { this.tick(now); throw new Error("TIME EXPIRED"); }
  }
  /** Places one provisional stone. Nothing is recorded until the turn is committed. */
  play(index: number, now = Date.now()): LocalMoveResult {
    this.assertPlayable(now);
    const before = this.game, player = before.currentPlayer;
    const after = placeStone(before, player, index);
    this.game = after;
    return { before, after, change: compareBoards(before.board, after.board) };
  }
  /** Both answers at once: asking them separately would price the rules twice a frame. */
  get turnStatus() { return turnStatus(this.game) }
  get canCommit() { return this.turnStatus.canCommit }
  get mustPass() { return this.turnStatus.mustPass }
  /** Hands the turn over, charging the whole turn's thinking time to its player. */
  commit(now = Date.now()): LocalMoveResult {
    this.assertPlayable(now);
    const before = this.game, player = before.currentPlayer, cells = [...before.turnPlacements];
    const after = commitTurn(before);
    const elapsedMs = this.settings.clockEnabled && !this.timeout.continueWithoutClock ? Math.max(0, now - this.clock.activeSince) : 0;
    this.turnLog.push({ cells, player, elapsedMs });
    if (player === "black") this.clock.blackRemainingMs = Math.max(0, this.clock.blackRemainingMs - elapsedMs);
    else this.clock.whiteRemainingMs = Math.max(0, this.clock.whiteRemainingMs - elapsedMs);
    this.clock.activeSince = now;
    this.clock.running = this.settings.clockEnabled && !this.timeout.continueWithoutClock && !after.winner;
    this.game = after;
    return { before, after, change: compareBoards(before.board, after.board) };
  }
  canUndo(now=Date.now()) { return now>=this.countdownEndsAt && !this.timeout.pendingFor && mayUndo(this.game, this.turnLog, this.settings.undoMode); }
  /**
   * Takes back the newest stone of the turn in hand, or — with nothing in hand — the
   * whole turn before it. `change` describes the first case only: a single stone coming
   * back off the board is worth watching, a whole turn rewinding is not.
   */
  undo(now = Date.now()): LocalMoveResult & { tookBackStone: boolean } {
    if (!this.canUndo()) throw new Error("UNDO IS NOT AVAILABLE");
    const before = this.game;
    if (before.turnPlacements.length) {
      this.game = undoLastPlacement(before);
      return { before, after: this.game, change: compareBoards(before.board, this.game.board), tookBackStone: true };
    }
    this.turnLog.pop();
    const rebuilt = replayTurns(this.settings, this.turnLog, before.revision + 1);
    this.game = rebuilt.game;
    this.clock = { blackRemainingMs: rebuilt.blackRemainingMs, whiteRemainingMs: rebuilt.whiteRemainingMs, activeSince: now, running: this.settings.clockEnabled && !this.timeout.continueWithoutClock };
    return { before, after: this.game, change: compareBoards(before.board, this.game.board), tookBackStone: false };
  }
  tick(now = Date.now()) {
    if (now<this.countdownEndsAt || this.timeout.pendingFor || this.timeout.continueWithoutClock || !this.clock.running || this.game.winner) return false;
    const player = this.game.currentPlayer;
    if (remainingAt(this.clock, player, now) > 0) return false;
    if (player === "black") this.clock.blackRemainingMs = 0; else this.clock.whiteRemainingMs = 0;
    this.game = { ...this.game, revision: this.game.revision + 1, events: [] };
    this.clock.running = false;
    this.timeout={pendingFor:player,continueWithoutClock:false};
    return true;
  }
  decideTimeout(continueGame:boolean){
    const player=this.timeout.pendingFor;if(!player)throw new Error("NO TIMEOUT DECISION PENDING");
    if(continueGame){this.timeout={pendingFor:"",continueWithoutClock:true};this.game={...this.game,revision:this.game.revision+1,events:[]};return}
    this.timeout={...EMPTY_TIMEOUT};this.game={...this.game,winner:player==="black"?"white":"black",revision:this.game.revision+1,events:[`${player.toUpperCase()} TIMEOUT`]};
  }
  rematch(now = Date.now()) { this.game = createGame(); this.countdownEndsAt=now+COUNTDOWN_MS;this.timeout={...EMPTY_TIMEOUT};this.clock = initialClock(this.settings, this.countdownEndsAt, this.settings.clockEnabled); this.turnLog = []; }
  remaining(player: Player, now = Date.now()) { return remainingAt(this.clock, player, now, this.game.currentPlayer); }
  get turnPlacements() { return lastCompletedTurnPlacements(this.turnLog); }
  get historyLength() { return this.turnLog.length; }
}
