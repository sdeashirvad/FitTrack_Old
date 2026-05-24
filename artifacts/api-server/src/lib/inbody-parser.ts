/**
 * InBody OCR Parser Utilities
 * ----------------------------
 * Parses raw OCR text from InBody / body composition reports and extracts
 * structured metrics using regex patterns.  All values are returned as
 * strings so the caller / client can decide how to format / validate them.
 *
 * Handles noisy OCR output: spaces within numbers, InBody-specific layout,
 * mixed case, abbreviations, and various report formats.
 */

export interface ExtractedInBodyMetrics {
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

// ─── Helper ───────────────────────────────────────────────────────────────────
function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const raw = (m[1] ?? m[0]).trim();
      // Collapse internal spaces within a number: "40. 0" → "40.0"
      const val = raw.replace(/(\d)\s+(\d)/g, "$1$2").replace(/(\d)\s*\.\s*(\d)/g, "$1.$2");
      if (val && val !== "" && /\d/.test(val)) return val;
    }
  }
  return undefined;
}

// ─── Normalise raw OCR text ───────────────────────────────────────────────────
export function normalizeOCRText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\s{2,}/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .toLowerCase();
}

// ─── Extract individual metrics ───────────────────────────────────────────────
export function extractMetrics(rawText: string): ExtractedInBodyMetrics {
  const t = normalizeOCRText(rawText);

  const metrics: ExtractedInBodyMetrics = {};

  // Weight (kg)
  // Handle: "weight 45.4", "weight: 72.5 kg", "body weight 80.0", bare number near "kg"
  metrics.weight = firstMatch(t, [
    /(?:body\s*)?weight[\s:]+(\d[\d\s]*\.?\s*\d*)\s*kg/i,
    /\bwt[\s.:]+(\d[\d\s]*\.?\s*\d*)\s*kg/i,
    /weight[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /(\d{2,3}[\s]*\.[\s]*\d)\s*kg/i,
    /(\d{2,3})\s*kg/i,
  ]);

  // BMI
  metrics.bmi = firstMatch(t, [
    /\bbmi[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /body\s*mass\s*index[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
  ]);

  // Body Fat %
  // InBody label is "PBF" (percent body fat) or "Body Fat Mass" / "Body Fat %"
  metrics.bodyFat = firstMatch(t, [
    /\bpbf[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /body\s*fat\s*(?:percentage|percent|%|mass)?[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /fat\s*(?:percentage|percent|%|mass)?[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /fat\s*%[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
  ]);

  // Skeletal Muscle Mass
  metrics.skeletalMuscleMass = firstMatch(t, [
    /skeletal\s*muscle\s*mass[\s:]+(\d[\d\s]*\.?\s*\d*)\s*kg/i,
    /\bsmm[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /muscle\s*mass[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /skeletal\s*muscle[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
  ]);

  // Lean Body Mass
  metrics.leanBodyMass = firstMatch(t, [
    /lean\s*body\s*mass[\s:]+(\d[\d\s]*\.?\s*\d*)\s*kg/i,
    /fat[\s-]free\s*mass[\s:]+(\d[\d\s]*\.?\s*\d*)\s*kg/i,
    /\bffm[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /lean\s*mass[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
  ]);

  // Protein
  metrics.protein = firstMatch(t, [
    /protein[\s:]+(\d[\d\s]*\.?\s*\d*)\s*kg/i,
    /protein[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
  ]);

  // Body Water / Total Body Water
  metrics.bodyWater = firstMatch(t, [
    /(?:total\s*)?body\s*water[\s:]+(\d[\d\s]*\.?\s*\d*)\s*(?:l|kg|liter)/i,
    /\btbw[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /water[\s:]+(\d[\d\s]*\.?\s*\d*)\s*(?:l|kg)/i,
  ]);

  // Basal Metabolic Rate (BMR)
  // Handle: "BMR 1720", "Basal Metabolic Rate: 1720 kcal", "BMR: 1 7 2 0"
  metrics.bmr = firstMatch(t, [
    /\bbmr[\s:]+(\d[\d\s]{2,4})\s*(?:kcal|kj)?/i,
    /basal\s*metabolic\s*rate[\s:]+(\d[\d\s]{2,4})\s*(?:kcal|kj)?/i,
    /basal\s*metabolism[\s:]+(\d[\d\s]{2,4})/i,
  ]);

  // Visceral Fat
  metrics.visceralFat = firstMatch(t, [
    /visceral\s*fat[\s:]+(?:level\s*)?(\d[\d\s]*\.?\s*\d*)/i,
    /visceral\s*fat\s*(?:level|rating|area)[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
  ]);

  // Metabolic Age
  metrics.metabolicAge = firstMatch(t, [
    /metabolic\s*age[\s:]+(\d{1,3})/i,
    /metabolism\s*age[\s:]+(\d{1,3})/i,
  ]);

  // Waist-Hip Ratio (WHR)
  metrics.waistHipRatio = firstMatch(t, [
    /waist[\s-]hip\s*ratio[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /\bwhr[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
    /waist\s*to\s*hip[\s:]+(\d[\d\s]*\.?\s*\d*)/i,
  ]);

  // Remove undefined keys
  return Object.fromEntries(
    Object.entries(metrics).filter(([, v]) => v !== undefined),
  ) as ExtractedInBodyMetrics;
}

// ─── Quality check ────────────────────────────────────────────────────────────
/**
 * Returns true when enough fields were extracted to be considered a valid scan.
 * Threshold: at least 2 recognised metrics (lowered because InBody OCR can be noisy).
 */
export function isValidExtraction(metrics: ExtractedInBodyMetrics): boolean {
  return Object.values(metrics).filter(Boolean).length >= 2;
}
