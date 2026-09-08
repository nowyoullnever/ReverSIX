import { applyMove, getLegalMoves } from "./reversi";
import { getSixLines } from "./six";
import { other } from "./types";
import type { GameState } from "./types";
export function getMoveOptions(state: GameState): {
  legal: number[];
  forbidden: number[];
} {
  if (state.winner) return { legal: [], forbidden: [] };
  const player = state.currentPlayer;
  const opponent = other(player);
  const before = new Set(
    getSixLines(state.board, opponent).map((line) => line.join(",")),
  );
  const forbidden: number[] = [];
  const legal: number[] = [];
  for (const index of getLegalMoves(state.board, player)) {
    const board = applyMove(state.board, player, index);
    const createsOpponentSix = getSixLines(board, opponent).some(
      (line) => !before.has(line.join(",")),
    );
    (createsOpponentSix ? forbidden : legal).push(index);
  }
  return { legal, forbidden };
}
