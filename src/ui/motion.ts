export function setStatusText(
  element: HTMLElement,
  text: string,
  animatedDots = false,
) {
  element.replaceChildren(document.createTextNode(text));
  if (animatedDots) {
    const dots = document.createElement("span");
    dots.className = "animated-dots";
    dots.setAttribute("aria-hidden", "true");
    element.append(dots);
  }
}

export function replayMotion(element: HTMLElement, className: string) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}
