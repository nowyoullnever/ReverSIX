export const CHAT_PRESETS = {
  wellPlayed: "Well playe!",
  goodMove: "Good move!",
  bruh: "Bruh.",
  illTakeThat: "I'll take that.",
  damn: "Damn!",
  misclicked: "I misclicked...",
  makeMove: "Please make a move...",
  wait: "Wait a second please...",
  thinking: "Sorry, I'm thinking...",
  goodLuck: "Good Luck!",
  thanks: "Thanks!",
  wow: "Wow!",
  fellAsleep: "I almost fell asleep because you were not moving!",
  stfu: "stfu.",
} as const;

export type ChatPresetId = keyof typeof CHAT_PRESETS;
export const CHAT_PRESET_IDS = Object.keys(CHAT_PRESETS) as ChatPresetId[];

export function isChatPresetId(value: unknown): value is ChatPresetId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(CHAT_PRESETS, value)
  );
}
