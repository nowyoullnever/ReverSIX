import { getMoveOptions } from "../game/rules";
import type { GameState } from "../game/types";
export function boardView(
  state: GameState,
  enabled: boolean,
  move: (i: number) => void,
): HTMLElement {
  const board = document.createElement("div");
  board.className = "board";
  board.setAttribute("aria-label", "10 by 10 game board");
  const { legal, forbidden } = getMoveOptions(state);
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement("button");
    const color = state.board[i];
    const blocked = forbidden.includes(i);
    cell.className = `cell ${color} ${!color && legal.includes(i) ? "legal" : ""}`;
    cell.disabled = !enabled || !legal.includes(i);
    cell.setAttribute(
      "aria-label",
      `Row ${Math.floor(i / 10) + 1}, column ${(i % 10) + 1}: ${color || (blocked ? "forbidden by double-six rule" : legal.includes(i) ? "legal move" : "empty")}`,
    );
    if (color) {
      const stone = document.createElement("span");
      stone.className = "stone";
      cell.append(stone);
    } else if (blocked) {
      cell.textContent = "🚫";
      cell.classList.add("forbidden");
    }
    if (i === state.firstPlacedStone) cell.classList.add("first");
    cell.onclick = () => move(i);
    board.append(cell);
  }
  return board;
}
