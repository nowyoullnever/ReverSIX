import { openTutorial } from "./tutorial";
import { setStatusText } from "./motion";
import { t } from "../i18n/i18n";
import { openSettings } from "./settings";
import { openNewGameDialog } from "./newGameDialog";
import type { GameSettings } from "../game/session";
import type { Player } from "../game/types";
import type { ComputerDifficulty } from "../ai/difficulty";
import { getTheme, setTheme } from "./theme";
export type LobbyActivity = "creating" | "joining" | "reconnecting" | undefined;
export function lobby(
  root: HTMLElement,
  configured: boolean,
  busy: boolean,
  local: (settings: GameSettings) => void,
  computer: (settings: GameSettings,humanSide:Player,difficulty:ComputerDifficulty) => void,
  create: (settings: GameSettings) => void,
  join: (code: string) => void,
  activity?: LobbyActivity,
  getSound: () => boolean = () => true,
  setSound: (value:boolean) => void = () => {},
  changed: () => void = () => {},
  getBgm: () => boolean = () => true,
  setBgm: (value:boolean) => void = () => {},
) {
  root.dataset.mode = "lobby";
  delete root.dataset.room;
  delete root.dataset.checkRing;
  const stones=Array.from({length:25},(_,index)=>`<i class="home-stone ${index%3===0?"white":"black"}"></i>`).join("");
  root.innerHTML = `<div class="home-reversi-background" aria-hidden="true"><div class="home-stone-grid">${stones}</div></div><div class="home-shell"><h1>ReverSix!</h1><section class="lobby"><button id="new-game">${t("lobby.newGame")}</button></section></div>`;
  const newGame = root.querySelector<HTMLButtonElement>("#new-game")!;
  newGame.disabled = busy;
  newGame.onclick = () =>
    openNewGameDialog(configured, busy, { local, computer, create, join });
  const help = document.createElement("button");
  help.className = "how-to-play";
  help.textContent = t("lobby.how");
  help.onclick = () => openTutorial();
  const secondary=document.createElement("div");secondary.className="lobby-secondary-actions";secondary.append(help);
  const settings=document.createElement("button");settings.className="settings-launch";settings.textContent=t("lobby.settings");settings.onclick=()=>openSettings({getSound,setSound,getTheme,setTheme,getBgm,setBgm,changed});secondary.append(settings);root.querySelector(".lobby")!.append(secondary);
  if (activity) {
    const status = document.createElement("p");
    status.className = "lobby-status";
    status.setAttribute("role", "status");
    setStatusText(
      status,
      activity === "creating"
        ? t("lobby.creating")
        : activity === "joining"
          ? t("lobby.joining")
          : t("lobby.reconnecting"),
      true,
    );
    root.querySelector(".lobby")!.append(status);
  }
}
