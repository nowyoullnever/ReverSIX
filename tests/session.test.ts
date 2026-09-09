import { expect, it } from "vitest";
import { LocalGameSession } from "../src/local/localGame";
import { COMPUTER_DEFAULT_SETTINGS, DEFAULT_SETTINGS, LOCAL_DEFAULT_SETTINGS, ROOM_DEFAULT_SETTINGS, countdownRenderState, countdownValue, validSettings } from "../src/game/session";
import { getMoveOptions } from "../src/game/rules";

it("maps a shared countdown deadline to 3, 2, 1, then zero",()=>{expect([0,999,1000,1999,2000,2999,3000].map(now=>countdownValue(3000,now))).toEqual([3,3,2,2,1,1,0])});
it("renders once when an online countdown ends even without a running clock",()=>{
  expect(countdownRenderState(4000,1000,false)).toEqual({active:true,shouldRender:true});
  expect(countdownRenderState(4000,2000,true)).toEqual({active:true,shouldRender:true});
  expect(countdownRenderState(4000,3000,true)).toEqual({active:true,shouldRender:true});
  expect(countdownRenderState(4000,4000,true)).toEqual({active:false,shouldRender:true});
  expect(countdownRenderState(4000,4001,false)).toEqual({active:false,shouldRender:false});
});
it("uses five-minute defaults with clocks enabled only for local and rooms",()=>{
  expect(LOCAL_DEFAULT_SETTINGS).toMatchObject({initialTimeMs:300000,clockEnabled:true});
  expect(ROOM_DEFAULT_SETTINGS).toMatchObject({initialTimeMs:300000,clockEnabled:true});
  expect(COMPUTER_DEFAULT_SETTINGS).toMatchObject({initialTimeMs:300000,clockEnabled:false});
});
it("accepts integer tenth-minute clock settings only",()=>{
  expect([6000,90000,282000,300000,3600000].every(initialTimeMs=>validSettings({...DEFAULT_SETTINGS,initialTimeMs}))).toBe(true);
  expect([5999,6001,3606000].some(initialTimeMs=>validSettings({...DEFAULT_SETTINGS,initialTimeMs}))).toBe(false);
  expect(validSettings({...DEFAULT_SETTINGS,initialTimeMs:6001})).toBe(false);
  expect(validSettings({...DEFAULT_SETTINGS,initialTimeMs:3606001})).toBe(false);
});

it("local countdown excludes its three seconds from the full-turn clock",()=>{const game=new LocalGameSession(DEFAULT_SETTINGS,0);expect(()=>game.play(34,2999)).toThrow("GAME IS COUNTING DOWN");expect(game.remaining("black",3000)).toBe(300000);game.play(34,5000);expect(game.remaining("black",8000)).toBe(298000);expect(game.game.currentPlayer).toBe("white");game.play(getMoveOptions(game.game).legal[0],8000);expect(game.game.currentPlayer).toBe("white");expect(game.remaining("white",10000)).toBe(295000);game.play(getMoveOptions(game.game).legal[0],10000);expect(game.game.currentPlayer).toBe("black")});
it("local ALL rewinds placements across turns and restores clocks",()=>{const game=new LocalGameSession(DEFAULT_SETTINGS,0);game.play(34,10000);game.play(33,15000);game.undo(20000);expect(game.game.currentPlayer).toBe("white");expect(game.remaining("white",20000)).toBe(300000);game.undo(21000);expect(game.game.currentPlayer).toBe("black")});
it("local TURN only rewinds placements in the current turn",()=>{const game=new LocalGameSession({...DEFAULT_SETTINGS,undoMode:"turn",checkRingEnabled:true},0);game.play(34,4000);expect(game.canUndo(4000)).toBe(false);game.play(33,5000);expect(game.canUndo(5000)).toBe(true)});
it("local timeout waits for NO, while YES continues the same board without clocks",()=>{const settings={initialTimeMs:60000,clockEnabled:true,undoMode:"all" as const,checkRingEnabled:true};const noGame=new LocalGameSession(settings,0);expect(noGame.tick(63001)).toBe(true);expect(noGame.game.winner).toBe("");expect(noGame.timeout.pendingFor).toBe("black");noGame.decideTimeout(false);expect(noGame.game.winner).toBe("white");const yesGame=new LocalGameSession(settings,0),board=yesGame.game.board;yesGame.tick(63001);yesGame.decideTimeout(true);expect(yesGame.game.board).toBe(board);expect(yesGame.game.currentPlayer).toBe("black");expect(yesGame.timeout.continueWithoutClock).toBe(true);expect(yesGame.clock.running).toBe(false);yesGame.rematch(70000);expect(yesGame.settings).toBe(settings);expect(yesGame.timeout.continueWithoutClock).toBe(false);expect(yesGame.countdownEndsAt).toBe(73000);expect(yesGame.clock.blackRemainingMs).toBe(60000)});
it("disables elapsed time and timeout when the time limit is off",()=>{const game=new LocalGameSession({...DEFAULT_SETTINGS,clockEnabled:false},0);expect(game.clock.running).toBe(false);expect(game.tick(999999)).toBe(false);game.play(34,999999);expect(game.clock.blackRemainingMs).toBe(300000);expect(game.moveLog[0].elapsedMs).toBe(0)});
