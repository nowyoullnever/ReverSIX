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

it("uses Dongle Regular as the application font",()=>{
  expect(css).toContain('font-family: Dongle;');
  expect(css).toContain('url("/fonts/Dongle-Regular.ttf") format("truetype")');
  expect(css).toContain('font-family: Dongle, sans-serif;');
  expect(css).not.toContain('font-family: MaruBuri');
  expect(css).toContain('font-size: 20px;');
  expect(css).toContain('html[lang="ko"] { font-size: 17px; }');
});

it("uses uninterrupted solid result lines",()=>{
  expect(css).not.toContain("stroke-dasharray");
  expect(css).not.toContain("stroke-dashoffset");
  expect(board).not.toContain("pathLength");
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
  for(const view of [onlineView,localView]) expect(view.indexOf('class="text-button undo"')).toBeLessThan(view.indexOf('class="back"'));
});
