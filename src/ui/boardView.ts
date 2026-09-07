import { getMoveOptions } from "../game/rules";
import type { GameState } from "../game/types";
import type { BoardChange } from "./transitions";
const revisions = new WeakMap<HTMLElement, number>();
export interface BoardPresentation {
  change?: BoardChange;
  lastPlaced?: number;
  six?: number[];
}
export function updateBoard(
  board: HTMLElement,
  state: GameState,
  enabled: boolean,
  move: (i: number) => void,
  presentation: BoardPresentation = {},
) {
  const changed = revisions.get(board) !== state.revision;
  const { legal, forbidden } = getMoveOptions(state);
  for (let i = 0; i < 100; i++) {
    const cell = board.children[i] as HTMLButtonElement;
    const color = state.board[i];
    cell.disabled = !enabled || !legal.includes(i);
    cell.onclick = () => {
      if (!cell.disabled) move(i);
    };
    if (changed) {
      cell.className = `cell ${color} ${!color && legal.includes(i) ? "legal" : ""}`;
      cell.replaceChildren();
      cell.setAttribute(
        "aria-label",
        `Row ${Math.floor(i / 10) + 1}, column ${(i % 10) + 1}: ${color || (forbidden.includes(i) ? "forbidden by double-six rule" : legal.includes(i) ? "legal move" : "empty")}`,
      );
      if (color) {
        const stone = document.createElement("span");
        stone.className = "stone";
        cell.append(stone);
        if (presentation.change?.placed.includes(i))
          stone.classList.add("stone-enter");
        if (presentation.change?.flipped.includes(i)) {
          stone.style.setProperty(
            "--old-color",
            color === "black" ? "#fff" : "#000",
          );
          stone.style.setProperty(
            "--new-color",
            color === "black" ? "#000" : "#fff",
          );
          stone.classList.add("stone-flip");
        }
      } else if (forbidden.includes(i)) {
        cell.textContent = "🚫";
        cell.classList.add("forbidden");
      }
      cell.classList.toggle("first", i === state.firstPlacedStone);
    }
    cell.classList.toggle(
      "last-placed",
      i === presentation.lastPlaced && Boolean(color),
    );
    cell.classList.toggle(
      "six-highlight",
      presentation.six?.includes(i) ?? false,
    );
  }
  revisions.set(board, state.revision);
}
export function boardView(
  state: GameState,
  enabled: boolean,
  move: (i: number) => void,
  presentation: BoardPresentation = {},
): HTMLElement {
  const board = document.createElement("div");
  board.className = "board";
  board.setAttribute("aria-label", "10 by 10 game board");
  for (let i = 0; i < 100; i++) board.append(document.createElement("button"));
  updateBoard(board, state, enabled, move, presentation);
  return board;
}
