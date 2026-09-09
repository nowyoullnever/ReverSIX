const CHECK_RING_KEY = "reversix-check-ring-enabled";

export function getCheckRingEnabled(): boolean {
  try {
    const value = localStorage.getItem(CHECK_RING_KEY);
    if (value === "false") return false;
  } catch {}
  return true;
}

export function applyCheckRingSetting(enabled = getCheckRingEnabled()) {
  document.documentElement.dataset.checkRing = enabled ? "on" : "off";
}

export function setCheckRingEnabled(enabled: boolean) {
  try { localStorage.setItem(CHECK_RING_KEY, String(enabled)); } catch {}
  applyCheckRingSetting(enabled);
}

export { CHECK_RING_KEY };
