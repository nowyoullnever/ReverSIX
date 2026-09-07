import type { Player } from "../game/types";
import type { Room } from "../online/rooms";
import { boardView, updateBoard, type BoardPresentation } from "./boardView";
export interface GamePresentation extends BoardPresentation {
  undo?: () => void;
  canUndo?: boolean;
}
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
  if (root.dataset.room !== code || !root.querySelector(".board")) {
    root.dataset.room = code;
    root.innerHTML =
      '<h1>REVERSIX!</h1><div class="room"><span></span><button class="copy">COPY</button></div><h2 role="status"></h2><p class="check" hidden></p><div class="board-slot"></div><p class="you"></p><p class="notice" role="status"></p><div class="game-controls"><button class="back">BACK TO LOBBY</button><button class="text-button undo" disabled>UNDO</button></div><p class="game-error" role="alert" hidden></p>';
    root
      .querySelector(".board-slot")!
      .append(boardView(s, false, move, presentation));
  }
  root.querySelector(".room span")!.textContent = `ROOM ${code}`;
  const copy = root.querySelector<HTMLButtonElement>(".copy")!;
  copy.onclick = () =>
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        copy.textContent = "COPIED";
      })
      .catch(() => {
        copy.textContent = "SELECT CODE";
      });
  root.querySelector("h2")!.textContent =
    room.status === "waiting"
      ? "WAITING FOR PLAYER..."
      : s.winner
        ? s.winner === "draw"
          ? "DRAW"
          : s.winner === player
            ? "YOU WIN"
            : "YOU LOSE"
        : `${s.currentPlayer.toUpperCase()}'S TURN — MOVE ${s.moveNumberInTurn} / ${s.turn === 0 ? 1 : 2}`;
  const check = root.querySelector<HTMLElement>(".check")!;
  check.hidden = !s.checkBy || Boolean(s.winner);
  check.textContent = s.checkBy
    ? `CHECK! ${s.checkBy === player ? "OPPONENT IS IN CHECK" : "YOU ARE IN CHECK"}`
    : "";
  updateBoard(
    root.querySelector<HTMLElement>(".board")!,
    s,
    connected &&
      opponentOnline &&
      !busy &&
      room.status === "playing" &&
      s.currentPlayer === player,
    move,
    presentation,
  );
  root.querySelector(".you")!.textContent =
    `YOU ARE ${player.toUpperCase()} · BLACK ${s.board.filter((c) => c === "black").length} / WHITE ${s.board.filter((c) => c === "white").length}`;
  root.querySelector(".notice")!.textContent = !connected
    ? "CONNECTION LOST — RECONNECTING..."
    : room.players.white && !opponentOnline
      ? "OPPONENT DISCONNECTED"
      : s.events.join(" · ");
  root.querySelector<HTMLButtonElement>(".back")!.onclick = leave;
  const undo = root.querySelector<HTMLButtonElement>(".undo")!;
  undo.disabled =
    !presentation.canUndo || busy || !connected || !opponentOnline;
  undo.onclick = () => {
    if (!undo.disabled) presentation.undo?.();
  };
}
