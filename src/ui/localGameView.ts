import { getSixLines } from "../game/six";
import type { GameState } from "../game/types";
import { localizeEvent, t } from "../i18n/i18n";
import { boardView, updateBoard, type BoardPresentation } from "./boardView";
import { setStatusText } from "./motion";

export interface LocalGamePresentation extends BoardPresentation {
  canUndo: boolean;
  undo: () => void;
}

export function localGameView(
  root: HTMLElement,
  game: GameState,
  busy: boolean,
  move: (index: number) => void,
  leave: () => void,
  presentation: LocalGamePresentation,
) {
  const winningPlayer =
    game.winner === "black" || game.winner === "white"
      ? game.winner
      : undefined;
  const defenseFailed =
    Boolean(winningPlayer) && game.events.includes("CHECK DEFENSE FAILED");
  const finalPresentation = defenseFailed
    ? { ...presentation, defeatLines: getSixLines(game.board, winningPlayer!) }
    : presentation;
  if (root.dataset.mode !== "local" || !root.querySelector(".board")) {
    root.dataset.mode = "local";
    delete root.dataset.room;
    root.innerHTML =
      '<h1>REVERSIX!</h1><p class="local-title"></p><h2 class="turn-status" role="status"></h2><p class="check" hidden></p><div class="game-layout"><div class="board-wrap"><div class="board-slot"></div></div></div><p class="local-count"></p><p class="notice" role="status"></p><div class="game-controls"><button class="back"></button><button class="text-button undo" disabled></button></div><p class="game-error" role="alert" hidden></p>';
    root
      .querySelector(".board-slot")!
      .append(boardView(game, false, move, finalPresentation));
  }
  root.querySelector<HTMLElement>(".local-title")!.textContent = t("local.title");
  const status = root.querySelector<HTMLElement>(".turn-status")!;
  const result = game.winner
    ? game.winner === "draw"
      ? t("game.draw")
      : t(`local.${game.winner}Wins`)
    : t("game.turn", {
        color: t(`game.${game.currentPlayer}`),
        move: game.moveNumberInTurn,
        total: game.turn === 0 ? 1 : 2,
      });
  setStatusText(status, result);
  status.classList.toggle(
    "result-enter",
    Boolean(defenseFailed && presentation.defeatSequence),
  );
  const check = root.querySelector<HTMLElement>(".check")!;
  check.hidden = !game.checkBy || Boolean(game.winner);
  check.textContent = game.checkBy ? t(`local.${game.checkBy}Check`) : "";
  updateBoard(
    root.querySelector<HTMLElement>(".board")!,
    game,
    !busy && !game.winner,
    move,
    finalPresentation,
  );
  root.querySelector<HTMLElement>(".local-count")!.textContent = t("local.count", {
    black: game.board.filter((cell) => cell === "black").length,
    white: game.board.filter((cell) => cell === "white").length,
  });
  root.querySelector<HTMLElement>(".notice")!.textContent = game.events
    .filter((event) => event.endsWith(" PASS") || event.includes("SKIPPED"))
    .map(localizeEvent)
    .join(" · ");
  const back = root.querySelector<HTMLButtonElement>(".back")!;
  back.textContent = t("game.back");
  back.onclick = leave;
  const undo = root.querySelector<HTMLButtonElement>(".undo")!;
  undo.textContent = t("game.undo");
  undo.disabled = !presentation.canUndo || busy || Boolean(game.winner);
  undo.onclick = () => {
    if (!undo.disabled) presentation.undo();
  };
}
