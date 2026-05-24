import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@/context/AuthContext";
import type { InBodyReport } from "@/hooks/useInbodyService";
import { fetchUserProfile, saveWorkoutSetupToProfile } from "@/hooks/useWorkoutService";
import { getGoalById, type WorkoutGoalId } from "@/lib/workoutGoals";
import { isWorkoutSetup, type WorkoutSetup } from "@/lib/workoutSetup";

const STORAGE_KEY = "@fittrack_workout_setup_v2";

export type { WorkoutSetup } from "@/lib/workoutSetup";

export interface WorkoutReadiness {
  ready: boolean;
  hasGoal: boolean;
  hasInbodyReport: boolean;
  hasActivePlan: boolean;
}

function parseLocalSetup(raw: string | null): WorkoutSetup | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    return isWorkoutSetup(data) ? data : null;
  } catch {
    return null;
  }
}

export function evaluateWorkoutReadiness(
  setup: WorkoutSetup | null,
  user: User | null,
  reports: InBodyReport[],
): WorkoutReadiness {
  const hasGoal = !!(setup?.goalLabel || user?.fitnessGoal);
  const hasInbodyReport = reports.some(
    (r) => r.status === "done" && r.extractedMetrics && Object.keys(r.extractedMetrics).length > 0,
  );
  const hasActivePlan = !!(setup?.completed && setup.planName);
  const ready = !!(setup?.completed && setup.goalId && setup.planName);

  return { ready, hasGoal, hasInbodyReport, hasActivePlan };
}

export function useWorkoutSetup(
  token: string | null,
  user: User | null,
  reports: InBodyReport[],
  syncUser?: (profile: User) => Promise<void>,
) {
  const [setup, setSetup] = useState<WorkoutSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const syncUserRef = useRef(syncUser);
  const userRef = useRef(user);
  const hasLoadedOnceRef = useRef(false);
  const loadInFlightRef = useRef(false);

  useEffect(() => {
    syncUserRef.current = syncUser;
  }, [syncUser]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const applyProfile = useCallback(async (profile: User) => {
    const dbSetup =
      profile.workoutSetup && isWorkoutSetup(profile.workoutSetup) ? profile.workoutSetup : null;

    if (dbSetup) {
      setSetup(dbSetup);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dbSetup));
      return;
    }

    const local = parseLocalSetup(await AsyncStorage.getItem(STORAGE_KEY));
    setSetup(local);
  }, []);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) {
        setSetup(null);
        setLoading(false);
        return;
      }

      if (loadInFlightRef.current) return;
      loadInFlightRef.current = true;

      const showSpinner = !options?.silent && !hasLoadedOnceRef.current;
      if (showSpinner) setLoading(true);

      try {
        const profile = await fetchUserProfile(token);
        await syncUserRef.current?.(profile);
        await applyProfile(profile);
      } catch {
        const local = parseLocalSetup(await AsyncStorage.getItem(STORAGE_KEY));
        if (local) {
          setSetup(local);
        } else if (userRef.current?.workoutSetup && isWorkoutSetup(userRef.current.workoutSetup)) {
          setSetup(userRef.current.workoutSetup);
        } else {
          setSetup(null);
        }
      } finally {
        hasLoadedOnceRef.current = true;
        loadInFlightRef.current = false;
        setLoading(false);
      }
    },
    [token, applyProfile],
  );

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    load();
  }, [token, load]);

  const readiness = evaluateWorkoutReadiness(setup, user, reports);

  const completeSetup = useCallback(
    async (params: {
      goalId: WorkoutGoalId;
      source: "manual" | "ai";
      aiConfidence?: number;
    }) => {
      if (!token) throw new Error("Not authenticated");

      const goal = getGoalById(params.goalId);
      const next: WorkoutSetup = {
        completed: true,
        goalId: params.goalId,
        goalLabel: goal.title,
        planName: goal.planName,
        source: params.source,
        aiConfidence: params.aiConfidence,
        completedAt: new Date().toISOString(),
      };

      const profile = await saveWorkoutSetupToProfile(token, next);
      await syncUserRef.current?.(profile);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSetup(next);
      return next;
    },
    [token],
  );

  const clearSetup = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSetup(null);
  }, []);

  const refresh = useCallback(() => load({ silent: true }), [load]);

  return {
    setup,
    loading,
    readiness,
    completeSetup,
    clearSetup,
    refresh,
  };
}
