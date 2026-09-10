import { readFileSync } from "node:fs";
import { expect,it } from "vitest";
import { createGame,playMove } from "../src/game/gameState";
import { emptyBoard } from "../src/game/board";
import { getMoveOptions } from "../src/game/rules";
import { encode,safePlacements } from "../src/ai/encoder";
import { ReversixNet,type ModelMeta } from "../src/ai/reversixNet";
import { halvingSchedule,searchPlacement,selectMiddleRankedMove,type Network } from "../src/ai/search";

function loadModel(){const meta=JSON.parse(readFileSync("public/model/normal/model.json","utf8")) as ModelMeta,buffer=readFileSync("public/model/normal/model.bin"),flat=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));return new ReversixNet(meta,flat)}
function loadHardModel(){const meta=JSON.parse(readFileSync("public/model/hard/model.json","utf8")) as ModelMeta,buffer=readFileSync("public/model/hard/model.bin"),flat=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));return new ReversixNet(meta,flat)}

it("matches the normal iteration-20 inference test vector",()=>{const net=loadModel(),vector=JSON.parse(readFileSync("public/model/normal/testvec.json","utf8")) as {input:number[];policy:number[];value:number},output=net.forward(Float32Array.from(vector.input));expect(net.meta).toMatchObject({board:10,planes:9,ch:64,blocks:6,iter:20,total_floats:454754});expect(output.policy).toHaveLength(100);expect(Math.max(...output.policy.map((value,index)=>Math.abs(value-vector.policy[index])))).toBeLessThan(1e-4);expect(Math.abs(output.value-vector.value)).toBeLessThan(1e-4)});
it("matches the hard iteration-54 inference test vector",()=>{const net=loadHardModel(),vector=JSON.parse(readFileSync("public/model/hard/testvec.json","utf8")) as {input:number[];policy:number[];value:number},output=net.forward(Float32Array.from(vector.input));expect(net.meta).toMatchObject({board:10,planes:9,ch:64,blocks:6,iter:54,total_floats:454754});expect(output.policy).toHaveLength(100);expect(Math.max(...output.policy.map((value,index)=>Math.abs(value-vector.policy[index])))).toBeLessThan(1e-4);expect(Math.abs(output.value-vector.value)).toBeLessThan(1e-4);expect(readFileSync("public/model/normal/model.bin").equals(readFileSync("public/model/hard/model.bin"))).toBe(false)});

it("encodes the opening from the current player's view in nine planes",()=>{const planes=encode(createGame()),plane=(n:number)=>planes.slice(n*100,(n+1)*100);expect(planes).toHaveLength(900);expect([...plane(0)].flatMap((value,index)=>value?[index]:[])).toEqual([45,54]);expect([...plane(1)].flatMap((value,index)=>value?[index]:[])).toEqual([44,55]);expect([...plane(7)].flatMap((value,index)=>value?[index]:[])).toEqual([34,43,56,65]);expect(plane(8).every(value=>value===1)).toBe(true)});

it("keeps a CHECK defense first move when its second move can finish the defense",()=>{
  const board=emptyBoard();
  for(const index of [40,41,42,43,44,45])board[index]="black";
  board[54]="white";board[12]="black";board[22]="white";
  const state={...createGame(),board,turnStartBoard:[...board],currentPlayer:"white" as const,checkBy:"black" as const,turn:1};
  expect(playMove(state,"white",34).checkBy).toBe("black");
  expect(playMove(playMove(state,"white",34),"white",2).winner).not.toBe("black");
  expect(safePlacements(state)).toContain(34);
});

it("uses the current engine legal set throughout Gumbel sequential halving",async()=>{const net:Network={forward:()=>({policy:Float32Array.from({length:100},(_,index)=>index/100),value:0})};let state=createGame(),checked=0;for(let game=0;game<12&&checked<100;game++){state=createGame();while(!state.winner&&checked<100){const legal=getMoveOptions(state).legal,index=await searchPlacement(net,state,{sims:4,candidates:4,random:()=>0.5});expect(legal).toContain(index);expect(safePlacements(state)).toContain(index);state=playMove(state,state.currentPlayer,index);checked++}}expect(checked).toBeGreaterThanOrEqual(100);expect(halvingSchedule(32,16)).toEqual([[16,1],[8,1],[4,2],[2,4]])});

it("selects NORMAL moves uniformly from the middle ranked band",()=>{
  const ranked=[1,2,3,4,5,6,7,8,9,10];
  expect([0,.17,.34,.5,.67,.99].map(random=>selectMiddleRankedMove(ranked,()=>random))).toEqual([3,4,5,6,7,8]);
  expect(selectMiddleRankedMove([1],()=>.9)).toBe(1);
  expect(selectMiddleRankedMove([1,2],()=>.9)).toBe(2);
  expect(selectMiddleRankedMove([1,2,3],()=>0)).toBe(2);
  expect([0,.9].map(random=>selectMiddleRankedMove([1,2,3,4],()=>random))).toEqual([2,3]);
  expect([0,.5,.99].map(random=>selectMiddleRankedMove([1,2,3,4,5],()=>random))).toEqual([2,3,4]);
});

it("keeps NORMAL search selections inside its CHECK-defense placement set",async()=>{
  const board=emptyBoard();
  for(const index of [40,41,42,43,44,45])board[index]="black";
  board[54]="white";board[12]="black";board[22]="white";
  const state={...createGame(),board,turnStartBoard:[...board],currentPlayer:"white" as const,checkBy:"black" as const,turn:1};
  const net:Network={forward:()=>({policy:Float32Array.from({length:100},(_,index)=>index),value:0})};
  const index=await searchPlacement(net,state,{sims:4,candidates:4,selection:"middle",random:()=>.5});
  expect(safePlacements(state)).toContain(index);
});