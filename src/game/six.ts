import { inside, SIZE } from "./board";
import type { Board, Player } from "./types";
export function getSixLines(board: Board, player: Player): number[][] {
  const lines: number[][] = [];
  for (let i = 0; i < 100; i++) {
    if (board[i] !== player) continue;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [1, 1],
      [-1, 1],
    ]) {
      let r = Math.floor(i / SIZE),
        c = i % SIZE;
      if (inside(r - dr, c - dc) && board[(r - dr) * SIZE + c - dc] === player)
        continue;
      const line: number[] = [];
      while (inside(r, c) && board[r * SIZE + c] === player) {
        line.push(r * SIZE + c);
        r += dr;
        c += dc;
      }
      // A line is one maximal run: never split an overline into six-cell windows.
      if (line.length === 6) lines.push(line);
    }
  }
  return lines;
}
