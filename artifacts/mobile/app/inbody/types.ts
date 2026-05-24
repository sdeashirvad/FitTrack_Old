export type Phase = "upload" | "preview" | "analyzing" | "results" | "plan";
export type PlanType = "trainer" | "ai" | null;

export interface GeminiAnalysis {
  overallSummary: string;
  fitnessLevel: string;

  bodyFatAnalysis: {
    status: string;
    description: string;
    recommendation: string;
    idealRange?: string;
  };
  muscleMassAnalysis: {
    status: string;
    description: string;
    recommendation: string;
    idealRange?: string;
  };
  metabolismInsights: {
    bmr: string;
    metabolicAge: string;
    description: string;
    recommendation?: string;
  };
  visceralFatAnalysis: {
    level: string;
    risk: string;
    recommendation: string;
    whrImplication?: string;
  };
  bodyCompositionAnalysis?: {
    hydrationStatus: string;
    proteinStatus: string;
    mineralStatus: string;
    description: string;
    recommendation: string;
  };
  obesityAnalysis?: {
    bmiStatus: string;
    pbfStatus: string;
    obesityDegreeInterpretation: string;
    riskLevel: string;
    description: string;
    recommendation: string;
  };
  weightControlAnalysis?: {
    targetWeight: string;
    estimatedWeightToLose: string;
    estimatedFatToLose: string;
    timeline: string;
    strategy: string;
  };
  metabolicHealthAnalysis?: {
    description: string;
    bmrInterpretation: string;
    metabolicAgeInterpretation: string;
    recommendation: string;
  };
  recompositionGoals?: {
    shortTerm: string;
    mediumTerm: string;
    longTerm: string;
  };

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
  // Core
  weight?: string;
  bmi?: string;
  bodyFat?: string;
  bodyFatMass?: string;
  skeletalMuscleMass?: string;
  leanBodyMass?: string;
  fatFreeMass?: string;
  softLeanMass?: string;
  protein?: string;
  mineral?: string;
  bodyWater?: string;
  // Metabolic
  bmr?: string;
  metabolicAge?: string;
  recommendedCalorieIntake?: string;
  // Obesity & risk
  visceralFat?: string;
  waistHipRatio?: string;
  obesityDegree?: string;
  // Weight control
  targetWeight?: string;
  weightControl?: string;
  fatControl?: string;
  muscleControl?: string;
  // Research
  smi?: string;
  // Demographics & score
  inbodyScore?: string;
  height?: string;
  age?: string;
  gender?: string;
}

export interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}
