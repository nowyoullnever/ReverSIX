import { expect, it } from "vitest";
import { createGame } from "../src/game/gameState";
import {
  CODE_PATTERN,
  joinRoomState,
  moveRoomState,
  randomCode,
  type Room,
} from "../src/online/rooms";
const room = (): Room => ({
  status: "waiting",
  createdAt: 1,
  players: { black: "a" },
  game: createGame(),
});
it("creates unambiguous six-character codes", () => {
  for (let i = 0; i < 100; i++) expect(randomCode()).toMatch(CODE_PATTERN);
});
it("joins exactly one white player", () => {
  expect(joinRoomState(room(), "b").players).toEqual({
    black: "a",
    white: "b",
  });
});
it("rejects missing, duplicate and full rooms", () => {
  expect(() => joinRoomState(null, "b")).toThrow("ROOM NOT FOUND");
  expect(() => joinRoomState(room(), "a")).toThrow("ALREADY");
  expect(() => joinRoomState(joinRoomState(room(), "b"), "c")).toThrow(
    "ROOM FULL",
  );
});
it("rejects out of turn and stale / duplicate moves", () => {
  const r = joinRoomState(room(), "b");
  expect(() => moveRoomState(r, "b", 0, 34)).toThrow("NOT YOUR TURN");
  const next = moveRoomState(r, "a", 0, 34);
  expect(next.game.revision).toBe(1);
  expect(() => moveRoomState(next, "b", 0, 33)).toThrow("STATE CHANGED");
});
