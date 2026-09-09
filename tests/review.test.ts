import { expect, it } from "vitest";
import { LocalGameSession } from "../src/local/localGame";
import { DEFAULT_SETTINGS } from "../src/game/session";
import { getMoveOptions } from "../src/game/rules";
import { canReviewBack, replayForReview } from "../src/ui/review";

it("reviews a finished game one placement at a time down to the initial four stones",()=>{
  const session=new LocalGameSession({...DEFAULT_SETTINGS,clockEnabled:false},0);
  session.play(34);
  session.play(getMoveOptions(session.game).legal[0]);
  session.play(getMoveOptions(session.game).legal[0]);
  const records=structuredClone(session.moveLog);
  const finalBoard=structuredClone(session.game.board);
  expect(canReviewBack(true,null,records)).toBe(true);
  const two=replayForReview(session.settings,records,2,session.game.revision);
  const one=replayForReview(session.settings,records,1,session.game.revision);
  const zero=replayForReview(session.settings,records,0,session.game.revision);
  expect(two.game.board).not.toEqual(finalBoard);
  expect(two.lastPlaced).toBe(records[1].index);
  expect(one.lastPlaced).toBe(records[0].index);
  expect(zero.game.board.filter(Boolean)).toHaveLength(4);
  expect(zero.clock.running).toBe(false);
  expect(canReviewBack(true,0,records)).toBe(false);
  expect(session.moveLog).toEqual(records);
  expect(session.game.board).toEqual(finalBoard);
});

it("allows full post-game review regardless of the live undo mode",()=>{
  const records=[{index:34,player:"black" as const,elapsedMs:0}];
  expect(canReviewBack(true,null,records)).toBe(true);
  expect(canReviewBack(false,null,records)).toBe(false);
});
