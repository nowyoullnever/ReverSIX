import { get, ref, runTransaction } from "firebase/database";
import { createGame, playMove } from "../game/gameState";
import { DEFAULT_SETTINGS, commitElapsed, initialClock, mayUndo, replayMoves, validSettings, type ClockState, type GameSettings, type MoveRecord } from "../game/session";
import { other, type Player } from "../game/types";
import { connection } from "./firebase";

export interface RematchState { black: boolean; white: boolean; generation: number }
export interface Room {
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  players: { black: string; white?: string };
  settings?: GameSettings;
  clock?: ClockState;
  moveLog?: MoveRecord[];
  rematch?: RematchState;
  game: ReturnType<typeof createGame>;
}
export interface NormalizedRoom extends Room { settings:GameSettings; clock:ClockState; moveLog:MoveRecord[]; rematch:RematchState }
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
export function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join("");
}
export function newRoom(uid: string, settings: GameSettings = DEFAULT_SETTINGS, now = Date.now()): NormalizedRoom {
  if (!validSettings(settings)) throw new Error("INVALID GAME SETTINGS");
  return { status: "waiting", createdAt: now, players: { black: uid }, settings: { ...settings }, clock: initialClock(settings), moveLog: [], rematch: { black: false, white: false, generation: 0 }, game: createGame() };
}
export function normalizeRoom(value: Room): NormalizedRoom {
  const settings = value.settings ?? DEFAULT_SETTINGS;
  return { ...value, settings, clock: value.clock ?? initialClock(settings), moveLog: value.moveLog ?? [], rematch: value.rematch ?? { black:false, white:false, generation:0 }, game: { ...value.game, events: value.game.events ?? [] } };
}
export function joinRoomState(value: Room | null, uid: string, now = Date.now()): NormalizedRoom {
  if (!value) throw new Error("ROOM NOT FOUND");
  const room = normalizeRoom(value);
  if (room.players.black === uid || room.players.white === uid) throw new Error("ALREADY IN THIS ROOM");
  if (room.players.white || room.status !== "waiting") throw new Error("ROOM FULL");
  return { ...room, players: { ...room.players, white: uid }, status: "playing", clock: { ...room.clock, activeSince: now, running: true } };
}
function assertMember(room: NormalizedRoom, uid: string): Player {
  if (room.players.black === uid) return "black";
  if (room.players.white === uid) return "white";
  throw new Error("NOT A PLAYER");
}
export function moveRoomState(value: Room, uid: string, revision: number, index: number, now = Date.now()): NormalizedRoom {
  const room = normalizeRoom(value);
  if (room.status !== "playing") throw new Error("GAME IS NOT ACTIVE");
  const player = assertMember(room, uid);
  if (player !== room.game.currentPlayer) throw new Error("NOT YOUR TURN");
  if (room.game.revision !== revision) throw new Error("STATE CHANGED — TRY AGAIN");
  const committed = commitElapsed(room.clock, player, now);
  if (committed.clock[player === "black" ? "blackRemainingMs" : "whiteRemainingMs"] <= 0)
    throw new Error("TIME EXPIRED");
  const game = playMove(room.game, player, index);
  const finished = Boolean(game.winner);
  return { ...room, game, moveLog: [...room.moveLog, { index, player, elapsedMs: committed.elapsedMs }], status: finished ? "finished" : "playing", clock: { ...committed.clock, activeSince: now, running: !finished } };
}
export function undoRoomState(value: Room, uid: string, revision: number = value.game.revision, now = Date.now()): NormalizedRoom {
  const room = normalizeRoom(value);
  if (room.status !== "playing" || room.game.winner) throw new Error("GAME IS NOT ACTIVE");
  assertMember(room, uid);
  if (room.game.revision !== revision) throw new Error("STATE CHANGED — TRY AGAIN");
  if (!mayUndo(room.game, room.moveLog, room.settings.undoMode)) throw new Error("UNDO IS NOT AVAILABLE");
  const records = room.moveLog.slice(0, -1);
  const rebuilt = replayMoves(room.settings, records, room.game.revision + 1);
  return { ...room, moveLog: records, game: rebuilt.game, clock: { blackRemainingMs: rebuilt.blackRemainingMs, whiteRemainingMs: rebuilt.whiteRemainingMs, activeSince: now, running: true } };
}
export function timeoutRoomState(value: Room, uid: string, now = Date.now()): NormalizedRoom {
  const room = normalizeRoom(value);
  assertMember(room, uid);
  if (room.status !== "playing" || !room.clock.running || room.game.winner) throw new Error("GAME IS NOT ACTIVE");
  const timedOut = room.game.currentPlayer;
  const committed = commitElapsed(room.clock, timedOut, now);
  const key = timedOut === "black" ? "blackRemainingMs" : "whiteRemainingMs";
  if (committed.clock[key] > 0) throw new Error("TIME REMAINS");
  return { ...room, status: "finished", game: { ...room.game, winner: other(timedOut), revision: room.game.revision + 1, events: [`${timedOut.toUpperCase()} TIMEOUT`] }, clock: { ...committed.clock, [key]: 0, running: false } };
}
export function rematchRoomState(value: Room, uid: string, now = Date.now()): NormalizedRoom {
  const room = normalizeRoom(value);
  const player = assertMember(room, uid);
  if (room.status !== "finished") throw new Error("REMATCH IS NOT AVAILABLE");
  const rematch = { ...room.rematch, [player]: true };
  if (!rematch.black || !rematch.white) return { ...room, game:{...room.game,revision:room.game.revision+1}, rematch };
  const game=createGame(); game.revision=room.game.revision+1;
  return { ...room, status: "playing", game, clock: initialClock(room.settings, now, true), moveLog: [], rematch: { black:false, white:false, generation: room.rematch.generation + 1 } };
}
async function transaction(code: string, mutate: (room: Room, uid: string) => Room) {
  const { db, uid } = await connection(); let failure = "ROOM NOT FOUND";
  const result = await runTransaction(ref(db, `rooms/${code}`), current => { if (!current) return; try { return mutate(current, uid); } catch (e) { failure=(e as Error).message; return; } }, { applyLocally:false });
  if (!result.committed) throw new Error(failure);
  return normalizeRoom(result.snapshot.val());
}
export async function createRoom(settings: GameSettings = DEFAULT_SETTINGS) {
  const { db, uid } = await connection();
  const offset=(await get(ref(db,".info/serverTimeOffset"))).val()??0; const now=Date.now()+offset;
  for (let attempt=0; attempt<10; attempt++) { const code=randomCode(); const result=await runTransaction(ref(db,`rooms/${code}`), current=>current?undefined:newRoom(uid,settings,now),{applyLocally:false}); if(result.committed)return code; }
  throw new Error("COULD NOT CREATE ROOM — TRY AGAIN");
}
export async function joinRoom(code: string) {
  if (!CODE_PATTERN.test(code)) throw new Error("ENTER A VALID 6-CHARACTER CODE");
  const { db, uid }=await connection(); const roomRef=ref(db,`rooms/${code}`); const snapshot=await get(roomRef); const offset=(await get(ref(db,".info/serverTimeOffset"))).val()??0; const now=Date.now()+offset; joinRoomState(snapshot.val(),uid,now); let failure="ROOM FULL";
  const result=await runTransaction(roomRef,current=>{try{return joinRoomState(current??snapshot.val(),uid,now)}catch(e){failure=(e as Error).message;return}},{applyLocally:false}); if(!result.committed)throw new Error(failure);
}
export const submitMove=(code:string,revision:number,index:number,now=Date.now())=>transaction(code,(r,u)=>moveRoomState(r,u,revision,index,now));
export const submitUndo=(code:string,revision:number,now=Date.now())=>transaction(code,(r,u)=>undoRoomState(r,u,revision,now));
export const submitTimeout=(code:string,now=Date.now())=>transaction(code,(r,u)=>timeoutRoomState(r,u,now));
export const requestRematch=(code:string,now=Date.now())=>transaction(code,(r,u)=>rematchRoomState(r,u,now));
