import { t } from "../i18n/i18n";
import { COMPUTER_DEFAULT_SETTINGS, DEFAULT_SETTINGS, LOCAL_DEFAULT_SETTINGS, ROOM_DEFAULT_SETTINGS, type GameSettings, type UndoMode } from "../game/session";
import type { Player } from "../game/types";
import type { ComputerDifficulty } from "../ai/difficulty";

interface NewGameActions {
  local: (settings: GameSettings) => void;
  computer: (settings: GameSettings, humanSide: Player, difficulty: ComputerDifficulty) => void;
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
  let step: "options" | "join" | "localSettings" | "computerDifficulty" | "computerSettings" | "roomSettings" = "options";
  let computerDifficulty:ComputerDifficulty="normal";
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
    title.textContent = step === "options" ? t("newGame.title") : step === "join" ? t("newGame.join") : t(step === "computerDifficulty" ? "computer.difficulty" : step === "computerSettings" ? "computer.title" : step === "localSettings" ? "gameSettings.title" : "roomSettings.title");
    dialog.append(closeButton, title);
    if (step === "options") {
      const options = document.createElement("div");
      options.className = "new-game-options";
      const local = option(t("newGame.local"), false, () => { step="localSettings"; render(); });
      local.classList.add("new-game-local");
      const computer = option(t("newGame.computer"), false, () => { step="computerDifficulty"; render(); });
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
    } else if(step === "computerDifficulty") {
      const options=document.createElement("div");options.className="new-game-options difficulty-options";
      for(const difficulty of ["easy","normal","hard"] as const){
        const button=option(t(`computer.${difficulty}`),false,()=>{computerDifficulty=difficulty;step="computerSettings";render()});
        button.dataset.difficulty=difficulty;options.append(button);
      }
      const back=document.createElement("button");back.type="button";back.className="new-game-back";back.textContent=t("newGame.back");back.onclick=()=>{step="options";render()};
      dialog.append(options,back);
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
      dialog.append(settingsForm(mode, (settings,humanSide,difficulty) =>
        run(() => mode === "local" ? actions.local(settings) : mode === "computer" ? actions.computer(settings,humanSide,difficulty??computerDifficulty) : actions.create(settings)),
        () => { step=mode==="computer"?"computerDifficulty":"options"; render(); },
        mode==="computer"?COMPUTER_DEFAULT_SETTINGS:mode==="room"?ROOM_DEFAULT_SETTINGS:LOCAL_DEFAULT_SETTINGS,
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
  submitSettings:(settings:GameSettings,humanSide:Player,difficulty?:ComputerDifficulty)=>void,
  submitKey=mode==="room"?"game.changeOptions":"gameSettings.start",
  difficulty?:ComputerDifficulty,
) {
  const dialog=document.createElement("dialog");
  dialog.className="new-game-dialog";
  dialog.setAttribute("aria-labelledby","game-options-title");
  const previousFocus=document.activeElement as HTMLElement|null;
  const close=()=>{dialog.close();dialog.remove();previousFocus?.focus()};
  const closeButton=document.createElement("button");
  closeButton.type="button";closeButton.className="new-game-close";closeButton.textContent="×";closeButton.setAttribute("aria-label",t("newGame.closeAria"));closeButton.onclick=close;
  const title=document.createElement("h2");title.id="game-options-title";title.textContent=t(mode==="computer"?"computer.title":mode==="room"?"roomSettings.title":"gameSettings.title");
  dialog.append(closeButton,title,settingsForm(mode,(settings,side,difficulty)=>{close();submitSettings(settings,side,difficulty)},close,defaults,humanSide,submitKey,difficulty,true));
  dialog.addEventListener("cancel",event=>{event.preventDefault();close()});
  document.body.append(dialog);dialog.showModal();return dialog;
}

function settingsForm(mode:"local"|"computer"|"room", submitSettings: (settings: GameSettings,humanSide:Player,difficulty?:ComputerDifficulty) => void, backAction: () => void, defaults:GameSettings=DEFAULT_SETTINGS, selectedSide:Player="black", submitKey?:string,difficulty?:ComputerDifficulty,showDifficulty=false) {
  const form=document.createElement("form"); form.className="game-settings-form";
  const sideSection=document.createElement("section");sideSection.className="game-settings-section computer-side-section";
  const sideLegend=document.createElement("p");sideLegend.className="settings-legend";sideLegend.textContent=t("computer.side");
  sideSection.append(sideLegend,radioOptions("humanSide",[["black","computer.black"],["white","computer.white"]],selectedSide));
  const difficultySection=document.createElement("section");difficultySection.className="game-settings-section computer-difficulty-section";
  const difficultyLegend=document.createElement("p");difficultyLegend.className="settings-legend";difficultyLegend.textContent=t("computer.difficulty");
  difficultySection.append(difficultyLegend,radioOptions("computerDifficulty",[["easy","computer.easy"],["normal","computer.normal"],["hard","computer.hard"]],difficulty??"normal"));
  const timeSection=document.createElement("section"); timeSection.className="game-settings-section";
  const timeLegend=document.createElement("p"); timeLegend.className="settings-legend"; timeLegend.textContent=t("gameSettings.time");
  const timeChoices=radioOptions("clockEnabled",[["on","gameSettings.on"],["off","gameSettings.off"]],defaults.clockEnabled?"on":"off");
  const timeLabel=document.createElement("label"); timeLabel.className="time-input-shell";
  const input=document.createElement("input"); input.type="number"; input.name="minutes"; input.min="0.1"; input.max="60"; input.step="0.1"; input.value=(defaults.initialTimeMs/60000).toFixed(1); input.required=true;
  const unit=document.createElement("span"); unit.textContent=t("gameSettings.minutes"); timeLabel.append(input,unit);
  const syncTimeInput=()=>{const enabled=(form.querySelector<HTMLInputElement>('input[name="clockEnabled"]:checked')?.value??"on")==="on";input.disabled=!enabled;timeLabel.classList.toggle("disabled",!enabled)};
  let scrubStartX=0,scrubStartTenths=0,scrubbing=false;
  input.addEventListener("pointerdown",event=>{if(event.pointerType==="touch"||input.disabled)return;scrubStartX=event.clientX;scrubStartTenths=Math.round(Number(input.value)*10);scrubbing=false;input.setPointerCapture(event.pointerId)});
  input.addEventListener("pointermove",event=>{if(!input.hasPointerCapture(event.pointerId))return;const distance=event.clientX-scrubStartX;if(Math.abs(distance)<4)return;scrubbing=true;const tenths=Math.min(600,Math.max(1,scrubStartTenths+Math.trunc(distance/12)));input.value=(tenths/10).toFixed(1)});
  input.addEventListener("pointerup",event=>{if(input.hasPointerCapture(event.pointerId))input.releasePointerCapture(event.pointerId);if(scrubbing)event.preventDefault()});
  timeChoices.addEventListener("change",syncTimeInput); timeSection.append(timeLegend,timeChoices,timeLabel);
  const legend=document.createElement("p"); legend.className="settings-legend"; legend.textContent=t("gameSettings.undo");
  const choices=radioOptions("undoMode",[["all","gameSettings.all"],["turn","gameSettings.turn"]],defaults.undoMode);
  const undoSection=document.createElement("section"); undoSection.className="game-settings-section"; undoSection.append(legend,choices);
  const ringLegend=document.createElement("p"); ringLegend.className="settings-legend"; ringLegend.textContent=t("gameSettings.checkRing");
  const ringChoices=radioOptions("checkRingEnabled",[["on","gameSettings.on"],["off","gameSettings.off"]],defaults.checkRingEnabled?"on":"off");
  const ringSection=document.createElement("section"); ringSection.className="game-settings-section"; ringSection.append(ringLegend,ringChoices);
  const actions=document.createElement("div"); actions.className="settings-actions";
  const back=document.createElement("button"); back.type="button"; back.textContent=t("newGame.back"); back.onclick=backAction;
  const submit=document.createElement("button"); submit.type="submit"; submit.textContent=t(submitKey??(mode==="room"?"roomSettings.create":"gameSettings.start")); actions.append(back,submit);
  if(mode==="computer") {if(showDifficulty)form.append(difficultySection);form.append(sideSection)}form.append(timeSection,undoSection,ringSection,actions); syncTimeInput();
  form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form),minutes=Number(input.value),tenths=Math.round(minutes*10),clockEnabled=data.get("clockEnabled")==="on";if(!Number.isFinite(minutes)||tenths<1||tenths>600||Math.abs(minutes*10-tenths)>1e-8)return;submitSettings({initialTimeMs:tenths*6000,clockEnabled,undoMode:data.get("undoMode") as UndoMode,checkRingEnabled:data.get("checkRingEnabled")==="on"},(data.get("humanSide")??"black") as Player,data.get("computerDifficulty") as ComputerDifficulty|undefined)};
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
