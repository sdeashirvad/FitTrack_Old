/**
 * Groq AI Service for InBody Analysis
 * ------------------------------------
 * Keeps the existing exported names and response shape while using a compact
 * prompt/payload to avoid Groq TPM and request-size failures.
 */

import Groq from "groq-sdk";
import { logger } from "./logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const FALLBACK_GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_OCR_CHARS_FOR_AI = 5000;
const MAX_AI_OUTPUT_TOKENS = 1600;
const LOG_GROQ_RAW_RESPONSE = process.env.LOG_GROQ_RAW_RESPONSE === "true";

const GROQ_MODEL = selectGroqModel(process.env.GROQ_MODEL);
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

export interface GeminiAnalysis {
  overallSummary: string;
  fitnessLevel: string;
  bodyFatAnalysis: {
    status: string;
    description: string;
    recommendation: string;
  };
  muscleMassAnalysis: {
    status: string;
    description: string;
    recommendation: string;
  };
  metabolismInsights: {
    bmr: string;
    metabolicAge: string;
    description: string;
  };
  visceralFatAnalysis: {
    level: string;
    risk: string;
    recommendation: string;
  };
  strengths: string[];
  weaknesses: string[];
  healthRisks: string[];
  recommendations: string[];
  workoutPlan: {
    goal: string;
    planType: string;
    weeklySchedule: Array<{
      day: string;
      focus: string;
      duration: string;
      exercises?: string[];
    }>;
    cardioRecommendation: string;
  };
  dietPlan: {
    calorieTarget: number;
    deficit: number;
    protein: number;
    carbs: number;
    fat: number;
    waterLiters: number;
    meals: string[];
    supplements: string[];
  };
  goalSuggestions: string[];
  __aiSource?: "groq" | "fallback";
  __aiModel?: string;
  __aiRawResponse?: string;
  __aiUsage?: unknown;
}

type CompactInBodyMetrics = {
  weight?: string;
  bmi?: string;
  bodyFat?: string;
  skeletalMuscle?: string;
  age?: string;
  gender?: string;
  height?: string;
};

const SYSTEM_PROMPT = `You are a concise fitness analyst. Return valid JSON only, no markdown.
Use InBody metrics to produce a short fitness summary, muscle analysis, fat analysis, recommendations, and health insights.
Keep every string brief. Preserve this schema exactly:
{"overallSummary":"","fitnessLevel":"","bodyFatAnalysis":{"status":"","description":"","recommendation":""},"muscleMassAnalysis":{"status":"","description":"","recommendation":""},"metabolismInsights":{"bmr":"","metabolicAge":"","description":""},"visceralFatAnalysis":{"level":"","risk":"","recommendation":""},"strengths":[""],"weaknesses":[""],"healthRisks":[""],"recommendations":[""],"workoutPlan":{"goal":"","planType":"","weeklySchedule":[{"day":"","focus":"","duration":"","exercises":[""]}],"cardioRecommendation":""},"dietPlan":{"calorieTarget":0,"deficit":0,"protein":0,"carbs":0,"fat":0,"waterLiters":0,"meals":[""],"supplements":[""]},"goalSuggestions":[""]}`;

export async function analyzeWithGemini(
  metrics: Record<string, string | undefined>,
  userProfile?: { age?: number; gender?: string; height?: string; fitnessGoal?: string },
  rawOCRText = "",
): Promise<GeminiAnalysis> {
  if (!groq || !GROQ_API_KEY) {
    logger.warn("GROQ_API_KEY not set; returning demo analysis");
    return withAiDebug(getDemoAnalysis(metrics), {
      source: "fallback",
      model: GROQ_MODEL,
      rawResponse: "",
      usage: undefined,
    });
  }

  const cleanedOCRText = cleanOCRText(rawOCRText);
  const trimmedOCRText = cleanedOCRText.slice(0, MAX_OCR_CHARS_FOR_AI);
  const compactMetrics = {
    ...extractImportantMetricsFromOCR(trimmedOCRText),
    ...toCompactMetrics(metrics),
  };

  const payload = {
    metrics: compactMetrics,
    parsedMetrics: metrics,
    userProfile: userProfile ?? null,
    ocrExcerpt: hasEnoughCompactMetrics(compactMetrics) ? undefined : trimmedOCRText,
  };
  const prompt = `Analyze this InBody report JSON:\n${JSON.stringify(payload)}`;

  logger.info(
    {
      ocrLengthBeforeCleanup: rawOCRText.length,
      ocrLengthAfterCleanup: cleanedOCRText.length,
      finalAiPayloadSize: prompt.length,
      selectedModel: GROQ_MODEL,
    },
    "Prepared compact Groq AI payload",
  );

  try {
    const result = await requestGroqAnalysis(prompt, GROQ_MODEL);
    return withAiDebug(result.analysis, {
      source: "groq",
      model: GROQ_MODEL,
      rawResponse: result.rawResponse,
      usage: result.usage,
    });
  } catch (err: any) {
    logger.warn(
      { err: err.message, model: GROQ_MODEL, fallbackModel: FALLBACK_GROQ_MODEL },
      "Groq AI analysis failed; trying fallback model",
    );
  }

  try {
    const result = await requestGroqAnalysis(prompt, FALLBACK_GROQ_MODEL);
    return withAiDebug(result.analysis, {
      source: "groq",
      model: FALLBACK_GROQ_MODEL,
      rawResponse: result.rawResponse,
      usage: result.usage,
    });
  } catch (err: any) {
    logger.error(
      { err: err.message, model: FALLBACK_GROQ_MODEL },
      "Groq fallback analysis failed; returning demo analysis",
    );
    return withAiDebug(getDemoAnalysis(metrics), {
      source: "fallback",
      model: FALLBACK_GROQ_MODEL,
      rawResponse: "",
      usage: undefined,
    });
  }
}

