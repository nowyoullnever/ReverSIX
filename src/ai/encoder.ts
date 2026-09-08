import { playMove } from "../game/gameState";
import { getMoveOptions } from "../game/rules";
import { getSixLines } from "../game/six";
import { other,type GameState } from "../game/types";

export function safePlacements(state:GameState,safe=true):number[]{
  const legal=getMoveOptions(state).legal,player=state.currentPlayer,opponent=other(player);
  const mustDefend=safe&&state.checkBy===opponent;
  if(!mustDefend)return legal;
  const result=legal.filter(index=>{
    const first=playMove(state,player,index);
    if(first.currentPlayer!==player||first.winner)return first.winner!==opponent;
    return getMoveOptions(first).legal.some(second=>playMove(first,player,second).winner!==opponent);
  });
  return result.length?result:safePlacements(state,false);
}

export function encode(state:GameState){
  const cells=100,planes=new Float32Array(9*cells),player=state.currentPlayer,opponent=other(player),base=(plane:number)=>plane*cells;
  for(let i=0;i<cells;i++){
    if(state.board[i]===player)planes[base(0)+i]=1;
    else if(state.board[i]===opponent)planes[base(1)+i]=1;
    planes[base(8)+i]=1;
  }
  if(state.checkBy===opponent)planes.fill(1,base(2),base(3));
  for(const line of getSixLines(state.board,opponent))for(const index of line)planes[base(3)+index]=1;
  if(state.moveNumberInTurn===2)planes.fill(1,base(4),base(5));
  if(state.firstPlacedStone>=0)planes[base(5)+state.firstPlacedStone]=1;
  if(state.turn>0)planes.fill(1,base(6),base(7));
  for(const index of safePlacements(state))planes[base(7)+index]=1;
  return planes;
}
