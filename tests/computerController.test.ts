import { expect,it,vi } from "vitest";
import { ComputerController,chooseRandomLegalMove } from "../src/ai/computerController";
import { createGame } from "../src/game/gameState";
import { getMoveOptions } from "../src/game/rules";

class FakeWorker {
  onmessage:((event:MessageEvent)=>void)|null=null;
  onerror:((event:ErrorEvent)=>void)|null=null;
  messages:unknown[]=[];
  postMessage(message:unknown){this.messages.push(message)}
  terminate(){}
  emit(data:unknown){this.onmessage?.({data} as MessageEvent)}
}

it("loads the Pages-relative model once and reports search progress",async()=>{
  const worker=new FakeWorker(),controller=new ComputerController(()=>worker);
  const load=controller.load(),loadMessage=worker.messages[0] as {type:string;id:number;base:string};
  expect(loadMessage).toMatchObject({type:"load",base:"/model/normal/model"});
  worker.emit({type:"loaded",id:loadMessage.id,meta:{iter:20}});
  await expect(load).resolves.toMatchObject({iter:20});
  await controller.load();
  expect(worker.messages.filter((message:any)=>message.type==="load")).toHaveLength(1);
  const progress=vi.fn(),choice=controller.choose(createGame(),"normal",progress);
  await Promise.resolve();
  const search=worker.messages.at(-1) as {type:string;id:number;state:{revision:number};selection:string};
  expect(search).toMatchObject({type:"search",state:{revision:0},selection:"middle"});
  worker.emit({type:"progress",id:search.id,done:3,total:20});
  expect(progress).toHaveBeenCalledWith(3,20);
  worker.emit({type:"result",id:search.id,index:34,revision:0});
  await expect(choice).resolves.toEqual({index:34,revision:0});
});

it("uses the existing best selection for hard searches",async()=>{
  const worker=new FakeWorker(),controller=new ComputerController(()=>worker);
  const load=controller.load("hard"),loadMessage=worker.messages[0] as {id:number};worker.emit({type:"loaded",id:loadMessage.id,meta:{iter:54}});await load;
  const choice=controller.choose(createGame(),"hard");await Promise.resolve();
  expect(worker.messages.at(-1)).toMatchObject({type:"search",selection:"best"});
  const search=worker.messages.at(-1) as {id:number};worker.emit({type:"result",id:search.id,index:34,revision:0});await expect(choice).resolves.toEqual({index:34,revision:0});
});

it("chooses EASY moves from the authoritative legal set without creating a worker",async()=>{
  const factory=vi.fn(()=>new FakeWorker()),controller=new ComputerController(factory),state=createGame(),legal=getMoveOptions(state).legal;
  await expect(controller.load("easy")).resolves.toBeUndefined();
  const choice=await controller.choose(state,"easy");
  expect(legal).toContain(choice.index);expect(factory).not.toHaveBeenCalled();
  expect(chooseRandomLegalMove(state,()=>0).index).toBe(legal[0]);
  expect(chooseRandomLegalMove(state,()=>.26).index).toBe(legal[1]);
  expect(chooseRandomLegalMove(state,()=>.51).index).toBe(legal[2]);
  expect(chooseRandomLegalMove(state,()=>.99).index).toBe(legal[3]);
});

it("rejects a cancelled search and ignores its late result",async()=>{
  const worker=new FakeWorker(),controller=new ComputerController(()=>worker);
  const load=controller.load(),loadMessage=worker.messages[0] as {id:number};
  worker.emit({type:"loaded",id:loadMessage.id,meta:{iter:20}});await load;
  const choice=controller.choose(createGame());await Promise.resolve();
  const search=worker.messages.at(-1) as {id:number};
  controller.cancel();
  await expect(choice).rejects.toMatchObject({name:"AbortError"});
  worker.emit({type:"result",id:search.id,index:34,revision:0});
  expect((worker.messages.at(-1) as {type:string;id:number})).toEqual({type:"cancel",id:search.id});
});