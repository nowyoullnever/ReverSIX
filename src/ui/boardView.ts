import { getMoveOptions } from "../game/rules";
import type { GameState, Player } from "../game/types";
import type { BoardChange } from "./transitions";
import { t } from "../i18n/i18n";
import { randomBoardColors } from "./boardColors";
const revisions = new WeakMap<HTMLElement, number>();
export interface BoardPresentation {
  change?: BoardChange;
  lastPlaced?: number;
  six?: number[];
  defeatLines?: number[][];
  defeatPlayer?: Player;
  defeatSequence?: boolean;
}
const svg = (name: string) =>
  document.createElementNS("http://www.w3.org/2000/svg", name);
const applyBoardColor = (cell: HTMLElement, index: number) => {
  cell.style.backgroundColor =
    (Math.floor(index / 10) + (index % 10)) % 2 === 0
      ? "var(--board-color-a)"
      : "var(--board-color-b)";
};
function drawDefeatLines(board: HTMLElement, lines: number[][] = [], player?:Player) {
  let overlay = board.querySelector<SVGSVGElement>(":scope > .six-lines");
  if (!overlay) {
    overlay = svg("svg") as SVGSVGElement;
    overlay.classList.add("six-lines");
    overlay.setAttribute("viewBox", "0 0 100 100");
    overlay.setAttribute("preserveAspectRatio", "none");
    overlay.setAttribute("aria-hidden", "true");
    board.append(overlay);
  }
  const key=player&&lines.length?`${player}:${lines.map(line=>line.join(",")).sort().join("|")}`:"";
  if(overlay.dataset.linesKey===key)return;
  overlay.dataset.linesKey=key;
  overlay.replaceChildren(
    ...lines.map((line) => {
      const start = line[0],
        end = line.at(-1)!;
      const path = svg("line");
      path.classList.add("defeat-six-line");
      if(player)path.classList.add(`winner-${player}`);
      path.setAttribute("pathLength","1");
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
  const { legal, forbidden } = getMoveOptions(state);
  const cells = board.querySelectorAll<HTMLButtonElement>(":scope > .cell");
  drawDefeatLines(board, presentation.defeatLines, presentation.defeatPlayer);
  board.classList.toggle("defeat-sequence", Boolean(presentation.defeatSequence));
  for (let i = 0; i < 100; i++) {
    const cell = cells[i];
    applyBoardColor(cell, i);
    const color = state.board[i];
    cell.disabled = !enabled || !legal.includes(i);
    cell.onclick = () => {
      if (!cell.disabled) move(i);
    };
    if (changed) {
      const boardColor = (Math.floor(i / 10) + (i % 10)) % 2 ? "board-color-b" : "board-color-a";
      cell.className = `cell ${boardColor} ${color} ${!color && legal.includes(i) ? "legal" : ""} ${!color && forbidden.includes(i) ? "forbidden" : ""}`;
      cell.replaceChildren();
      if (!color && forbidden.includes(i)) {
        const mark=document.createElement("span");
        mark.className="forbidden-mark";
        mark.textContent="🚫";
        mark.setAttribute("aria-hidden","true");
        cell.append(mark);
      }
      cell.setAttribute(
        "aria-label",
        t("board.cell", { row: Math.floor(i / 10) + 1, column: String.fromCharCode(65 + i % 10), state: color ? t(`game.${color}`) : forbidden.includes(i) ? t("board.forbidden") : legal.includes(i) ? t("board.legal") : t("board.empty") }),
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
  const colors = randomBoardColors();
  board.style.setProperty("--board-color-a", colors.a);
  board.style.setProperty("--board-color-b", colors.b);
  board.setAttribute("aria-label", t("board.label"));
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement("button");
    cell.className = `cell board-color-${(Math.floor(i / 10) + i % 10) % 2 ? "b" : "a"}`;
    board.append(cell);
    applyBoardColor(cell, i);
  }
  updateBoard(board, state, enabled, move, presentation);
  return board;
}

export function boardWithCoordinates(
  state: GameState,
  enabled: boolean,
  move: (i: number) => void,
  presentation: BoardPresentation = {},
): HTMLElement {
  const frame=document.createElement("div"); frame.className="board-coordinate-frame";
  const columns=document.createElement("div"); columns.className="board-column-coordinates"; columns.setAttribute("aria-hidden","true");
  const rows=document.createElement("div"); rows.className="board-row-coordinates"; rows.setAttribute("aria-hidden","true");
  for(let i=0;i<10;i++){
    const column=document.createElement("span"); column.textContent=String.fromCharCode(65+i); columns.append(column);
    const row=document.createElement("span"); row.textContent=String(i+1); rows.append(row);
  }
  frame.append(columns,rows,boardView(state,enabled,move,presentation));
  return frame;
}
