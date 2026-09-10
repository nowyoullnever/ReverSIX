export type ComputerDifficulty = "easy" | "normal" | "hard";
export type NeuralDifficulty = Exclude<ComputerDifficulty, "easy">;

export const MODEL_BASES: Record<NeuralDifficulty, string> = {
  normal: `${import.meta.env.BASE_URL}model/normal/model`,
  hard: `${import.meta.env.BASE_URL}model/hard/model`,
};