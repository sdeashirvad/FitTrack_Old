/**
 * useProgressAPI
 * ─────────────
 * Fetches real progress data from the API server.
 * Falls back gracefully to demo data when not authenticated or API is unavailable.
 */

import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";

function getApiBase(): string {
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  if (d) return `https://${d}`;
  if (Platform.OS === "android") return "http://10.0.2.2:3001";
  return "http://localhost:3001";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendPoint { week: string; value: number; date?: string }
export interface CurrentMetrics {
  weight: number | null;
  bodyFat: number | null;
  muscle: number | null;
  bmi: number | null;
  bmr: number | null;
  visceralFat: number | null;
}
export interface TransformSummary {
  weightLost: number | null;
  muscleGained: number | null;
  fatLost: number | null;
  scans: number;
  weeks: number;
}
export interface FitnessScore {
  score: number;
  label: string;
  breakdown: Record<string, number>;
}
export interface InbodyReport {
  id: string;
  date: string;
  weight: string | null;
  bodyFat: string | null;
  muscleMass: string | null;
  bmi: string | null;
  score: number | null;
  status: string;
  aiAnalysis: any;
}
export interface DailyCheckin {
  id?: string;
  energyLevel: number;
  sleepHours?: number;
  soreness?: number;
  mood?: number;
  recoveryScore?: number;
  notes?: string;
  checkinDate?: string;
}

export interface ProgressDashboard {
  weightTrend: TrendPoint[];
  currentMetrics: CurrentMetrics;
  transformationSummary: TransformSummary;
  workoutStats: { streak: number; longestStreak: number };
  fitnessScore: FitnessScore;
  achievements: any[];
  recentCheckin: DailyCheckin | null;
  recentActivity: any[];
  inbodyReports: InbodyReport[];
  _source: "api" | "demo";
}

// ─── Demo fallback ─────────────────────────────────────────────────────────────

const DEMO: ProgressDashboard = {
  weightTrend: [
    { week: "W1", value: 83.0 }, { week: "W2", value: 82.5 },
    { week: "W3", value: 81.8 }, { week: "W4", value: 81.2 },
    { week: "W5", value: 80.5 }, { week: "W6", value: 79.8 },
    { week: "W7", value: 79.2 }, { week: "W8", value: 78.2 },
  ],
  currentMetrics: { weight: 78.2, bodyFat: 18.4, muscle: 32.8, bmi: 24.1, bmr: 1780, visceralFat: 7 },
  transformationSummary: { weightLost: 4.8, muscleGained: 2.6, fatLost: 3.9, scans: 3, weeks: 11 },
  workoutStats: { streak: 12, longestStreak: 18 },
  fitnessScore: { score: 74, label: "Great", breakdown: { streak: 8, bodyComp: 15, recovery: 10, consistency: 16, achievements: 4 } },
  achievements: [
    { id: "a1", name: "12 Day Streak", description: "12 consecutive workout days", type: "workout_streak", points: 50, earnedAt: new Date().toISOString() },
    { id: "a2", name: "50 Workouts", description: "Completed 50 workouts", type: "workout_streak", points: 100, earnedAt: new Date().toISOString() },
    { id: "a3", name: "5 kg Lost", description: "Lost 5kg from starting weight", type: "progress_milestone", points: 75, earnedAt: new Date().toISOString() },
    { id: "a4", name: "Consistency", description: "30-day consistency award", type: "workout_streak", points: 60, earnedAt: new Date().toISOString() },
  ],
  recentCheckin: null,
  recentActivity: [],
  inbodyReports: [
    { id: "r1", date: "2026-05-15", weight: "78.2", bodyFat: "18.4", muscleMass: "32.8", bmi: "24.1", score: 74, status: "done", aiAnalysis: null },
    { id: "r2", date: "2026-04-10", weight: "80.5", bodyFat: "20.1", muscleMass: "31.6", bmi: "24.8", score: 68, status: "done", aiAnalysis: null },
    { id: "r3", date: "2026-03-05", weight: "83.0", bodyFat: "22.3", muscleMass: "30.2", bmi: "25.6", score: 61, status: "done", aiAnalysis: null },
  ],
  _source: "demo",
};

const DEMO_AI_INSIGHTS = {
  insights: [
    "Your muscle mass improved by 2.6 kg since your first scan — progressive overload is working!",
    "Body fat trending down at 18.4% — continue with current calorie deficit and cardio.",
    "Visceral fat at 7 is in the healthy range — maintain with regular cardio 3× per week.",
    "12-day workout streak is strong consistency. Aim for 21 days to cement the habit.",
  ],
  weeklyGoal: "Complete 4 workouts, log weight daily, and hit 2,200 kcal target.",
  recoveryAdvice: "Recovery is looking good. Keep 7–8 hours sleep and maintain active rest days.",
  source: "demo",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProgressAPI() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<ProgressDashboard>(DEMO);
  const [aiInsights, setAiInsights] = useState(DEMO_AI_INSIGHTS);
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) { setDashboard({ ...DEMO, _source: "demo" }); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/progress/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Merge real data — fall back field-by-field if API returns empty arrays
      const wt: TrendPoint[] = data.weightTrend?.length ? data.weightTrend : DEMO.weightTrend;

      setDashboard({
        weightTrend: wt,
        currentMetrics: data.currentMetrics?.weight ? data.currentMetrics : DEMO.currentMetrics,
        transformationSummary: data.transformationSummary?.weightLost != null ? data.transformationSummary : DEMO.transformationSummary,
        workoutStats: data.workoutStats ?? DEMO.workoutStats,
        fitnessScore: data.fitnessScore ?? DEMO.fitnessScore,
        achievements: data.achievements?.length ? data.achievements : DEMO.achievements,
        recentCheckin: data.recentCheckin ?? null,
        recentActivity: data.recentActivity ?? [],
        inbodyReports: data.inbodyReports?.length ? data.inbodyReports : DEMO.inbodyReports,
        _source: "api",
      });
    } catch (err: any) {
      setError(err.message);
      setDashboard({ ...DEMO, _source: "demo" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchAIInsights = useCallback(async () => {
    if (!token) return DEMO_AI_INSIGHTS;
    setInsightsLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/progress/ai-insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAiInsights(data);
      return data;
    } catch {
      setAiInsights(DEMO_AI_INSIGHTS);
      return DEMO_AI_INSIGHTS;
    } finally {
      setInsightsLoading(false);
    }
  }, [token]);

  const logCheckin = useCallback(async (data: Omit<DailyCheckin, "id" | "checkinDate">) => {
    if (!token) return null;
    try {
      const res = await fetch(`${getApiBase()}/api/progress/checkin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Optimistically update recentCheckin in dashboard
      setDashboard(prev => ({ ...prev, recentCheckin: { ...data, checkinDate: new Date().toISOString() } }));
      return json;
    } catch (err: any) {
      return null;
    }
  }, [token]);

  const logWeight = useCallback(async (weightKg: number, notes?: string) => {
    if (!token) return null;
    try {
      const res = await fetch(`${getApiBase()}/api/progress/weight`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchDashboard(); // refresh trends
      return await res.json();
    } catch {
      return null;
    }
  }, [token, fetchDashboard]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboard,
    aiInsights,
    loading,
    insightsLoading,
    error,
    refreshDashboard: fetchDashboard,
    fetchAIInsights,
    logCheckin,
    logWeight,
  };
}
