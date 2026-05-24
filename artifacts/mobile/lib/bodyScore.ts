import type { ThemeTokens } from "@/constants/colors";

export interface BodyScoreStyle {
  color: string;
  trackColor: string;
  label: string;
  range: string;
}

export function formatScoreLegend(style: BodyScoreStyle): string {
  return `${style.label} · ${style.range}`;
}

/** Maps a 0–100 body score to ring/badge colors and a short tier label. */
export function getBodyScoreStyle(score: number, colors: ThemeTokens): BodyScoreStyle {
  const s = Math.min(Math.max(Math.round(score), 0), 100);

  if (s >= 80) {
    return { color: colors.green, trackColor: colors.green + "22", label: "Excellent", range: "80–100" };
  }
  if (s >= 65) {
    return { color: colors.cyan, trackColor: colors.cyan + "22", label: "Good", range: "65–79" };
  }
  if (s >= 50) {
    return { color: colors.yellow, trackColor: colors.yellow + "22", label: "Fair", range: "50–64" };
  }
  if (s >= 35) {
    return { color: colors.orange, trackColor: colors.orange + "22", label: "Needs work", range: "35–49" };
  }
  return { color: colors.red, trackColor: colors.red + "22", label: "Poor", range: "0–34" };
}
