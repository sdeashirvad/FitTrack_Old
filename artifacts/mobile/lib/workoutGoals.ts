import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type WorkoutGoalId =
  | "fat_loss"
  | "muscle_gain"
  | "body_recomposition"
  | "strength"
  | "athletic_performance"
  | "general_fitness";

export interface WorkoutGoal {
  id: WorkoutGoalId;
  title: string;
  shortDescription: string;
  beginnerExplanation: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  color: string;
  gradient: [string, string];
  /** Matches `goal` field on weekly-plan templates */
  planName: string;
}

export const WORKOUT_GOALS: WorkoutGoal[] = [
  {
    id: "fat_loss",
    title: "Fat Loss",
    shortDescription: "Burn fat while keeping muscle",
    beginnerExplanation:
      "Best if you want to look leaner and feel lighter. Combines calorie control with strength training so you lose fat, not muscle.",
    icon: "flame",
    color: "#FF6B35",
    gradient: ["#FF6B35", "#E8521A"],
    planName: "Fat Loss Routine",
  },
  {
    id: "muscle_gain",
    title: "Muscle Gain",
    shortDescription: "Build size and strength",
    beginnerExplanation:
      "Ideal when you're underweight or want a bigger, stronger physique. Focuses on progressive overload and enough protein.",
    icon: "barbell",
    color: "#8B5CF6",
    gradient: ["#8B5CF6", "#6D28D9"],
    planName: "Push Pull Legs",
  },
  {
    id: "body_recomposition",
    title: "Body Recomposition",
    shortDescription: "Lose fat and gain muscle together",
    beginnerExplanation:
      "Great for beginners or returning lifters. You'll train hard, eat well, and slowly trade fat for muscle at the same weight.",
    icon: "swap-horizontal",
    color: "#3B82F6",
    gradient: ["#3B82F6", "#2563EB"],
    planName: "Upper Lower",
  },
  {
    id: "strength",
    title: "Strength",
    shortDescription: "Lift heavier, get stronger",
    beginnerExplanation:
      "Perfect if you care about performance in the gym. Lower reps, compound lifts, and steady progression on squats, presses, and pulls.",
    icon: "fitness",
    color: "#F59E0B",
    gradient: ["#F59E0B", "#D97706"],
    planName: "Upper Lower",
  },
  {
    id: "athletic_performance",
    title: "Athletic Performance",
    shortDescription: "Power, speed, and conditioning",
    beginnerExplanation:
      "For sport or an active lifestyle. Mixes strength, explosive work, and cardio so you move better on and off the field.",
    icon: "flash",
    color: "#22C55E",
    gradient: ["#22C55E", "#16A34A"],
    planName: "Push Pull Legs",
  },
  {
    id: "general_fitness",
    title: "General Fitness",
    shortDescription: "Stay healthy and consistent",
    beginnerExplanation:
      "A balanced start if you're new or getting back into training. Full-body sessions, manageable volume, and room to grow.",
    icon: "heart",
    color: "#06B6D4",
    gradient: ["#06B6D4", "#0891B2"],
    planName: "Beginner Routine",
  },
];

export function getGoalById(id: WorkoutGoalId): WorkoutGoal {
  return WORKOUT_GOALS.find((g) => g.id === id) ?? WORKOUT_GOALS[5];
}

const TITLE_ALIASES: Record<string, WorkoutGoalId> = {
  maintenance: "body_recomposition",
  "general fitness": "general_fitness",
  athletic: "athletic_performance",
  performance: "athletic_performance",
  recomposition: "body_recomposition",
};

export function getGoalByTitle(title: string): WorkoutGoal | undefined {
  const normalized = title.toLowerCase().trim();
  const alias = TITLE_ALIASES[normalized];
  if (alias) return getGoalById(alias);

  return WORKOUT_GOALS.find(
    (g) =>
      g.title.toLowerCase() === normalized ||
      normalized.includes(g.title.toLowerCase().split(" ")[0] ?? ""),
  );
}
