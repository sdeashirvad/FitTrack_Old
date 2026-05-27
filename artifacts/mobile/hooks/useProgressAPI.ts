/**
 * useProgressAPI
 * ─────────────
 * Fetches real progress data from the API server.
 * Returns empty/null state when not authenticated or API is unavailable.
 * Never falls back to demo/mock data.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";

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
  _source: "api" | "empty" | "error";
}

// ─── Empty (no-data) state ─────────────────────────────────────────────────────

const EMPTY_DASHBOARD: ProgressDashboard = {
  weightTrend: [],
  currentMetrics: { weight: null, bodyFat: null, muscle: null, bmi: null, bmr: null, visceralFat: null },
  transformationSummary: { weightLost: null, muscleGained: null, fatLost: null, scans: 0, weeks: 0 },
  workoutStats: { streak: 0, longestStreak: 0 },
  fitnessScore: { score: 0, label: "Getting Started", breakdown: { streak: 0, bodyComp: 0, recovery: 0, consistency: 0, achievements: 0 } },
  achievements: [],
  recentCheckin: null,
  recentActivity: [],
  inbodyReports: [],
  _source: "empty",
};

const EMPTY_AI_INSIGHTS = {
  insights: [] as string[],
  weeklyGoal: null as string | null,
  recoveryAdvice: null as string | null,
  source: "empty",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProgressAPI() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<ProgressDashboard>(EMPTY_DASHBOARD);
  const [aiInsights, setAiInsights] = useState(EMPTY_AI_INSIGHTS);
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setDashboard({ ...EMPTY_DASHBOARD, _source: "empty" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/progress/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setDashboard({
        weightTrend: data.weightTrend ?? [],
        currentMetrics: data.currentMetrics ?? EMPTY_DASHBOARD.currentMetrics,
        transformationSummary: data.transformationSummary ?? EMPTY_DASHBOARD.transformationSummary,
        workoutStats: data.workoutStats ?? EMPTY_DASHBOARD.workoutStats,
        fitnessScore: data.fitnessScore ?? EMPTY_DASHBOARD.fitnessScore,
        achievements: data.achievements ?? [],
        recentCheckin: data.recentCheckin ?? null,
        recentActivity: data.recentActivity ?? [],
        inbodyReports: data.inbodyReports ?? [],
        _source: "api",
      });
    } catch (err: any) {
      setError(err.message);
      setDashboard({ ...EMPTY_DASHBOARD, _source: "error" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchAIInsights = useCallback(async () => {
    if (!token) return EMPTY_AI_INSIGHTS;
    setInsightsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/progress/ai-insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAiInsights(data);
      return data;
    } catch {
      setAiInsights(EMPTY_AI_INSIGHTS);
      return EMPTY_AI_INSIGHTS;
    } finally {
      setInsightsLoading(false);
    }
  }, [token]);

  const logCheckin = useCallback(async (data: Omit<DailyCheckin, "id" | "checkinDate">) => {
    if (!token) return null;
    try {
      const res = await fetch(`${getApiBaseUrl()}/progress/checkin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDashboard(prev => ({ ...prev, recentCheckin: { ...data, checkinDate: new Date().toISOString() } }));
      return json;
    } catch (err: any) {
      return null;
    }
  }, [token]);

  const logWeight = useCallback(async (weightKg: number, notes?: string) => {
    if (!token) return null;
    try {
      const res = await fetch(`${getApiBaseUrl()}/progress/weight`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchDashboard();
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