/// <reference lib="webworker" />
import type { GameState } from "../game/types";
import { ReversixNet } from "./reversixNet";
import { searchPlacement, type SearchSelection } from "./search";

type Request={type:"load";id:number;base:string}|{type:"search";id:number;state:GameState;selection:SearchSelection}|{type:"cancel";id:number};
let network:ReversixNet|undefined,loading:Promise<ReversixNet>|undefined;
const cancelled=new Set<number>();
const send=(message:unknown)=>self.postMessage(message);
self.onmessage=async(event:MessageEvent<Request>)=>{
  const request=event.data;
  if(request.type==="cancel"){cancelled.add(request.id);return}
  try{
    if(request.type==="load"){
      loading??=ReversixNet.load(request.base);
      try{network=await loading}catch(error){loading=undefined;network=undefined;throw error}
      send({type:"loaded",id:request.id,meta:network.meta});return;
    }
    if(!network)throw new Error("MODEL NOT LOADED");
    const index=await searchPlacement(network,request.state,{sims:32,candidates:16,selection:request.selection,cancelled:()=>cancelled.has(request.id),onProgress:async(done,total)=>{send({type:"progress",id:request.id,done,total});await new Promise(resolve=>setTimeout(resolve,0))}});
    if(!cancelled.has(request.id))send({type:"result",id:request.id,index,revision:request.state.revision});
  }catch(error){if(!cancelled.has(request.id))send({type:"error",id:request.id,message:error instanceof Error?error.message:String(error)})}finally{cancelled.delete(request.id)}
};