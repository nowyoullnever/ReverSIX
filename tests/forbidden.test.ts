import { describe,expect,it } from "vitest";
import { emptyBoard } from "../src/game/board";
import { createGame,playMove,settlePasses } from "../src/game/gameState";
import { getMoveOptions } from "../src/game/rules";
import { getSixLines } from "../src/game/six";
import { getLegalMoves } from "../src/game/reversi";

const state=(checkBy:"black"|"white"|""="")=>({...createGame(),board:emptyBoard(),turn:1,checkBy});
it("forbids a flip that changes an opponent overline into a new Exact SIX",()=>{const s=state();for(let i=40;i<=46;i++)s.board[i]="white";s.board[30]="black";expect(getSixLines(s.board,"white")).toEqual([]);expect(getMoveOptions(s).forbidden).toContain(50);expect(()=>playMove(s,"black",50)).toThrow("FORBIDDEN MOVE")});
it("allows a move that creates the current player's Exact SIX",()=>{const s=state();for(let i=41;i<=45;i++)s.board[i]="black";s.board[40]="white";s.board[30]="black";expect(getMoveOptions(s).legal).toContain(50)});
it("does not forbid an existing opponent SIX that merely remains during defense",()=>{const s=state("white");for(let i=41;i<=46;i++)s.board[i]="white";s.board[10]="white";s.board[20]="black";expect(getMoveOptions(s).legal).toContain(0)});
it("forbids a newly added opponent SIX even while another CHECK line remains",()=>{const s=state("white");for(let i=70;i<=75;i++)s.board[i]="white";for(let i=40;i<=46;i++)s.board[i]="white";s.board[30]="black";expect(getMoveOptions(s).forbidden).toContain(50)});
it("does not mark an overline result unless a new exact six appears",()=>{const s=state();for(let i=40;i<=47;i++)s.board[i]="white";s.board[30]="black";expect(getMoveOptions(s).legal).toContain(50)});
it("PASS uses filtered moves when every raw move is forbidden",()=>{const s=state();s.board.fill("black");for(let i=40;i<=46;i++)s.board[i]="white";for(const i of [32,23,14,5])s.board[i]="white";s.board[50]="";expect(getLegalMoves(s.board,"black")).toEqual([50]);expect(getMoveOptions(s)).toEqual({legal:[],forbidden:[50]});const settled=settlePasses(s);expect(settled.events).toContain("BLACK PASS")});
it("skips move two when only forbidden raw moves remain",()=>{const s=state();s.board.fill("black");for(let i=40;i<=46;i++)s.board[i]="white";for(const i of [32,23,14,5])s.board[i]="white";s.board[1]="white";s.board[0]="";s.board[50]="";const result=playMove(s,"black",0);expect(result.events).toContain("BLACK SECOND MOVE SKIPPED")});
