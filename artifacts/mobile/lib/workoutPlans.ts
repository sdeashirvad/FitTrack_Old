/** Plan template names — must match `PLANS[].name` in weekly-plan.tsx */
export const WORKOUT_PLAN_NAMES = [
  "Push Pull Legs",
  "Upper Lower",
  "Fat Loss Routine",
  "Beginner Routine",
] as const;

export function getWorkoutPlanIndex(planName: string): number {
  const idx = WORKOUT_PLAN_NAMES.indexOf(planName as (typeof WORKOUT_PLAN_NAMES)[number]);
  return idx >= 0 ? idx : 0;
}
