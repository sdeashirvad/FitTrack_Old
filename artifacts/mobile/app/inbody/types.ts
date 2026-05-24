export type Phase = "upload" | "preview" | "analyzing" | "results" | "plan";
export type PlanType = "trainer" | "ai" | null;

export interface GeminiAnalysis {
  overallSummary: string;
  fitnessLevel: string;
  bodyFatAnalysis: { status: string; description: string; recommendation: string };
  muscleMassAnalysis: { status: string; description: string; recommendation: string };
  metabolismInsights: { bmr: string; metabolicAge: string; description: string };
  visceralFatAnalysis: { level: string; risk: string; recommendation: string };
  strengths: string[];
  weaknesses: string[];
  healthRisks: string[];
  recommendations: string[];
  workoutPlan: {
    goal: string;
    planType: string;
    weeklySchedule: Array<{ day: string; focus: string; duration?: string; exercises?: string[] } | string>;
    cardioRecommendation: string;
  };
  goalSuggestions: string[];
  __aiSource?: "groq" | "fallback";
  __aiModel?: string;
  __aiRawResponse?: string;
  __aiUsage?: unknown;
}

export interface ExtractedMetrics {
  weight?: string;
  bmi?: string;
  bodyFat?: string;
  skeletalMuscleMass?: string;
  leanBodyMass?: string;
  protein?: string;
  bodyWater?: string;
  bmr?: string;
  visceralFat?: string;
  metabolicAge?: string;
  waistHipRatio?: string;
}

export interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}
