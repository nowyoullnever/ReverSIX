import { t } from "../i18n/i18n";
import { DEFAULT_SETTINGS, type GameSettings, type UndoMode } from "../game/session";

interface NewGameActions {
  local: (settings: GameSettings) => void;
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
  let step: "options" | "join" | "localSettings" | "roomSettings" = "options";
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
    title.textContent = step === "options" ? t("newGame.title") : step === "join" ? t("newGame.join") : t(step === "localSettings" ? "gameSettings.title" : "roomSettings.title");
    dialog.append(closeButton, title);
    if (step === "options") {
      const options = document.createElement("div");
      options.className = "new-game-options";
      const local = option(t("newGame.local"), false, () => { step="localSettings"; render(); });
      local.classList.add("new-game-local");
      const create = option(t("newGame.create"), busy || !configured, () => { step="roomSettings"; render(); });
      create.classList.add("new-game-create");
      const join = option(t("newGame.join"), busy || !configured, () => {
        step = "join";
        render();
      });
      join.classList.add("new-game-join");
      options.append(local, create, join);
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
      dialog.append(settingsForm(step === "localSettings", (settings) =>
        run(() => step === "localSettings" ? actions.local(settings) : actions.create(settings)),
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

function settingsForm(local: boolean, submitSettings: (settings: GameSettings) => void, backAction: () => void) {
  const form=document.createElement("form"); form.className="game-settings-form";
  const timeLabel=document.createElement("label"); timeLabel.textContent=t("gameSettings.time");
  const input=document.createElement("input"); input.type="number"; input.name="minutes"; input.min="1"; input.max="60"; input.step="1"; input.value=String(DEFAULT_SETTINGS.initialTimeMs/60000); input.required=true; timeLabel.append(input, document.createTextNode(` ${t("gameSettings.minutes")}`));
  const legend=document.createElement("p"); legend.className="settings-legend"; legend.textContent=t("gameSettings.undo");
  const choices=document.createElement("div"); choices.className="undo-mode-options";
  for(const [value,key] of [["all","gameSettings.all"],["turn","gameSettings.turn"]] as const){const label=document.createElement("label");const radio=document.createElement("input");radio.type="radio";radio.name="undoMode";radio.value=value;radio.checked=value==="all";label.append(radio,document.createTextNode(t(key)));choices.append(label)}
  const actions=document.createElement("div"); actions.className="settings-actions";
  const back=document.createElement("button"); back.type="button"; back.textContent=t("newGame.back"); back.onclick=backAction;
  const submit=document.createElement("button"); submit.type="submit"; submit.textContent=t(local?"gameSettings.start":"roomSettings.create"); actions.append(back,submit);
  form.append(timeLabel,legend,choices,actions);
  form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const minutes=Number(input.value);if(!Number.isInteger(minutes)||minutes<1||minutes>60)return;submitSettings({initialTimeMs:minutes*60000,undoMode:new FormData(form).get("undoMode") as UndoMode})};
  return form;
}

function option(label: string, disabled: boolean, click: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.onclick = click;
  return button;
}
