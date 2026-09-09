export type ComputerDifficulty = "normal" | "hard";

export const MODEL_BASES: Record<ComputerDifficulty, string> = {
  normal: `${import.meta.env.BASE_URL}model/normal/model`,
  hard: `${import.meta.env.BASE_URL}model/hard/model`,
};
