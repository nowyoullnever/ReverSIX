import { safePlacements } from "./encoder";
import type { GameState } from "../game/types";
import type { ModelMeta } from "./reversixNet";
import { MODEL_BASES, type ComputerDifficulty, type NeuralDifficulty } from "./difficulty";
import type { SearchSelection } from "./search";

interface WorkerLike { postMessage(message:unknown):void; terminate():void; onmessage:((event:MessageEvent)=>void)|null; onerror:((event:ErrorEvent)=>void)|null }
interface Pending { resolve:(value:unknown)=>void; reject:(error:Error)=>void; progress?:(done:number,total:number)=>void; kind:"load"|"search" }
export function easyPlacements(state:GameState){return safePlacements(state);}
export function chooseEasyMove(state:GameState,random:()=>number=Math.random){
  const candidates=easyPlacements(state);
  const index=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]??-1;
  return { index, revision:state.revision };
}
/** Backward-compatible name for the EASY random chooser. */
export const chooseRandomLegalMove=chooseEasyMove;
export class ComputerController {
  private channels=new Map<NeuralDifficulty,NeuralChannel>();
  constructor(private factory:()=>WorkerLike=()=>new Worker(new URL("./aiWorker.ts",import.meta.url),{type:"module"})){ }
  load(difficulty:ComputerDifficulty="normal"):Promise<ModelMeta|void>{return difficulty==="easy"?Promise.resolve():this.channel(difficulty).load(difficulty)}
  choose(state:GameState,difficulty:ComputerDifficulty="normal",progress?:(done:number,total:number)=>void){
    return difficulty==="easy"?Promise.resolve(chooseEasyMove(state)):this.channel(difficulty).choose(state,difficulty,progress);
  }
  cancel(){for(const channel of this.channels.values())channel.cancel()}
  dispose(){for(const channel of this.channels.values())channel.dispose()}
  private channel(difficulty:NeuralDifficulty){let channel=this.channels.get(difficulty);if(!channel){channel=new NeuralChannel(this.factory());this.channels.set(difficulty,channel)}return channel}
}
class NeuralChannel {
  private nextId=1;private pending=new Map<number,Pending>();private loadPromise?:Promise<ModelMeta>;private activeSearch=0;
  constructor(private worker:WorkerLike){this.worker.onmessage=event=>this.receive(event.data);this.worker.onerror=event=>this.failAll(new Error(event.message||"AI WORKER FAILED"))}
  load(difficulty:NeuralDifficulty){
    if(this.loadPromise)return this.loadPromise;
    const id=this.nextId++;this.loadPromise=new Promise<ModelMeta>((resolve,reject)=>{this.pending.set(id,{resolve:value=>resolve(value as ModelMeta),reject,kind:"load"});this.worker.postMessage({type:"load",id,base:MODEL_BASES[difficulty]})});
    this.loadPromise.catch(()=>{this.loadPromise=undefined});return this.loadPromise;
  }
  async choose(state:GameState,difficulty:NeuralDifficulty,progress?:(done:number,total:number)=>void){
    await this.load(difficulty);this.cancel();const id=this.nextId++;this.activeSearch=id;
    const selection:SearchSelection=difficulty==="normal"?"middle":"best";
    return new Promise<{index:number;revision:number}>((resolve,reject)=>{this.pending.set(id,{resolve:value=>resolve(value as {index:number;revision:number}),reject,progress,kind:"search"});this.worker.postMessage({type:"search",id,state:structuredClone(state),selection})});
  }
  cancel(){if(!this.activeSearch)return;const id=this.activeSearch;this.activeSearch=0;this.worker.postMessage({type:"cancel",id});const pending=this.pending.get(id);this.pending.delete(id);pending?.reject(new DOMException("AI search cancelled","AbortError"))}
  dispose(){this.cancel();this.worker.terminate();this.failAll(new Error("AI WORKER DISPOSED"))}
  private receive(message:{type:string;id:number;[key:string]:unknown}){
    const pending=this.pending.get(message.id);if(!pending)return;
    if(message.type==="progress"){pending.progress?.(message.done as number,message.total as number);return}
    this.pending.delete(message.id);if(this.activeSearch===message.id)this.activeSearch=0;
    if(message.type==="error")pending.reject(new Error(String(message.message)));else if(message.type==="loaded")pending.resolve(message.meta);else if(message.type==="result")pending.resolve({index:message.index,revision:message.revision});
  }
  private failAll(error:Error){for(const pending of this.pending.values())pending.reject(error);this.pending.clear();this.activeSearch=0}
}