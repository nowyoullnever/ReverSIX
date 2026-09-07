export class Toast {
  readonly element = document.createElement("div");
  private timer: ReturnType<typeof setTimeout> | undefined;
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
    this.element.textContent = message ?? "";
    this.element.hidden = !message;
    this.element.classList.toggle(
      "toast-check",
      message === "CHECK!" || message === "COUNTER CHECK!",
    );
    if (message)
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.next();
      }, 2000);
  }
  clear() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.queue = [];
    this.element.hidden = true;
  }
}
