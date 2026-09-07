import "./style.css";
import { firebaseConfigured } from "./online/firebase";
import {
  CODE_PATTERN,
  createRoom,
  joinRoom,
  submitMove,
  submitUndo,
  type Room,
} from "./online/rooms";
import { watchRoom } from "./online/sync";
import { lobby } from "./ui/lobby";
import { gameView } from "./ui/gameView";
import { getSixLines } from "./game/six";
import { Toast } from "./ui/toast";
import { RoomPresenter } from "./ui/presenter";
import {
  PresenceEvents,
  roomEvents,
  compareBoards,
  type BoardChange,
} from "./ui/transitions";
import { canUndo, recordMove, type MoveHistory } from "./game/history";
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
let history: MoveHistory | undefined;
const moveMarkers = new Map<number, number>();
let lastPlaced = -1,
  six: number[] = [],
  highlightTimer: ReturnType<typeof setTimeout> | undefined;
const toast = new Toast();
const presenceEvents = new PresenceEvents();
const presenter = new RoomPresenter(
  (previous, next, change) => {
    room = next;
    if (!previous) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(`reversix-marker-${code}`) ?? "null",
        );
        lastPlaced =
          saved?.revision === next.game.revision && next.game.board[saved.index]
            ? saved.index
            : -1;
      } catch {
        lastPlaced = -1;
      }
    }
    if (previous && next.game.revision > previous.game.revision) {
      moveMarkers.set(previous.game.board.filter(Boolean).length, lastPlaced);
      const diff = compareBoards(previous.game.board, next.game.board);
      if (diff.placed.length === 1) lastPlaced = diff.placed[0];
      else if (diff.placed.length > 1) lastPlaced = -1;
      if (diff.removed.length)
        lastPlaced =
          moveMarkers.get(next.game.board.filter(Boolean).length) ?? -1;
      moveMarkers.set(next.game.board.filter(Boolean).length, lastPlaced);
    }
    sessionStorage.setItem(
      `reversix-marker-${code}`,
      JSON.stringify({ revision: next.game.revision, index: lastPlaced }),
    );
    const events = roomEvents(previous, next);
    toast.show(events);
    if (events.includes("CHECK!") || events.includes("COUNTER CHECK!")) {
      clearTimeout(highlightTimer);
      six = next.game.checkBy
        ? getSixLines(next.game.board, next.game.checkBy).flat()
        : [];
      highlightTimer = setTimeout(() => {
        six = [];
        render();
      }, 1400);
    }
    render(change);
  },
  () => render(),
);
function render(change?: BoardChange) {
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
      busy || presenter.locked,
      (i) =>
        void action(async () => {
          const before = room!.game;
          const result = await submitMove(code, before.revision, i);
          history = recordMove(history, before, result.game);
        }),
      leave,
      {
        change,
        lastPlaced,
        six,
        canUndo:
          room.status === "playing" && canUndo(room.game, player, history),
        undo: () =>
          void action(async () => {
            const pending = history!;
            const result = await submitUndo(code, pending);
            const before = pending.before.slice(0, -1);
            history = before.length
              ? { ...pending, before, revision: result.game.revision }
              : undefined;
          }),
      },
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
  const existing = root.querySelector<HTMLElement>(".game-error");
  if (existing) {
    existing.textContent = error;
    existing.hidden = !error;
  } else if (error) {
    const p = document.createElement("p");
    p.setAttribute("role", "alert");
    p.textContent = error;
    root.append(p);
  }
}
async function action(fn: () => Promise<unknown>) {
  if (busy || presenter.locked) return;
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
  history = undefined;
  moveMarkers.clear();
  presenter.reset();
  toast.clear();
  presenceEvents.reset();
  clearTimeout(highlightTimer);
  six = [];
  lastPlaced = -1;
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
        uid = id;
        presenter.receive(next);
      }
      render();
    },
    (ids, online) => {
      if (generation === subscriptionGeneration) {
        if (connected && !online) presenter.reset();
        presence = ids;
        connected = online;
        if (room) {
          const otherId =
            room.players.black === uid
              ? room.players.white
              : room.players.black;
          toast.show(
            presenceEvents.update(
              online,
              ids.includes(otherId ?? ""),
              Boolean(room.players.white),
            ),
          );
        }
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
