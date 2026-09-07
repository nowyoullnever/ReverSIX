import type { Board } from "./types";
export const SIZE = 10;
export const emptyBoard = (): Board => Array(100).fill("");
export function initialBoard(): Board {
  const board = emptyBoard();
  board[44] = board[55] = "white";
  board[45] = board[54] = "black";
  return board;
}
export const inside = (r: number, c: number) =>
  r >= 0 && r < SIZE && c >= 0 && c < SIZE;
