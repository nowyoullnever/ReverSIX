import "./style.css";
import { firebaseConfigured } from "./online/firebase";
import {
  CODE_PATTERN,
  createRoom,
  joinRoom,
  submitMove,
  type Room,
} from "./online/rooms";
import { watchRoom } from "./online/sync";
import { lobby } from "./ui/lobby";
import { gameView } from "./ui/gameView";
const root = document.querySelector<HTMLElement>("#app")!;
let room: Room | null = null,
  uid = "",
  code = "",
  busy = false,
  connected = false;
let presence: string[] = [],
  stop: (() => void) | undefined,
  error = "";
let subscriptionGeneration = 0;
function render() {
  if (room) {
    const player = room.players.black === uid ? "black" : "white";
    gameView(
      root,
      room,
      code,
      player,
      connected,
      presence.includes(
        room.players[player === "black" ? "white" : "black"] ?? "",
      ),
      busy,
      (i) => void action(() => submitMove(code, room!.game.revision, i)),
      leave,
    );
  } else
    lobby(
      root,
      firebaseConfigured,
      busy,
      () => void action(async () => enter(await createRoom())),
      (value) =>
        void action(async () => {
          await joinRoom(value);
          await enter(value);
        }),
    );
  if (error) {
    const p = document.createElement("p");
    p.setAttribute("role", "alert");
    p.textContent = error;
    root.append(p);
  }
}
async function action(fn: () => Promise<unknown>) {
  if (busy) return;
  busy = true;
  error = "";
  render();
  try {
    await fn();
  } catch (e) {
    error = (e as Error).message;
  } finally {
    busy = false;
    render();
  }
}
function leave() {
  subscriptionGeneration++;
  stop?.();
  stop = undefined;
  room = null;
  code = "";
  connected = false;
  presence = [];
  sessionStorage.removeItem("reversix-room");
  error = "";
  render();
}
async function enter(value: string) {
  const generation = ++subscriptionGeneration;
  stop?.();
  code = value;
  sessionStorage.setItem("reversix-room", code);
  const unsubscribe = await watchRoom(
    code,
    (next, id) => {
      if (generation !== subscriptionGeneration) return;
      if (!next || (next.players.black !== id && next.players.white !== id)) {
        leave();
        error = next ? "YOU ARE NOT A PLAYER IN THIS ROOM" : "ROOM NOT FOUND";
      } else {
        room = next;
        uid = id;
      }
      render();
    },
    (ids, online) => {
      if (generation === subscriptionGeneration) {
        presence = ids;
        connected = online;
        render();
      }
    },
    (e) => {
      if (generation === subscriptionGeneration) {
        error = e.message;
        render();
      }
    },
  );
  if (generation === subscriptionGeneration) stop = unsubscribe;
  else unsubscribe();
}
render();
const saved = sessionStorage.getItem("reversix-room");
if (firebaseConfigured && saved && CODE_PATTERN.test(saved))
  void action(() => enter(saved));
