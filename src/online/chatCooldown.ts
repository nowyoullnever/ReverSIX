export const QUICK_CHAT_COOLDOWN_MS = 1000;

export function isQuickChatCoolingDown(now: number, cooldownUntil: number) {
  return now < cooldownUntil;
}
