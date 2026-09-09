import { t } from "../i18n/i18n";
import { DEFAULT_SETTINGS, type GameSettings, type UndoMode } from "../game/session";
import type { Player } from "../game/types";

interface NewGameActions {
  local: (settings: GameSettings) => void;
  computer: (settings: GameSettings, humanSide: Player) => void;
  create: (settings: GameSettings) => void;
  join: (code: string) => void;
}

export function openNewGameDialog(
  configured: boolean,
  busy: boolean,
  actions: NewGameActions,
) {
  const dialog = document.createElement("dialog");
  dialog.className = "new-game-dialog";
  dialog.setAttribute("aria-labelledby", "new-game-title");
  const previousFocus = document.activeElement as HTMLElement | null;
  let step: "options" | "join" | "localSettings" | "computerSettings" | "roomSettings" = "options";
  const close = () => {
    dialog.close();
    dialog.remove();
    previousFocus?.focus();
  };
  const run = (action: () => void) => {
    close();
    action();
  };
  const render = () => {
    dialog.replaceChildren();
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "new-game-close";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", t("newGame.closeAria"));
    closeButton.onclick = close;
    const title = document.createElement("h2");
    title.id = "new-game-title";
    title.textContent = step === "options" ? t("newGame.title") : step === "join" ? t("newGame.join") : t(step === "computerSettings" ? "computer.title" : step === "localSettings" ? "gameSettings.title" : "roomSettings.title");
    dialog.append(closeButton, title);
    if (step === "options") {
      const options = document.createElement("div");
      options.className = "new-game-options";
      const local = option(t("newGame.local"), false, () => { step="localSettings"; render(); });
      local.classList.add("new-game-local");
      const computer = option(t("newGame.computer"), false, () => { step="computerSettings"; render(); });
      computer.classList.add("new-game-computer");
      const create = option(t("newGame.create"), busy || !configured, () => { step="roomSettings"; render(); });
      create.classList.add("new-game-create");
      const join = option(t("newGame.join"), busy || !configured, () => {
        step = "join";
        render();
      });
      join.classList.add("new-game-join");
      options.append(local, computer, create, join);
      dialog.append(options);
      if (!configured) {
        const note = document.createElement("p");
        note.className = "note";
        note.textContent = t("lobby.unconfigured");
        dialog.append(note);
      }
    } else if (step === "join") {
      const form = document.createElement("form");
      form.className = "new-game-join-form";
      const input = document.createElement("input");
      input.id = "new-game-code";
      input.name = "code";
      input.setAttribute("aria-label", t("lobby.code"));
      input.placeholder = t("lobby.code");
      input.minLength = 6;
      input.maxLength = 6;
      input.pattern = "[A-HJ-NP-Za-hj-np-z2-9]{6}";
      input.autocomplete = "off";
      input.autocapitalize = "characters";
      input.spellcheck = false;
      input.required = true;
      const submit = document.createElement("button");
      submit.type = "submit";
      submit.textContent = t("lobby.join");
      submit.disabled = busy;
      const row = document.createElement("div");
      row.className = "join-row";
      row.append(input, submit);
      const back = document.createElement("button");
      back.type = "button";
      back.className = "new-game-back";
      back.textContent = t("newGame.back");
      back.onclick = () => {
        step = "options";
        render();
      };
      form.append(row, back);
      form.onsubmit = (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        run(() => actions.join(input.value.trim().toUpperCase()));
      };
      dialog.append(form);
      queueMicrotask(() => input.focus());
    } else {
      const mode=step === "localSettings" ? "local" : step === "computerSettings" ? "computer" : "room";
      dialog.append(settingsForm(mode, (settings,humanSide) =>
        run(() => mode === "local" ? actions.local(settings) : mode === "computer" ? actions.computer(settings,humanSide) : actions.create(settings)),
        () => { step="options"; render(); },
      ));
    }
  };
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  document.body.append(dialog);
  render();
  dialog.showModal();
  return dialog;
}

