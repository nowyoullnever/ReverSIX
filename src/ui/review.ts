import { lastCompletedTurnPlacements, replayTurns, type GameSettings, type TurnRecord } from "../game/session";

export function canReviewBack(finished:boolean,cursor:number|null,records:TurnRecord[]){
  return finished&&(cursor??records.length)>0;
}

/** Rebuilds the position as it stood after `cursor` completed turns. */
export function replayForReview(settings:GameSettings,records:TurnRecord[],cursor:number,revision:number){
  const replay=replayTurns(settings,records.slice(0,cursor),-(revision+cursor+1));
  return {
    game:replay.game,
    clock:{
      blackRemainingMs:replay.blackRemainingMs,
      whiteRemainingMs:replay.whiteRemainingMs,
      activeSince:0,
      running:false,
    },
    turnPlacements:lastCompletedTurnPlacements(records.slice(0,cursor)),
  };
}
