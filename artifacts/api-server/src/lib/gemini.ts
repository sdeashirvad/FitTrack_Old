/**
 * Gemini AI Service for InBody Analysis
 * --------------------------------------
 * Sends extracted body composition metrics to Google's Gemini AI
 * for intelligent analysis, recommendations, and plan generation.
 *
 * Environment variable: GEMINI_API_KEY
 */

import { logger } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

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
}

const SYSTEM_PROMPT = `You are an expert fitness analyst and body composition specialist.
Analyze the provided InBody/body composition report data and generate a comprehensive, personalized fitness analysis.

You MUST respond with valid JSON only — no markdown, no code blocks, no explanatory text.
The JSON structure must be exactly:
{
  "overallSummary": "A 2-3 sentence executive summary of the person's body composition status",
  "fitnessLevel": "Beginner/Intermediate/Advanced/Elite",
  "bodyFatAnalysis": {
    "status": "Low/Normal/High/Very High",
    "description": "Detailed analysis of body fat percentage",
    "recommendation": "Specific actionable advice"
  },
  "muscleMassAnalysis": {
    "status": "Low/Average/Above Average/High",
    "description": "Analysis of skeletal muscle mass relative to body weight",
    "recommendation": "Specific advice for muscle development"
  },
  "metabolismInsights": {
    "bmr": "Interpretation of basal metabolic rate",
    "metabolicAge": "Interpretation of metabolic age vs actual age",
    "description": "Overall metabolic health assessment"
  },
  "visceralFatAnalysis": {
    "level": "Normal/Borderline/High",
    "risk": "Low/Moderate/High",
    "recommendation": "Specific advice for visceral fat management"
  },
  "strengths": ["List 3-4 body composition strengths"],
  "weaknesses": ["List 3-4 areas needing improvement"],
  "healthRisks": ["List any health risk factors identified"],
  "recommendations": ["List 5-6 specific, actionable recommendations"],
  "workoutPlan": {
    "goal": "Primary fitness goal based on analysis",
    "planType": "e.g. Fat Loss, Muscle Gain, Recomposition, Maintenance",
    "weeklySchedule": [
      {"day": "Mon", "focus": "Upper Body Push", "duration": "50 min", "exercises": ["Bench Press 4x8", "OHP 3x10", "Tricep Dips 3x12"]},
      {"day": "Tue", "focus": "Cardio", "duration": "30 min"},
      {"day": "Wed", "focus": "Lower Body", "duration": "55 min", "exercises": ["Squats 4x8", "Romanian Deadlift 3x10", "Leg Press 3x12"]},
      {"day": "Thu", "focus": "Rest"},
      {"day": "Fri", "focus": "Upper Body Pull", "duration": "50 min", "exercises": ["Deadlift 4x5", "Pull-ups 3x8", "Barbell Row 3x10"]},
      {"day": "Sat", "focus": "Cardio + Core", "duration": "35 min"},
      {"day": "Sun", "focus": "Rest"}
    ],
    "cardioRecommendation": "Specific cardio advice"
  },
  "dietPlan": {
    "calorieTarget": 1850,
    "deficit": -350,
    "protein": 145,
    "carbs": 185,
    "fat": 58,
    "waterLiters": 3.2,
    "meals": ["Breakfast: specific meal", "Lunch: specific meal", "Snack: specific meal", "Dinner: specific meal"],
    "supplements": ["Whey Protein", "Creatine", "Vitamin D"]
  },
  "goalSuggestions": ["Primary goal", "Secondary goal", "Long-term goal"]
}

Make all recommendations specific to the person's metrics. Use Indian food examples for diet plans. Be precise with numbers.`;

export async function analyzeWithGemini(
  metrics: Record<string, string | undefined>,
  userProfile?: { age?: number; gender?: string; height?: string; fitnessGoal?: string },
): Promise<GeminiAnalysis> {
  if (!GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not set — returning demo analysis");
    return getDemoAnalysis(metrics);
  }

  const metricsText = Object.entries(metrics)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const profileText = userProfile
    ? `\nUser Profile:\nAge: ${userProfile.age ?? "unknown"}\nGender: ${userProfile.gender ?? "unknown"}\nHeight: ${userProfile.height ?? "unknown"}\nGoal: ${userProfile.fitnessGoal ?? "unknown"}`
    : "";

  const prompt = `Analyze this InBody/body composition report:\n\n${metricsText}${profileText}`;

  try {
    logger.info("Calling Gemini AI for InBody analysis");

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
      }>;
    };

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in Gemini response");
    }

    const analysis = JSON.parse(jsonMatch[0]) as GeminiAnalysis;
    logger.info("Gemini AI analysis complete");

    return analysis;
  } catch (err: any) {
    logger.error({ err: err.message }, "Gemini AI analysis failed — returning demo");
    return getDemoAnalysis(metrics);
  }
}

