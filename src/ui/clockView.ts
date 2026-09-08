import type { ClockState, GameSettings } from "../game/session";
import { remainingAt } from "../game/session";
import type { Player } from "../game/types";
import { t } from "../i18n/i18n";

export function formatClock(ms: number) {
  const seconds=Math.max(0,Math.ceil(ms/1000));
  return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
}
export function updateClocks(root: HTMLElement, clock: ClockState, active: Player, now: number, left: Player, right: Player, enabled = true) {
  for(const [side,player] of [["left",left],["right",right]] as const){
    const el=root.querySelector<HTMLElement>(`.clock-${side}`)!;
    el.classList.toggle("active",enabled&&clock.running&&active===player);
    el.querySelector<HTMLElement>(".clock-color")!.textContent=`⌛ ${t(`game.${player}`)}`;
    el.querySelector<HTMLElement>(".clock-time")!.textContent=enabled?formatClock(remainingAt(clock,player,now,active)):"∞";
  }
}
export function settingsSummary(settings: GameSettings) {
  return t(settings.clockEnabled?"game.settingsSummary":"game.settingsSummaryNoLimit",{minutes:settings.initialTimeMs/60000,undo:t(`gameSettings.${settings.undoMode}`)});
}
