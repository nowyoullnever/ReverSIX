import { expect, it } from "vitest";
import { createGame, playMove } from "../src/game/gameState";
import {
  recordMove,
  canUndo,
  undoMove,
  restoreSnapshot,
} from "../src/game/history";
import { getMoveOptions } from "../src/game/rules";
import { emptyBoard } from "../src/game/board";
import { undoRoomState, type Room } from "../src/online/rooms";
function firstMove() {
  const start = playMove(createGame(), "black", 34),
    after = playMove(start, "white", 33);
  return { start, after, history: recordMove(undefined, start, after) };
}
it("undoes the first move including all flips and restores legal/forbidden squares", () => {
  const { start, after, history } = firstMove();
  expect(canUndo(after, "white", history)).toBe(true);
  const restored = undoMove(after, "white", history);
  expect(restored.game).toEqual({ ...start, revision: after.revision + 1 });
  expect(getMoveOptions(restored.game)).toEqual(getMoveOptions(start));
  expect(restored.history).toBeUndefined();
});
it("snapshot restoration supports a second move and two successive restorations without rolling revision back", () => {
  const { start, after, history } = firstMove();
  const end = playMove(after, "white", getMoveOptions(after).legal[0]);
  const both = recordMove(history, after, end);
  expect(both.before).toHaveLength(2);
  const second = restoreSnapshot(end, both.before[1]);
  expect(second.moveNumberInTurn).toBe(2);
  expect(second.board).toEqual(after.board);
  const first = restoreSnapshot(second, both.before[0]);
  expect(first.board).toEqual(start.board);
  expect(first.revision).toBe(end.revision + 2);
});
it("online policy rejects second-move undo as soon as the turn transfers", () => {
  const { after, history } = firstMove();
  const end = playMove(after, "white", getMoveOptions(after).legal[0]);
  const both = recordMove(history, after, end);
  expect(end.currentPlayer).toBe("black");
  expect(canUndo(end, "white", both)).toBe(false);
  expect(() => undoMove(end, "white", both)).toThrow("UNDO IS NOT AVAILABLE");
});
it("rejects undo after the opponent moves and after revision conflicts", () => {
  const { after, history } = firstMove();
  expect(() =>
    undoMove({ ...after, revision: after.revision + 1 }, "white", history),
  ).toThrow("STATE CHANGED");
  expect(canUndo({ ...after, currentPlayer: "black" }, "white", history)).toBe(
    false,
  );
  expect(() =>
    undoMove(
      { ...after, currentPlayer: "black", revision: after.revision + 2 },
      "white",
      history,
    ),
  ).toThrow();
});
it("snapshot restoration removes CHECK and restores counter-check state consistently", () => {
  const b = emptyBoard();
  [40, 41, 42, 43, 44].forEach((i) => (b[i] = "black"));
  b[55] = "white";
  b[65] = "black";
  b[12] = "white";
  b[22] = "black";
  const first = playMove({ ...createGame(), board: b, turn: 1 }, "black", 45),
    end = playMove(first, "black", 2);
  expect(end.checkBy).toBe("black");
  expect(restoreSnapshot(end, first).checkBy).toBe("");
  const defending = { ...first, checkBy: "white" as const };
  expect(restoreSnapshot({ ...end, checkBy: "black" }, defending).checkBy).toBe(
    "white",
  );
});
it("cannot undo in finished/waiting games, without history, or someone elses move", () => {
  const { after, history } = firstMove();
  const room: Room = {
    status: "playing",
    createdAt: 1,
    players: { black: "a", white: "b" },
    game: after,
  };
  expect(canUndo(after, "white", undefined)).toBe(false);
  expect(() => undoRoomState(room, "a", history)).toThrow("NOT YOUR TURN");
  expect(() =>
    undoRoomState({ ...room, status: "finished" }, "b", history),
  ).toThrow("GAME IS NOT ACTIVE");
  expect(() =>
    undoRoomState({ ...room, status: "waiting" }, "b", history),
  ).toThrow("GAME IS NOT ACTIVE");
  expect(canUndo({ ...after, winner: "white" }, "white", history)).toBe(false);
});
it("history is bounded and does not cross players or turns", () => {
  const { after, history } = firstMove();
  const end = playMove(after, "white", getMoveOptions(after).legal[0]);
  const both = recordMove(history, after, end);
  const next = playMove(end, "black", getMoveOptions(end).legal[0]);
  expect(recordMove(both, end, next).before).toHaveLength(1);
});
