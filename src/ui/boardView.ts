import { getMoveOptions } from "../game/rules";
import type { GameState } from "../game/types";
import type { BoardChange } from "./transitions";
import { t } from "../i18n/i18n";
const revisions = new WeakMap<HTMLElement, number>();
export interface BoardPresentation {
  change?: BoardChange;
  lastPlaced?: number;
  six?: number[];
  defeatLines?: number[][];
  defeatSequence?: boolean;
}
const svg = (name: string) =>
  document.createElementNS("http://www.w3.org/2000/svg", name);
function drawDefeatLines(board: HTMLElement, lines: number[][] = []) {
  let overlay = board.querySelector<SVGSVGElement>(":scope > .six-lines");
  if (!overlay) {
    overlay = svg("svg") as SVGSVGElement;
    overlay.classList.add("six-lines");
    overlay.setAttribute("viewBox", "0 0 100 100");
    overlay.setAttribute("preserveAspectRatio", "none");
    overlay.setAttribute("aria-hidden", "true");
    board.prepend(overlay);
  }
  overlay.replaceChildren(
    ...lines.map((line, index) => {
      const start = line[0],
        end = line.at(-1)!;
      const path = svg("line");
      path.classList.add("defeat-six-line");
      path.setAttribute("pathLength", "1");
      path.style.setProperty("--defeat-delay", `${Math.min(index * 80, 160)}ms`);
      path.setAttribute("x1", `${(start % 10) * 10 + 5}`);
      path.setAttribute("y1", `${Math.floor(start / 10) * 10 + 5}`);
      path.setAttribute("x2", `${(end % 10) * 10 + 5}`);
      path.setAttribute("y2", `${Math.floor(end / 10) * 10 + 5}`);
      path.setAttribute("data-start", `${start}`);
      path.setAttribute("data-end", `${end}`);
      return path;
    }),
  );
}
export function updateBoard(
  board: HTMLElement,
  state: GameState,
  enabled: boolean,
  move: (i: number) => void,
  presentation: BoardPresentation = {},
) {
  const changed = revisions.get(board) !== state.revision;
  const { legal } = getMoveOptions(state);
  const cells = board.querySelectorAll<HTMLButtonElement>(":scope > .cell");
  drawDefeatLines(board, presentation.defeatLines);
  board.classList.toggle("defeat-sequence", Boolean(presentation.defeatSequence));
  for (let i = 0; i < 100; i++) {
    const cell = cells[i];
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
        `Row ${Math.floor(i / 10) + 1}, column ${(i % 10) + 1}: ${color || (legal.includes(i) ? "legal move" : "empty")}`,
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
    cell.classList.toggle(
      "defeat-six",
      presentation.defeatLines?.some((line) => line.includes(i)) ?? false,
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
  board.setAttribute("aria-label", t("board.label"));
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    board.append(cell);
  }
  updateBoard(board, state, enabled, move, presentation);
  return board;
}
