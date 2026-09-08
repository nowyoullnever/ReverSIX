import { getSixLines } from "../game/six";
import type { GameState } from "../game/types";
import { localizeEvent, t } from "../i18n/i18n";
import { boardWithCoordinates, updateBoard, type BoardPresentation } from "./boardView";
import { setStatusText } from "./motion";
import type { ClockState, GameSettings } from "../game/session";
import { settingsSummary, updateClocks } from "./clockView";
import { updateCountdown, updateTimeoutDialog } from "./timingView";
import type { TimeoutState } from "../game/session";
import type { Player } from "../game/types";

export interface LocalGamePresentation extends BoardPresentation {
  canUndo: boolean;
  undo: () => void;
  rematch?: () => void;
  clock?: ClockState;
  settings?: GameSettings;
  now?: number;
  countdownEndsAt?: number;
  timeout?: TimeoutState;
  timeoutDecision?: (continueGame:boolean) => void;
  mode?: "local"|"computer";
  humanSide?: Player;
  computerSide?: Player;
  computerThinking?: boolean;
  computerProgress?: {done:number;total:number};
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
  const mode=presentation.mode??"local";
  if (root.dataset.mode !== mode || !root.querySelector(".board")) {
    root.dataset.mode = mode;
    delete root.dataset.room;
    root.innerHTML =
      '<h1>REVERSIX!</h1><p class="local-title"></p><p class="game-settings-summary"></p><h2 class="turn-status" role="status"></h2><p class="computer-status" role="status" hidden></p><p class="check" hidden></p><div class="clock-board-layout"><aside class="player-clock clock-left"><span class="clock-color"></span><strong class="clock-time"></strong></aside><div class="board-wrap"><div class="board-slot"></div></div><aside class="player-clock clock-right"><span class="clock-color"></span><strong class="clock-time"></strong></aside></div><p class="local-count"></p><p class="notice" role="status"></p><div class="game-controls"><button class="rematch" hidden></button><button class="back"></button><button class="text-button undo" disabled></button></div><p class="game-error" role="alert" hidden></p><div class="countdown-overlay" hidden aria-live="assertive"></div><dialog class="timeout-dialog" aria-modal="true"></dialog>';
    root
      .querySelector(".board-slot")!
      .append(boardWithCoordinates(game, false, move, finalPresentation));
  }
  root.querySelector<HTMLElement>(".local-title")!.textContent = t(mode==="computer"?"computer.title":"local.title");
  const now=presentation.now??Date.now(),countingDown=updateCountdown(root,presentation.countdownEndsAt??0,now),timeout=presentation.timeout??{pendingFor:"",continueWithoutClock:false};
  updateTimeoutDialog(root,timeout,Boolean(timeout.pendingFor),presentation.timeoutDecision);
  if(timeout.pendingFor&&timeout.pendingFor===presentation.computerSide)root.querySelector<HTMLElement>(".timeout-dialog h2")!.textContent=t("computer.timeout");
  if(presentation.clock&&presentation.settings){
    root.querySelector<HTMLElement>(".game-settings-summary")!.textContent=settingsSummary(presentation.settings);
    updateClocks(root,presentation.clock,game.currentPlayer,now,"black","white",presentation.settings.clockEnabled&&!timeout.continueWithoutClock,!countingDown&&!timeout.pendingFor);
  }
  if(mode==="computer"&&presentation.humanSide){for(const [side,player] of [["left","black"],["right","white"]] as const)root.querySelector<HTMLElement>(`.clock-${side} .clock-color`)!.textContent=`${t(player===presentation.humanSide?"computer.you":"computer.name")} · ${t(`game.${player}`)}`}
  const thinking=root.querySelector<HTMLElement>(".computer-status")!;thinking.hidden=!presentation.computerThinking;thinking.textContent=presentation.computerThinking?`${t("computer.thinking")}${presentation.computerProgress?` ${presentation.computerProgress.done} / ${presentation.computerProgress.total}`:""}`:"";
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
    !busy && !game.winner && !countingDown && !timeout.pendingFor && !(mode==="computer"&&(presentation.computerThinking||game.currentPlayer===presentation.computerSide)),
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
  rematch.hidden=!game.winner; rematch.disabled=Boolean(timeout.pendingFor);rematch.textContent=t("game.rematch"); rematch.onclick=()=>presentation.rematch?.();
  const undo = root.querySelector<HTMLButtonElement>(".undo")!;
  undo.textContent = t("game.undo");
  undo.disabled = !presentation.canUndo || busy || Boolean(game.winner) || countingDown || Boolean(timeout.pendingFor);
  undo.onclick = () => {
    if (!undo.disabled) presentation.undo();
  };
}
