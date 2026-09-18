import "./style.css";
import { firebaseConfigured } from "./online/firebase";
import {
  CODE_PATTERN,
  changeRoomSettings,
  createRoom,
  joinRoom,
  requestRematch,
  submitTurn,
  submitTimeout,
  submitTimeoutDecision,
  submitUndo,
  type Room,
} from "./online/rooms";
import { watchRoom, watchServerOffset } from "./online/sync";
import { lobby } from "./ui/lobby";
import type { LobbyActivity } from "./ui/lobby";
import { gameView } from "./ui/gameView";
import { localGameView } from "./ui/localGameView";
import { getSixLines } from "./game/six";
import { placeStone, undoLastPlacement } from "./game/gameState";
import { turnStatus } from "./game/rules";
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
import { AudioManager } from "./audio/audio";
import { BgmManager } from "./audio/bgm";
import { getLocale, localizeError, setLocale, t } from "./i18n/i18n";
import { LocalGameSession } from "./local/localGame";
import { countdownRenderState, lastCompletedTurnPlacements, mayUndo, remainingAt, type GameSettings } from "./game/session";
import type { GameState, Player } from "./game/types";
import { ComputerController } from "./ai/computerController";
import type { ComputerDifficulty } from "./ai/difficulty";
import { watchSystemTheme } from "./ui/theme";
import { openGameSettingsDialog } from "./ui/newGameDialog";
import { canReviewBack, replayForReview } from "./ui/review";
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
let localGame: LocalGameSession | null = null;
let localLocked = false;
let localTimer: ReturnType<typeof setTimeout> | undefined;
let computerTimer:ReturnType<typeof setTimeout>|undefined;
let computerController:ComputerController|undefined;
let computerMode:{humanSide:Player;computerSide:Player;difficulty:ComputerDifficulty;loading:boolean;loadFailed:boolean;thinking:boolean;progress?:{done:number;total:number};generation:number}|null=null;
let serverOffset=0;
let stopOffset:(()=>void)|undefined;
let timeoutPending=false;
let onlineCountdownActive=false;
let six: number[] = [];
let defeatSequenceRevision = -1;
let localReviewCursor:number|null=null,onlineReviewCursor:number|null=null;
// The turn an online player is still building. It stays on this screen: nothing reaches
// the room until they confirm the turn, so the opponent never sees a half-made turn.
let onlineDraft:GameState|null=null,onlineDraftBase=-1,ownTurnRevision=-1;
let resultOverlayRevision=-1;
let resultOverlayTimer:ReturnType<typeof setTimeout>|undefined;
const RESULT_OVERLAY_MS=2400;
const toast = new Toast();
const audio = new AudioManager();
const bgm = new BgmManager();
function clearResultOverlay(){clearTimeout(resultOverlayTimer);resultOverlayTimer=undefined;resultOverlayRevision=-1}
function showResultOverlay(revision:number){
  clearResultOverlay();resultOverlayRevision=revision;
  resultOverlayTimer=setTimeout(()=>{resultOverlayTimer=undefined;resultOverlayRevision=-1;render()},RESULT_OVERLAY_MS);
}
watchSystemTheme();
setLocale(getLocale());
const unlockAudio=()=>{void audio.unlock();void bgm.unlock()};
document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });
const presenceEvents = new PresenceEvents();
const presenter = new RoomPresenter(
  (previous, next, change) => {
    room = next;
    if ((previous?.rematch?.generation??0)!==(next.rematch?.generation??0)) {
      six=[];defeatSequenceRevision=-1;onlineReviewCursor=null;clearResultOverlay();
    }
    if (next.game.revision !== onlineDraftBase) { onlineDraft = null; onlineDraftBase = -1 }
    // this client already watched its own stones land, so the echo is not replayed
    const own = next.game.revision === ownTurnRevision;
    if (own) ownTurnRevision = -1;
    const events = roomEvents(previous, next);
    if (!own) audio.playChange(moveTransition(previous, next));
    if (
      previous &&
      !previous.game.winner &&
      Boolean(next.game.winner)
    ) {
      showResultOverlay(next.game.revision);
      if(next.game.events.includes("CHECK DEFENSE FAILED"))defeatSequenceRevision=next.game.revision;
    }
    toast.show(events);
    six = next.game.checkBy && !next.game.winner
      ? [...new Set(getSixLines(next.game.board, next.game.checkBy).flat())]
      : [];
    render(own ? undefined : change);
  },
  () => render(),
);
function render(change?: BoardChange) {
  if(computerMode&&!localGame){
    root.dataset.mode="computer-loading";delete root.dataset.room;
    root.innerHTML=`<h1>ReverSix!</h1><p class="local-title">${t("computer.title")}</p><p class="computer-loading" role="status">${t(computerMode.loadFailed?"computer.loadFailed":"computer.loading")}</p><button class="back">${t("game.back")}</button>`;
    root.querySelector<HTMLButtonElement>(".back")!.onclick=leaveLocal;
  } else if (localGame) {
    const reviewed=localReviewCursor===null?null:replayForReview(localGame.settings,localGame.turnLog,localReviewCursor,localGame.game.revision);
    const localTurn=localGame.turnStatus;
    const displayGame=reviewed?.game??localGame.game,displayClock=reviewed?.clock??localGame.clock;
    localGameView(
      root,
      displayGame,
      localLocked,
      localMove,
      leaveLocal,
      {
        change,
        turnPlacements: reviewed?reviewed.turnPlacements:localGame.turnPlacements,
        six:reviewed?[]:six,
        defeatSequence: defeatSequenceRevision === localGame.game.revision,
        canUndo: localGame.game.winner?canReviewBack(true,localReviewCursor,localGame.turnLog):localGame.canUndo(Date.now()),
        undo: undoLocal,
        undoPlacement: undoLocal,
        commit: commitLocalTurn,
        canCommit: localReviewCursor===null&&localTurn.canCommit,
        passing: localReviewCursor===null&&localTurn.mustPass,
        rematch: rematchLocal,
        changeOptions:changeLocalOptions,
        clock: displayClock,
        settings: localGame.settings,
        now: Date.now(),
        countdownEndsAt:localGame.countdownEndsAt,
        timeout:localGame.timeout,
        timeoutDecision:decideLocalTimeout,
        mode:computerMode?"computer":"local",
        humanSide:computerMode?.humanSide,
        computerSide:computerMode?.computerSide,
        computerThinking:computerMode?.thinking,
        computerProgress:computerMode?.progress,
        finishedGame:localGame.game.winner?localGame.game:undefined,
        reviewing:localReviewCursor!==null,
        resultOverlay:resultOverlayRevision===localGame.game.revision&&localReviewCursor===null,
      },
    );
  } else if (room) {
    const player = room.players.black === uid ? "black" : "white";
    const reviewed=onlineReviewCursor===null?null:replayForReview(room.settings!,room.moveLog!,onlineReviewCursor,room.game.revision);
    const drafted=draftGame(),draftedTurn=turnStatus(drafted);
    const displayRoom=reviewed?{...room,game:reviewed.game,clock:reviewed.clock}:drafted===room.game?room:{...room,game:drafted};
    gameView(
      root,
      displayRoom,
      code,
      player,
      connected,
      presence.includes(
        room.players[player === "black" ? "white" : "black"] ?? "",
      ),
      busy || presenter.locked,
      placeOnline,
      leave,
      {
        change,
        turnPlacements:reviewed?reviewed.turnPlacements:lastCompletedTurnPlacements(room.moveLog!),
        six:reviewed?[]:six,
        defeatSequence: defeatSequenceRevision === room.game.revision,
        canUndo:room.game.winner?canReviewBack(true,onlineReviewCursor,room.moveLog!):room.status === "playing" && !room.timeout?.pendingFor && serverNow()>=room.countdownEndsAt! && (drafted.turnPlacements.length>0 || mayUndo(room.game, room.moveLog!, room.settings!.undoMode)),
        undo:undoOnline,
        undoPlacement:undoOnline,
        commit:commitOnlineTurn,
        canCommit:onlineReviewCursor===null&&draftedTurn.canCommit,
        passing:onlineReviewCursor===null&&draftedTurn.mustPass,
        rematch: () => void action(()=>requestRematch(code,serverNow())),
        changeOptions:changeOnlineOptions,
        timeoutDecision:(continueGame)=>void action(()=>submitTimeoutDecision(code,continueGame)),
        now: serverNow(),
        finishedGame:room.game.winner?room.game:undefined,
        reviewing:onlineReviewCursor!==null,
        resultOverlay:resultOverlayRevision===room.game.revision&&onlineReviewCursor===null,
      },
    );
  } else
    lobby(
      root,
      firebaseConfigured,
      busy,
      startLocalGame,
      startComputerGame,
      (settings) => void (audio.unlock(), action(async () => enter(await createRoom(settings)), "creating")),
      (value) =>
        void (audio.unlock(), action(async () => {
          await joinRoom(value);
          await enter(value);
        }, "joining")),
      lobbyActivity,
      () => audio.isEnabled(),
      (enabled) => { audio.setEnabled(enabled); render(); },
      render,
      () => bgm.isEnabled(),
      (enabled) => { bgm.setEnabled(enabled); render(); },
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
function startLocalGame(settings: GameSettings) {
  cancelComputerWork();computerMode=null;
  localGame = new LocalGameSession(settings);
  localReviewCursor=null;clearResultOverlay();
  six = [];
  defeatSequenceRevision = -1;
  error = "";
  toast.clear();
  sessionStorage.removeItem("reversix-room");
  render();
}
async function startComputerGame(settings:GameSettings,humanSide:Player,difficulty:ComputerDifficulty="normal"){
  cancelComputerWork();localGame=null;const generation=(computerMode?.generation??0)+1;
  localReviewCursor=null;clearResultOverlay();
  computerMode={humanSide,computerSide:humanSide==="black"?"white":"black",difficulty,loading:true,loadFailed:false,thinking:false,generation};error="";toast.clear();sessionStorage.removeItem("reversix-room");render();
  computerController??=new ComputerController();
  try{await computerController.load(difficulty);if(!computerMode||computerMode.generation!==generation)return;localGame=new LocalGameSession(settings);computerMode.loading=false;render()}
  catch{if(!computerMode||computerMode.generation!==generation)return;computerMode.loading=false;computerMode.loadFailed=true;render()}
}
function rematchLocal(){if(!localGame?.game.winner)return;cancelComputerWork(false);localReviewCursor=null;clearResultOverlay();localGame.rematch();six=[];defeatSequenceRevision=-1;toast.clear();render();queueComputerMove()}
function localMove(index: number) {
  if (!localGame || localLocked || localGame.game.winner || (computerMode&&localGame.game.currentPlayer===computerMode.computerSide)) return;
  performLocalMove(index);
}
/** Places one provisional stone. The turn only ends when its player confirms it. */
function performLocalMove(index:number){
  if(!localGame)return;
  void audio.unlock();
  let result;
  try{result=localGame.play(index)}catch(e){error=(e as Error).message;render();return}
  const { change } = result;
  audio.playChange(change);
  localLocked =
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  render(change);
  if (localLocked) {
    clearTimeout(localTimer);
    localTimer = setTimeout(() => {
      localLocked = false;
      localTimer = undefined;
      render();
      queueComputerMove(500);
    }, MOVE_ANIMATION_MS);
  }else queueComputerMove(500);
}
/** Hands the finished turn to the opponent — or passes it, when nothing could be played. */
function commitLocalTurn(){
  if(!localGame||localLocked||localGame.game.winner||!localGame.canCommit)return;
  void audio.unlock();
  let result;
  try{result=localGame.commit()}catch(e){error=(e as Error).message;render();return}
  const { before, after } = result;
  toast.show(gameEvents(before, after));
  six = after.checkBy && !after.winner
    ? [...new Set(getSixLines(after.board, after.checkBy).flat())]
    : [];
  if(!before.winner&&after.winner){showResultOverlay(after.revision);if(after.events.includes("CHECK DEFENSE FAILED"))defeatSequenceRevision=after.revision}
  error="";
  render();
  queueComputerMove(500);
}
function undoLocal() {
  if(!localGame||localLocked)return;
  if(localGame.game.winner){const cursor=localReviewCursor??localGame.turnLog.length;if(cursor<=0)return;cancelComputerWork(false);clearResultOverlay();localReviewCursor=cursor-1;render();return}
  if(!localGame.canUndo())return;
  cancelComputerWork(false);
  const undone = localGame.undo();
  six = localGame.game.checkBy && !localGame.game.winner
    ? [...new Set(getSixLines(localGame.game.board, localGame.game.checkBy).flat())]
    : [];
  defeatSequenceRevision = -1;
  toast.clear();
  // the stones this stone had flipped turn back over; a whole-turn rewind just snaps
  render(undone.tookBackStone ? undone.change : undefined);
  queueComputerMove(500);
}
function changeLocalOptions(){
  if(!localGame?.game.winner)return;
  openGameSettingsDialog(computerMode?"computer":"local",localGame.settings,computerMode?.humanSide??"black",(settings,humanSide,difficulty)=>{
    if(computerMode){void startComputerGame(settings,humanSide,difficulty??computerMode.difficulty);return}
    cancelComputerWork(false);localReviewCursor=null;clearResultOverlay();six=[];defeatSequenceRevision=-1;toast.clear();localGame=new LocalGameSession(settings);
    render();queueComputerMove();
  },undefined,computerMode?.difficulty);
}
/** The position this player sees: the room's, plus whatever they have placed so far. */
function draftGame(){return onlineDraft&&onlineDraftBase===room!.game.revision?onlineDraft:room!.game}
function placeOnline(index:number){
  if(!room||busy||presenter.locked||onlineReviewCursor!==null)return;
  void audio.unlock();
  const player:Player=room.players.black===uid?"black":"white";
  const before=draftGame();
  let after;
  try{after=placeStone(before,player,index)}catch(e){error=(e as Error).message;render();return}
  onlineDraft=after;onlineDraftBase=room.game.revision;error="";
  const change=compareBoards(before.board,after.board);
  audio.playChange(change);
  render(change);
}
function commitOnlineTurn(){
  if(!room||onlineReviewCursor!==null)return;
  const drafted=draftGame();
  if(!turnStatus(drafted).canCommit)return;
  const cells=[...drafted.turnPlacements],revision=room.game.revision;
  void action(async()=>{
    ownTurnRevision=revision+1;
    try{await submitTurn(code,revision,cells,serverNow())}
    catch(e){ownTurnRevision=-1;throw e}
  });
}
function undoOnline(){
  if(!room)return;
  if(room.game.winner){const cursor=onlineReviewCursor??room.moveLog!.length;if(cursor<=0)return;clearResultOverlay();onlineReviewCursor=cursor-1;render();return}
  const drafted=draftGame();
  if(drafted.turnPlacements.length){
    onlineDraft=undoLastPlacement(drafted);onlineDraftBase=room.game.revision;error="";
    render(compareBoards(drafted.board,onlineDraft.board));
    return;
  }
  void action(async()=>{await submitUndo(code,room!.game.revision,serverNow())});
}
function changeOnlineOptions(){if(!room?.game.winner)return;openGameSettingsDialog("room",room.nextSettings??room.settings!,"black",settings=>void action(()=>changeRoomSettings(code,settings)))}
function decideLocalTimeout(continueGame:boolean){if(!localGame?.timeout.pendingFor)return;cancelComputerWork(false);const before=localGame.game.winner;localGame.decideTimeout(continueGame);if(!before&&localGame.game.winner)showResultOverlay(localGame.game.revision);render();if(continueGame)queueComputerMove()}
function leaveLocal() {
  cancelComputerWork();computerMode=null;
  localReviewCursor=null;clearResultOverlay();
  clearTimeout(localTimer);
  localTimer = undefined;
  localLocked = false;
  localGame = null;
  six = [];
  defeatSequenceRevision = -1;
  toast.clear();
  error = "";
  render();
}
function cancelComputerWork(invalidate=true){clearTimeout(computerTimer);computerTimer=undefined;computerController?.cancel();if(computerMode){computerMode.thinking=false;computerMode.progress=undefined;if(invalidate)computerMode.generation++}}
function queueComputerMove(delay=0){
  if(computerTimer||!computerMode||!localGame)return;
  computerTimer=setTimeout(()=>{computerTimer=undefined;void runComputerMove()},delay);
}
async function runComputerMove(){
  if(!computerMode||!localGame||computerMode.loading||computerMode.loadFailed||computerMode.thinking||localLocked||localGame.game.winner||localGame.timeout.pendingFor||Date.now()<localGame.countdownEndsAt||localGame.game.currentPlayer!==computerMode.computerSide)return;
  // the computer needs no confirmation: it hands over as soon as its turn is playable
  if(localGame.canCommit){commitLocalTurn();return}
  const generation=computerMode.generation,revision=localGame.game.revision;computerMode.thinking=true;computerMode.progress=undefined;render();
  try{
    const difficulty=computerMode.difficulty;
    const result=await computerController!.choose(localGame.game,difficulty,(done,total)=>{if(computerMode&&computerMode.generation===generation&&computerMode.difficulty===difficulty){computerMode.progress={done,total};render()}});
    if(!computerMode||!localGame||computerMode.generation!==generation||computerMode.difficulty!==difficulty||localGame.game.revision!==revision||result.revision!==revision||localGame.game.currentPlayer!==computerMode.computerSide||localGame.timeout.pendingFor||localGame.game.winner)return;
    computerMode.thinking=false;computerMode.progress=undefined;performLocalMove(result.index);
  }catch(e){if((e as Error).name!=="AbortError"&&computerMode&&computerMode.generation===generation){computerMode.thinking=false;computerMode.progress=undefined;error="COMPUTER SEARCH FAILED";render()}}
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
  presenter.reset();
  toast.clear();
  presenceEvents.reset();
  six = [];
  defeatSequenceRevision = -1;
  onlineReviewCursor=null;clearResultOverlay();
  onlineDraft=null;onlineDraftBase=-1;ownTurnRevision=-1;
  subscriptionGeneration++;
  stopOffset?.(); stopOffset=undefined;
  stop?.();
  stop = undefined;
  room = null;
  code = "";
  connected = false;
  onlineCountdownActive = false;
  presence = [];
  sessionStorage.removeItem("reversix-room");
  error = "";
  render();
}
async function enter(value: string) {
  const generation = ++subscriptionGeneration;
  stop?.();
  stopOffset?.();
  code = value;
  sessionStorage.setItem("reversix-room", code);
  stopOffset=await watchServerOffset(offset=>{serverOffset=offset},e=>{if(generation===subscriptionGeneration){error=e.message;render()}});
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
function serverNow(){return Date.now()+serverOffset}
setInterval(()=>{
  if(localGame){const before=localGame.game.winner;if(localGame.tick()) {cancelComputerWork(false);defeatSequenceRevision=-1;toast.show(localGame.game.events);if(!before&&localGame.game.winner)showResultOverlay(localGame.game.revision)} render();queueComputerMove();return}
  if(room?.status==="playing"){
    const now=serverNow();
    const countdown=countdownRenderState(room.countdownEndsAt!,now,onlineCountdownActive);
    onlineCountdownActive=countdown.active;
    if(countdown.shouldRender){render();if(countdown.active)return}
    if(room.clock!.running&&!room.timeout?.pendingFor&&!room.timeout?.continueWithoutClock){
      const left=remainingAt(room.clock!,room.game.currentPlayer,now);
      if(left<=0&&!timeoutPending){timeoutPending=true;void submitTimeout(code,now).catch(()=>{}).finally(()=>timeoutPending=false)}
      render();
    }
  }
},33);
render();
const saved = sessionStorage.getItem("reversix-room");
if (firebaseConfigured && saved && CODE_PATTERN.test(saved))
  void action(() => enter(saved), "reconnecting");
