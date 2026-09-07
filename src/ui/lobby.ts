import { openTutorial } from "./tutorial";
import { setStatusText } from "./motion";
import { t } from "../i18n/i18n";
import { openSettings } from "./settings";
export type LobbyActivity = "creating" | "joining" | "reconnecting" | undefined;
export function lobby(
  root: HTMLElement,
  configured: boolean,
  busy: boolean,
  create: () => void,
  join: (code: string) => void,
  activity?: LobbyActivity,
  sound = true,
  setSound: (value:boolean) => void = () => {},
  changed: () => void = () => {},
) {
  root.innerHTML = `<h1>REVERSIX!</h1><section class="lobby"><button id="create">${t("lobby.create")}</button><form><label for="code">${t("lobby.joinLabel")}</label><div class="join-row"><input id="code" name="code" aria-label="${t("lobby.code")}" placeholder="${t("lobby.code")}" minlength="6" maxlength="6" pattern="[A-HJ-NP-Za-hj-np-z2-9]{6}" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button type="submit">${t("lobby.join")}</button></div></form></section>`;
  root.querySelector<HTMLButtonElement>("#create")!.onclick = create;
  root.querySelector("form")!.onsubmit = (e) => {
    e.preventDefault();
    join(
      root.querySelector<HTMLInputElement>("input")!.value.trim().toUpperCase(),
    );
  };
  root
    .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button")
    .forEach((el) => (el.disabled = busy || !configured));
  if (!configured) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent =
      t("lobby.unconfigured");
    root.append(note);
  }
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
