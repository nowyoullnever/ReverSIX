export const BOARD_COLOR_GROUP_A = ["#F9EBDE", "#FFDFB9", "#FFDFDE", "#FCF6F5", "#FAD0C9"] as const;
export const BOARD_COLOR_GROUP_B = ["#815854", "#A4193D", "#6A7BA2", "#7B9ACC", "#6E6E6D"] as const;
export interface BoardColorPair { a: string; b: string; }
const randomFrom = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;
export const randomBoardColors = (): BoardColorPair => ({ a: randomFrom(BOARD_COLOR_GROUP_A), b: randomFrom(BOARD_COLOR_GROUP_B) });
