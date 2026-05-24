import type { WorkoutGoalId } from "./workoutGoals";

/** Persisted on user_profiles.onboarding_data.workoutSetup in the DB. */
export interface WorkoutSetup {
  completed: boolean;
  goalId: WorkoutGoalId;
  goalLabel: string;
  planName: string;
  source: "manual" | "ai";
  aiConfidence?: number;
  completedAt: string;
}

export function isWorkoutSetup(value: unknown): value is WorkoutSetup {
  if (!value || typeof value !== "object") return false;
  const s = value as WorkoutSetup;
  return Boolean(s.completed && s.goalId && s.goalLabel && s.planName);
}
