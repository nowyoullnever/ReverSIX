import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css=readFileSync(new URL("../src/style.css",import.meta.url),"utf8");
const board=readFileSync(new URL("../src/ui/boardView.ts",import.meta.url),"utf8");

it("anchors CHECK rings to stones with fixed contrasting colors",()=>{
  expect(css).toContain(".six-highlight .stone::before");
  expect(css).toMatch(/\.black\.six-highlight \.stone::before\s*\{[^}]*#fff/s);
  expect(css).toMatch(/\.white\.six-highlight \.stone::before\s*\{[^}]*#000/s);
  expect(css).not.toContain(".six-highlight::after");
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