export function openGameSettingsDialog(
  mode:"local"|"computer"|"room",
  defaults:GameSettings,
  humanSide:Player,
  submitSettings:(settings:GameSettings,humanSide:Player)=>void,
  submitKey=mode==="room"?"game.changeOptions":"gameSettings.start",
) {
  const dialog=document.createElement("dialog");
  dialog.className="new-game-dialog";
  dialog.setAttribute("aria-labelledby","game-options-title");
  const previousFocus=document.activeElement as HTMLElement|null;
  const close=()=>{dialog.close();dialog.remove();previousFocus?.focus()};
  const closeButton=document.createElement("button");
  closeButton.type="button";closeButton.className="new-game-close";closeButton.textContent="×";closeButton.setAttribute("aria-label",t("newGame.closeAria"));closeButton.onclick=close;
  const title=document.createElement("h2");title.id="game-options-title";title.textContent=t(mode==="computer"?"computer.title":mode==="room"?"roomSettings.title":"gameSettings.title");
  dialog.append(closeButton,title,settingsForm(mode,(settings,side)=>{close();submitSettings(settings,side)},close,defaults,humanSide,submitKey));
  dialog.addEventListener("cancel",event=>{event.preventDefault();close()});
  document.body.append(dialog);dialog.showModal();return dialog;
}

function settingsForm(mode:"local"|"computer"|"room", submitSettings: (settings: GameSettings,humanSide:Player) => void, backAction: () => void, defaults:GameSettings=DEFAULT_SETTINGS, selectedSide:Player="black", submitKey?:string) {
  const form=document.createElement("form"); form.className="game-settings-form";
  const sideSection=document.createElement("section");sideSection.className="game-settings-section computer-side-section";
  const sideLegend=document.createElement("p");sideLegend.className="settings-legend";sideLegend.textContent=t("computer.side");
  sideSection.append(sideLegend,radioOptions("humanSide",[["black","computer.black"],["white","computer.white"]],selectedSide));
  const timeSection=document.createElement("section"); timeSection.className="game-settings-section";
  const timeLegend=document.createElement("p"); timeLegend.className="settings-legend"; timeLegend.textContent=t("gameSettings.time");
  const timeChoices=radioOptions("clockEnabled",[["on","gameSettings.on"],["off","gameSettings.off"]],defaults.clockEnabled?"on":"off");
  const timeLabel=document.createElement("label"); timeLabel.className="time-input-shell";
  const input=document.createElement("input"); input.type="number"; input.name="minutes"; input.min="1"; input.max="60"; input.step="1"; input.value=String(defaults.initialTimeMs/60000); input.required=true;
  const unit=document.createElement("span"); unit.textContent=t("gameSettings.minutes"); timeLabel.append(input,unit);
  const syncTimeInput=()=>{const enabled=(form.querySelector<HTMLInputElement>('input[name="clockEnabled"]:checked')?.value??"on")==="on";input.disabled=!enabled;timeLabel.classList.toggle("disabled",!enabled)};
  timeChoices.addEventListener("change",syncTimeInput); timeSection.append(timeLegend,timeChoices,timeLabel);
  const legend=document.createElement("p"); legend.className="settings-legend"; legend.textContent=t("gameSettings.undo");
  const choices=radioOptions("undoMode",[["all","gameSettings.all"],["turn","gameSettings.turn"]],defaults.undoMode);
  const undoSection=document.createElement("section"); undoSection.className="game-settings-section"; undoSection.append(legend,choices);
  const actions=document.createElement("div"); actions.className="settings-actions";
  const back=document.createElement("button"); back.type="button"; back.textContent=t("newGame.back"); back.onclick=backAction;
  const submit=document.createElement("button"); submit.type="submit"; submit.textContent=t(submitKey??(mode==="room"?"roomSettings.create":"gameSettings.start")); actions.append(back,submit);
  if(mode==="computer")form.append(sideSection);form.append(timeSection,undoSection,actions); syncTimeInput();
  form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form),minutes=Number(input.value),clockEnabled=data.get("clockEnabled")==="on";if(clockEnabled&&(!Number.isInteger(minutes)||minutes<1||minutes>60))return;submitSettings({initialTimeMs:minutes*60000,clockEnabled,undoMode:data.get("undoMode") as UndoMode},(data.get("humanSide")??"black") as Player)};
  return form;
}

function radioOptions(name:string,values:readonly (readonly [string,string])[],selected:string){
  const options=document.createElement("div"); options.className="choice-options";
  for(const [value,key] of values){const label=document.createElement("label");const radio=document.createElement("input");radio.type="radio";radio.name=name;radio.value=value;radio.checked=value===selected;const text=document.createElement("span");text.textContent=t(key);label.append(radio,text);options.append(label)}
  return options;
}

function option(label: string, disabled: boolean, click: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.onclick = click;
  return button;
}
