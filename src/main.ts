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
import type { LobbyActivity } from "./ui/lobby";
import { gameView } from "./ui/gameView";
import { localGameView } from "./ui/localGameView";
import { getSixLines } from "./game/six";
import { Toast } from "./ui/toast";
import { RoomPresenter, MOVE_ANIMATION_MS } from "./ui/presenter";
import {
  PresenceEvents,
  gameEvents,
  roomEvents,
  compareBoards,
  moveTransition,
  type BoardChange,
} from "./ui/transitions";
import { canUndo, recordMove, type MoveHistory } from "./game/history";
import { AudioManager } from "./audio/audio";
import { getLocale, localizeError, setLocale } from "./i18n/i18n";
import { sendQuickChat, watchQuickChat, type QuickChatMessage } from "./online/quickChat";
import type { ChatPresetId } from "./online/chatPresets";
import { isQuickChatCoolingDown, QUICK_CHAT_COOLDOWN_MS } from "./online/chatCooldown";
import { LocalGameSession } from "./local/localGame";
const root = document.querySelector<HTMLElement>("#app")!;
let room: Room | null = null,
  uid = "",
  code = "",
  busy = false,
  connected = false;
let lobbyActivity: LobbyActivity;
let presence: string[] = [],
  stop: (() => void) | undefined,
  error = "";
let subscriptionGeneration = 0;
let history: MoveHistory | undefined;
let localGame: LocalGameSession | null = null;
let localLocked = false;
let localTimer: ReturnType<typeof setTimeout> | undefined;
let quickChatMessages: QuickChatMessage[] = [];
let quickChatError = "";
let quickChatStop: (() => void) | undefined;
let quickChatRoom = "";
let quickChatGeneration = 0;
let quickChatCooldownUntil = 0;
let quickChatTimer: ReturnType<typeof setTimeout> | undefined;
let chatOpen = false;
const desktopChat = window.matchMedia("(min-width: 900px)");
const moveMarkers = new Map<number, number>();
let lastPlaced = -1,
  six: number[] = [];
