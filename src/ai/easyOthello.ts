import { getFlips } from "../game/reversi";
import { getMoveOptions } from "../game/rules";
import type { GameState } from "../game/types";

const SIZE = 10;
const corners = [0, 9, 90, 99];
const cornerNeighbors = new Map<number, { x: number; c: number[] }>([
  [0, { x: 11, c: [1, 10] }],
  [9, { x: 18, c: [8, 19] }],
  [90, { x: 81, c: [80, 91] }],
  [99, { x: 88, c: [89, 98] }],
]);

/** A deliberately shallow 10 by 10 Othello evaluation. It never inspects SIX or CHECK. */
export function chooseEasyMove(state: GameState, random = Math.random): number {
  const legal = getMoveOptions(state).legal;
  if (!legal.length) return -1;
  let bestScore = -Infinity;
  let best: number[] = [];
  for (const index of legal) {
    let score = getFlips(state.board, state.currentPlayer, index).length;
    if (corners.includes(index)) score += 10_000;
    if (index % SIZE === 0 || index % SIZE === SIZE - 1 || index < SIZE || index >= SIZE * (SIZE - 1)) score += 100;
    for (const [corner, neighbors] of cornerNeighbors) {
      if (state.board[corner] !== "") continue;
      if (index === neighbors.x) score -= 1_000;
      if (neighbors.c.includes(index)) score -= 500;
    }
    if (score > bestScore) { bestScore = score; best = [index]; }
    else if (score === bestScore) best.push(index);
  }
  return best[Math.floor(random() * best.length)];
}
