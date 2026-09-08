import { openTutorial } from "./tutorial";
import { setStatusText } from "./motion";
import { t } from "../i18n/i18n";
import { openSettings } from "./settings";
import { openNewGameDialog } from "./newGameDialog";
export type LobbyActivity = "creating" | "joining" | "reconnecting" | undefined;
export function lobby(
  root: HTMLElement,
  configured: boolean,
  busy: boolean,
  local: () => void,
  create: () => void,
  join: (code: string) => void,
  activity?: LobbyActivity,
  sound = true,
  setSound: (value:boolean) => void = () => {},
  changed: () => void = () => {},
) {
  delete root.dataset.mode;
  delete root.dataset.room;
  root.innerHTML = `<h1>REVERSIX!</h1><section class="lobby"><button id="new-game">${t("lobby.newGame")}</button></section>`;
  const newGame = root.querySelector<HTMLButtonElement>("#new-game")!;
  newGame.disabled = busy;
  newGame.onclick = () =>
    openNewGameDialog(configured, busy, { local, create, join });
  const help = document.createElement("button");
  help.className = "how-to-play";
  help.textContent = t("lobby.how");
  help.onclick = () => openTutorial();
  const secondary=document.createElement("div");secondary.className="lobby-secondary-actions";secondary.append(help);
  const settings=document.createElement("button");settings.className="settings-launch";settings.textContent=t("lobby.settings");settings.onclick=()=>openSettings(sound,setSound,changed);secondary.append(settings);root.querySelector(".lobby")!.append(secondary);
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
