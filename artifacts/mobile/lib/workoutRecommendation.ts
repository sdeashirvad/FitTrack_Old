import type { InBodyReport } from "@/hooks/useInbodyService";
import type { GeminiAnalysis } from "@/app/inbody/types";
import { getGoalById, getGoalByTitle, type WorkoutGoalId } from "./workoutGoals";
import type { WorkoutProfileContext } from "./workoutProfile";

export interface WorkoutRecommendation {
  goalId: WorkoutGoalId;
  goalTitle: string;
  reasoning: string;
  healthRisks: string[];
  transformationDirection: string;
  estimatedTimeline: string;
  confidence: number;
  summaryLine: string;
  /** e.g. "Profile", "InBody scan", "AI body analysis" */
  dataSources: string[];
  /** If profile goal differs from AI pick */
  profileGoalNote?: string;
  alternateGoals?: { id: WorkoutGoalId; title: string; reason: string }[];
}

function parseNum(value?: string | null): number | null {
  if (!value) return null;
  const n = parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function computeBmi(profile: WorkoutProfileContext): number | null {
  const fromProfile = parseNum(profile.bmi);
  if (fromProfile != null) return fromProfile;
  const h = parseNum(profile.heightCm);
  const w = parseNum(profile.weightKg);
  if (h == null || w == null || h <= 0) return null;
  return w / Math.pow(h / 100, 2);
}

function isBeginner(profile: WorkoutProfileContext): boolean {
  const exp = (profile.workoutExperience ?? "").toLowerCase();
  return exp.includes("beginner") || exp.includes("< 1");
}

function isSedentary(profile: WorkoutProfileContext): boolean {
  const act = (profile.activityLevel ?? "").toLowerCase();
  return act.includes("sedentary") || act.includes("lightly");
}

function profileGoalId(profile: WorkoutProfileContext): WorkoutGoalId | null {
  const match = getGoalByTitle(profile.fitnessGoal ?? "");
  return match?.id ?? null;
}

function nudgeFromProfile(
  goalId: WorkoutGoalId,
  profile: WorkoutProfileContext,
  reasons: string[],
  confidence: number,
): { goalId: WorkoutGoalId; confidence: number } {
  let next = goalId;
  let conf = confidence;
  const stated = profileGoalId(profile);

  if (stated) {
    if (stated === "fat_loss" && goalId === "muscle_gain") {
      const bf = parseNum(profile.bodyFatPercent);
      if (bf != null && bf >= 22) {
        next = "fat_loss";
        conf = Math.max(conf, 70);
        reasons.push(`your profile goal is Fat Loss and body fat (${bf}%) supports cutting first`);
      }
    }
    if (stated === "muscle_gain" && goalId === "fat_loss") {
      const bf = parseNum(profile.bodyFatPercent);
      if (bf != null && bf < 22) {
        next = "muscle_gain";
        conf = Math.max(conf, 72);
        reasons.push(`your profile goal is Muscle Gain and body fat (${bf}%) is low enough to bulk`);
      }
    }
    if (profile.fitnessGoal?.toLowerCase().includes("maintenance")) {
      if (goalId === "general_fitness" || goalId === "fat_loss") {
        next = "body_recomposition";
        reasons.push("profile Maintenance maps best to Body Recomposition for training");
      }
    }
  }

  if (isBeginner(profile) && next === "athletic_performance") {
    next = "general_fitness";
    conf -= 5;
    reasons.push("beginner experience level — starting with General Fitness is safer");
  }

  if (isSedentary(profile) && next === "fat_loss") {
    reasons.push("lighter activity level — we'll pair fat loss with beginner-friendly strength");
  }

  const diet = (profile.dietaryPreference ?? "").toLowerCase();
  if (diet.includes("high protein") && next === "muscle_gain") {
    conf = Math.min(conf + 4, 95);
    reasons.push("High Protein diet aligns well with muscle-building phases");
  }

  return { goalId: next, confidence: conf };
}

function recommendFromInbodyMetrics(
  m: NonNullable<InBodyReport["extractedMetrics"]>,
  analysis: GeminiAnalysis | undefined,
  profile: WorkoutProfileContext | null,
): { goalId: WorkoutGoalId; confidence: number; reasons: string[]; risks: string[] } {
  const bodyFat = parseNum(m.bodyFat) ?? parseNum(profile?.bodyFatPercent);
  const bmi = parseNum(m.bmi) ?? (profile ? computeBmi(profile) : null);
  const visceral = parseNum(m.visceralFat);
  const muscle = parseNum(m.skeletalMuscleMass);
  const whr = parseNum(m.waistHipRatio);
  const obesity = (m.obesityDegree ?? "").toLowerCase();

  let goalId: WorkoutGoalId = "general_fitness";
  let confidence = 70;
  const risks: string[] = [];
  const reasons: string[] = [];

  const veryHighBf = bodyFat != null && bodyFat >= 30;
  const highBf = bodyFat != null && bodyFat >= 25;
  const highVisceral = visceral != null && visceral >= 10;
  const overweightBmi = bmi != null && bmi >= 25;
  const obeseBmi = bmi != null && bmi >= 30;
  const highWhr = whr != null && whr >= 0.9;
  const lowMuscle = muscle != null && muscle < 28;

  if (veryHighBf || obeseBmi || highVisceral) {
    goalId = "fat_loss";
    confidence = 88;
    if (veryHighBf) reasons.push(`InBody body fat ${bodyFat}% is elevated`);
    if (obeseBmi) reasons.push(`BMI ${bmi?.toFixed(1)} is above healthy range`);
    if (highVisceral) reasons.push(`visceral fat ${visceral} is high`);
    risks.push("Elevated visceral fat increases metabolic risk — fat loss should come first.");
  } else if (highBf || overweightBmi || highWhr) {
    goalId = "fat_loss";
    confidence = 78;
    if (highBf) reasons.push(`body fat ${bodyFat}% favors a fat-loss phase`);
    if (overweightBmi) reasons.push(`BMI ${bmi?.toFixed(1)} supports a moderate deficit`);
    if (highWhr) reasons.push(`waist-hip ratio ${whr} suggests central fat`);
  } else if (lowMuscle && bodyFat != null && bodyFat < 22) {
    goalId = "muscle_gain";
    confidence = 82;
    reasons.push(`muscle mass (${muscle} kg) can increase`);
    reasons.push("body fat is not excessive — lean bulk is viable");
  } else if (bodyFat != null && bodyFat >= 18 && bodyFat <= 26 && muscle != null && muscle >= 28) {
    goalId = "body_recomposition";
    confidence = 76;
    reasons.push("body composition suits recomposition (fat down, muscle up)");
  } else if (muscle != null && muscle >= 32 && bodyFat != null && bodyFat < 18) {
    goalId = "strength";
    confidence = 74;
    reasons.push("strong muscle base — strength block will pay off");
  } else if (obesity.includes("over") || obesity.includes("high")) {
    goalId = "fat_loss";
    confidence = 75;
    reasons.push(`obesity level: ${m.obesityDegree}`);
  }

  if (analysis?.healthRisks?.length) risks.push(...analysis.healthRisks.slice(0, 2));
  if (analysis?.goalSuggestions?.length) {
    const s = analysis.goalSuggestions[0]?.toLowerCase() ?? "";
    if (s.includes("fat") && goalId !== "fat_loss") {
      goalId = "fat_loss";
      confidence = Math.min(confidence + 6, 92);
      reasons.push("InBody AI analysis also prioritizes fat reduction");
    }
    if (s.includes("muscle") && !veryHighBf && goalId === "general_fitness") {
      goalId = "muscle_gain";
      confidence = Math.min(confidence + 4, 90);
    }
  }

  if (profile) {
    const nudged = nudgeFromProfile(goalId, profile, reasons, confidence);
    goalId = nudged.goalId;
    confidence = nudged.confidence;
  }

  return { goalId, confidence, reasons, risks };
}

function recommendFromProfileOnly(profile: WorkoutProfileContext): {
  goalId: WorkoutGoalId;
  confidence: number;
  reasons: string[];
  risks: string[];
} {
  const reasons: string[] = [];
  const risks: string[] = [];
  let confidence = 58;

  const stated = profileGoalId(profile);
  if (stated) {
    reasons.push(`you selected ${profile.fitnessGoal} on your profile`);
    confidence = 65;
  }

  const bmi = computeBmi(profile);
  const bf = parseNum(profile.bodyFatPercent);

  if (bf != null && bf >= 28) {
    return {
      goalId: nudgeFromProfile("fat_loss", profile, [...reasons, `profile body fat ${bf}%`], 68).goalId,
      confidence: 68,
      reasons: [...reasons, `profile body fat ${bf}% suggests Fat Loss`],
      risks: ["Without an InBody scan, visceral fat and muscle balance are estimated only."],
    };
  }
  if (bmi != null && bmi >= 27) {
    return {
      goalId: nudgeFromProfile("fat_loss", profile, [...reasons, `BMI ${bmi.toFixed(1)}`], 66).goalId,
      confidence: 66,
      reasons: [...reasons, `estimated BMI ${bmi.toFixed(1)} supports fat loss`],
      risks: [],
    };
  }
  if (stated === "muscle_gain" || profile.fitnessGoal?.toLowerCase().includes("muscle")) {
    return {
      goalId: nudgeFromProfile("muscle_gain", profile, reasons, 64).goalId,
      confidence: 64,
      reasons: [...reasons, "profile goal focuses on building muscle"],
      risks: [],
    };
  }
  if (stated === "fat_loss" || profile.fitnessGoal?.toLowerCase().includes("fat")) {
    return {
      goalId: "fat_loss",
      confidence: 64,
      reasons: [...reasons, "profile goal is fat loss"],
      risks: [],
    };
  }
  if (profile.fitnessGoal?.toLowerCase().includes("strength")) {
    return {
      goalId: nudgeFromProfile("strength", profile, reasons, 62).goalId,
      confidence: 62,
      reasons: [...reasons, "profile goal is strength"],
      risks: [],
    };
  }

  if (isBeginner(profile)) {
    return {
      goalId: "general_fitness",
      confidence: 60,
      reasons: [...reasons, "beginner experience — build consistency first"],
      risks: ["Upload an InBody report for a scan-based recommendation."],
    };
  }

  const goalId = stated ?? "general_fitness";
  return {
    goalId: nudgeFromProfile(goalId, profile, reasons, confidence).goalId,
    confidence,
    reasons: reasons.length ? reasons : ["using your profile lifestyle data"],
    risks: ["InBody scan not found — recommendation uses profile only (lower accuracy)."],
  };
}

export function recommendWorkoutGoal(options: {
  profile: WorkoutProfileContext | null;
  report?: InBodyReport | null;
}): WorkoutRecommendation {
  const { profile, report } = options;
  const dataSources: string[] = [];
  if (profile) dataSources.push("Your profile");
  if (report?.extractedMetrics) dataSources.push("Latest InBody report");
  if (report?.geminiAnalysis) dataSources.push("AI body analysis");

  let goalId: WorkoutGoalId;
  let confidence: number;
  let reasons: string[];
  let risks: string[];

  if (report?.extractedMetrics && Object.keys(report.extractedMetrics).length > 0) {
    const analysis = report.geminiAnalysis as GeminiAnalysis | undefined;
    const fromScan = recommendFromInbodyMetrics(report.extractedMetrics, analysis, profile);
    goalId = fromScan.goalId;
    confidence = fromScan.confidence;
    reasons = fromScan.reasons;
    risks = fromScan.risks;
  } else if (profile) {
    const fromProfile = recommendFromProfileOnly(profile);
    goalId = fromProfile.goalId;
    confidence = fromProfile.confidence;
    reasons = fromProfile.reasons;
    risks = fromProfile.risks;
  } else {
    goalId = "general_fitness";
    confidence = 50;
    reasons = ["limited data available"];
    risks = ["Complete your profile or upload InBody for a personalized pick."];
  }

  const goal = getGoalById(goalId);
  const analysis = report?.geminiAnalysis as GeminiAnalysis | undefined;

  const timeline =
    analysis?.weightControlAnalysis?.timeline ??
    analysis?.recompositionGoals?.mediumTerm ??
    (goalId === "fat_loss"
      ? "12–20 weeks with consistent training and nutrition"
      : goalId === "muscle_gain"
        ? "16–24 weeks for visible muscle gain"
        : "8–16 weeks to see measurable progress");

  const direction =
    goalId === "fat_loss"
      ? "Moderate deficit, 3–4 strength sessions/week, protein prioritized. Add steps or light cardio if activity is low."
      : goalId === "muscle_gain"
        ? "Slight surplus, progressive overload, protein aligned with your diet preference."
        : goalId === "body_recomposition"
          ? "Maintenance calories, high protein, mix of strength and controlled cardio."
          : goalId === "strength"
            ? "Compound lifts, longer rest, periodized loading."
            : "Full-body or upper/lower splits 3×/week — ideal for beginners.";

  const reasonText = reasons.join("; ");
  const summaryLine =
    report?.extractedMetrics
      ? `Based on your InBody scan${profile?.fitnessGoal ? ` and profile (${profile.fitnessGoal})` : ""}, we recommend **${goal.title}**.`
      : profile?.fitnessGoal
        ? `Based on your profile (goal: ${profile.fitnessGoal}, ${profile.activityLevel ?? "activity n/a"}), we recommend **${goal.title}**. Upload InBody for higher accuracy.`
        : `We recommend starting with **${goal.title}**.`;

  let profileGoalNote: string | undefined;
  const statedId = profile ? profileGoalId(profile) : null;
  if (statedId && statedId !== goalId && profile?.fitnessGoal) {
    profileGoalNote = `Your profile lists "${profile.fitnessGoal}" — our scan-based pick is ${goal.title} because: ${reasonText}. You can still choose your profile goal manually.`;
  }

  const alternateGoals: WorkoutRecommendation["alternateGoals"] = [];
  if (goalId !== "fat_loss" && (parseNum(report?.extractedMetrics?.bodyFat) ?? 0) >= 25) {
    alternateGoals.push({
      id: "fat_loss",
      title: "Fat Loss",
      reason: "High body fat % from scan",
    });
  }
  if (goalId !== "muscle_gain" && statedId === "muscle_gain") {
    alternateGoals.push({
      id: "muscle_gain",
      title: "Muscle Gain",
      reason: "Matches your profile goal",
    });
  }

  return {
    goalId,
    goalTitle: goal.title,
    reasoning: `${reasonText}. ${goal.beginnerExplanation}`,
    healthRisks: [...new Set(risks)].slice(0, 3),
    transformationDirection: direction,
    estimatedTimeline: timeline,
    confidence,
    summaryLine: summaryLine.replace(/\*\*/g, ""),
    dataSources,
    profileGoalNote,
    alternateGoals: alternateGoals.length ? alternateGoals : undefined,
  };
}

/** @deprecated Use recommendWorkoutGoal */
export function recommendGoalFromInbodyReport(report: InBodyReport): WorkoutRecommendation {
  return recommendWorkoutGoal({ profile: null, report });
}
