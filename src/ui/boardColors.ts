export const BOARD_COLOR_GROUP_A = ["#e8efe8", "#ecebe6", "#fff8de", "#fffac3", "#faf1a2", "#f4f3b0", "#fee893", "#ffe19b", "#fde5b7", "#fee4cb", "#fdcda7", "#fcd2c4", "#f9c8cb", "#f8cad7", "#feeae9", "#e9d0e5", "#c2a1da", "#c2a1da"] as const;
export const BOARD_COLOR_GROUP_B = ["#b6b2d7", "#aeb0d7", "#d1e2f4", "#bae3f7", "#d6e9f8", "#dbf2f8", "#cfebec", "#c1e4dd", "#d0eadd", "#cce6bf", "#c5d9a6", "#dbe9c6", "#f0f6e8"] as const;
export interface BoardColorPair { a: string; b: string; }
const randomFrom = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;
export const randomBoardColors = (): BoardColorPair => ({ a: randomFrom(BOARD_COLOR_GROUP_A), b: randomFrom(BOARD_COLOR_GROUP_B) });
