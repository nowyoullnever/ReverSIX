import { describe, expect, it } from "vitest";
import { emptyBoard, initialBoard } from "../src/game/board";
import { applyMove, getFlips, getLegalMoves } from "../src/game/reversi";
import { getSixLines } from "../src/game/six";
import { getMoveOptions } from "../src/game/rules";
import { createGame, playMove, settlePasses } from "../src/game/gameState";
import type { Board, GameState } from "../src/game/types";
function state(board: Board, extra: Partial<GameState> = {}): GameState {
  return { ...createGame(), board, turnStartBoard: [...board], turn: 1, ...extra };
}
function fill(
  board: Board,
  indices: number[],
  color: "black" | "white" = "black",
) {
  indices.forEach((i) => (board[i] = color));
}
describe("Reversi", () => {
  it("initial placement and four opening moves", () => {
    expect(initialBoard().slice(44, 46)).toEqual(["white", "black"]);
    expect(getLegalMoves(initialBoard(), "black")).toEqual([34, 43, 56, 65]);
  });
  it.each([1, 10, 11, 9])("flips along direction %i", (step) => {
    const b = emptyBoard();
    b[24] = "black";
    b[24 + step] = "white";
    b[24 + step * 2] = "white";
    expect(getFlips(b, "black", 24 + step * 3)).toEqual([
      24 + step * 2,
      24 + step,
    ]);
    expect(applyMove(b, "black", 24 + step * 3)[24 + step]).toBe("black");
  });
  it("flips in all eight directions at once without mutating input", () => {
    const b = emptyBoard();
    for (const step of [-11, -10, -9, -1, 1, 9, 10, 11]) {
      b[44 + step] = "white";
      b[44 + step * 2] = "black";
    }
    expect(getFlips(b, "black", 44)).toHaveLength(8);
    expect(applyMove(b, "black", 44).filter((c) => c === "black")).toHaveLength(
      17,
    );
    expect(b[44]).toBe("");
  });
  it("rejects occupied, unbracketed, out of range and row-wrapping moves", () => {
    const b = initialBoard();
    for (const i of [44, 0, -1, 100, 1.5])
      expect(() => applyMove(b, "black", i)).toThrow();
    const edge = emptyBoard();
    edge[9] = "black";
    edge[10] = "white";
    expect(getFlips(edge, "black", 11)).toEqual([]);
  });
});
describe("sequential turns", () => {
  it("black opens with one, white then plays twice and recomputes moves", () => {
    const opening = playMove(createGame(), "black", 34);
    expect(opening.currentPlayer).toBe("white");
    expect(opening.turn).toBe(1);
    expect(opening.turnStartBoard).toEqual(opening.board);
    expect(opening.turnStartBoard).not.toBe(opening.board);
    const options = getMoveOptions(opening).legal;
    const first = playMove(opening, "white", options[0]);
    expect(first.moveNumberInTurn).toBe(2);
    expect(first.currentPlayer).toBe("white");
    expect(first.board).not.toEqual(opening.board);
    expect(first.turnStartBoard).toEqual(opening.board);
    expect(getMoveOptions(first).legal).not.toEqual(options);
    const second = playMove(first, "white", getMoveOptions(first).legal[0]);
    expect(second.currentPlayer).toBe("black");
    expect(second.turnStartBoard).toEqual(second.board);
    expect(second.turnStartBoard).not.toBe(second.board);
    expect(second.revision).toBe(3);
    expect(() => playMove(opening, "black", 43)).toThrow("NOT YOUR TURN");
  });
  it("A→B and B→A can have different final boards", () => {
    let seed = 19;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    let found = false;
    for (let n = 0; n < 300 && !found; n++) {
      const b = Array.from({ length: 100 }, () => {
        const r = random();
        return r < 0.4 ? "black" : r < 0.8 ? "white" : "";
      }) as Board;
      const legal = getLegalMoves(b, "black");
      for (const a of legal)
        for (const c of legal) {
          if (a === c) continue;
          const ab = applyMove(b, "black", a),
            ba = applyMove(b, "black", c);
          if (
            getFlips(ab, "black", c).length &&
            getFlips(ba, "black", a).length &&
            JSON.stringify(applyMove(ab, "black", c)) !==
              JSON.stringify(applyMove(ba, "black", a))
          )
            found = true;
        }
    }
    expect(found).toBe(true);
  });
});
describe("Double-Six", () => {
  it.each([
    [20, 1, 10],
    [2, 10, 1],
    [11, 11, 10],
    [71, -9, -10],
  ])("allows two new endpoints for axis %j", (start, step, side) => {
    const b = emptyBoard();
    fill(
      b,
      [1, 2, 3, 4].map((n) => start + n * step),
    );
    for (const end of [start, start + 5 * step]) {
      b[end + side] = "white";
      b[end + 2 * side] = "black";
    }
    const first = playMove(state(b), "black", start);
    const middle = state(applyMove(b, "black", start), {
      moveNumberInTurn: 2,
      firstPlacedStone: start,
    });
    expect(getMoveOptions(middle).legal).toContain(start + 5 * step);
    expect(first.board[start]).toBe("black");
  });
  it("allows a middle gap after second-move flips complete the run", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 44, 45]);
    b[43] = "white";
    const s = state(b, { moveNumberInTurn: 2, firstPlacedStone: 40 });
    expect(getMoveOptions(s).legal).toContain(42);
  });
  it("allows two stones in one maximal seven-stone run", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44, 45]);
    b[56] = "white";
    b[66] = "black";
    expect(
      getMoveOptions(state(b, { moveNumberInTurn: 2, firstPlacedStone: 40 }))
        .legal,
    ).toContain(46);
  });
  it("allows same-line placements when the connection stays shorter than six", () => {
    const b = emptyBoard();
    fill(b, [40, 41]);
    b[52] = "white";
    b[62] = "black";
    expect(
      getMoveOptions(state(b, { moveNumberInTurn: 2, firstPlacedStone: 40 }))
        .legal,
    ).toContain(42);
  });
  it("allows a SIX that does not contain both new stones", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44, 11]);
    b[55] = "white";
    b[65] = "black";
    expect(
      getMoveOptions(state(b, { moveNumberInTurn: 2, firstPlacedStone: 11 }))
        .legal,
    ).toContain(45);
  });
});
describe("EXACT SIX and CHECK", () => {
  it.each([
    [40, 1, "horizontal"],
    [4, 10, "vertical"],
    [11, 11, "down-right diagonal"],
    [81, -9, "up-right diagonal"],
  ])("recognizes an exact six on the %s", (start, step) => {
    const b = emptyBoard();
    fill(
      b,
      Array.from({ length: 6 }, (_, i) => start + i * step),
    );
    expect(getSixLines(b, "black")).toEqual([
      Array.from({ length: 6 }, (_, i) => start + i * step),
    ]);
  });
  it.each([
    [40, 1, 7, "horizontal seven"],
    [40, 1, 8, "horizontal eight"],
    [40, 1, 10, "horizontal ten"],
    [4, 10, 7, "vertical seven"],
    [11, 11, 7, "down-right diagonal seven"],
    [81, -9, 7, "up-right diagonal seven"],
  ])("does not treat %s as a SIX", (start, step, length) => {
    const b = emptyBoard();
    fill(
      b,
      Array.from({ length }, (_, i) => start + i * step),
    );
    expect(getSixLines(b, "black")).toEqual([]);
  });
  it("does not split a seven-stone run into six-cell windows", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44, 45, 46]);
    expect(getSixLines(b, "black")).toHaveLength(0);
  });
  it("recognizes a SIX created by flipping", () => {
    const b = emptyBoard();
    b[40] = "black";
    fill(b, [41, 42, 43, 44], "white");
    expect(getSixLines(applyMove(b, "black", 45), "black")).toEqual([
      [40, 41, 42, 43, 44, 45],
    ]);
  });
  it("does not CHECK when a flip creates an overline", () => {
    const b = emptyBoard();
    b[40] = b[41] = "black";
    fill(b, [42, 43, 44, 45], "white");
    expect(getSixLines(applyMove(b, "black", 46), "black")).toEqual([]);
    const end = playMove(
      state(b, { moveNumberInTurn: 2, firstPlacedStone: 99 }),
      "black",
      46,
    );
    expect(end.checkBy).toBe("");
  });
  it("waits for the end of the turn before CHECK", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44]);
    b[55] = "white";
    b[65] = "black";
    b[12] = "white";
    b[22] = "black";
    const first = playMove(state(b), "black", 45);
    expect(first.moveNumberInTurn).toBe(2);
    expect(first.checkBy).toBe("");
    const end = playMove(first, "black", 2);
    expect(end.checkBy).toBe("black");
  });
  function defense(extra: Partial<GameState> = {}) {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44, 45]);
    b[54] = "white";
    b[12] = "black";
    b[22] = "white";
    return state(b, { currentPlayer: "white", checkBy: "black", ...extra });
  }
  it("defends by removing every opposing SIX", () => {
    const first = playMove(defense(), "white", 34);
    expect(first.checkBy).toBe("black");
    const end = playMove(first, "white", 2);
    expect(end.winner).not.toBe("black");
    expect(end.checkBy).not.toBe("black");
  });
  it("treats a defended black overline as no remaining CHECK", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44, 45, 46]);
    fill(b, [0, 1, 2, 3, 4, 5, 6, 7], "white");
    const result = settlePasses(
      state(b, { currentPlayer: "white", checkBy: "black" }),
    );
    expect(result.events).not.toContain("CHECK DEFENSE FAILED");
  });
  it("keeps CHECK when an overline coexists with another exact six", () => {
    const b = emptyBoard();
    fill(b, [0, 1, 2, 3, 4, 5, 6]);
    fill(b, [40, 41, 42, 43, 44, 45]);
    expect(getSixLines(b, "black")).toEqual([[40, 41, 42, 43, 44, 45]]);
  });
  it("fails when an opposing SIX remains at the end", () => {
    const s = defense({ moveNumberInTurn: 2, firstPlacedStone: 99 });
    expect(playMove(s, "white", 2).winner).toBe("black");
  });
  it("loses after breaking only one of multiple SIX lines", () => {
    const s = defense({ moveNumberInTurn: 2, firstPlacedStone: 99 });
    fill(s.board, [70, 71, 72, 73, 74, 75]);
    s.turnStartBoard = [...s.board];
    expect(playMove(s, "white", 34).winner).toBe("black");
  });
  it("counter-checks after successful defense", () => {
    const s = defense({ moveNumberInTurn: 2, firstPlacedStone: 99 });
    fill(s.board, [30, 31, 32, 33, 35], "white");
    const end = playMove(s, "white", 34);
    expect(end.checkBy).toBe("white");
    expect(end.winner).not.toBe("black");
  });
  it("CHECK defense failure takes priority over a defenders own SIX", () => {
    const s = defense({ moveNumberInTurn: 2, firstPlacedStone: 99 });
    fill(s.board, [70, 71, 72, 73, 74, 75], "white");
    s.turnStartBoard = [...s.board];
    expect(playMove(s, "white", 2).winner).toBe("black");
  });
  it("loses on PASS while in CHECK", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44, 45]);
    expect(
      settlePasses(state(b, { currentPlayer: "white", checkBy: "black" }))
        .winner,
    ).toBe("black");
  });
});
describe("automatic pass and skips", () => {
  it("skips a second move when no Reversi move remains", () => {
    const b = emptyBoard();
    b[40] = "black";
    b[41] = "white";
    const end = playMove(state(b), "black", 42);
    expect(end.events).toContain("BLACK SECOND MOVE SKIPPED");
    expect(end.winner).toBe("black");
  });
  it("does not skip when a second Reversi move remains", () => {
    const b = emptyBoard();
    fill(b, [21, 22, 23, 24]);
    b[30] = b[35] = "white";
    b[40] = b[45] = b[46] = "black";
    const end = playMove(state(b), "black", 20);
    expect(end.events).not.toContain("BLACK SECOND MOVE SKIPPED");
    expect(end.moveNumberInTurn).toBe(2);
  });
  it("judges CHECK after a one-move turn with no second move", () => {
    const b = emptyBoard();
    fill(b, [40, 41, 42, 43, 44]);
    b[55] = "white";
    b[65] = "black";
    const end = playMove(state(b), "black", 45);
    expect(end.checkBy).toBe("black");
    expect(end.winner).toBe("black");
  });
  it.each([
    ["black", 3, 2],
    ["white", 2, 3],
    ["draw", 2, 2],
  ] as const)("counts stones after two passes: %s", (winner, black, white) => {
    const b = emptyBoard();
    fill(
      b,
      Array.from({ length: black }, (_, i) => i),
    );
    fill(
      b,
      Array.from({ length: white }, (_, i) => 90 + i),
      "white",
    );
    const end = settlePasses(state(b));
    expect(end.winner).toBe(winner);
    expect(end.consecutivePasses).toBe(2);
  });
});
