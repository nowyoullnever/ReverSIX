import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, onValue, ref, runTransaction, set } from "firebase/database";
import { createGame } from "../src/game/gameState";
import {
  joinRoomState,
  moveRoomState,
  normalizeRoom,
  undoRoomState,
  type Room,
} from "../src/online/rooms";
import { recordMove } from "../src/game/history";
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-reversix",
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: readFileSync("database.rules.json", "utf8"),
    },
  });
});
beforeEach(async () => env.clearDatabase());
afterAll(async () => env?.cleanup());
const db = (uid: string) => env.authenticatedContext(uid).database();
const waiting = (): Room => ({
  status: "waiting",
  createdAt: 1,
  players: { black: "a" },
  game: createGame(),
});
it("two clients share first and second moves; stale and out-of-turn writes fail", async () => {
  const a = ref(db("a"), "rooms/ABC234"),
    b = ref(db("b"), "rooms/ABC234");
  await set(a, waiting());
  const joined = joinRoomState((await get(b)).val(), "b");
  await set(b, joined);
  const first = moveRoomState(joined, "a", 0, 34);
  await set(a, first);
  expect(normalizeRoom((await get(b)).val())).toEqual(first);
  await assertFails(set(a, { ...first, game: { ...first.game, revision: 2 } }));
  const second = moveRoomState(first, "b", 1, 33);
  await set(b, second);
  expect(second.game.moveNumberInTurn).toBe(2);
  expect(normalizeRoom((await get(a)).val())).toEqual(second);
  await assertFails(set(b, second));
  const observed = new Promise<Room>((resolve) => {
    const off = onValue(a, (s) => {
      if (s.val()?.game?.revision === 3) {
        off();
        resolve(normalizeRoom(s.val()));
      }
    });
  });
  const { getMoveOptions } = await import("../src/game/rules");
  const third = moveRoomState(
    second,
    "b",
    2,
    getMoveOptions(second.game).legal[0],
  );
  await set(b, third);
  expect(await observed).toEqual(third);
});
it("simultaneous join transactions admit exactly one white player", async () => {
  await set(ref(db("a"), "rooms/ABC234"), waiting());
  const clients = ["b", "c"].map((uid) => ({
    uid,
    r: ref(db(uid), "rooms/ABC234"),
  }));
  const snapshots = await Promise.all(clients.map((c) => get(c.r)));
  const results = await Promise.all(
    clients.map((c, i) =>
      runTransaction(
        c.r,
        (current) => {
          try {
            return joinRoomState(current ?? snapshots[i].val(), c.uid);
          } catch {
            return;
          }
        },
        { applyLocally: false },
      ),
    ),
  );
  expect(results.filter((r) => r.committed)).toHaveLength(1);
});
it("blocks anonymous reads, room enumeration, third player writes and identity replacement", async () => {
  const a = ref(db("a"), "rooms/ABC234");
  await set(a, waiting());
  await assertFails(
    get(ref(env.unauthenticatedContext().database(), "rooms/ABC234")),
  );
  await assertFails(get(ref(db("a"), "rooms")));
  const r = joinRoomState(waiting(), "b");
  await set(ref(db("b"), "rooms/ABC234"), r);
  await assertFails(
    set(ref(db("c"), "rooms/ABC234"), {
      ...r,
      game: { ...r.game, revision: 1 },
    }),
  );
  await assertFails(
    set(a, {
      ...r,
      players: { black: "a", white: "c" },
      game: { ...r.game, revision: 1 },
    }),
  );
});
it("presence is member-only and each player owns their connection entries", async () => {
  await set(ref(db("a"), "rooms/ABC234"), waiting());
  await set(ref(db("a"), "presence/ABC234/a/tab1"), true);
  await assertFails(set(ref(db("b"), "presence/ABC234/a/tab2"), true));
  await assertFails(get(ref(db("b"), "presence/ABC234")));
});
it("UNDO transaction restores both clients and advances revision with existing rules", async () => {
  const a = ref(db("a"), "rooms/ABC234"),
    b = ref(db("b"), "rooms/ABC234");
  await set(a, waiting());
  const joined = joinRoomState(waiting(), "b");
  await set(b, joined);
  const opening = moveRoomState(joined, "a", 0, 34);
  await set(a, opening);
  const first = moveRoomState(opening, "b", 1, 33);
  await set(b, first);
  const history = recordMove(undefined, opening.game, first.game);
  const result = await runTransaction(
    b,
    (current) => undoRoomState(current ?? first, "b", history),
    { applyLocally: false },
  );
  expect(result.committed).toBe(true);
  const restored = normalizeRoom((await get(a)).val());
  expect(restored.game).toEqual({ ...opening.game, revision: 3 });
  expect(normalizeRoom((await get(b)).val())).toEqual(restored);
  await assertFails(set(b, restored));
});
it("UNDO rejects stale revision and cannot write after the opponent turn starts", async () => {
  const a = ref(db("a"), "rooms/ABC234"),
    b = ref(db("b"), "rooms/ABC234");
  await set(a, waiting());
  const joined = joinRoomState(waiting(), "b");
  await set(b, joined);
  const opening = moveRoomState(joined, "a", 0, 34);
  await set(a, opening);
  const first = moveRoomState(opening, "b", 1, 33);
  await set(b, first);
  const history = recordMove(undefined, opening.game, first.game);
  const { getMoveOptions } = await import("../src/game/rules");
  const second = moveRoomState(
    first,
    "b",
    2,
    getMoveOptions(first.game).legal[0],
  );
  await set(b, second);
  expect(() => undoRoomState(second, "b", history)).toThrow("STATE CHANGED");
  await assertFails(set(b, { ...first, game: { ...first.game, revision: 4 } }));
});
