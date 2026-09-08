export type Player = "black" | "white";
export type Cell = Player | "";
export type Board = Cell[];
export interface GameState {
  board: Board;
  turnStartBoard: Board;
  currentPlayer: Player;
  turn: number;
  moveNumberInTurn: 1 | 2;
  firstPlacedStone: number;
  checkBy: Player | "";
  winner: Player | "draw" | "";
  consecutivePasses: number;
  revision: number;
  events: string[];
}
export const other = (player: Player): Player =>
  player === "black" ? "white" : "black";
