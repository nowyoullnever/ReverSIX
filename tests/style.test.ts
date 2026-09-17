import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css=readFileSync(new URL("../src/style.css",import.meta.url),"utf8");
const board=readFileSync(new URL("../src/ui/boardView.ts",import.meta.url),"utf8");
const onlineView=readFileSync(new URL("../src/ui/gameView.ts",import.meta.url),"utf8");
const localView=readFileSync(new URL("../src/ui/localGameView.ts",import.meta.url),"utf8");

it("anchors CHECK rings to stones with fixed contrasting colors",()=>{
  expect(css).toContain(".six-highlight .stone::before");
  expect(css).toMatch(/\.black\.six-highlight \.stone::before\s*\{[^}]*#fff/s);
  expect(css).toMatch(/\.white\.six-highlight \.stone::before\s*\{[^}]*#000/s);
  expect(css).toContain('main[data-check-ring="off"] .six-highlight .stone::before { display:none; }');
  expect(css).not.toContain(".six-highlight::after");
});

it("renders every result line as a solid SVG line",()=>{
  expect(css).not.toContain("stroke-dasharray");
  expect(css).not.toContain("stroke-dashoffset");
  expect(css).not.toContain("defeat-line-draw");
  expect(css).toContain(".winner-black { stroke:#fff; }");
  expect(css).toContain(".winner-white { stroke:#000; }");
  expect(board).not.toContain('path.setAttribute("pathLength","1")');
});

it("uses only the required forbidden board marker",()=>{
  expect(board).toContain('mark.textContent="🚫"');
  expect(board).not.toContain('cell.textContent = "×"');
});

it("sizes the board from available width without a viewport-height cap",()=>{
  expect(css).toMatch(/\.board\s*\{[^}]*width:\s*100%;[^}]*aspect-ratio:\s*1/s);
  expect(css).toMatch(/\.board-wrap\s*\{[^}]*width:\s*min\(100%,\s*680px\);/s);
  expect(css).not.toContain("calc(100dvh - 290px)");
});

it("lets the board own every 10 by 10 grid track",()=>{
  const boardRule=css.match(/\.board\s*\{[^}]*\}/s)?.[0]??"",cellRule=css.match(/\.cell\s*\{[^}]*\}/s)?.[0]??"";
  expect(boardRule).toContain("grid-template-columns: repeat(10, minmax(0, 1fr))");
  expect(boardRule).toContain("grid-template-rows: repeat(10, minmax(0, 1fr))");
  expect(cellRule).toMatch(/width:\s*100%;/);
  expect(cellRule).toMatch(/height:\s*100%;/);
  expect(cellRule).not.toContain("aspect-ratio");
});
it("keeps victory SIX lines above every board-cell graphic",()=>{
  const boardRule=css.match(/\.board\s*\{[^}]*\}/s)?.[0]??"",cellRule=css.match(/\.cell\s*\{[^}]*\}/s)?.[0]??"",stoneRule=css.match(/\.stone\s*\{[^}]*\}/s)?.[0]??"",linesRule=css.match(/\.six-lines\s*\{[^}]*\}/s)?.[0]??"";
  expect(boardRule).toContain("isolation: isolate");
  expect(cellRule).toContain("z-index: 0");
  expect(stoneRule).toContain("z-index: 1");
  expect(linesRule).toContain("z-index: 10");
  expect(css).toMatch(/\.countdown-overlay\s*\{[^}]*z-index:20/s);
  expect(board).toContain("board.append(overlay)");
  expect(board).not.toContain("board.prepend(overlay)");
});
it("centers legal and turn-placement markers without legacy offsets",()=>{
  expect(css).toContain(".turn-placed .stone::after");
  expect(css).toContain(".legal::after");
  expect(css).toMatch(/\.turn-placed \.stone::after\s*\{[^}]*left:50%;[^}]*top:50%;[^}]*translate\(-50%, -50%\)/s);
  expect(css).toMatch(/\.legal::after\s*\{[^}]*left:50%;[^}]*top:50%;[^}]*translate\(-50%, -50%\)/s);
  expect(css).toContain(".white.turn-placed .stone::after { background:#000; }");
  expect(css).not.toContain("last-placed");
  expect(css).not.toContain(".first .stone");
});

it("places UNDO before BACK TO LOBBY in every game control DOM",()=>{
  for(const view of [onlineView,localView]) expect(view.indexOf('class="undo"')).toBeLessThan(view.indexOf('class="back"'));
});
