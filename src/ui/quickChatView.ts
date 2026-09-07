import { t } from "../i18n/i18n";
import {
  CHAT_PRESETS,
  CHAT_PRESET_IDS,
  isChatPresetId,
  type ChatPresetId,
} from "../online/chatPresets";
import type { QuickChatMessage } from "../online/quickChat";

export interface QuickChatPresentation {
  enabled: boolean;
  messages: QuickChatMessage[];
  disabled: boolean;
  error?: string;
  send: (presetId: ChatPresetId) => void;
}

export function quickChatView(
  slot: HTMLElement,
  currentUid: string,
  presentation: QuickChatPresentation,
) {
  if (!presentation.enabled) {
    slot.hidden = true;
    slot.replaceChildren();
    return;
  }
  slot.hidden = false;
  let panel = slot.querySelector<HTMLElement>(".quick-chat");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "quick-chat";
    const heading = document.createElement("h2");
    heading.className = "quick-chat-title";
    const history = document.createElement("div");
    history.className = "quick-chat-history";
    history.setAttribute("aria-live", "polite");
    const picker = document.createElement("div");
    picker.className = "quick-chat-picker";
    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "quick-chat-choose";
    choose.setAttribute("aria-haspopup", "menu");
    choose.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.className = "quick-chat-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    for (const presetId of CHAT_PRESET_IDS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quick-chat-preset";
      button.dataset.presetId = presetId;
      button.setAttribute("role", "menuitem");
      button.textContent = CHAT_PRESETS[presetId];
      menu.append(button);
    }
    choose.onclick = () => {
      if (choose.disabled) return;
      menu.hidden = !menu.hidden;
      choose.setAttribute("aria-expanded", String(!menu.hidden));
    };
    menu.onclick = (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        ".quick-chat-preset",
      );
      if (!button || button.disabled || !isChatPresetId(button.dataset.presetId))
        return;
      menu.hidden = true;
      choose.setAttribute("aria-expanded", "false");
      presentation.send(button.dataset.presetId);
    };
    picker.append(choose, menu);
    const error = document.createElement("p");
    error.className = "quick-chat-error";
    error.setAttribute("role", "alert");
    panel.append(heading, history, picker, error);
    slot.append(panel);
  }

  panel.querySelector<HTMLElement>(".quick-chat-title")!.textContent =
    t("chat.title");
  const choose = panel.querySelector<HTMLButtonElement>(".quick-chat-choose")!;
  choose.textContent = t("chat.choose");
  choose.disabled = presentation.disabled;
  for (const button of panel.querySelectorAll<HTMLButtonElement>(
    ".quick-chat-preset",
  ))
    button.disabled = presentation.disabled;

  const history = panel.querySelector<HTMLElement>(".quick-chat-history")!;
  const signature = presentation.messages
    .map((message) => `${message.id}:${message.uid}:${message.presetId}`)
    .join("|");
  if (history.dataset.signature !== signature) {
    const nearBottom =
      history.childElementCount === 0 ||
      history.scrollHeight - history.scrollTop - history.clientHeight <= 48;
    const rows = presentation.messages.map((message) => {
      const mine = message.uid === currentUid;
      const row = document.createElement("div");
      row.className = `quick-chat-message quick-chat-message-${mine ? "me" : "opponent"}`;
      const sender = document.createElement("strong");
      sender.className = "quick-chat-sender";
      sender.textContent = t(mine ? "chat.me" : "chat.opponent");
      const text = document.createElement("p");
      text.className = "quick-chat-bubble";
      text.textContent = CHAT_PRESETS[message.presetId];
      row.append(sender, text);
      return row;
    });
    history.replaceChildren(...rows);
    history.dataset.signature = signature;
    if (nearBottom) history.scrollTop = history.scrollHeight;
  } else {
    for (const [index, message] of presentation.messages.entries()) {
      const sender = history.children[index]?.querySelector("strong");
      if (sender) sender.textContent = t(message.uid === currentUid ? "chat.me" : "chat.opponent");
    }
  }
  const error = panel.querySelector<HTMLElement>(".quick-chat-error")!;
  error.textContent = presentation.error ?? "";
  error.hidden = !presentation.error;
}
