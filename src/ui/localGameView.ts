import { getSixLines } from "../game/six";
import type { GameState, Player } from "../game/types";
import { localizeEvent, t } from "../i18n/i18n";
import type { ClockState, GameSettings, TimeoutState } from "../game/session";
import { boardWithCoordinates, updateBoard, type BoardPresentation } from "./boardView";
import { updateClocks } from "./clockView";
import { setStatusText } from "./motion";
import { updateCountdown, updateTimeoutDialog } from "./timingView";

export interface LocalGamePresentation extends BoardPresentation {
  canUndo:boolean; undo:()=>void; rematch?:()=>void; changeOptions?:()=>void;
  clock?:ClockState; settings?:GameSettings; now?:number; countdownEndsAt?:number;
  timeout?:TimeoutState; timeoutDecision?:(continueGame:boolean)=>void;
  mode?:"local"|"computer"; humanSide?:Player; computerSide?:Player;
  computerThinking?:boolean; computerProgress?:{done:number;total:number};
  finishedGame?:GameState; reviewing?:boolean; resultOverlay?:boolean;
}

export function localGameView(root:HTMLElement,game:GameState,busy:boolean,move:(index:number)=>void,leave:()=>void,presentation:LocalGamePresentation){
  const sessionGame=presentation.finishedGame??game;
  const finished=Boolean(sessionGame.winner);
  const winningPlayer=sessionGame.winner==="black"||sessionGame.winner==="white"?sessionGame.winner:undefined;
  const defenseFailed=Boolean(winningPlayer)&&sessionGame.events.includes("CHECK DEFENSE FAILED");
  const finalPresentation=defenseFailed&&!presentation.reviewing?{...presentation,defeatLines:getSixLines(sessionGame.board,winningPlayer!)}:{...presentation,defeatLines:undefined};
  const mode=presentation.mode??"local";
  if(root.dataset.mode!==mode||!root.querySelector(".board")){
    root.dataset.mode=mode;delete root.dataset.room;
    root.innerHTML='<h1>ReverSix!</h1><p class="local-title"></p><h2 class="turn-status" role="status"></h2><p class="computer-status" role="status" hidden></p><p class="check" hidden></p><div class="clock-board-layout"><aside class="player-clock clock-left"><span class="clock-color"></span><strong class="clock-time"></strong></aside><div class="board-wrap"><div class="board-slot"></div></div><aside class="player-clock clock-right"><span class="clock-color"></span><strong class="clock-time"></strong></aside></div><p class="local-count"></p><p class="notice" role="status"></p><div class="game-controls"><button class="rematch" hidden></button><button class="change-options" hidden></button><button class="back"></button><button class="text-button undo" disabled></button></div><p class="game-error" role="alert" hidden></p><div class="countdown-overlay" hidden aria-live="assertive"></div><div class="result-overlay" hidden aria-live="assertive"><strong></strong></div><dialog class="timeout-dialog" aria-modal="true"></dialog>';
    root.querySelector(".board-slot")!.append(boardWithCoordinates(game,false,move,finalPresentation));
  }
  root.querySelector<HTMLElement>(".local-title")!.textContent=t(mode==="computer"?"computer.title":"local.title");
  const now=presentation.now??Date.now(),timeout=presentation.timeout??{pendingFor:"",continueWithoutClock:false};
  const countingDown=!finished&&updateCountdown(root,presentation.countdownEndsAt??0,now);
  if(finished)root.querySelector<HTMLElement>(".countdown-overlay")!.hidden=true;
  updateTimeoutDialog(root,timeout,Boolean(timeout.pendingFor),presentation.timeoutDecision);
  if(timeout.pendingFor&&timeout.pendingFor===presentation.computerSide)root.querySelector<HTMLElement>(".timeout-dialog h2")!.textContent=t("computer.timeout");
  if(presentation.clock&&presentation.settings)updateClocks(root,presentation.clock,game.currentPlayer,now,"black","white",presentation.settings.clockEnabled&&!timeout.continueWithoutClock,!finished&&!presentation.reviewing&&!countingDown&&!timeout.pendingFor);
  if(mode==="computer"&&presentation.humanSide)for(const [side,player] of [["left","black"],["right","white"]] as const)root.querySelector<HTMLElement>(`.clock-${side} .clock-color`)!.textContent=`${t(player===presentation.humanSide?"computer.you":"computer.name")} · ${t(`game.${player}`)}`;
  const thinking=root.querySelector<HTMLElement>(".computer-status")!;thinking.hidden=!presentation.computerThinking||finished;thinking.textContent=thinking.hidden?"":`${t("computer.thinking")}${presentation.computerProgress?` ${presentation.computerProgress.done} / ${presentation.computerProgress.total}`:""}`;
  const timeoutEvent=sessionGame.events.find(event=>event.endsWith(" TIMEOUT"));
  const result=sessionGame.winner?sessionGame.winner==="draw"?t("game.draw"):`${timeoutEvent?t(`game.${timeoutEvent.startsWith("BLACK")?"blackTimeout":"whiteTimeout"}`)+" · ":""}${t(`local.${sessionGame.winner}Wins`)}`:t("game.turn",{color:t(`game.${game.currentPlayer}`),move:game.moveNumberInTurn,total:game.turn===0?1:2});
  const status=root.querySelector<HTMLElement>(".turn-status")!;setStatusText(status,result);status.classList.toggle("result-enter",Boolean(defenseFailed&&presentation.defeatSequence&&!presentation.reviewing));
  const overlay=root.querySelector<HTMLElement>(".result-overlay")!;overlay.hidden=!presentation.resultOverlay;overlay.querySelector("strong")!.textContent=result;
  const check=root.querySelector<HTMLElement>(".check")!;check.hidden=finished||!game.checkBy;check.textContent=game.checkBy?t(`local.${game.checkBy}Check`):"";
  updateBoard(root.querySelector<HTMLElement>(".board")!,game,!busy&&!finished&&!countingDown&&!timeout.pendingFor&&!(mode==="computer"&&(presentation.computerThinking||game.currentPlayer===presentation.computerSide)),move,finalPresentation);
  root.querySelector<HTMLElement>(".local-count")!.textContent=t("local.count",{black:game.board.filter(cell=>cell==="black").length,white:game.board.filter(cell=>cell==="white").length});
  root.querySelector<HTMLElement>(".notice")!.textContent=finished?"":game.events.filter(event=>event.endsWith(" PASS")||event.includes("SKIPPED")).map(localizeEvent).join(" · ");
  const rematch=root.querySelector<HTMLButtonElement>(".rematch")!;rematch.hidden=!finished;rematch.disabled=Boolean(timeout.pendingFor);rematch.textContent=t("game.rematch");rematch.onclick=()=>presentation.rematch?.();
  const changeOptions=root.querySelector<HTMLButtonElement>(".change-options")!;changeOptions.hidden=!finished;changeOptions.textContent=t("game.changeOptions");changeOptions.onclick=()=>presentation.changeOptions?.();
  const back=root.querySelector<HTMLButtonElement>(".back")!;back.textContent=t("game.back");back.onclick=leave;
  const undo=root.querySelector<HTMLButtonElement>(".undo")!;undo.textContent=t("game.undo");undo.disabled=!presentation.canUndo||busy||countingDown||Boolean(timeout.pendingFor);undo.onclick=()=>{if(!undo.disabled)presentation.undo()};
}
