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

it("draws each result line once before retaining a solid line",()=>{
  expect(css).toContain("stroke-dasharray: 1");
  expect(css).toContain("defeat-line-draw 650ms");
  expect(css).toContain(".winner-black { stroke:#fff; }");
  expect(css).toContain(".winner-white { stroke:#000; }");
  expect(board).toContain('path.setAttribute("pathLength","1")');
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

it("places UNDO before BACK TO LOBBY in every game control DOM",()=>{
  for(const view of [onlineView,localView]) expect(view.indexOf('class="undo"')).toBeLessThan(view.indexOf('class="back"'));
});
