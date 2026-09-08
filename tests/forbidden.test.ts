import { expect,it } from "vitest";
import { emptyBoard } from "../src/game/board";
import { createGame,playMove,settlePasses } from "../src/game/gameState";
import { getMoveOptions } from "../src/game/rules";
import { getSixLines } from "../src/game/six";
import { getLegalMoves } from "../src/game/reversi";
import type { GameState } from "../src/game/types";

const state=(checkBy:"black"|"white"|""="")=>({...createGame(),board:emptyBoard(),turnStartBoard:emptyBoard(),turn:1,checkBy});
const captureTurnStart=(s:GameState)=>{s.turnStartBoard=[...s.board];return s};
const fill=(board:GameState["board"],indices:number[],color:"black"|"white"="white")=>indices.forEach(i=>board[i]=color);

it("forbids a new opponent Exact SIX relative to the turn-start board",()=>{const s=state();fill(s.board,[40,41,42,43,44,45,46]);s.board[30]="black";captureTurnStart(s);expect(getSixLines(s.turnStartBoard,"white")).toEqual([]);expect(getMoveOptions(s).forbidden).toContain(50);expect(()=>playMove(s,"black",50)).toThrow("FORBIDDEN MOVE")});

it("allows an Exact SIX that existed at turn start to reappear on move two",()=>{const s=state("white");fill(s.turnStartBoard,[41,42,43,44,45,46]);s.board=[...s.turnStartBoard];s.board[40]="white";s.board[30]="black";s.moveNumberInTurn=2;s.firstPlacedStone=99;expect(getSixLines(s.board,"white")).toEqual([]);expect(getMoveOptions(s).legal).toContain(50);const result=playMove(s,"black",50);expect(getSixLines(result.board,"white")).toEqual([[41,42,43,44,45,46]]);expect(result.winner).toBe("white");expect(result.events).toContain("CHECK DEFENSE FAILED")});

it("still forbids a new SIX B when existing SIX A was present at turn start",()=>{const s=state("white");fill(s.turnStartBoard,[70,71,72,73,74,75]);s.board=[...s.turnStartBoard];fill(s.board,[40,41,42,43,44,45,46]);s.board[30]="black";s.moveNumberInTurn=2;s.firstPlacedStone=99;expect(getMoveOptions(s).forbidden).toContain(50)});

it("allows a move that creates the current player's Exact SIX",()=>{const s=state();fill(s.board,[41,42,43,44,45],"black");s.board[40]="white";s.board[30]="black";captureTurnStart(s);expect(getMoveOptions(s).legal).toContain(50)});

it("does not forbid an opponent SIX that remains from turn start",()=>{const s=state("white");fill(s.board,[41,42,43,44,45,46]);s.board[10]="white";s.board[20]="black";captureTurnStart(s);expect(getMoveOptions(s).legal).toContain(0)});

it("does not mark an overline result unless a new exact six appears",()=>{const s=state();fill(s.board,[40,41,42,43,44,45,46,47]);s.board[30]="black";captureTurnStart(s);expect(getMoveOptions(s).legal).toContain(50)});

it("PASS uses turn-start filtered moves when every raw move is forbidden",()=>{const s=state();s.board.fill("black");fill(s.board,[40,41,42,43,44,45,46]);fill(s.board,[32,23,14,5]);s.board[50]="";captureTurnStart(s);expect(getLegalMoves(s.board,"black")).toEqual([50]);expect(getMoveOptions(s)).toEqual({legal:[],forbidden:[50]});const settled=settlePasses(s);expect(settled.events).toContain("BLACK PASS")});

it("keeps the same baseline and skips move two when only forbidden moves remain",()=>{const s=state();s.board.fill("black");fill(s.board,[40,41,42,43,44,45,46]);fill(s.board,[32,23,14,5]);s.board[1]="white";s.board[0]="";s.board[50]="";captureTurnStart(s);const baseline=[...s.turnStartBoard];const result=playMove(s,"black",0);expect(result.events).toContain("BLACK SECOND MOVE SKIPPED");expect(result.turnStartBoard).not.toEqual(baseline);expect(result.turnStartBoard).toEqual(result.board)});
