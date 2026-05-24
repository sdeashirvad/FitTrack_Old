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
    if (value < 15) return { label: "Low", color: colors.yellow };
    if (value < 22) return { label: "Optimal", color: colors.green };
    if (value < 28) return { label: "High", color: colors.orange };
    return { label: "Very High", color: colors.red };
  }
  if (metric === "bmi") {
    if (value < 18.5) return { label: "Under", color: colors.yellow };
    if (value < 25) return { label: "Normal", color: colors.green };
    if (value < 30) return { label: "Over", color: colors.orange };
    return { label: "Obese", color: colors.red };
  }
  if (metric === "visceralFat") {
    if (value <= 9) return { label: "Normal", color: colors.green };
    if (value <= 14) return { label: "High", color: colors.orange };
    return { label: "Very High", color: colors.red };
  }
  return { label: "Normal", color: colors.cyan };
};
