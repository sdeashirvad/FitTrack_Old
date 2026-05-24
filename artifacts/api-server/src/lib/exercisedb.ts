/**
 * ExerciseDB Client
 * -----------------
 * Fetches exercises from exercisedb.io public API.
 * Falls back to curated static data when the API is unavailable.
 */

import { logger } from "./logger";

const EXERCISEDB_BASE = "https://exercisedb.io/api/v1";
const REQUEST_TIMEOUT = 8000;

export interface ExerciseDBExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  gifUrl: string;
  instructions: string[];
}

const STATIC_FALLBACK: Record<string, ExerciseDBExercise[]> = {
  chest: [
    { id: "f_chest_1", name: "Barbell Bench Press", bodyPart: "chest", target: "pectorals", secondaryMuscles: ["triceps", "delts"], equipment: "barbell", gifUrl: "", instructions: ["Lie on bench, grip barbell slightly wider than shoulder-width", "Lower bar to mid-chest with control", "Press up explosively to full extension"] },
    { id: "f_chest_2", name: "Incline Dumbbell Press", bodyPart: "chest", target: "pectorals", secondaryMuscles: ["triceps"], equipment: "dumbbell", gifUrl: "", instructions: ["Set bench to 30–45°", "Press dumbbells up and together", "Control descent for 2 seconds"] },
    { id: "f_chest_3", name: "Cable Chest Fly", bodyPart: "chest", target: "pectorals", secondaryMuscles: ["biceps"], equipment: "cable", gifUrl: "", instructions: ["Set cables at shoulder height", "Step forward and bring hands together in arc", "Squeeze chest at centre"] },
  ],
  back: [
    { id: "f_back_1", name: "Deadlift", bodyPart: "back", target: "spine", secondaryMuscles: ["glutes", "hamstrings", "traps"], equipment: "barbell", gifUrl: "", instructions: ["Stand with feet hip-width, bar over laces", "Hinge at hips, grip just outside legs", "Drive through heels and extend hips to stand"] },
    { id: "f_back_2", name: "Pull-ups", bodyPart: "back", target: "lats", secondaryMuscles: ["biceps", "rear delts"], equipment: "body weight", gifUrl: "", instructions: ["Hang from bar with overhand grip", "Pull body up until chin clears bar", "Lower with control to dead hang"] },
    { id: "f_back_3", name: "Seated Cable Row", bodyPart: "back", target: "upper back", secondaryMuscles: ["biceps", "lats"], equipment: "cable", gifUrl: "", instructions: ["Sit upright, feet on platform", "Pull handle to lower chest", "Pause and squeeze shoulder blades"] },
  ],
  "upper legs": [
    { id: "f_legs_1", name: "Barbell Squat", bodyPart: "upper legs", target: "quads", secondaryMuscles: ["glutes", "hamstrings", "core"], equipment: "barbell", gifUrl: "", instructions: ["Bar on upper traps, feet shoulder-width", "Break parallel, knees tracking toes", "Drive up through heels"] },
    { id: "f_legs_2", name: "Romanian Deadlift", bodyPart: "upper legs", target: "hamstrings", secondaryMuscles: ["glutes", "lower back"], equipment: "barbell", gifUrl: "", instructions: ["Hold barbell at hip height", "Hinge at hips keeping back flat", "Lower bar along legs to shin level"] },
    { id: "f_legs_3", name: "Leg Press", bodyPart: "upper legs", target: "quads", secondaryMuscles: ["glutes", "hamstrings"], equipment: "machine", gifUrl: "", instructions: ["Place feet shoulder-width on platform", "Lower to 90° knee angle", "Press through heels to extend"] },
    { id: "f_legs_4", name: "Hip Thrust", bodyPart: "upper legs", target: "glutes", secondaryMuscles: ["hamstrings"], equipment: "barbell", gifUrl: "", instructions: ["Upper back on bench, bar across hips", "Drive hips up until body forms straight line", "Squeeze glutes hard at top"] },
  ],
  shoulders: [
    { id: "f_sh_1", name: "Overhead Press", bodyPart: "shoulders", target: "delts", secondaryMuscles: ["triceps", "upper chest"], equipment: "barbell", gifUrl: "", instructions: ["Grip bar just outside shoulders", "Brace core and press overhead", "Lock out arms at top"] },
    { id: "f_sh_2", name: "Lateral Raises", bodyPart: "shoulders", target: "delts", secondaryMuscles: [], equipment: "dumbbell", gifUrl: "", instructions: ["Stand with dumbbells at sides", "Raise arms to shoulder height with slight bend", "Lower with 3-second control"] },
    { id: "f_sh_3", name: "Face Pulls", bodyPart: "shoulders", target: "delts", secondaryMuscles: ["rear delts", "traps"], equipment: "cable", gifUrl: "", instructions: ["Set cable at face height, rope attachment", "Pull to forehead with elbows flaring wide", "Externally rotate wrists at end"] },
  ],
  "upper arms": [
    { id: "f_arm_1", name: "Barbell Curl", bodyPart: "upper arms", target: "biceps", secondaryMuscles: ["forearms"], equipment: "barbell", gifUrl: "", instructions: ["Stand with barbell, underhand grip", "Curl to shoulders without swinging", "Slowly lower over 3 seconds"] },
    { id: "f_arm_2", name: "Tricep Pushdown", bodyPart: "upper arms", target: "triceps", secondaryMuscles: [], equipment: "cable", gifUrl: "", instructions: ["Stand at cable machine, overhand grip", "Keep elbows pinned to sides", "Extend arms fully, squeeze triceps"] },
    { id: "f_arm_3", name: "Hammer Curl", bodyPart: "upper arms", target: "biceps", secondaryMuscles: ["brachialis", "forearms"], equipment: "dumbbell", gifUrl: "", instructions: ["Neutral grip (thumbs up)", "Curl to shoulders keeping elbows still", "Targets brachialis for arm thickness"] },
  ],
  "lower legs": [
    { id: "f_calf_1", name: "Standing Calf Raise", bodyPart: "lower legs", target: "calves", secondaryMuscles: [], equipment: "machine", gifUrl: "", instructions: ["Stand on edge of platform", "Raise on tiptoe as high as possible", "Pause 1 second at top"] },
  ],
  cardio: [
    { id: "f_card_1", name: "Treadmill Walk/Run", bodyPart: "cardio", target: "cardiovascular", secondaryMuscles: [], equipment: "machine", gifUrl: "", instructions: ["Set incline 2–5° for fat burn", "Maintain 65–75% max heart rate", "Aim for 20–45 minute sessions"] },
    { id: "f_card_2", name: "Cycling", bodyPart: "cardio", target: "cardiovascular", secondaryMuscles: ["quads", "glutes"], equipment: "machine", gifUrl: "", instructions: ["Adjust seat so leg is nearly straight at bottom", "Pedal at 70–90 RPM", "Keep moderate resistance for fat burn"] },
    { id: "f_card_3", name: "Jump Rope", bodyPart: "cardio", target: "cardiovascular", secondaryMuscles: ["calves", "shoulders"], equipment: "body weight", gifUrl: "", instructions: ["Keep elbows close to body", "Jump just high enough for rope to pass", "Do 30-second bursts for HIIT"] },
  ],
};

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchExercisesByBodyPart(
  bodyPart: string,
  limit = 6,
): Promise<ExerciseDBExercise[]> {
  const normalised = bodyPart.toLowerCase().trim();

  try {
    const url = `${EXERCISEDB_BASE}/exercises/bodyPart/${encodeURIComponent(normalised)}?limit=${limit}&offset=0`;
    const res = await fetchWithTimeout(url, REQUEST_TIMEOUT);

    if (!res.ok) {
      throw new Error(`ExerciseDB responded ${res.status}`);
    }

    const data = (await res.json()) as ExerciseDBExercise[];
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Empty response");
    }

    logger.info({ bodyPart: normalised, count: data.length }, "ExerciseDB fetch ok");
    return data.slice(0, limit);
  } catch (err: any) {
    logger.warn({ bodyPart: normalised, err: err.message }, "ExerciseDB fetch failed — using fallback");
    return getFallback(normalised, limit);
  }
}

export async function fetchExercisesByTarget(
  target: string,
  limit = 4,
): Promise<ExerciseDBExercise[]> {
  const normalised = target.toLowerCase().trim();

  try {
    const url = `${EXERCISEDB_BASE}/exercises/target/${encodeURIComponent(normalised)}?limit=${limit}&offset=0`;
    const res = await fetchWithTimeout(url, REQUEST_TIMEOUT);

    if (!res.ok) throw new Error(`ExerciseDB responded ${res.status}`);

    const data = (await res.json()) as ExerciseDBExercise[];
    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty");

    return data.slice(0, limit);
  } catch (err: any) {
    logger.warn({ target: normalised, err: err.message }, "ExerciseDB target fetch failed");
    return [];
  }
}

function getFallback(bodyPart: string, limit: number): ExerciseDBExercise[] {
  const key = Object.keys(STATIC_FALLBACK).find((k) => bodyPart.includes(k) || k.includes(bodyPart));
  const list = key ? STATIC_FALLBACK[key] : STATIC_FALLBACK.cardio;
  return list.slice(0, limit);
}
