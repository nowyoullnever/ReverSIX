import { t } from "../i18n/i18n";

interface NewGameActions {
  local: () => void;
  create: () => void;
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
  let step: "options" | "join" = "options";
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
    title.textContent = step === "options" ? t("newGame.title") : t("newGame.join");
    dialog.append(closeButton, title);
    if (step === "options") {
      const options = document.createElement("div");
      options.className = "new-game-options";
      const local = option(t("newGame.local"), false, () => run(actions.local));
      local.classList.add("new-game-local");
      const create = option(t("newGame.create"), busy || !configured, () => run(actions.create));
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
    } else {
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

function option(label: string, disabled: boolean, click: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.onclick = click;
  return button;
}