function getDemoAnalysis(metrics: Record<string, string | undefined>): GeminiAnalysis {
  const weight = parseFloat(metrics.weight ?? "78");
  const bodyFat = parseFloat(metrics.bodyFat ?? "22");
  const bmi = parseFloat(metrics.bmi ?? "25");
  const smm = parseFloat(metrics.skeletalMuscleMass ?? "33");
  const bmr = parseInt(metrics.bmr ?? "1680");
  const visceralFat = parseInt(metrics.visceralFat ?? "8");

  const fatStatus = bodyFat < 15 ? "Low" : bodyFat < 25 ? "Normal" : "High";
  const muscleStatus = smm > 35 ? "Above Average" : smm > 30 ? "Average" : "Low";
  const visceralStatus = visceralFat <= 9 ? "Normal" : "High";

  return {
    overallSummary: `Your body composition shows a ${fatStatus.toLowerCase()} body fat percentage (${bodyFat}%) with ${muscleStatus.toLowerCase()} muscle mass (${smm} kg). ${bmi > 25 ? "BMI indicates slight overweight, but this may be due to higher muscle mass." : "BMI is within healthy range."} Focus on ${bodyFat > 20 ? "fat loss while preserving muscle" : "building lean muscle mass"}.`,
    fitnessLevel: bodyFat < 15 && smm > 34 ? "Advanced" : bodyFat < 25 ? "Intermediate" : "Beginner",
    bodyFatAnalysis: {
      status: fatStatus,
      description: `Your body fat percentage of ${bodyFat}% is ${fatStatus.toLowerCase()} for ${bodyFat > 20 ? "males" : "the general population"}. ${bodyFat > 20 ? "Ideal range for males is 10-20%." : "You're within the healthy range."}`,
      recommendation: bodyFat > 20 ? "Aim for a moderate caloric deficit of 300-400 kcal/day to reduce body fat while preserving muscle mass." : "Maintain current body composition through consistent training and nutrition.",
    },
    muscleMassAnalysis: {
      status: muscleStatus,
      description: `Skeletal muscle mass of ${smm} kg is ${muscleStatus.toLowerCase()} relative to your body weight. ${smm > 33 ? "Good foundation for strength training." : "Room for improvement through progressive overload."}`,
      recommendation: "Focus on compound lifts (squat, bench, deadlift) with progressive overload. Aim for 1.6-2g protein per kg body weight daily.",
    },
    metabolismInsights: {
      bmr: `Your BMR of ${bmr} kcal means you burn approximately ${bmr} calories at rest. On active days, total expenditure is around ${Math.round(bmr * 1.55)} kcal.`,
      metabolicAge: `Based on your BMR and body composition, your metabolic age is in the ${bmr > 1700 ? "young" : "average"} range.`,
      description: `${bmr > 1600 ? "Healthy metabolic rate." : "Metabolism could be improved through increased muscle mass and activity level."} Building more muscle will naturally increase your BMR.`,
    },
    visceralFatAnalysis: {
      level: visceralStatus,
      risk: visceralFat <= 9 ? "Low" : visceralFat <= 12 ? "Moderate" : "High",
      recommendation: visceralFat > 9 ? "Reduce refined carbohydrates, increase fiber intake, and add 30 minutes of cardio 3-4x per week." : "Maintain current lifestyle. Continue monitoring visceral fat levels.",
    },
    strengths: [
      `${muscleStatus} skeletal muscle mass provides a good metabolic foundation`,
      `${fatStatus} body fat percentage is ${fatStatus === "Normal" ? "within healthy range" : "manageable"}`,
      `BMR of ${bmr} kcal supports ${bmr > 1600 ? "active" : "moderate"} lifestyle`,
      "Good potential for body recomposition with proper training and nutrition",
    ],
    weaknesses: [
      bodyFat > 20 ? "Body fat above ideal range — needs focused reduction" : "Body fat could be further optimized",
      smm < 34 ? "Skeletal muscle mass has room for improvement" : "Maintain and continue building muscle",
      visceralFat > 9 ? "Visceral fat slightly elevated — lifestyle changes needed" : "Continue monitoring visceral fat",
      "Overall fitness can be enhanced with structured training",
    ],
    healthRisks: [
      bmi > 25 ? "Elevated BMI — monitor cardiovascular health" : "BMI within acceptable range",
      bodyFat > 25 ? "Higher body fat increases risk of metabolic syndrome" : "Low metabolic risk profile",
      visceralFat > 12 ? "Elevated visceral fat — increased health risk" : "Visceral fat within safe limits",
    ],
    recommendations: [
      `Target ${bodyFat > 20 ? "fat loss" : "muscle gain"} with a ${bodyFat > 20 ? "300-400 kcal daily deficit" : "200-300 kcal surplus"}`,
      `Consume ${Math.round(weight * 1.8)}g protein daily to ${bodyFat > 20 ? "preserve muscle during fat loss" : "support muscle growth"}`,
      "Perform resistance training 4-5x per week focusing on compound movements",
      `Add ${bodyFat > 20 ? "2-3 cardio sessions (30 min LISS or 20 min HIIT)" : "1-2 light cardio sessions"} per week`,
      "Drink 3-3.5L water daily and ensure 7-8 hours of quality sleep",
      "Consider a DEXA scan every 3 months to track body composition changes",
    ],
    workoutPlan: {
      goal: bodyFat > 20 ? "Fat Loss + Muscle Preservation" : "Muscle Building + Strength",
      planType: bodyFat > 20 ? "Moderate Cut" : "Lean Bulk",
      weeklySchedule: [
        { day: "Mon", focus: "Upper Body Push", duration: "50 min", exercises: ["Bench Press 4x8", "Overhead Press 3x10", "Incline DB Press 3x12", "Tricep Dips 3x12"] },
        { day: "Tue", focus: "Cardio LISS", duration: "30 min" },
        { day: "Wed", focus: "Lower Body", duration: "55 min", exercises: ["Squats 4x8", "Romanian Deadlift 3x10", "Leg Press 3x12", "Calf Raises 4x15"] },
        { day: "Thu", focus: "Rest / Active Recovery", duration: "—" },
        { day: "Fri", focus: "Upper Body Pull", duration: "50 min", exercises: ["Deadlift 4x5", "Pull-ups 3x8", "Barbell Row 3x10", "Bicep Curls 3x12"] },
        { day: "Sat", focus: "Cardio HIIT + Core", duration: "30 min" },
        { day: "Sun", focus: "Rest", duration: "—" },
      ],
      cardioRecommendation: bodyFat > 20
        ? "2-3 sessions per week: 30 min LISS (walking, cycling) or 20 min HIIT (sprint intervals). Do cardio after weights or on separate days."
        : "1-2 light cardio sessions to maintain cardiovascular health. Focus more on resistance training.",
    },
    dietPlan: {
      calorieTarget: bodyFat > 20 ? Math.round(bmr * 1.2) : Math.round(bmr * 1.45),
      deficit: bodyFat > 20 ? -350 : 200,
      protein: Math.round(weight * 1.8),
      carbs: bodyFat > 20 ? Math.round(weight * 2.2) : Math.round(weight * 3),
      fat: Math.round(weight * 0.7),
      waterLiters: 3.2,
      meals: [
        "Breakfast: 3 egg whites + 1 whole egg omelette with oats and banana (400 kcal)",
        "Lunch: Grilled chicken breast (200g) + brown rice (1 cup) + dal + salad (550 kcal)",
        "Snack: Whey protein shake (1 scoop) + handful of almonds + 1 fruit (250 kcal)",
        "Dinner: Paneer tikka (150g) + mixed vegetables + 2 roti (450 kcal)",
      ],
      supplements: ["Whey Protein (post-workout)", "Creatine Monohydrate (5g/day)", "Vitamin D3 (2000 IU)", "Omega-3 Fish Oil (1000mg)"],
    },
    goalSuggestions: [
      bodyFat > 20 ? "Reduce body fat to 18% within 3 months" : "Build lean muscle to reach 35kg SMM",
      "Improve cardiovascular endurance — run 5km under 25 min",
      "Achieve consistent 4x/week training for 12 consecutive weeks",
    ],
  };
}
