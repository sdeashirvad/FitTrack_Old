import type { User } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";
import type { WorkoutSetup } from "@/lib/workoutSetup";

async function requestJson<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null
        ? (body as { error?: string; message?: string }).error ||
          (body as { error?: string; message?: string }).message
        : typeof body === "string"
          ? body
          : res.statusText;
    throw new Error(message || "Request failed");
  }

  return body as T;
}

/** Fresh user profile including fitnessGoal and workoutSetup from the database. */
export async function fetchUserProfile(token: string): Promise<User> {
  const data = await requestJson<{ user: User }>("/api/auth/profile", token);
  return data.user;
}

/** Persist workout goal + plan on user_profiles (onboarding_data.workoutSetup). */
export async function saveWorkoutSetupToProfile(
  token: string,
  setup: WorkoutSetup,
): Promise<User> {
  const data = await requestJson<{ user: User }>("/api/auth/workout-setup", token, {
    method: "PATCH",
    body: JSON.stringify(setup),
  });
  return data.user;
}
