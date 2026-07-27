import type { StreakType } from "./streaks";

export const MOTIVATIONAL_STREAK_TYPES = [
  "train_consec",
  "goals_consec",
  "mvp_consec",
] as const satisfies readonly StreakType[];

export type MotivationalStreakType = (typeof MOTIVATIONAL_STREAK_TYPES)[number];
export type StreakOrder = "current" | "best";

export function isMotivationalStreakType(
  value: string | undefined,
): value is MotivationalStreakType {
  return MOTIVATIONAL_STREAK_TYPES.some((type) => type === value);
}
