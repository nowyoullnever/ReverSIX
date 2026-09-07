import { getLocale, t } from "../i18n/i18n";
interface Step {
  title: string;
  paragraphs: string[];
  rows: string[];
  caption: string;
}
export const tutorialSteps: Step[] = [
  {
    title: "1. FLIP",
    paragraphs: [
      "Place a stone so that one or more opponent stones are trapped between your stones. Those stones flip to your color.",
    ],
    rows: ["BWW.", "BBBB"],
    caption: "BEFORE → AFTER · Works in all eight directions.",
  },
  {
    title: "2. TWO MOVES",
    paragraphs: [
      "Black places one stone on the first turn. After that, each player places two stones per turn.",
      "Flip after each move. The first move can change where the second move is legal. If no legal move remains, that move is skipped.",
    ],
    rows: ["BWW.", "BBBB"],
    caption: "MOVE 1 → FLIP → MOVE 2 → FLIP",
  },
  {
    title: "3. MAKE SIX",
    paragraphs: [
      "Connect exactly six of your stones in a horizontal, vertical, or diagonal line.",
      "Five does nothing. Seven or more does not count.",
    ],
    rows: ["BBBBBB", "BBBBBBB"],
    caption: "EXACTLY 6 → CHECK · 7 OR MORE → NO CHECK",
  },
  {
    title: "4. CHECK!",
    paragraphs: [
      "Completing a line of six does not win immediately. It puts your opponent in CHECK at the end of your turn.",
      "Your opponent gets their next full turn to break every SIX. CHECK is not declared halfway through a two-move turn.",
    ],
    rows: ["BBBBBB", "BBWBBB"],
    caption: "BLACK CHECK → WHITE BREAKS THE LINE",
  },
  {
    title: "5. BREAK THE SIX",
    paragraphs: [
      "If at least one opponent SIX still exists at the end of your turn, you lose. Break all of them.",
      "Breaking the CHECK while creating your own SIX creates a COUNTER CHECK.",
      "No legal move? PASS. Passing while in CHECK loses. Otherwise, two consecutive passes end the game by stone count.",
    ],
    rows: ["BBWBBB", "WWWWWW"],
    caption: "BLACK SIX BROKEN + WHITE SIX → COUNTER CHECK",
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
          ? "empty"
          : c === "W"
            ? "white"
            : c === "1"
              ? "first new black stone"
              : c === "2"
                ? "second new black stone"
                : "black",
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
  function render() {
    const step = tutorialSteps[index];
    dialog.replaceChildren();
    const content = document.createElement("div");
    content.className = "tutorial-step-enter";
    const closeButton=document.createElement("button");closeButton.className="settings-close";closeButton.textContent="×";closeButton.setAttribute("aria-label",getLocale()==="ko"?"게임 방법 닫기":"Close how to play");closeButton.onclick=close;content.append(closeButton);
    const count = document.createElement("p");
    count.className = "step-count";
    count.textContent = t("tutorial.count", { page:index+1, total:tutorialSteps.length });
    const title = document.createElement("h2");
    title.id = "tutorial-title";
    title.textContent = getLocale()==="ko" ? ["1. 뒤집기","2. 한 턴에 두 수","3. SIX 만들기","4. 체크!","5. SIX 방어하기"][index]! : step.title;
    title.tabIndex = -1;
    content.append(count, title);
    const illustration = document.createElement("div");
    illustration.className = "tutorial-boards";
    step.rows.forEach((row) => illustration.append(miniBoard(row)));
    content.append(illustration);
    const caption = document.createElement("p");
    caption.className = "tutorial-caption";
    caption.textContent = step.caption;
    content.append(caption);
    step.paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      content.append(p);
    });
    const controls = document.createElement("div");
    controls.className = "tutorial-controls";
    const back = document.createElement("button");
    back.textContent = getLocale()==="ko" ? "이전" : "BACK";
    back.disabled = index === 0;
    back.onclick = () => {
      index--;
      render();
    };
    const next = document.createElement("button");
    next.textContent = index === tutorialSteps.length - 1 ? (getLocale()==="ko" ? "완료" : "PLAY") : (getLocale()==="ko" ? "다음" : "NEXT");
    next.onclick = () => {
      if (index === tutorialSteps.length - 1) close();
      else {
        index++;
        render();
      }
    };
    controls.append(back, next);
    content.append(controls);
    dialog.append(content);
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
