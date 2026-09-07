export function lobby(
  root: HTMLElement,
  configured: boolean,
  busy: boolean,
  create: () => void,
  join: (code: string) => void,
) {
  root.innerHTML = `<h1>REVERSIX!</h1><section class="lobby"><button id="create">CREATE PRIVATE GAME</button><form><label for="code">JOIN PRIVATE GAME</label><div class="join-row"><input id="code" name="code" aria-label="Room code" placeholder="6-LETTER CODE" minlength="6" maxlength="6" pattern="[A-HJ-NP-Za-hj-np-z2-9]{6}" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button type="submit">JOIN</button></div></form></section>`;
  root.querySelector<HTMLButtonElement>("#create")!.onclick = create;
  root.querySelector("form")!.onsubmit = (e) => {
    e.preventDefault();
    join(
      root.querySelector<HTMLInputElement>("input")!.value.trim().toUpperCase(),
    );
  };
  root
    .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button")
    .forEach((el) => (el.disabled = busy || !configured));
  if (!configured) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent =
      "ONLINE PLAY IS NOT CONFIGURED. The host must finish Firebase setup.";
    root.append(note);
  }
}
