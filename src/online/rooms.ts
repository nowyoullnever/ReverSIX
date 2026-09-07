import { get, ref, runTransaction } from "firebase/database";
import { createGame, playMove } from "../game/gameState";
import type { GameState, Player } from "../game/types";
import { connection } from "./firebase";
export interface Room {
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  players: { black: string; white?: string };
  game: GameState;
}
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
export function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (n) => alphabet[n % alphabet.length],
  ).join("");
}
export function normalizeRoom(room: Room): Room {
  return { ...room, game: { ...room.game, events: room.game.events ?? [] } };
}
export function joinRoomState(room: Room | null, uid: string): Room {
  if (!room) throw new Error("ROOM NOT FOUND");
  if (room.players.black === uid || room.players.white === uid)
    throw new Error("ALREADY IN THIS ROOM");
  if (room.players.white || room.status !== "waiting")
    throw new Error("ROOM FULL");
  return {
    ...room,
    players: { ...room.players, white: uid },
    status: "playing",
  };
}
export function moveRoomState(
  room: Room,
  uid: string,
  revision: number,
  index: number,
): Room {
  if (room.status !== "playing") throw new Error("GAME IS NOT ACTIVE");
  const player: Player = room.game.currentPlayer;
  if (room.players[player] !== uid) throw new Error("NOT YOUR TURN");
  if (room.game.revision !== revision)
    throw new Error("STATE CHANGED — TRY AGAIN");
  const game = playMove(normalizeRoom(room).game, player, index);
  return { ...room, game, status: game.winner ? "finished" : "playing" };
}
export async function createRoom(): Promise<string> {
  const { db, uid } = await connection();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const result = await runTransaction(
      ref(db, `rooms/${code}`),
      (current) =>
        current
          ? undefined
          : {
              status: "waiting",
              createdAt: Date.now(),
              players: { black: uid },
              game: createGame(),
            },
      { applyLocally: false },
    );
    if (result.committed) return code;
  }
  throw new Error("COULD NOT CREATE ROOM — TRY AGAIN");
}
export async function joinRoom(code: string): Promise<void> {
  if (!CODE_PATTERN.test(code))
    throw new Error("ENTER A VALID 6-CHARACTER CODE");
  const { db, uid } = await connection();
  const roomRef = ref(db, `rooms/${code}`);
  // Transactions may initially receive null even after get(). Seed that first
  // proposal from the read; the server still checks/retries against its hash.
  const snapshot = await get(roomRef);
  joinRoomState(snapshot.val(), uid);
  let failure = "ROOM FULL";
  const result = await runTransaction(
    roomRef,
    (current) => {
      try {
        return joinRoomState(current ?? snapshot.val(), uid);
      } catch (e) {
        failure = (e as Error).message;
        return;
      }
    },
    { applyLocally: false },
  );
  if (!result.committed) throw new Error(failure);
}
export async function submitMove(
  code: string,
  revision: number,
  index: number,
) {
  const { db, uid } = await connection();
  let failure = "ROOM NOT FOUND";
  const result = await runTransaction(
    ref(db, `rooms/${code}`),
    (current) => {
      if (!current) return;
      try {
        return moveRoomState(current, uid, revision, index);
      } catch (e) {
        failure = (e as Error).message;
        return;
      }
    },
    { applyLocally: false },
  );
  if (!result.committed) throw new Error(failure);
}
