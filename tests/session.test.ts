import { expect, it } from "vitest";
import { LocalGameSession } from "../src/local/localGame";
import { DEFAULT_SETTINGS } from "../src/game/session";
import { getMoveOptions } from "../src/game/rules";

it("local clock follows the full two-placement turn",()=>{const game=new LocalGameSession(DEFAULT_SETTINGS,0);expect(game.remaining("white",5000)).toBe(420000);game.play(34,5000);expect(game.remaining("black",8000)).toBe(415000);expect(game.game.currentPlayer).toBe("white");game.play(getMoveOptions(game.game).legal[0],8000);expect(game.game.currentPlayer).toBe("white");expect(game.remaining("white",10000)).toBe(415000);game.play(getMoveOptions(game.game).legal[0],10000);expect(game.game.currentPlayer).toBe("black")});
it("local ALL rewinds placements across turns and restores clocks",()=>{const game=new LocalGameSession(DEFAULT_SETTINGS,0);game.play(34,10000);game.play(33,15000);game.undo(20000);expect(game.game.currentPlayer).toBe("white");expect(game.remaining("white",20000)).toBe(420000);game.undo(21000);expect(game.game.currentPlayer).toBe("black")});
it("local TURN only rewinds placements in the current turn",()=>{const game=new LocalGameSession({...DEFAULT_SETTINGS,undoMode:"turn"},0);game.play(34,1000);expect(game.canUndo()).toBe(false);game.play(33,2000);expect(game.canUndo()).toBe(true)});
it("local timeout and rematch reset while preserving settings",()=>{const settings={initialTimeMs:60000,undoMode:"all" as const};const game=new LocalGameSession(settings,0);expect(game.tick(60001)).toBe(true);expect(game.game.winner).toBe("white");game.rematch(70000);expect(game.settings).toBe(settings);expect(game.game.winner).toBe("");expect(game.clock.blackRemainingMs).toBe(60000);expect(game.moveLog).toEqual([])});