let defeatSequenceRevision = -1;
const toast = new Toast();
const audio = new AudioManager();
setLocale(getLocale());
document.addEventListener("pointerdown", () => void audio.unlock(), { once: true });
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
    audio.playChange(moveTransition(previous, next));
    if (
      previous &&
      !previous.game.winner &&
      Boolean(next.game.winner) &&
      next.game.events.includes("CHECK DEFENSE FAILED")
    )
      defeatSequenceRevision = next.game.revision;
    toast.show(events);
    six = next.game.checkBy && !next.game.winner
      ? [...new Set(getSixLines(next.game.board, next.game.checkBy).flat())]
      : [];
    render(change);
  },
  () => render(),
);
function render(change?: BoardChange) {
  if (localGame) {
    localGameView(
      root,
      localGame.game,
      localLocked,
      localMove,
      leaveLocal,
      {
        change,
        lastPlaced: localGame.lastPlaced,
        six,
        defeatSequence: defeatSequenceRevision === localGame.game.revision,
        canUndo: localGame.canUndo(),
        undo: undoLocal,
      },
    );
  } else if (room) {
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
        void (audio.unlock(), action(async () => {
          const before = room!.game;
          const result = await submitMove(code, before.revision, i);
          history = recordMove(history, before, result.game);
        })),
      leave,
      {
        change,
        lastPlaced,
        six,
        defeatSequence: defeatSequenceRevision === room.game.revision,
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
        quickChat: {
          enabled: desktopChat.matches,
          open: chatOpen,
          messages: quickChatMessages,
          disabled: isQuickChatCoolingDown(Date.now(), quickChatCooldownUntil),
          error: quickChatError,
          send: (presetId) => void sendPreset(presetId),
          show: () => {
            chatOpen = true;
            render();
          },
          close: () => {
            chatOpen = false;
            render();
          },
        },
      },
    );
  } else
    lobby(
      root,
      firebaseConfigured,
      busy,
      startLocalGame,
      () => void (audio.unlock(), action(async () => enter(await createRoom()), "creating")),
      (value) =>
        void (audio.unlock(), action(async () => {
          await joinRoom(value);
          await enter(value);
        }, "joining")),
      lobbyActivity,
      audio.isEnabled(),
      (enabled) => { audio.setEnabled(enabled); render(); },
      render,
    );
  const existing = root.querySelector<HTMLElement>(".game-error");
  if (existing) {
    existing.textContent = localizeError(error);
    existing.hidden = !error;
    if (error) existing.classList.add("text-fade-in");
    else existing.classList.remove("text-fade-in");
  } else if (error) {
    const p = document.createElement("p");
    p.setAttribute("role", "alert");
    p.className = "text-fade-in";
    p.textContent = localizeError(error);
    root.append(p);
  }
}
function startLocalGame() {
  localGame = new LocalGameSession();
  history = undefined;
  lastPlaced = -1;
  six = [];
  defeatSequenceRevision = -1;
  error = "";
  toast.clear();
  sessionStorage.removeItem("reversix-room");
  render();
}
function localMove(index: number) {
  if (!localGame || localLocked || localGame.game.winner) return;
  void audio.unlock();
  const { before, after, change } = localGame.play(index);
  audio.playChange(change);
  toast.show(gameEvents(before, after));
  six = after.checkBy && !after.winner
    ? [...new Set(getSixLines(after.board, after.checkBy).flat())]
    : [];
  if (
    !before.winner &&
    after.winner &&
    after.events.includes("CHECK DEFENSE FAILED")
  )
    defeatSequenceRevision = after.revision;
  localLocked =
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  render(change);
  if (localLocked) {
    clearTimeout(localTimer);
    localTimer = setTimeout(() => {
      localLocked = false;
      localTimer = undefined;
      render();
    }, MOVE_ANIMATION_MS);
  }
}
function undoLocal() {
  if (!localGame || localLocked || !localGame.canUndo()) return;
  localGame.undo();
  six = localGame.game.checkBy && !localGame.game.winner
    ? [...new Set(getSixLines(localGame.game.board, localGame.game.checkBy).flat())]
    : [];
  defeatSequenceRevision = -1;
  toast.clear();
  render();
}
function leaveLocal() {
  clearTimeout(localTimer);
  localTimer = undefined;
  localLocked = false;
  localGame = null;
  six = [];
  lastPlaced = -1;
  defeatSequenceRevision = -1;
  toast.clear();
  error = "";
  render();
}
async function action(fn: () => Promise<unknown>, activity?: LobbyActivity) {
  if (busy || presenter.locked) return;
  busy = true;
  lobbyActivity = activity;
  error = "";
  render();
  try {
    await fn();
  } catch (e) {
    error = (e as Error).message;
  } finally {
    busy = false;
    lobbyActivity = undefined;
    render();
  }
}
function leave() {
  history = undefined;
  moveMarkers.clear();
  presenter.reset();
  toast.clear();
  presenceEvents.reset();
  six = [];
  defeatSequenceRevision = -1;
  lastPlaced = -1;
  subscriptionGeneration++;
  stopQuickChat();
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
        reconcileQuickChat();
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
function stopQuickChat() {
  quickChatGeneration++;
  quickChatStop?.();
  quickChatStop = undefined;
  quickChatRoom = "";
  quickChatMessages = [];
  quickChatError = "";
  clearTimeout(quickChatTimer);
  quickChatTimer = undefined;
  quickChatCooldownUntil = 0;
  chatOpen = false;
}
function reconcileQuickChat() {
  if (!room || !code || !desktopChat.matches) {
    if (quickChatStop || quickChatRoom) stopQuickChat();
    return;
  }
  if (quickChatRoom === code) return;
  const generation = ++quickChatGeneration;
  quickChatStop?.();
  quickChatStop = undefined;
  quickChatRoom = code;
  quickChatMessages = [];
  quickChatError = "";
  void watchQuickChat(
    code,
    (messages) => {
      if (generation !== quickChatGeneration) return;
      quickChatMessages = messages;
      render();
    },
    (nextError) => {
      if (generation !== quickChatGeneration) return;
      quickChatError = localizeError(nextError.message);
      render();
    },
  ).then((unsubscribe) => {
    if (generation === quickChatGeneration) quickChatStop = unsubscribe;
    else unsubscribe();
  }).catch((nextError: Error) => {
    if (generation === quickChatGeneration) {
      quickChatError = localizeError(nextError.message);
      render();
    }
  });
}
async function sendPreset(presetId: ChatPresetId) {
  if (
    !room ||
    !code ||
    !desktopChat.matches ||
    isQuickChatCoolingDown(Date.now(), quickChatCooldownUntil)
  )
    return;
  quickChatCooldownUntil = Date.now() + QUICK_CHAT_COOLDOWN_MS;
  quickChatError = "";
  clearTimeout(quickChatTimer);
  quickChatTimer = setTimeout(() => {
    quickChatCooldownUntil = 0;
    render();
  }, QUICK_CHAT_COOLDOWN_MS);
  render();
  try {
    await sendQuickChat(code, presetId);
  } catch (nextError) {
    quickChatError = localizeError((nextError as Error).message);
    render();
  }
}
desktopChat.addEventListener("change", () => {
  if (!desktopChat.matches) chatOpen = false;
  reconcileQuickChat();
  render();
});
render();
const saved = sessionStorage.getItem("reversix-room");
if (firebaseConfigured && saved && CODE_PATTERN.test(saved))
  void action(() => enter(saved), "reconnecting");
