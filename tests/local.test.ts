// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createGame } from "../src/game/gameState";
import { emptyBoard } from "../src/game/board";
import { getMoveOptions } from "../src/game/rules";
import { LocalGameSession } from "../src/local/localGame";
import { DEFAULT_SETTINGS } from "../src/game/session";
import { setLocale } from "../src/i18n/i18n";
import { localGameView } from "../src/ui/localGameView";
import { openGameSettingsDialog, openNewGameDialog } from "../src/ui/newGameDialog";
import { lobby } from "../src/ui/lobby";

beforeEach(() => {
  setLocale("en");
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => document.body.replaceChildren());

it("uses the shared engine for the opening and two-move turn sequence", () => {
  const local = new LocalGameSession({...DEFAULT_SETTINGS,clockEnabled:false},0);
  expect(local.game.board.filter(Boolean)).toHaveLength(4);
  expect(local.game.currentPlayer).toBe("black");
  expect(local.game.moveNumberInTurn).toBe(1);
  local.play(34);
  expect(local.game.currentPlayer).toBe("white");
  expect(local.game.turn).toBe(1);
  expect(local.game.moveNumberInTurn).toBe(1);
  local.play(getMoveOptions(local.game).legal[0]);
  expect(local.game.currentPlayer).toBe("white");
  expect(local.game.moveNumberInTurn).toBe(2);
  local.play(getMoveOptions(local.game).legal[0]);
  expect(local.game.currentPlayer).toBe("black");
  expect(local.game.moveNumberInTurn).toBe(1);
});

it("undoes one placement at a time and restores the complete local snapshot", () => {
  const local = new LocalGameSession({...DEFAULT_SETTINGS,clockEnabled:false},0);
  local.play(34);
  const beforeWhite = structuredClone(local.game);
  const previousMarker = local.lastPlaced;
  local.play(getMoveOptions(local.game).legal[0]);
  const afterFirst = structuredClone(local.game);
  local.play(getMoveOptions(local.game).legal[0]);
  expect(local.game.currentPlayer).toBe("black");
  local.undo();
  expect({ ...local.game, revision: afterFirst.revision }).toEqual(afterFirst);
  local.undo();
  expect({ ...local.game, revision: beforeWhite.revision }).toEqual(beforeWhite);
  expect(local.lastPlaced).toBe(previousMarker);
});

it("uses the shared EXACT SIX engine in a local session", () => {
  const local = new LocalGameSession({...DEFAULT_SETTINGS,clockEnabled:false},0);
  const board = emptyBoard();
  [40, 41, 42, 43, 44].forEach((index) => (board[index] = "black"));
  board[55] = "white";
  board[65] = "black";
  board[12] = "white";
  board[22] = "black";
  local.game = { ...createGame(), board, turnStartBoard: [...board], turn: 1 };
  local.play(45);
  expect(local.game.moveNumberInTurn).toBe(2);
  local.play(2);
  expect(local.game.checkBy).toBe("black");
  expect(local.game.currentPlayer).toBe("white");
});

it("renders local play without room, connection, copy, or chat UI", () => {
  const root = document.createElement("main");
  const move = vi.fn(), leave = vi.fn(), undo = vi.fn();
  localGameView(root, createGame(), false, move, leave, {
    canUndo: false,
    undo,
  });
  expect(root.textContent).toContain("LOCAL 2 PLAYER");
  expect(root.textContent).toContain("BLACK'S TURN — MOVE 1 / 1");
  expect(root.textContent).toContain("BLACK 2 / WHITE 2");
  expect(root.textContent).not.toContain("YOU ARE");
  expect(root.textContent).not.toContain("ROOM");
  expect(root.textContent).not.toContain("COPY");
  expect(root.textContent).not.toContain("CONNECTION");
  expect(root.querySelector(".chat-toggle, .quick-chat-slot")).toBeNull();
  expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(4);
  root.querySelector<HTMLButtonElement>(".cell:not(:disabled)")!.click();
  expect(move).toHaveBeenCalledOnce();
  root.querySelector<HTMLButtonElement>(".back")!.click();
  expect(leave).toHaveBeenCalledOnce();
});

it("keeps BLACK on the left and WHITE on the right in computer mode",()=>{
  const game=createGame(),root=document.createElement("main"),move=vi.fn();
  localGameView(root,game,false,move,vi.fn(),{
    canUndo:false,undo:vi.fn(),mode:"computer",humanSide:"white",computerSide:"black",computerThinking:true,computerProgress:{done:7,total:24},
    clock:{blackRemainingMs:111000,whiteRemainingMs:222000,activeSince:0,running:true},settings:DEFAULT_SETTINGS,now:0,countdownEndsAt:0,
  });
  expect(root.querySelector(".local-title")?.textContent).toBe("VS. COMPUTER");
  expect(root.querySelector(".clock-left .clock-color")?.textContent).toBe("COMPUTER · BLACK");
  expect(root.querySelector(".clock-left .clock-time")?.textContent).toBe("01:51:000");
  expect(root.querySelector(".clock-right .clock-color")?.textContent).toBe("YOU · WHITE");
  expect(root.querySelector(".clock-right .clock-time")?.textContent).toBe("03:42:000");
  expect(root.querySelector(".computer-status")?.textContent).toContain("7 / 24");
  expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(0);
  const blackRoot=document.createElement("main");
  localGameView(blackRoot,game,false,vi.fn(),vi.fn(),{canUndo:false,undo:vi.fn(),mode:"computer",humanSide:"black",computerSide:"white",clock:{blackRemainingMs:111000,whiteRemainingMs:222000,activeSince:0,running:true},settings:DEFAULT_SETTINGS,now:0,countdownEndsAt:0});
  expect(blackRoot.querySelector(".clock-left .clock-color")?.textContent).toBe("YOU · BLACK");
  expect(blackRoot.querySelector(".clock-right .clock-color")?.textContent).toBe("COMPUTER · WHITE");
});

it("shows the local timeout decision and locks the board",()=>{const session=new LocalGameSession({...DEFAULT_SETTINGS,initialTimeMs:60000},0);session.tick(63001);const root=document.createElement("main"),decision=vi.fn();localGameView(root,session.game,false,vi.fn(),vi.fn(),{canUndo:false,undo:vi.fn(),clock:session.clock,settings:session.settings,now:63001,countdownEndsAt:session.countdownEndsAt,timeout:session.timeout,timeoutDecision:decision});expect(root.querySelector(".timeout-dialog")?.hasAttribute("open")).toBe(true);expect(root.querySelector(".timeout-dialog")?.textContent).toContain("CONTINUE?");expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(0);root.querySelectorAll<HTMLButtonElement>(".timeout-actions button")[1].click();expect(decision).toHaveBeenCalledWith(false)});

it("shows objective local CHECK and color-based winner text with SIX lines", () => {
  const checking = createGame();
  checking.currentPlayer = "white";
  checking.checkBy = "black";
  const checkRoot = document.createElement("main");
  localGameView(checkRoot, checking, false, vi.fn(), vi.fn(), {
    canUndo: false,
    undo: vi.fn(),
    six: [40, 41, 42, 43, 44, 45],
  });
  expect(checkRoot.textContent).toContain("BLACK CHECK! WHITE MUST DEFEND!");

  const finished = createGame();
  finished.board = emptyBoard();
  [40, 41, 42, 43, 44, 45].forEach((index) => (finished.board[index] = "black"));
  finished.winner = "black";
  finished.events = ["CHECK DEFENSE FAILED"];
  const resultRoot = document.createElement("main");
  localGameView(resultRoot, finished, false, vi.fn(), vi.fn(), {
    canUndo: false,
    undo: vi.fn(),
    defeatSequence: true,
  });
  expect(resultRoot.querySelector(".turn-status")?.textContent).toBe("BLACK WINS!");
  expect(resultRoot.querySelectorAll(".defeat-six-line")).toHaveLength(1);
  expect(resultRoot.querySelectorAll(".defeat-six")).toHaveLength(6);
  expect(resultRoot.textContent).not.toContain("YOU WIN");
});
it("keeps result controls during review without replaying the result overlay",()=>{const finished={...createGame(),winner:"black" as const},review=createGame(),root=document.createElement("main"),change=vi.fn();localGameView(root,review,false,vi.fn(),vi.fn(),{canUndo:true,undo:vi.fn(),rematch:vi.fn(),changeOptions:change,finishedGame:finished,reviewing:true,resultOverlay:false,clock:{blackRemainingMs:1,whiteRemainingMs:1,activeSince:0,running:false},settings:DEFAULT_SETTINGS,now:0});expect(root.querySelector(".turn-status")?.textContent).toBe("BLACK WINS!");expect(root.querySelector<HTMLButtonElement>(".rematch")!.hidden).toBe(false);expect(root.querySelector<HTMLButtonElement>(".change-options")!.hidden).toBe(false);expect(root.querySelector<HTMLButtonElement>(".undo")!.disabled).toBe(false);expect(root.querySelectorAll(".cell:not(:disabled)")).toHaveLength(0);expect(root.querySelectorAll(".defeat-six-line")).toHaveLength(0);expect((root.querySelector(".result-overlay") as HTMLElement).hidden).toBe(true)});

it("shows only NEW GAME on Home and opens the four-option menu", () => {
  const root = document.createElement("main");
  const local = vi.fn(), create = vi.fn(), join = vi.fn();
  lobby(root, true, false, local, vi.fn(), create, join);
  expect(root.querySelector("#new-game")?.textContent).toBe("NEW GAME");
  expect(root.querySelector("input, form, #create")).toBeNull();
  root.querySelector<HTMLButtonElement>("#new-game")!.click();
  const dialog = document.querySelector<HTMLDialogElement>(".new-game-dialog")!;
  expect(dialog.querySelectorAll(".new-game-options button")).toHaveLength(4);
  expect(dialog.textContent).toContain("LOCAL 2 PLAYER");
  expect(dialog.textContent).toContain("VS. COMPUTER");
  expect(dialog.textContent).toContain("CREATE PRIVATE GAME");
  expect(dialog.textContent).toContain("JOIN PRIVATE GAME");
  dialog.querySelector<HTMLButtonElement>(".new-game-local")!.click();
  dialog.querySelector<HTMLFormElement>(".game-settings-form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  expect(local).toHaveBeenCalledOnce();
  expect(dialog.isConnected).toBe(false);
});

it("keeps local available without Firebase and disables only online options", () => {
  const local = vi.fn();
  const dialog = openNewGameDialog(false, false, {
    local,
    computer: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
  });
  expect(dialog.querySelector<HTMLButtonElement>(".new-game-local")!.disabled).toBe(false);
  expect(dialog.querySelector<HTMLButtonElement>(".new-game-computer")!.disabled).toBe(false);
  expect(dialog.querySelector<HTMLButtonElement>(".new-game-create")!.disabled).toBe(true);
  expect(dialog.querySelector<HTMLButtonElement>(".new-game-join")!.disabled).toBe(true);
  expect(dialog.textContent).toContain("ONLINE PLAY IS NOT CONFIGURED");
  dialog.querySelector<HTMLButtonElement>(".new-game-local")!.click();
  dialog.querySelector<HTMLFormElement>(".game-settings-form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  expect(local).toHaveBeenCalledOnce();
});
it("validates time settings and presents time and undo as paired choices",()=>{const local=vi.fn();const dialog=openNewGameDialog(true,false,{local,computer:vi.fn(),create:vi.fn(),join:vi.fn()});dialog.querySelector<HTMLButtonElement>(".new-game-local")!.click();const input=dialog.querySelector<HTMLInputElement>('input[name="minutes"]')!,turn=dialog.querySelector<HTMLInputElement>('input[value="turn"]')!,form=dialog.querySelector<HTMLFormElement>("form")!;expect(input.value).toBe("7");expect(input.closest(".time-input-shell")?.textContent).toContain("MINUTES");expect(dialog.querySelectorAll(".choice-options")).toHaveLength(2);input.value="61";form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));expect(local).not.toHaveBeenCalled();input.value="15";turn.checked=true;form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));expect(local).toHaveBeenCalledWith({initialTimeMs:900000,clockEnabled:true,undoMode:"turn"});const offDialog=openNewGameDialog(true,false,{local,computer:vi.fn(),create:vi.fn(),join:vi.fn()});offDialog.querySelector<HTMLButtonElement>(".new-game-local")!.click();const offInput=offDialog.querySelector<HTMLInputElement>('input[name="clockEnabled"][value="off"]')!,offForm=offDialog.querySelector<HTMLFormElement>("form")!;offInput.checked=true;offInput.dispatchEvent(new Event("change",{bubbles:true}));expect(offDialog.querySelector<HTMLInputElement>('input[name="minutes"]')!.disabled).toBe(true);offForm.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));expect(local).toHaveBeenLastCalledWith({initialTimeMs:420000,clockEnabled:false,undoMode:"all"})});

