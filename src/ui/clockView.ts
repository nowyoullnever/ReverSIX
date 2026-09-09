import type { ClockState } from "../game/session";
import { remainingAt } from "../game/session";
import type { Player } from "../game/types";
import { t } from "../i18n/i18n";

export function formatClock(ms: number) {
  const safe=Math.max(0,Math.floor(ms));
  const minutes=Math.floor(safe/60_000),seconds=Math.floor((safe%60_000)/1_000),millis=safe%1_000;
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}:${String(millis).padStart(3,"0")}`;
}
export function updateClocks(root: HTMLElement, clock: ClockState, active: Player, now: number, left: Player, right: Player, enabled = true, showActive = enabled) {
  root.querySelector<HTMLElement>(".clock-board-layout")?.classList.toggle("no-clock",!enabled);
  for(const [side,player] of [["left",left],["right",right]] as const){
    const el=root.querySelector<HTMLElement>(`.clock-${side}`)!;
    el.hidden=!enabled;
    el.classList.toggle("active",enabled&&showActive&&clock.running&&active===player);
    el.querySelector<HTMLElement>(".clock-color")!.textContent=t(`game.${player}`);
    el.querySelector<HTMLElement>(".clock-time")!.textContent=enabled?formatClock(remainingAt(clock,player,now,active)):"";
  }
}
