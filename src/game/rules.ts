import { applyMove, getLegalMoves } from "./reversi";
import { getSixLines } from "./six";
import type { GameState } from "./types";
export function getMoveOptions(state: GameState): {
  legal: number[];
  forbidden: number[];
} {
  const legal: number[] = [],
    forbidden: number[] = [];
  if (state.winner) return { legal, forbidden };
  for (const i of getLegalMoves(state.board, state.currentPlayer)) {
    const blocked =
      state.moveNumberInTurn === 2 &&
      getSixLines(
        applyMove(state.board, state.currentPlayer, i),
        state.currentPlayer,
      ).some(
        (line) => line.includes(i) && line.includes(state.firstPlacedStone),
      );
    (blocked ? forbidden : legal).push(i);
  }
  return { legal, forbidden };
}