it("runs CREATE from the menu and localizes the Korean menu and game screen", () => {
  const create = vi.fn();
  const createDialog = openNewGameDialog(true, false, {
    local: vi.fn(),
    computer: vi.fn(),
    create,
    join: vi.fn(),
  });
  createDialog.querySelector<HTMLButtonElement>(".new-game-create")!.click();
  createDialog.querySelector<HTMLFormElement>(".game-settings-form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  expect(create).toHaveBeenCalledOnce();

  setLocale("ko");
  const local = vi.fn();
  const koreanDialog = openNewGameDialog(true, false, {
    local,
    computer: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
  });
  expect(koreanDialog.textContent).toContain("새 게임");
  expect(koreanDialog.textContent).toContain("2인 대전");
  expect(koreanDialog.textContent).toContain("컴퓨터 대전");
  expect(koreanDialog.textContent).toContain("코드를 이용하여 입장하기");
  expect(koreanDialog.querySelector(".new-game-close")?.getAttribute("aria-label")).toBe("새 게임 메뉴 닫기");
  koreanDialog.querySelector<HTMLButtonElement>(".new-game-local")!.click();
  koreanDialog.querySelector<HTMLFormElement>(".game-settings-form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  expect(local).toHaveBeenCalledOnce();
  const root = document.createElement("main");
  localGameView(root, createGame(), false, vi.fn(), vi.fn(), {
    canUndo: false,
    undo: vi.fn(),
  });
  expect(root.textContent).toContain("흑돌 차례 - 1 / 1");
  expect(root.textContent).toContain("흑 2개 / 백 2개");
});

it("uses the existing room-code constraints in the JOIN step and supports BACK", () => {
  const join = vi.fn();
  const dialog = openNewGameDialog(true, false, {
    local: vi.fn(),
    computer: vi.fn(),
    create: vi.fn(),
    join,
  });
  dialog.querySelector<HTMLButtonElement>(".new-game-join")!.click();
  const input = dialog.querySelector<HTMLInputElement>("#new-game-code")!;
  expect(input.minLength).toBe(6);
  expect(input.maxLength).toBe(6);
  expect(input.pattern).toBe("[A-HJ-NP-Za-hj-np-z2-9]{6}");
  dialog.querySelector<HTMLButtonElement>(".new-game-back")!.click();
  expect(dialog.querySelectorAll(".new-game-options button")).toHaveLength(4);
  dialog.querySelector<HTMLButtonElement>(".new-game-join")!.click();
  const valid = dialog.querySelector<HTMLInputElement>("#new-game-code")!;
  valid.value = "abc234";
  dialog.querySelector<HTMLFormElement>("form")!.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
  expect(join).toHaveBeenCalledWith("ABC234");
});

it("collects the human side and shared settings for VS. COMPUTER",()=>{
  const computer=vi.fn();
  const dialog=openNewGameDialog(true,false,{local:vi.fn(),computer,create:vi.fn(),join:vi.fn()});
  dialog.querySelector<HTMLButtonElement>(".new-game-computer")!.click();
  expect(dialog.querySelector<HTMLInputElement>('input[name="humanSide"]:checked')!.value).toBe("black");
  const white=dialog.querySelector<HTMLInputElement>('input[name="humanSide"][value="white"]')!;
  const turn=dialog.querySelector<HTMLInputElement>('input[name="undoMode"][value="turn"]')!;
  const minutes=dialog.querySelector<HTMLInputElement>('input[name="minutes"]')!;
  white.checked=true;turn.checked=true;minutes.value="9";
  dialog.querySelector<HTMLFormElement>("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  expect(computer).toHaveBeenCalledWith({initialTimeMs:540000,clockEnabled:true,undoMode:"turn"},"white");
});

it("closes the NEW GAME menu with both × and Escape", () => {
  const actions = { local: vi.fn(), computer: vi.fn(), create: vi.fn(), join: vi.fn() };
  const buttonDialog = openNewGameDialog(true, false, actions);
  expect(buttonDialog.querySelector(".new-game-close")?.getAttribute("aria-label")).toBe("Close new game menu");
  buttonDialog.querySelector<HTMLButtonElement>(".new-game-close")!.click();
  expect(buttonDialog.isConnected).toBe(false);
  const escapeDialog = openNewGameDialog(true, false, actions);
  escapeDialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  expect(escapeDialog.isConnected).toBe(false);
});
it("hides both clocks and removes the settings summary when time is disabled",()=>{const root=document.createElement("main");localGameView(root,createGame(),false,vi.fn(),vi.fn(),{canUndo:false,undo:vi.fn(),clock:{blackRemainingMs:420000,whiteRemainingMs:420000,activeSince:0,running:false},settings:{...DEFAULT_SETTINGS,clockEnabled:false},now:0,countdownEndsAt:0});expect(root.querySelector(".clock-board-layout")?.classList.contains("no-clock")).toBe(true);expect([...root.querySelectorAll<HTMLElement>(".player-clock")].every(clock=>clock.hidden)).toBe(true);expect(root.textContent).not.toContain("∞");expect(root.querySelector(".game-settings-summary")).toBeNull()});
it("reopens game options with the current values selected",()=>{const submit=vi.fn();const settings={initialTimeMs:600000,clockEnabled:false,undoMode:"turn" as const};const dialog=openGameSettingsDialog("computer",settings,"white",submit);expect(dialog.querySelector<HTMLInputElement>('input[name="humanSide"]:checked')?.value).toBe("white");expect(dialog.querySelector<HTMLInputElement>('input[name="clockEnabled"]:checked')?.value).toBe("off");expect(dialog.querySelector<HTMLInputElement>('input[name="undoMode"]:checked')?.value).toBe("turn");expect(dialog.querySelector<HTMLInputElement>('input[name="minutes"]')?.value).toBe("10");expect(dialog.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent).toBe("START GAME")});
