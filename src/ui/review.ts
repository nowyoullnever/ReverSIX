import { replayMoves, type GameSettings, type MoveRecord } from "../game/session";

export function canReviewBack(finished:boolean,cursor:number|null,records:MoveRecord[]){
  return finished&&(cursor??records.length)>0;
}

export function replayForReview(settings:GameSettings,records:MoveRecord[],cursor:number,revision:number){
  const replay=replayMoves(settings,records.slice(0,cursor),-(revision+cursor+1));
  return {
    game:replay.game,
    clock:{
      blackRemainingMs:replay.blackRemainingMs,
      whiteRemainingMs:replay.whiteRemainingMs,
      activeSince:0,
      running:false,
    },
    lastPlaced:cursor?records[cursor-1]?.index:-1,
  };
}
