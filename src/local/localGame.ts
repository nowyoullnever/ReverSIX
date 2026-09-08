import { createGame, playMove } from "../game/gameState";
import type { GameState } from "../game/types";
import { compareBoards, type BoardChange } from "../ui/transitions";

interface LocalSnapshot {
  game: GameState;
  lastPlaced: number;
}

export interface LocalMoveResult {
  before: GameState;
  after: GameState;
  change: BoardChange;
}

export class LocalGameSession {
  game = createGame();
  lastPlaced = -1;
  private history: LocalSnapshot[] = [];

  play(index: number): LocalMoveResult {
    const before = this.game;
    const after = playMove(before, before.currentPlayer, index);
    const change = compareBoards(before.board, after.board);
    this.history.push({
      game: structuredClone(before),
      lastPlaced: this.lastPlaced,
    });
    this.game = after;
    this.lastPlaced = change.placed.length === 1 ? change.placed[0] : -1;
    return { before, after, change };
  }

  canUndo() {
    return !this.game.winner && this.history.length > 0;
  }

  undo() {
    if (!this.canUndo()) throw new Error("UNDO IS NOT AVAILABLE");
    const snapshot = this.history.pop()!;
    this.game = structuredClone(snapshot.game);
    this.lastPlaced = snapshot.lastPlaced;
    return this.game;
  }

  get historyLength() {
    return this.history.length;
  }
}
