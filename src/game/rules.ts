import { getLegalMoves } from "./reversi";
import type { GameState } from "./types";
export function getMoveOptions(state: GameState): {
  legal: number[];
} {
  return { legal: state.winner ? [] : getLegalMoves(state.board, state.currentPlayer) };
}
