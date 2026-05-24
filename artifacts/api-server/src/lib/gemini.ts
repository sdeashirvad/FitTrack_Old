/**
 * Groq AI Service for InBody Analysis
 * ------------------------------------
 * Keeps the existing exported names and response shape while using a compact
 * prompt/payload to avoid Groq TPM and request-size failures.
 */

/**
 * Groq AI Service for InBody Analysis
 * Optimized + Fixed Version
 */

import Groq from "groq-sdk";
import { logger } from "./logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const FALLBACK_GROQ_MODEL = "llama-3.3-70b-versatile";

const MAX_OCR_CHARS_FOR_AI = 5000;
const MAX_AI_OUTPUT_TOKENS = 1200;

const LOG_GROQ_RAW_RESPONSE =
  process.env.LOG_GROQ_RAW_RESPONSE === "true";

const GROQ_MODEL = selectGroqModel(process.env.GROQ_MODEL);

const groq = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

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
  bmr?: string;
  visceralFat?: string;
  metabolicAge?: string;
};

const SYSTEM_PROMPT = `
You are an expert InBody fitness analysis AI.

CRITICAL RULES:
- Return ONLY valid JSON.
- Never return markdown.
- Never omit fields.
- Preserve original numeric metrics exactly.
- Keep descriptions short.
- Keep recommendations practical.

IMPORTANT:
- metabolismInsights.bmr must contain numeric BMR only.
- metabolismInsights.metabolicAge must contain numeric age only.
- visceralFatAnalysis.level must contain numeric visceral fat value only.

Return this exact schema:

{
  "overallSummary": "",
  "fitnessLevel": "",

  "bodyFatAnalysis": {
    "status": "",
    "description": "",
    "recommendation": ""
  },

  "muscleMassAnalysis": {
    "status": "",
    "description": "",
    "recommendation": ""
  },

  "metabolismInsights": {
    "bmr": "",
    "metabolicAge": "",
    "description": ""
  },

  "visceralFatAnalysis": {
    "level": "",
    "risk": "",
    "recommendation": ""
  },

  "strengths": [""],

  "weaknesses": [""],

  "healthRisks": [""],

  "recommendations": [""],

  "workoutPlan": {
    "goal": "",
    "planType": "",

    "weeklySchedule": [
      {
        "day": "",
        "focus": "",
        "duration": "",
        "exercises": [""]
      }
    ],

    "cardioRecommendation": ""
  },

  "goalSuggestions": [""]
}
`;

