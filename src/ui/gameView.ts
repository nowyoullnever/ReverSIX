import type { Player } from "../game/types";
import { getSixLines } from "../game/six";
import type { Room } from "../online/rooms";
import { boardView, updateBoard, type BoardPresentation } from "./boardView";
import { replayMotion, setStatusText } from "./motion";
import { t } from "../i18n/i18n";
export interface GamePresentation extends BoardPresentation {
  undo?: () => void;
  canUndo?: boolean;
}
const lastTurn = new WeakMap<HTMLElement, Player>();
const copyTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();
export function gameView(
  root: HTMLElement,
  room: Room,
  code: string,
  player: Player,
  connected: boolean,
  opponentOnline: boolean,
  busy: boolean,
  move: (i: number) => void,
  leave: () => void,
  presentation: GamePresentation = {},
) {
  const s = room.game;
  const winningPlayer =
    s.winner === "black" || s.winner === "white" ? s.winner : undefined;
  const defenseFailed =
    Boolean(winningPlayer) && s.events.includes("CHECK DEFENSE FAILED");
  const finalPresentation = defenseFailed
    ? { ...presentation, defeatLines: getSixLines(s.board, winningPlayer!) }
    : presentation;
  if (root.dataset.room !== code || !root.querySelector(".board")) {
    root.dataset.room = code;
    root.innerHTML =
      '<h1>REVERSIX!</h1><div class="room"><span></span><button class="copy">COPY</button></div><h2 class="turn-status" role="status"></h2><p class="result-detail" hidden></p><p class="check" hidden></p><div class="board-slot"></div><p class="you"></p><p class="notice" role="status"></p><div class="game-controls"><button class="back">BACK TO LOBBY</button><button class="text-button undo" disabled>UNDO</button></div><p class="game-error" role="alert" hidden></p>';
    root
      .querySelector(".board-slot")!
      .append(boardView(s, false, move, finalPresentation));
  }
  root.querySelector(".room span")!.textContent = t("game.room", { code });
  const copy = root.querySelector<HTMLButtonElement>(".copy")!;
  if (!copyTimers.has(copy)) copy.textContent = t("game.copy");
  copy.onclick = () =>
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        showCopyFeedback(copy, t("game.copied"));
      })
      .catch(() => {
        showCopyFeedback(copy, t("game.select"));
      });
  const status = root.querySelector<HTMLElement>("h2")!;
  const resultText = s.winner
    ? s.winner === "draw"
      ? t("game.draw")
      : s.winner === player
        ? t("game.win")
        : t("game.lose")
    : undefined;
  setStatusText(
    status,
    room.status === "waiting"
      ? t("game.waiting")
      : resultText ?? t("game.turn", { color:t(`game.${s.currentPlayer}`), move:s.moveNumberInTurn, total:s.turn === 0 ? 1 : 2 }),
    room.status === "waiting",
  );
  const previousTurn = lastTurn.get(root);
  if (!s.winner && previousTurn && previousTurn !== s.currentPlayer && s.currentPlayer === player)
    replayMotion(status, "text-status-change");
  if (!s.winner) lastTurn.set(root, s.currentPlayer);
  status.classList.toggle("result-enter", Boolean(defenseFailed && presentation.defeatSequence));
  const check = root.querySelector<HTMLElement>(".check")!;
  check.hidden = !s.checkBy || Boolean(s.winner);
  check.textContent = s.checkBy
    ? s.checkBy === player ? t("game.check") : t("game.defend")
    : "";
  const detail = root.querySelector<HTMLElement>(".result-detail")!;
  detail.hidden = !defenseFailed;
  detail.textContent = defenseFailed
    ? s.winner === player
      ? t("game.survived")
      : t("game.remained")
    : "";
  detail.classList.toggle("result-enter", Boolean(defenseFailed && presentation.defeatSequence));
  updateBoard(
    root.querySelector<HTMLElement>(".board")!,
    s,
    connected &&
      opponentOnline &&
      !busy &&
      room.status === "playing" &&
      s.currentPlayer === player,
    move,
    finalPresentation,
  );
  root.querySelector(".you")!.textContent =
    t("game.you", { color:t(`game.${player}`), black:s.board.filter((c) => c === "black").length, white:s.board.filter((c) => c === "white").length });
  const notice = root.querySelector<HTMLElement>(".notice")!;
  const noticeText = !connected
    ? t("game.connection")
    : room.players.white && !opponentOnline
      ? t("game.disconnected")
      : s.events.join(" · ");
  const previousNotice = notice.dataset.message;
  setStatusText(notice, noticeText, !connected);
  notice.dataset.message = noticeText;
  if (room.players.white && !opponentOnline && connected && previousNotice !== noticeText)
    replayMotion(notice, "notice-enter");
  const back = root.querySelector<HTMLButtonElement>(".back")!;
  back.textContent = t("game.back");
  back.onclick = leave;
  const undo = root.querySelector<HTMLButtonElement>(".undo")!;
  undo.textContent = t("game.undo");
  undo.disabled =
    !presentation.canUndo || busy || !connected || !opponentOnline;
  undo.onclick = () => {
    if (!undo.disabled) presentation.undo?.();
  };
}

function showCopyFeedback(copy: HTMLButtonElement, label: string) {
  clearTimeout(copyTimers.get(copy));
  copy.textContent = label;
  replayMotion(copy, "copy-feedback");
  copyTimers.set(
    copy,
    setTimeout(() => {
      copy.textContent = t("game.copy");
      copy.classList.remove("copy-feedback");
    }, 1200),
  );
}
