import { expect, it } from "vitest";
import { LocalGameSession } from "../src/local/localGame";
import { DEFAULT_SETTINGS } from "../src/game/session";
import { getMoveOptions } from "../src/game/rules";
import { canReviewBack, replayForReview } from "../src/ui/review";

it("reviews a finished game one committed turn at a time down to the initial four stones",()=>{
  const session=new LocalGameSession({...DEFAULT_SETTINGS,clockEnabled:false},0);
  session.play(34);
  session.commit();
  const whiteFirst=getMoveOptions(session.game).legal[0];
  session.play(whiteFirst);
  const whiteSecond=getMoveOptions(session.game).legal[0];
  session.play(whiteSecond);
  session.commit();
  const records=structuredClone(session.turnLog);
  const finalBoard=structuredClone(session.game.board);
  expect(records.map(record=>record.cells)).toEqual([[34],[whiteFirst,whiteSecond]]);
  expect(canReviewBack(true,null,records)).toBe(true);
  const one=replayForReview(session.settings,records,1,session.game.revision);
  const zero=replayForReview(session.settings,records,0,session.game.revision);
  expect(one.game.board).not.toEqual(finalBoard);
  expect(one.turnPlacements).toEqual([34]);
  expect(one.game.currentPlayer).toBe("white");
  expect(zero.game.board.filter(Boolean)).toHaveLength(4);
  expect(zero.turnPlacements).toEqual([]);
  expect(zero.clock.running).toBe(false);
  expect(canReviewBack(true,0,records)).toBe(false);
  expect(session.turnLog).toEqual(records);
  expect(session.game.board).toEqual(finalBoard);
});

it("allows full post-game review regardless of the live undo mode",()=>{
  const records=[{cells:[34],player:"black" as const,elapsedMs:0}];
  expect(canReviewBack(true,null,records)).toBe(true);
  expect(canReviewBack(false,null,records)).toBe(false);
});
