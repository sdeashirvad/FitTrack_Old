import type { GeminiAnalysis } from "./types";

export type ColorPalette = {
  yellow: string;
  green: string;
  orange: string;
  red: string;
  cyan: string;
};

export const parseGeminiAnalysis = (value: unknown): GeminiAnalysis | null => {
  if (!value) return null;
  if (typeof value === "object") return value as GeminiAnalysis;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GeminiAnalysis;
    } catch (err) {
      console.warn("Failed to parse Gemini analysis string", err);
      return null;
    }
  }
  return null;
};

export const getRating = (metric: string, value: number, colors: ColorPalette) => {
  if (metric === "bodyFat") {
    if (value < 10) return { label: "Very Low", color: colors.yellow };
    if (value < 15) return { label: "Low", color: colors.yellow };
    if (value < 22) return { label: "Optimal", color: colors.green };
    if (value < 28) return { label: "High", color: colors.orange };
    if (value < 35) return { label: "Very High", color: colors.red };
    return { label: "Severely High", color: colors.red };
  }
  if (metric === "bmi") {
    if (value < 18.5) return { label: "Under", color: colors.yellow };
    if (value < 25) return { label: "Normal", color: colors.green };
    if (value < 30) return { label: "Over", color: colors.orange };
    if (value < 35) return { label: "Obese", color: colors.red };
    return { label: "Severely Obese", color: colors.red };
  }
  if (metric === "visceralFat") {
    if (value <= 9) return { label: "Normal", color: colors.green };
    if (value <= 14) return { label: "High", color: colors.orange };
    return { label: "Very High", color: colors.red };
  }
  if (metric === "waistHipRatio") {
    if (value < 0.9) return { label: "Normal", color: colors.green };
    if (value < 1.0) return { label: "Moderate", color: colors.orange };
    return { label: "High Risk", color: colors.red };
  }
  if (metric === "obesityDegree") {
    if (value < 90) return { label: "Under", color: colors.yellow };
    if (value <= 110) return { label: "Normal", color: colors.green };
    if (value <= 130) return { label: "Overweight", color: colors.orange };
    return { label: "Obese", color: colors.red };
  }
  return { label: "Normal", color: colors.cyan };
};

export function safeNum(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function formatControl(v: string | undefined): string {
  if (!v) return "--";
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (n === 0) return "0.0 kg";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)} kg`;
}
