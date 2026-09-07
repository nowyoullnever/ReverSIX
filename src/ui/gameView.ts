import type { Player } from "../game/types";
import type { Room } from "../online/rooms";
import { boardView } from "./boardView";
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
) {
  const s = room.game;
  root.innerHTML = "<h1>REVERSIX!</h1>";
  const header = document.createElement("div");
  header.className = "room";
  const label = document.createElement("span");
  label.textContent = `ROOM ${code}`;
  const copy = document.createElement("button");
  copy.textContent = "COPY";
  copy.onclick = () =>
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        copy.textContent = "COPIED";
      })
      .catch(() => {
        copy.textContent = "SELECT CODE";
      });
  header.append(label, copy);
  root.append(header);
  const status = document.createElement("h2");
  status.setAttribute("role", "status");
  status.textContent =
    room.status === "waiting"
      ? "WAITING FOR PLAYER..."
      : s.winner
        ? s.winner === "draw"
          ? "DRAW"
          : s.winner === player
            ? "YOU WIN"
            : "YOU LOSE"
        : `${s.currentPlayer.toUpperCase()}'S TURN — MOVE ${s.moveNumberInTurn} / ${s.turn === 0 ? 1 : 2}`;
  root.append(status);
  if (s.checkBy && !s.winner) {
    const check = document.createElement("p");
    check.className = "check";
    check.textContent = `CHECK! ${s.checkBy === player ? "OPPONENT IS IN CHECK" : "YOU ARE IN CHECK"}`;
    root.append(check);
  }
  root.append(
    boardView(
      s,
      connected &&
        opponentOnline &&
        !busy &&
        room.status === "playing" &&
        s.currentPlayer === player,
      move,
    ),
  );
  const you = document.createElement("p");
  you.textContent = `YOU ARE ${player.toUpperCase()} · BLACK ${s.board.filter((c) => c === "black").length} / WHITE ${s.board.filter((c) => c === "white").length}`;
  root.append(you);
  const notice = document.createElement("p");
  notice.className = "notice";
  notice.setAttribute("role", "status");
  notice.textContent = !connected
    ? "CONNECTION LOST — RECONNECTING..."
    : room.players.white && !opponentOnline
      ? "OPPONENT DISCONNECTED"
      : s.events.join(" · ");
  root.append(notice);
  const back = document.createElement("button");
  back.textContent = "BACK TO LOBBY";
  back.onclick = leave;
  root.append(back);
}
