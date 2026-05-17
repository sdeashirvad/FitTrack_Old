/**
 * InBody OCR Parser Utilities
 * ----------------------------
 * Parses raw OCR text from InBody / body composition reports and extracts
 * structured metrics using regex patterns.  All values are returned as
 * strings so the caller / client can decide how to format / validate them.
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
      const val = (m[1] ?? m[0]).trim();
      if (val && val !== "") return val;
    }
  }
  return undefined;
}

// ─── Normalise raw OCR text ───────────────────────────────────────────────────
export function normalizeOCRText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")       // Windows line endings
    .replace(/\s{2,}/g, " ")      // Collapse multiple spaces
    .replace(/[^\x20-\x7E\n]/g, " ") // Strip non-printable except newline
    .toLowerCase();
}

// ─── Extract individual metrics ───────────────────────────────────────────────
export function extractMetrics(rawText: string): ExtractedInBodyMetrics {
  const t = normalizeOCRText(rawText);

  const metrics: ExtractedInBodyMetrics = {};

  // Weight (kg / lbs)
  metrics.weight = firstMatch(t, [
    /weight[\s:]+(\d+\.?\d*)\s*kg/i,
    /body\s*weight[\s:]+(\d+\.?\d*)\s*kg/i,
    /wt[\s.:]+(\d+\.?\d*)\s*kg/i,
    /(\d{2,3}\.?\d*)\s*kg/i,            // fallback bare value
  ]);

  // BMI
  metrics.bmi = firstMatch(t, [
    /bmi[\s:]+(\d+\.?\d*)/i,
    /body\s*mass\s*index[\s:]+(\d+\.?\d*)/i,
  ]);

  // Body Fat %
  metrics.bodyFat = firstMatch(t, [
    /body\s*fat\s*(?:percentage|percent|%|mass)?[\s:]+(\d+\.?\d*)\s*%?/i,
    /fat\s*(?:mass|%)?[\s:]+(\d+\.?\d*)\s*%?/i,
    /pbf[\s:]+(\d+\.?\d*)/i,             // InBody abbreviation
  ]);

  // Skeletal Muscle Mass
  metrics.skeletalMuscleMass = firstMatch(t, [
    /skeletal\s*muscle\s*mass[\s:]+(\d+\.?\d*)\s*kg/i,
    /smm[\s:]+(\d+\.?\d*)\s*kg/i,
    /muscle\s*mass[\s:]+(\d+\.?\d*)\s*kg/i,
  ]);

  // Lean Body Mass
  metrics.leanBodyMass = firstMatch(t, [
    /lean\s*body\s*mass[\s:]+(\d+\.?\d*)\s*kg/i,
    /fat[\s-]free\s*mass[\s:]+(\d+\.?\d*)\s*kg/i,
    /ffm[\s:]+(\d+\.?\d*)\s*kg/i,
  ]);

  // Protein
  metrics.protein = firstMatch(t, [
    /protein[\s:]+(\d+\.?\d*)\s*kg/i,
    /protein\s*level[\s:]+(\d+\.?\d*)/i,
  ]);

  // Body Water / Total Body Water
  metrics.bodyWater = firstMatch(t, [
    /(?:total\s*)?body\s*water[\s:]+(\d+\.?\d*)\s*(?:l|kg|liter)/i,
    /tbw[\s:]+(\d+\.?\d*)\s*(?:l|kg)?/i,
    /water[\s:]+(\d+\.?\d*)\s*(?:l|kg)/i,
  ]);

  // Basal Metabolic Rate (BMR)
  metrics.bmr = firstMatch(t, [
    /b(?:asal)?\s*m(?:etabolic)?\s*r(?:ate)?[\s:]+(\d{3,4})\s*(?:kcal|kj)?/i,
    /bmr[\s:]+(\d{3,4})\s*(?:kcal)?/i,
    /basal\s*metabolism[\s:]+(\d{3,4})/i,
  ]);

  // Visceral Fat
  metrics.visceralFat = firstMatch(t, [
    /visceral\s*fat[\s:]+(?:level\s*)?(\d+\.?\d*)/i,
    /visceral\s*fat\s*(?:level|rating|area)[\s:]+(\d+\.?\d*)/i,
  ]);

  // Metabolic Age
  metrics.metabolicAge = firstMatch(t, [
    /metabolic\s*age[\s:]+(\d+)/i,
    /metabolism\s*age[\s:]+(\d+)/i,
  ]);

  // Waist-Hip Ratio (WHR)
  metrics.waistHipRatio = firstMatch(t, [
    /waist[\s-]hip\s*ratio[\s:]+(\d+\.?\d*)/i,
    /whr[\s:]+(\d+\.?\d*)/i,
    /waist\s*to\s*hip[\s:]+(\d+\.?\d*)/i,
  ]);

  // Remove undefined keys
  return Object.fromEntries(
    Object.entries(metrics).filter(([, v]) => v !== undefined),
  ) as ExtractedInBodyMetrics;
}

// ─── Quality check ────────────────────────────────────────────────────────────
/**
 * Returns true when enough fields were extracted to be considered a valid scan.
 * Threshold: at least 3 recognised metrics.
 */
export function isValidExtraction(metrics: ExtractedInBodyMetrics): boolean {
  return Object.values(metrics).filter(Boolean).length >= 3;
}
