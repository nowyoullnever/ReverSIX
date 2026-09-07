import type { Board } from "../game/types";
import type { Room } from "../online/rooms";

export interface BoardChange {
  placed: number[];
  flipped: number[];
  removed: number[];
}
export function compareBoards(before: Board, after: Board): BoardChange {
  const change: BoardChange = { placed: [], flipped: [], removed: [] };
  after.forEach((color, i) => {
    if (before[i] === color) return;
    if (!before[i] && color) change.placed.push(i);
    else if (before[i] && !color) change.removed.push(i);
    else change.flipped.push(i);
  });
  return change;
}
export function moveTransition(
  before: Room | null,
  after: Room,
): BoardChange | undefined {
  if (!before || after.game.revision !== before.game.revision + 1) return;
  const change = compareBoards(before.game.board, after.game.board);
  // Reconnect gaps and undo snapshots are restored immediately, never replayed.
  return change.placed.length === 1 && !change.removed.length
    ? change
    : undefined;
}
export function roomEvents(before: Room | null, after: Room): string[] {
  if (!before) return [];
  const events: string[] = [];
  if (!before.players.white && after.players.white)
    events.push("PLAYER JOINED");
  if (after.game.revision <= before.game.revision) return events;
  if (compareBoards(before.game.board, after.game.board).removed.length)
    return events;
  if (!after.game.winner && before.game.checkBy !== after.game.checkBy) {
    if (before.game.checkBy)
      events.push(after.game.checkBy ? "COUNTER CHECK!" : "CHECK DEFENDED");
    else if (after.game.checkBy) events.push("CHECK!");
  }
  events.push(...after.game.events.filter((event) => event.endsWith(" PASS")));
  return events;
}

export class PresenceEvents {
  private last: boolean | undefined;
  update(
    connected: boolean,
    opponent: boolean,
    hasOpponent: boolean,
  ): string[] {
    if (!connected || !hasOpponent) {
      this.last = undefined;
      return [];
    }
    const old = this.last;
    this.last = opponent;
    if (old === undefined || old === opponent) return [];
    return [opponent ? "OPPONENT RECONNECTED" : "OPPONENT DISCONNECTED"];
  }
  reset() {
    this.last = undefined;
  }
}