export async function analyzeWithGemini(
  metrics: Record<string, string | undefined>,
  userProfile?: {
    age?: number;
    gender?: string;
    height?: string;
    fitnessGoal?: string;
  },
  rawOCRText = "",
): Promise<GeminiAnalysis> {
  if (!groq || !GROQ_API_KEY) {
    logger.warn("GROQ_API_KEY missing");

    return withAiDebug(getDemoAnalysis(metrics), {
      source: "fallback",
      model: GROQ_MODEL,
      rawResponse: "",
      usage: undefined,
    });
  }

  const cleanedOCRText = cleanOCRText(rawOCRText);

  const trimmedOCRText = cleanedOCRText.slice(
    0,
    MAX_OCR_CHARS_FOR_AI,
  );

  const compactMetrics = {
    ...extractImportantMetricsFromOCR(trimmedOCRText),
    ...toCompactMetrics(metrics),
  };

  const payload = {
    metrics: compactMetrics,
    userProfile: userProfile ?? null,
    ocrExcerpt: hasEnoughCompactMetrics(compactMetrics)
      ? undefined
      : trimmedOCRText,
  };

  const prompt = `
Analyze this InBody report:

${JSON.stringify(payload)}
`;

  logger.info(
    {
      payloadSize: prompt.length,
      selectedModel: GROQ_MODEL,
    },
    "Prepared Groq payload",
  );

  try {
    const result = await requestGroqAnalysis(
      prompt,
      GROQ_MODEL,
    );

    return withAiDebug(result.analysis, {
      source: "groq",
      model: GROQ_MODEL,
      rawResponse: result.rawResponse,
      usage: result.usage,
    });
  } catch (err: any) {
    logger.warn(
      { err: err.message },
      "Primary model failed",
    );
  }

  try {
    const result = await requestGroqAnalysis(
      prompt,
      FALLBACK_GROQ_MODEL,
    );

    return withAiDebug(result.analysis, {
      source: "groq",
      model: FALLBACK_GROQ_MODEL,
      rawResponse: result.rawResponse,
      usage: result.usage,
    });
  } catch (err: any) {
    logger.error(
      { err: err.message },
      "Fallback model failed",
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
    .map((line) =>
      line.replace(/[ \t]+/g, " ").trim(),
    )
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

function toCompactMetrics(
  metrics: Record<string, string | undefined>,
): CompactInBodyMetrics {
  return {
    weight: metrics.weight,
    bmi: metrics.bmi,
    bodyFat: metrics.bodyFat,
    skeletalMuscle: metrics.skeletalMuscleMass,
    bmr: metrics.bmr,
    visceralFat: metrics.visceralFat,
    metabolicAge: metrics.metabolicAge,
  };
}

function extractImportantMetricsFromOCR(
  text: string,
): CompactInBodyMetrics {
  return {
    weight: firstMatch(text, [
      /weight\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),

    bmi: firstMatch(text, [
      /\bbmi\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),

    bodyFat: firstMatch(text, [
      /\bpbf\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /body\s*fat.*?(\d+(?:\.\d+)?)/i,
    ]),

    skeletalMuscle: firstMatch(text, [
      /\bsmm\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),

    bmr: firstMatch(text, [
      /\bbmr\s*[:\-]?\s*(\d+)/i,
    ]),

    visceralFat: firstMatch(text, [
      /visceral\s*fat.*?(\d+)/i,
    ]),

    metabolicAge: firstMatch(text, [
      /metabolic\s*age.*?(\d+)/i,
    ]),
  };
}

function firstMatch(
  text: string,
  patterns: RegExp[],
): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function hasEnoughCompactMetrics(
  metrics: CompactInBodyMetrics,
): boolean {
  return (
    Object.values(metrics).filter(Boolean).length >= 3
  );
}

async function requestGroqAnalysis(
  prompt: string,
  model: string,
): Promise<{
  analysis: GeminiAnalysis;
  rawResponse: string;
  usage: unknown;
}> {
  if (!groq) {
    throw new Error("Groq client missing");
  }

  const message =
    await groq.chat.completions.create({
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

      temperature: 0.3,

      max_tokens: MAX_AI_OUTPUT_TOKENS,

      response_format: {
        type: "json_object",
      },
    });

  const rawText =
    message.choices[0]?.message?.content ?? "";

  if (LOG_GROQ_RAW_RESPONSE) {
    logger.info(
      {
        rawText,
        usage: message.usage,
      },
      "Groq raw response",
    );
  }

  if (!rawText) {
    throw new Error("Empty AI response");
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Invalid JSON response");
  }

  const parsed =
    JSON.parse(jsonMatch[0]) as GeminiAnalysis;

  parsed.metabolismInsights.bmr =
    extractNumber(
      parsed.metabolismInsights.bmr,
    );

  parsed.metabolismInsights.metabolicAge =
    extractNumber(
      parsed.metabolismInsights.metabolicAge,
    );

  parsed.visceralFatAnalysis.level =
    extractNumber(
      parsed.visceralFatAnalysis.level,
    );

  return {
    analysis: parsed,
    rawResponse: rawText,
    usage: message.usage,
  };
}

function extractNumber(value: string): string {
  const match = value?.match(/\d+(\.\d+)?/);

  return match?.[0] ?? "";
}

function withAiDebug(
  analysis: GeminiAnalysis,
  debug: {
    source: "groq" | "fallback";
    model: string;
    rawResponse: string;
    usage: unknown;
  },
): GeminiAnalysis {
  return {
    ...analysis,
    __aiSource: debug.source,
    __aiModel: debug.model,
    __aiRawResponse: debug.rawResponse,
    __aiUsage: debug.usage,
  };
}

function getDemoAnalysis(
  metrics: Record<string, string | undefined>,
): GeminiAnalysis {
  const weight = parseFloat(
    metrics.weight ?? "64",
  );

  const bodyFat = parseFloat(
    metrics.bodyFat ?? "15",
  );

  const bmi = parseFloat(metrics.bmi ?? "22");

  const smm = parseFloat(
    metrics.skeletalMuscleMass ?? "30",
  );

  const bmr = parseInt(
    metrics.bmr ?? "1700",
    10,
  );

  const visceralFat = parseInt(
    metrics.visceralFat ?? "7",
    10,
  );

  const metabolicAge =
    metrics.metabolicAge ?? "24";

  return {
    overallSummary:
      bodyFat < 18
        ? "Lean physique with healthy body composition."
        : "Body composition can improve with fat reduction.",

    fitnessLevel:
      bodyFat < 15
        ? "Advanced"
        : bodyFat < 22
        ? "Intermediate"
        : "Beginner",

    bodyFatAnalysis: {
      status:
        bodyFat < 15
          ? "Low"
          : bodyFat < 22
          ? "Normal"
          : "High",

      description:
        bodyFat < 15
          ? "You have a low body fat percentage."
          : "Body fat is within acceptable range.",

      recommendation:
        bodyFat < 15
          ? "Increase muscle mass through strength training."
          : "Maintain current nutrition and training.",
    },

    muscleMassAnalysis: {
      status:
        smm > 34
          ? "High"
          : smm > 28
          ? "Average"
          : "Low",

      description:
        smm > 28
          ? "Muscle mass is decent."
          : "Muscle mass can improve.",

      recommendation:
        "Train with progressive overload 4x weekly.",
    },

    metabolismInsights: {
      bmr: String(bmr),

      metabolicAge: String(metabolicAge),

      description:
        "Metabolism is stable and healthy.",
    },

    visceralFatAnalysis: {
      level: String(visceralFat),

      risk:
        visceralFat <= 9
          ? "Low"
          : visceralFat <= 12
          ? "Moderate"
          : "High",

      recommendation:
        "Maintain cardio and active lifestyle.",
    },

    strengths: [
      "Low body fat percentage",
      "Healthy BMI",
      "Good metabolic health",
    ],

    weaknesses: [
      smm < 30
        ? "Low muscle mass"
        : "Could improve muscle definition",
    ],

    healthRisks: [
      bmi > 25
        ? "Elevated BMI"
        : "No major risks detected",
    ],

    recommendations: [
      "Strength train 4x weekly",
      "Track body composition monthly",
      "Maintain high protein intake",
      "Sleep 7-8 hours daily",
    ],

    workoutPlan: {
      goal:
        bodyFat > 20
          ? "Fat Loss"
          : "Lean Muscle Gain",

      planType:
        bodyFat > 20
          ? "Recomposition"
          : "Hypertrophy",

      weeklySchedule: [
        {
          day: "Monday",
          focus: "Push Workout",
          duration: "60 min",
          exercises: [
            "Bench Press",
            "Shoulder Press",
            "Tricep Pushdown",
          ],
        },

        {
          day: "Wednesday",
          focus: "Pull Workout",
          duration: "60 min",
          exercises: [
            "Pull Ups",
            "Barbell Rows",
            "Bicep Curls",
          ],
        },

        {
          day: "Friday",
          focus: "Leg Workout",
          duration: "70 min",
          exercises: [
            "Squats",
            "Leg Press",
            "Romanian Deadlift",
          ],
        },
      ],

      cardioRecommendation:
        "2-3 cardio sessions weekly.",
    },

    goalSuggestions: [
      "Build lean muscle mass",
      "Improve overall strength",
      "Maintain healthy body fat",
    ],
  };
}