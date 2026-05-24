import type { User } from "@/context/AuthContext";

/** Lifestyle fields from user_profiles (signup / profile DB). */
export interface WorkoutProfileContext {
  fitnessGoal?: string | null;
  activityLevel?: string | null;
  dietaryPreference?: string | null;
  workoutExperience?: string | null;
  bodyFatPercent?: string | null;
  heightCm?: string | null;
  weightKg?: string | null;
  bmi?: string | null;
}

export function profileFromUser(user: User | null | undefined): WorkoutProfileContext | null {
  if (!user) return null;
  const ctx: WorkoutProfileContext = {
    fitnessGoal: user.fitnessGoal,
    activityLevel: user.activityLevel,
    dietaryPreference: user.dietaryPreference,
    workoutExperience: user.workoutExperience,
    bodyFatPercent: user.bodyFatPercent,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    bmi: user.bmi,
  };
  const hasAny = Object.values(ctx).some((v) => v != null && String(v).trim() !== "");
  return hasAny ? ctx : null;
}

export function formatProfileSummary(profile: WorkoutProfileContext): string[] {
  const lines: string[] = [];
  if (profile.fitnessGoal) lines.push(`Goal: ${profile.fitnessGoal}`);
  if (profile.activityLevel) lines.push(`Activity: ${profile.activityLevel}`);
  if (profile.workoutExperience) lines.push(`Experience: ${profile.workoutExperience}`);
  if (profile.dietaryPreference) lines.push(`Diet: ${profile.dietaryPreference}`);
  return lines;
}