export function cleanOCRText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\x20-\x7E\n%]/g, " ")
    .replace(/[|_~`^={}\[\]\\<>]/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function selectGroqModel(model?: string): string {
  if (!model || model === "openai/gpt-oss-120b") {
    return DEFAULT_GROQ_MODEL;
  }

  return model;
}

function toCompactMetrics(metrics: Record<string, string | undefined>): CompactInBodyMetrics {
  return {
    weight: metrics.weight,
    bmi: metrics.bmi,
    bodyFat: metrics.bodyFat,
    skeletalMuscle: metrics.skeletalMuscleMass,
  };
}

function extractImportantMetricsFromOCR(text: string): CompactInBodyMetrics {
  return {
    weight: firstMatch(text, [
      /(?:body\s*)?weight\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs)?/i,
    ]),
    bmi: firstMatch(text, [
      /\bbmi\s*[:\-]?\s*(\d{2}(?:\.\d+)?)/i,
      /body\s*mass\s*index\s*[:\-]?\s*(\d{2}(?:\.\d+)?)/i,
    ]),
    bodyFat: firstMatch(text, [
      /(?:body\s*)?fat\s*(?:percentage|percent|%)?\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*%?/i,
      /\bpbf\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)/i,
    ]),
    skeletalMuscle: firstMatch(text, [
      /skeletal\s*muscle\s*mass\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:kg|kgs)?/i,
      /\bsmm\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:kg|kgs)?/i,
    ]),
    age: firstMatch(text, [/\bage\s*[:\-]?\s*(\d{1,3})\b/i]),
    gender: firstMatch(text, [/\b(?:gender|sex)\s*[:\-]?\s*(male|female|m|f)\b/i]),
    height: firstMatch(text, [
      /\bheight\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm|cms)?/i,
    ]),
  };
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function hasEnoughCompactMetrics(metrics: CompactInBodyMetrics): boolean {
  return Object.values(metrics).filter(Boolean).length >= 3;
}

async function requestGroqAnalysis(
  prompt: string,
  model: string,
): Promise<{ analysis: GeminiAnalysis; rawResponse: string; usage: unknown }> {
  if (!groq) {
    throw new Error("Groq client is not configured");
  }

  logger.info({ selectedModel: model }, "Calling Groq AI for InBody analysis");

  const message = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model,
    temperature: 0.35,
    max_tokens: MAX_AI_OUTPUT_TOKENS,
    top_p: 0.8,
    response_format: { type: "json_object" },
  });

  const rawText = message.choices[0]?.message?.content ?? "";

  if (LOG_GROQ_RAW_RESPONSE) {
    logger.info(
      {
        selectedModel: model,
        groqUsage: message.usage,
        groqRawResponse: rawText,
      },
      "Groq raw model response",
    );
  }

  if (!rawText) {
    throw new Error("No response content from Groq API");
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in Groq response");
  }

  return {
    analysis: JSON.parse(jsonMatch[0]) as GeminiAnalysis,
    rawResponse: rawText,
    usage: message.usage,
  };
}

function withAiDebug(
  analysis: GeminiAnalysis,
  debug: { source: "groq" | "fallback"; model: string; rawResponse: string; usage: unknown },
): GeminiAnalysis {
  return {
    ...analysis,
    __aiSource: debug.source,
    __aiModel: debug.model,
    __aiRawResponse: debug.rawResponse,
    __aiUsage: debug.usage,
  };
}

function getDemoAnalysis(metrics: Record<string, string | undefined>): GeminiAnalysis {
  const weight = parseFloat(metrics.weight ?? "78");
  const bodyFat = parseFloat(metrics.bodyFat ?? "22");
  const bmi = parseFloat(metrics.bmi ?? "25");
  const smm = parseFloat(metrics.skeletalMuscleMass ?? "33");
  const bmr = parseInt(metrics.bmr ?? "1680", 10);
  const visceralFat = parseInt(metrics.visceralFat ?? "8", 10);

  const fatStatus = bodyFat < 15 ? "Low" : bodyFat < 25 ? "Normal" : "High";
  const muscleStatus = smm > 35 ? "Above Average" : smm > 30 ? "Average" : "Low";
  const visceralStatus = visceralFat <= 9 ? "Normal" : "High";

  return {
    overallSummary: `Body composition shows ${fatStatus.toLowerCase()} body fat (${bodyFat}%) with ${muscleStatus.toLowerCase()} skeletal muscle (${smm} kg). Focus on ${bodyFat > 20 ? "fat loss while preserving muscle" : "lean muscle gain and maintenance"}.`,
    fitnessLevel: bodyFat < 15 && smm > 34 ? "Advanced" : bodyFat < 25 ? "Intermediate" : "Beginner",
    bodyFatAnalysis: {
      status: fatStatus,
      description: `Body fat is ${fatStatus.toLowerCase()} based on the available report values.`,
      recommendation: bodyFat > 20 ? "Use a moderate calorie deficit and keep protein high." : "Maintain current habits and monitor trends.",
    },
    muscleMassAnalysis: {
      status: muscleStatus,
      description: `Skeletal muscle mass is ${muscleStatus.toLowerCase()} relative to body weight.`,
      recommendation: "Train with progressive overload 3-5 days per week and target 1.6-2.0 g protein per kg body weight.",
    },
    metabolismInsights: {
      bmr: `Estimated BMR is ${bmr} kcal.`,
      metabolicAge: metrics.metabolicAge ? `Reported metabolic age is ${metrics.metabolicAge}.` : "Metabolic age was not clearly detected.",
      description: "Improving or preserving muscle mass should support metabolic health.",
    },
    visceralFatAnalysis: {
      level: visceralStatus,
      risk: visceralFat <= 9 ? "Low" : visceralFat <= 12 ? "Moderate" : "High",
      recommendation: visceralFat > 9 ? "Prioritize daily steps, fiber, sleep, and 2-3 cardio sessions weekly." : "Maintain active lifestyle and monitor visceral fat over time.",
    },
    strengths: [
      `${muscleStatus} skeletal muscle foundation`,
      `BMR around ${bmr} kcal`,
      "Enough report data for trend tracking",
    ],
    weaknesses: [
      bodyFat > 20 ? "Body fat can be reduced" : "Continue optimizing body composition",
      smm < 34 ? "Muscle mass can improve" : "Maintain muscle mass",
      "Consistency will determine progress",
    ],
    healthRisks: [
      bmi > 25 ? "BMI is elevated; interpret alongside muscle mass." : "BMI is within a reasonable range.",
      visceralFat > 12 ? "Visceral fat may increase metabolic risk." : "Visceral fat appears manageable.",
    ],
    recommendations: [
      `Target ${bodyFat > 20 ? "fat loss" : "lean muscle gain"} for the next 8-12 weeks.`,
      `Aim for about ${Math.round(weight * 1.8)}g protein daily.`,
      "Lift weights 3-5 times per week.",
      "Add 2-3 cardio or brisk walking sessions weekly.",
      "Sleep 7-8 hours and track weight/body metrics weekly.",
    ],
    workoutPlan: {
      goal: bodyFat > 20 ? "Fat loss with muscle retention" : "Lean muscle gain",
      planType: bodyFat > 20 ? "Recomposition" : "Lean bulk",
      weeklySchedule: [
        { day: "Mon", focus: "Upper body strength", duration: "45 min" },
        { day: "Tue", focus: "Cardio + mobility", duration: "30 min" },
        { day: "Wed", focus: "Lower body strength", duration: "45 min" },
        { day: "Fri", focus: "Full body hypertrophy", duration: "45 min" },
      ],
      cardioRecommendation: "Use brisk walking, cycling, or incline treadmill 2-3 times per week.",
    },
    dietPlan: {
      calorieTarget: bodyFat > 20 ? Math.round(bmr * 1.25) : Math.round(bmr * 1.45),
      deficit: bodyFat > 20 ? -300 : 150,
      protein: Math.round(weight * 1.8),
      carbs: bodyFat > 20 ? Math.round(weight * 2.2) : Math.round(weight * 3),
      fat: Math.round(weight * 0.7),
      waterLiters: 3,
      meals: [
        "Breakfast: eggs or paneer with oats/poha",
        "Lunch: dal/chicken/paneer with rice or roti and salad",
        "Snack: curd or whey with fruit",
        "Dinner: lean protein with vegetables and roti",
      ],
      supplements: ["Whey protein if needed", "Creatine 3-5g/day", "Vitamin D if deficient"],
    },
    goalSuggestions: [
      bodyFat > 20 ? "Reduce body fat by 2-4% over 12 weeks" : "Increase lean muscle steadily",
      "Train consistently 4 days per week",
      "Recheck body composition in 8-12 weeks",
    ],
  };
}
