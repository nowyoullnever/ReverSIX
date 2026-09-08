import { getSixLines } from "../game/six";
import type { GameState } from "../game/types";
import { localizeEvent, t } from "../i18n/i18n";
import { boardWithCoordinates, updateBoard, type BoardPresentation } from "./boardView";
import { setStatusText } from "./motion";
import type { ClockState, GameSettings } from "../game/session";
import { settingsSummary, updateClocks } from "./clockView";

export interface LocalGamePresentation extends BoardPresentation {
  canUndo: boolean;
  undo: () => void;
  rematch?: () => void;
  clock?: ClockState;
  settings?: GameSettings;
  now?: number;
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
      '<h1>REVERSIX!</h1><p class="local-title"></p><p class="game-settings-summary"></p><h2 class="turn-status" role="status"></h2><p class="check" hidden></p><div class="clock-board-layout"><aside class="player-clock clock-left"><span class="clock-color"></span><strong class="clock-time"></strong></aside><div class="board-wrap"><div class="board-slot"></div></div><aside class="player-clock clock-right"><span class="clock-color"></span><strong class="clock-time"></strong></aside></div><p class="local-count"></p><p class="notice" role="status"></p><div class="game-controls"><button class="rematch" hidden></button><button class="back"></button><button class="text-button undo" disabled></button></div><p class="game-error" role="alert" hidden></p>';
    root
      .querySelector(".board-slot")!
      .append(boardWithCoordinates(game, false, move, finalPresentation));
  }
  root.querySelector<HTMLElement>(".local-title")!.textContent = t("local.title");
  if(presentation.clock&&presentation.settings){root.querySelector<HTMLElement>(".game-settings-summary")!.textContent=settingsSummary(presentation.settings);updateClocks(root,presentation.clock,game.currentPlayer,presentation.now??Date.now(),"black","white",presentation.settings.clockEnabled)}
  const status = root.querySelector<HTMLElement>(".turn-status")!;
  const timeoutEvent=game.events.find(event=>event.endsWith(" TIMEOUT"));
  const result = game.winner
    ? game.winner === "draw"
      ? t("game.draw")
      : `${timeoutEvent ? t(`game.${timeoutEvent.startsWith("BLACK")?"blackTimeout":"whiteTimeout"}`)+" · " : ""}${t(`local.${game.winner}Wins`)}`
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
  const rematch=root.querySelector<HTMLButtonElement>(".rematch")!;
  rematch.hidden=!game.winner; rematch.textContent=t("game.rematch"); rematch.onclick=()=>presentation.rematch?.();
  const undo = root.querySelector<HTMLButtonElement>(".undo")!;
  undo.textContent = t("game.undo");
  undo.disabled = !presentation.canUndo || busy || Boolean(game.winner);
  undo.onclick = () => {
    if (!undo.disabled) presentation.undo();
  };
}
