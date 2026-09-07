import { inside, SIZE } from "./board";
import { other, type Board, type Player } from "./types";
const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
export function getFlips(
  board: Board,
  player: Player,
  index: number,
): number[] {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 100 ||
    board[index] !== ""
  )
    return [];
  const flips: number[] = [];
  for (const [dr, dc] of directions) {
    let r = Math.floor(index / SIZE) + dr,
      c = (index % SIZE) + dc;
    const line: number[] = [];
    while (inside(r, c) && board[r * SIZE + c] === other(player)) {
      line.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (line.length && inside(r, c) && board[r * SIZE + c] === player)
      flips.push(...line);
  }
  return flips;
}
export function getLegalMoves(board: Board, player: Player): number[] {
  return Array.from({ length: 100 }, (_, i) => i).filter(
    (i) => getFlips(board, player, i).length > 0,
  );
}
export function applyMove(board: Board, player: Player, index: number): Board {
  const flips = getFlips(board, player, index);
  if (!flips.length) throw new Error("ILLEGAL MOVE");
  const next = [...board];
  for (const i of [index, ...flips]) next[i] = player;
  return next;
}
