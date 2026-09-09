import type { GameState, Player } from "../game/types";
import { getSixLines } from "../game/six";
import { normalizeRoom, type Room } from "../online/rooms";
import { boardWithCoordinates, updateBoard, type BoardPresentation } from "./boardView";
import { replayMotion, setStatusText } from "./motion";
import { t } from "../i18n/i18n";
import { updateClocks } from "./clockView";
import { updateCountdown, updateTimeoutDialog } from "./timingView";

export interface GamePresentation extends BoardPresentation {
  undo?:()=>void; canUndo?:boolean; rematch?:()=>void; changeOptions?:()=>void;
  timeoutDecision?:(continueGame:boolean)=>void; now?:number;
  finishedGame?:GameState; reviewing?:boolean; resultOverlay?:boolean;
}
const lastTurn=new WeakMap<HTMLElement,Player>();
const copyTimers=new WeakMap<HTMLButtonElement,ReturnType<typeof setTimeout>>();

export function gameView(root:HTMLElement,rawRoom:Room,code:string,player:Player,connected:boolean,opponentOnline:boolean,busy:boolean,move:(i:number)=>void,leave:()=>void,presentation:GamePresentation={}){
  const room=normalizeRoom(rawRoom),timeout=room.timeout!,countdownEndsAt=room.countdownEndsAt!;
  root.dataset.checkRing=room.settings!.checkRingEnabled?"on":"off";
  const s=room.game,sessionGame=presentation.finishedGame??s,finished=Boolean(sessionGame.winner);
  const winningPlayer=sessionGame.winner==="black"||sessionGame.winner==="white"?sessionGame.winner:undefined;
  const defenseFailed=Boolean(winningPlayer)&&sessionGame.events.includes("CHECK DEFENSE FAILED");
  const finalPresentation=defenseFailed&&!presentation.reviewing?{...presentation,defeatLines:getSixLines(sessionGame.board,winningPlayer!),defeatPlayer:winningPlayer}:{...presentation,defeatLines:undefined,defeatPlayer:undefined};
  if(root.dataset.room!==code||!root.querySelector(".board")){
    root.dataset.room=code;
    root.innerHTML='<h1>ReverSix!</h1><div class="room"><span></span><button class="copy">COPY</button></div><div class="game-status-area"><h2 class="turn-status" role="status"></h2><p class="result-detail status-empty"></p><p class="check status-empty"></p></div><div class="game-layout clock-board-layout"><aside class="player-clock clock-left"><span class="clock-color"></span><strong class="clock-time"></strong></aside><div class="board-wrap"><div class="board-slot"></div></div><aside class="player-clock clock-right"><span class="clock-color"></span><strong class="clock-time"></strong></aside></div><p class="you"></p><p class="notice status-empty" role="status"></p><div class="game-controls"><button class="rematch" hidden></button><button class="change-options" hidden></button><button class="undo" disabled>UNDO</button><button class="back">BACK TO LOBBY</button></div><p class="game-error" role="alert" hidden></p><div class="result-overlay" hidden aria-live="assertive"><strong></strong></div><dialog class="timeout-dialog" aria-modal="true"></dialog>';
    const frame=boardWithCoordinates(s,false,move,finalPresentation);root.querySelector(".board-slot")!.append(frame);frame.querySelector(".board")!.append(Object.assign(document.createElement("div"),{className:"countdown-overlay",hidden:true,ariaLive:"assertive"}));
  }
  root.querySelector(".room span")!.textContent=t("game.room",{code});
  const opponent:Player=player==="black"?"white":"black",now=presentation.now??Date.now();
  const countingDown=!finished&&room.status==="playing"&&updateCountdown(root,countdownEndsAt,now);
  if(finished)root.querySelector<HTMLElement>(".countdown-overlay")!.hidden=true;
  updateTimeoutDialog(root,timeout,timeout.pendingFor===player,presentation.timeoutDecision,busy);
  updateClocks(root,room.clock!,s.currentPlayer,now,player,opponent,room.settings!.clockEnabled&&!timeout.continueWithoutClock,!finished&&!presentation.reviewing&&!countingDown&&!timeout.pendingFor);
  const copy=root.querySelector<HTMLButtonElement>(".copy")!;if(!copyTimers.has(copy))copy.textContent=t("game.copy");
  copy.onclick=()=>void navigator.clipboard.writeText(code).then(()=>showCopyFeedback(copy,t("game.copied"))).catch(()=>showCopyFeedback(copy,t("game.select")));
  const timeoutEvent=sessionGame.events.find(event=>event.endsWith(" TIMEOUT"));
  const resultText=sessionGame.winner?sessionGame.winner==="draw"?t("game.draw"):timeoutEvent?`${t(`game.${timeoutEvent.startsWith("BLACK")?"blackTimeout":"whiteTimeout"}`)} · ${t(`local.${sessionGame.winner}Wins`)}`:sessionGame.winner===player?t("game.win"):t("game.lose"):undefined;
  const status=root.querySelector<HTMLElement>("h2")!;
  setStatusText(status,room.status==="waiting"?t("game.waiting"):resultText??t("game.turn",{color:t(`game.${s.currentPlayer}`),move:s.moveNumberInTurn,total:s.turn===0?1:2}),room.status==="waiting");
  const previousTurn=lastTurn.get(root);if(!finished&&previousTurn&&previousTurn!==s.currentPlayer&&s.currentPlayer===player)replayMotion(status,"text-status-change");if(!finished)lastTurn.set(root,s.currentPlayer);
  status.classList.toggle("result-enter",Boolean(defenseFailed&&presentation.defeatSequence&&!presentation.reviewing));
  const overlay=root.querySelector<HTMLElement>(".result-overlay")!;overlay.hidden=!presentation.resultOverlay;overlay.querySelector("strong")!.textContent=resultText??"";
  const check=root.querySelector<HTMLElement>(".check")!;check.textContent=finished||!s.checkBy?"":s.checkBy===player?t("game.check"):t("game.defend");check.classList.toggle("status-empty",!check.textContent);
  const detail=root.querySelector<HTMLElement>(".result-detail")!;detail.textContent=defenseFailed?sessionGame.winner===player?t("game.survived"):t("game.remained"):"";detail.classList.toggle("status-empty",!detail.textContent);detail.classList.toggle("result-enter",Boolean(defenseFailed&&presentation.defeatSequence&&!presentation.reviewing));
  updateBoard(root.querySelector<HTMLElement>(".board")!,s,connected&&opponentOnline&&!busy&&!finished&&!countingDown&&!timeout.pendingFor&&room.status==="playing"&&s.currentPlayer===player,move,finalPresentation);
  root.querySelector(".you")!.textContent=t("game.you",{color:t(`game.${player}`),black:s.board.filter(c=>c==="black").length,white:s.board.filter(c=>c==="white").length});
  const notice=root.querySelector<HTMLElement>(".notice")!;
  const noticeText=!connected?t("game.connection"):room.players.white&&!opponentOnline?t("game.disconnected"):finished?"":s.events.join(" · ");
  const previousNotice=notice.dataset.message;setStatusText(notice,noticeText,!connected);notice.classList.toggle("status-empty",!noticeText);notice.dataset.message=noticeText;if(room.players.white&&!opponentOnline&&connected&&previousNotice!==noticeText)replayMotion(notice,"notice-enter");
  const rematch=root.querySelector<HTMLButtonElement>(".rematch")!;rematch.hidden=!finished;rematch.disabled=Boolean(room.rematch![player])||Boolean(timeout.pendingFor);rematch.textContent=room.rematch![player]?t("game.rematchWaiting"):t("game.rematch");rematch.onclick=()=>presentation.rematch?.();
  const changeOptions=root.querySelector<HTMLButtonElement>(".change-options")!;changeOptions.hidden=!finished;changeOptions.textContent=t("game.changeOptions");changeOptions.onclick=()=>presentation.changeOptions?.();
  const back=root.querySelector<HTMLButtonElement>(".back")!;back.textContent=t("game.back");back.onclick=leave;
  const undo=root.querySelector<HTMLButtonElement>(".undo")!;undo.textContent=t("game.undo");undo.disabled=!presentation.canUndo||busy||(!finished&&(!connected||!opponentOnline))||countingDown||Boolean(timeout.pendingFor);undo.onclick=()=>{if(!undo.disabled)presentation.undo?.()};
}
function showCopyFeedback(copy:HTMLButtonElement,label:string){clearTimeout(copyTimers.get(copy));copy.textContent=label;replayMotion(copy,"copy-feedback");copyTimers.set(copy,setTimeout(()=>{copy.textContent=t("game.copy");copy.classList.remove("copy-feedback")},1200))}
