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
      "Connect six or more of your stones in a horizontal, vertical, or diagonal line.",
      "Five does nothing. Seven or more also counts as SIX.",
    ],
    rows: ["BBBBBB", "BBBBBBB"],
    caption: "6 OR MORE",
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
  {
    title: "6. NO DOUBLE-SIX",
    paragraphs: [
      "You cannot create a SIX that contains both stones placed during the same turn. The final board after flipping is what counts.",
      "Two stones may still be placed on the same row, column, or diagonal. It is only forbidden if both new stones belong to the same SIX.",
      "The 🚫 icon marks a Reversi-legal square forbidden by this rule. Other illegal squares have no icon.",
    ],
    rows: [".BBBB.", "1BBBB2"],
    caption: "① → FLIP → ② → FLIP · 🚫 BOTH NEW STONES IN ONE SIX",
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
  const close = () => {
    dialog.close();
    dialog.remove();
    previousFocus?.focus();
    onClose();
  };
  function render() {
    const step = tutorialSteps[index];
    dialog.replaceChildren();
    const count = document.createElement("p");
    count.className = "step-count";
    count.textContent = `HOW TO PLAY · ${index + 1} / 6`;
    const title = document.createElement("h2");
    title.id = "tutorial-title";
    title.textContent = step.title;
    title.tabIndex = -1;
    dialog.append(count, title);
    const illustration = document.createElement("div");
    illustration.className = "tutorial-boards";
    step.rows.forEach((row) => illustration.append(miniBoard(row)));
    dialog.append(illustration);
    const caption = document.createElement("p");
    caption.className = "tutorial-caption";
    caption.textContent = step.caption;
    dialog.append(caption);
    step.paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      dialog.append(p);
    });
    const controls = document.createElement("div");
    controls.className = "tutorial-controls";
    const back = document.createElement("button");
    back.textContent = "BACK";
    back.disabled = index === 0;
    back.onclick = () => {
      index--;
      render();
    };
    const next = document.createElement("button");
    next.textContent = index === 5 ? "PLAY" : "NEXT";
    next.onclick = () => {
      if (index === 5) close();
      else {
        index++;
        render();
      }
    };
    const exit = document.createElement("button");
    exit.className = "text-button";
    exit.textContent = "CLOSE";
    exit.onclick = close;
    controls.append(back, next, exit);
    dialog.append(controls);
    title.focus();
  }
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" && index < 5) {
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
  dialog.querySelector<HTMLElement>("h2")!.focus();
  return dialog;
}
