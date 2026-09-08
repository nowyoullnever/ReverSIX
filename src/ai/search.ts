import { playMove } from "../game/gameState";
import type { GameState,Player } from "../game/types";
import { encode,safePlacements } from "./encoder";
import type { NetworkOutput } from "./reversixNet";

export interface Network { forward(input:Float32Array):NetworkOutput }
export interface SearchOptions { sims?:number; candidates?:number; random?:()=>number; onProgress?:(done:number,total:number)=>void|Promise<void>; cancelled?:()=>boolean }
const C_VISIT=50,C_SCALE=1;
const softmax=(values:number[])=>{const max=Math.max(...values),exp=values.map(value=>Math.exp(value-max)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(value=>value/sum)};
const sigma=(q:number,maxVisits:number)=>(C_VISIT+maxVisits)*C_SCALE*q;
const gumbel=(random:()=>number)=>-Math.log(-Math.log(Math.max(random(),1e-12))+1e-12);
export function halvingSchedule(simulations:number,candidates:number){const phases=Math.max(1,Math.ceil(Math.log2(Math.max(candidates,2)))),out:Array<[number,number]>=[];let count=candidates;for(let i=0;i<phases;i++){if(count<1)break;out.push([count,Math.max(1,Math.floor(simulations/(phases*count)))]);if(count===1)break;count=Math.floor(count/2)}return out}

class SearchNode {
  readonly player:Player;readonly terminal:boolean;expanded=false;legal:number[]=[];prior:number[]=[];visits=new Int32Array();value=0;wins=new Float64Array();children:Array<SearchNode|null>=[];
  constructor(readonly state:GameState){this.player=state.currentPlayer;this.terminal=Boolean(state.winner)}
  expand(logits:Float32Array,value:number){this.legal=safePlacements(this.state);let max=-Infinity;for(const index of this.legal)if(logits[index]>max)max=logits[index];this.prior=this.legal.map(index=>logits[index]-max);this.visits=new Int32Array(this.legal.length);this.wins=new Float64Array(this.legal.length);this.children=new Array(this.legal.length).fill(null);this.value=value;this.expanded=true}
  q(){return Array.from(this.visits,(visits,index)=>visits?this.wins[index]/visits:0)}
  completedQ(){const total=this.visits.reduce((a,b)=>a+b,0),q=this.q();if(total===0)return this.legal.map(()=>this.value);const probabilities=softmax(this.prior);let weight=0,weightedQ=0;for(let i=0;i<this.visits.length;i++)if(this.visits[i]){weight+=probabilities[i];weightedQ+=probabilities[i]*q[i]}const mixed=(this.value+(total/Math.max(weight,1e-8))*weightedQ)/(1+total);return q.map((value,index)=>this.visits[index]?value:mixed)}
  maxVisits(){let max=0;for(const visits of this.visits)if(visits>max)max=visits;return max}
}
const terminalValue=(state:GameState,player:Player)=>state.winner==="draw"||!state.winner?0:state.winner===player?1:-1;
function interiorSelect(node:SearchNode){const q=node.completedQ(),max=node.maxVisits(),probability=softmax(node.prior.map((prior,index)=>prior+sigma(q[index],max))),total=node.visits.reduce((a,b)=>a+b,0);let best=0,bestValue=-Infinity;for(let i=0;i<probability.length;i++){const value=probability[i]-node.visits[i]/(1+total);if(value>bestValue){bestValue=value;best=i}}return best}
function backup(path:Array<[SearchNode,number]>,value:number,leafPlayer:Player){for(const [node,index] of path){node.visits[index]++;node.wins[index]+=node.player===leafPlayer?value:-value}}
function abortIfNeeded(cancelled?:()=>boolean){if(cancelled?.())throw new DOMException("AI search cancelled","AbortError")}

export async function searchPlacement(net:Network,state:GameState,options:SearchOptions={}){
  const simulations=options.sims??32,maxCandidates=options.candidates??16,random=options.random??Math.random,root=new SearchNode(state);
  const evaluate=(node:SearchNode)=>{const output=net.forward(encode(node.state));node.expand(output.policy,output.value)};
  evaluate(root);if(!root.legal.length)return -1;if(root.legal.length===1)return root.legal[0];
  const noise=root.legal.map(()=>gumbel(random));let candidates=root.prior.map((prior,index)=>[prior+noise[index],index] as const).sort((a,b)=>b[0]-a[0]).slice(0,Math.min(maxCandidates,root.legal.length)).map(item=>item[1]);
  const schedule=halvingSchedule(simulations,candidates.length),total=schedule.reduce((sum,[count,per])=>sum+count*per,0);let done=0;
  for(const [candidateCount,per] of schedule){
    const current=candidates.slice(0,candidateCount);
    for(let visit=0;visit<per;visit++)for(const rootIndex of current){
      abortIfNeeded(options.cancelled);const path:Array<[SearchNode,number]>=[];let node=root,index=rootIndex;
      for(;;){
        path.push([node,index]);let next=node.children[index];
        if(!next){next=new SearchNode(playMove(node.state,node.player,node.legal[index]));node.children[index]=next}
        if(next.terminal){backup(path,terminalValue(next.state,next.player),next.player);break}
        if(!next.expanded){evaluate(next);backup(path,next.value,next.player);break}
        node=next;index=interiorSelect(node);
      }
      done++;await options.onProgress?.(done,total);
    }
    if(candidateCount>1){const q=root.completedQ(),max=root.maxVisits();candidates=current.map(index=>[noise[index]+root.prior[index]+sigma(q[index],max),index] as const).sort((a,b)=>b[0]-a[0]).slice(0,Math.max(1,Math.floor(candidateCount/2))).map(item=>item[1])}
  }
  const q=root.completedQ(),max=root.maxVisits();let best=candidates[0],bestScore=-Infinity;for(const index of candidates){const score=noise[index]+root.prior[index]+sigma(q[index],max);if(score>bestScore){bestScore=score;best=index}}
  return root.legal[best];
}
