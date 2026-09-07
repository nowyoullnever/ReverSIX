import { localizeEvent } from "../i18n/i18n";
export class Toast {
  readonly element = document.createElement("div");
  private timer: ReturnType<typeof setTimeout> | undefined;
  private exitTimer: ReturnType<typeof setTimeout> | undefined;
  private queue: string[] = [];
  constructor() {
    this.element.className = "toast";
    this.element.setAttribute("role", "status");
    this.element.setAttribute("aria-live", "polite");
    this.element.hidden = true;
    document.body.append(this.element);
  }
  show(messages: string[]) {
    this.queue.push(...messages);
    if (!this.timer) this.next();
  }
  private next() {
    const message = this.queue.shift();
    this.element.textContent = message ? localizeEvent(message) : "";
    this.element.hidden = !message;
    this.element.className = `toast ${toastKind(message)}`;
    if (message) {
      void this.element.offsetWidth;
      this.element.classList.add("toast-enter");
    }
    if (message)
      this.timer = setTimeout(() => {
        this.element.classList.remove("toast-enter");
        this.element.classList.add("toast-leave");
        this.exitTimer = setTimeout(() => {
          this.timer = undefined;
          this.exitTimer = undefined;
          this.next();
        }, 180);
      }, 2000);
  }
  clear() {
    clearTimeout(this.timer);
    clearTimeout(this.exitTimer);
    this.timer = undefined;
    this.queue = [];
    this.element.hidden = true;
  }
}

function toastKind(message: string | undefined) {
  if (message === "CHECK!") return "toast-check";
  if (message === "COUNTER CHECK!") return "toast-counter";
  if (message === "CHECK DEFENDED") return "toast-defended";
  if (message?.endsWith(" PASS")) return "toast-pass";
  return "";
}
