import { t } from "../i18n/i18n";
interface Step {
  titleKey: string;
  paragraphKeys: string[];
  rows: string[];
  captionKey: string;
}
export const tutorialSteps: Step[] = [
  {
    titleKey: "tutorial.step1.title",
    paragraphKeys: ["tutorial.step1.p1"],
    rows: ["BWW.", "BBBB"],
    captionKey: "tutorial.step1.caption",
  },
  {
    titleKey: "tutorial.step2.title",
    paragraphKeys: ["tutorial.step2.p1", "tutorial.step2.p2"],
    rows: ["BWW.", "BBBB"],
    captionKey: "tutorial.step2.caption",
  },
  {
    titleKey: "tutorial.step3.title",
    paragraphKeys: ["tutorial.step3.p1", "tutorial.step3.p2"],
    rows: ["BBBBBB", "BBBBBBB"],
    captionKey: "tutorial.step3.caption",
  },
  {
    titleKey: "tutorial.step4.title",
    paragraphKeys: ["tutorial.step4.p1", "tutorial.step4.p2"],
    rows: ["BBBBBB", "BBWBBB"],
    captionKey: "tutorial.step4.caption",
  },
  {
    titleKey: "tutorial.step5.title",
    paragraphKeys: ["tutorial.step5.p1", "tutorial.step5.p2", "tutorial.step5.p3"],
    rows: ["BBWBBB", "WWWWWW"],
    captionKey: "tutorial.step5.caption",
  },
];
export function miniBoard(row: string): HTMLElement {
  const board = document.createElement("div");
  board.className = "mini-board";
  board.style.gridTemplateColumns = `repeat(${row.length},1fr)`;
  board.setAttribute("role", "img");
  board.setAttribute(
    "aria-label",
    row
      .split("")
      .map((c) =>
        c === "."
          ? t("board.empty")
          : c === "W"
            ? t("game.white")
            : c === "1"
              ? t("board.first")
              : c === "2"
                ? t("board.second")
                : t("game.black"),
      )
      .join(", "),
  );
  for (const value of row) {
    const cell = document.createElement("span");
    cell.className = `mini-cell ${value === "W" ? "white" : "black"}`;
    if (value !== ".") {
      const stone = document.createElement("span");
      stone.className = "stone";
      stone.textContent = value === "1" ? "①" : value === "2" ? "②" : "";
      cell.append(stone);
    }
    board.append(cell);
  }
  return board;
}
export function openTutorial(onClose: () => void = () => {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "tutorial";
  dialog.setAttribute("aria-labelledby", "tutorial-title");
  const closeButton = document.createElement("button");
  closeButton.className = "tutorial-close";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", t("tutorial.closeAria"));
  const content = document.createElement("div");
  content.className = "tutorial-step-enter";
  dialog.append(closeButton, content);
  const previousFocus = document.activeElement as HTMLElement | null;
  let index = 0;
  let closing = false;
  const finishClose = () => {
    dialog.close();
    dialog.remove();
    previousFocus?.focus();
    onClose();
  };
  const close = () => {
    if (closing) return;
    closing = true;
    dialog.classList.add("tutorial-closing");
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      finishClose();
    else setTimeout(finishClose, 180);
  };
  closeButton.onclick = close;
  function render() {
    const step = tutorialSteps[index];
    content.replaceChildren();
    const count = document.createElement("p");
    count.className = "step-count";
    count.textContent = t("tutorial.count", { page:index+1, total:tutorialSteps.length });
    const title = document.createElement("h2");
    title.id = "tutorial-title";
    title.textContent = t(step.titleKey);
    title.tabIndex = -1;
    content.append(count, title);
    const illustration = document.createElement("div");
    illustration.className = "tutorial-boards";
    step.rows.forEach((row) => illustration.append(miniBoard(row)));
    content.append(illustration);
    const caption = document.createElement("p");
    caption.className = "tutorial-caption";
    caption.textContent = t(step.captionKey);
    content.append(caption);
    step.paragraphKeys.forEach((key) => {
      const p = document.createElement("p");
      p.textContent = t(key);
      content.append(p);
    });
    const controls = document.createElement("div");
    controls.className = "tutorial-controls";
    const back = document.createElement("button");
    back.textContent = t("tutorial.back");
    back.disabled = index === 0;
    back.onclick = () => {
      index--;
      render();
    };
    const next = document.createElement("button");
    next.textContent = index === tutorialSteps.length - 1
      ? t("tutorial.play")
      : t("tutorial.next");
    next.onclick = () => {
      if (index === tutorialSteps.length - 1) close();
      else {
        index++;
        render();
      }
    };
    controls.append(back, next);
    content.append(controls);
    title.focus();
  }
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" && index < tutorialSteps.length - 1) {
      event.preventDefault();
      index++;
      render();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      index--;
      render();
    }
  });
  document.body.append(dialog);
  render();
  dialog.showModal();
  dialog.classList.add("tutorial-opening");
  dialog.querySelector<HTMLElement>("h2")!.focus();
  return dialog;
}
