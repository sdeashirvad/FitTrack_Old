/**
 * InBody OCR Service
 * ------------------
 * Extraction pipeline (in priority order):
 *   1. Groq Vision AI  — directly reads InBody report image (most accurate)
 *   2. Google Cloud Vision — full text OCR → regex parsing
 *   3. OCR.space — fallback text OCR → regex parsing
 *   4. Demo stub — development fallback
 *
 * Environment variables used:
 *   GROQ_API_KEY              — Used for vision extraction (reuses text-AI key)
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service-role key (bypasses RLS for storage)
 *   GOOGLE_VISION_API_KEY     — Google Cloud Vision API key (optional)
 *   OCR_SPACE_API_KEY         — OCR.space API key (fallback, optional)
 */

import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import {
  extractMetrics,
  normalizeOCRText,
  type ExtractedInBodyMetrics,
} from "./inbody-parser";

// ─── Supabase Storage client ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;

const storageClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = "inbody-reports";
const STORAGE_SETUP_HINT =
  "Run `pnpm --filter @workspace/api-server run setup-storage` or create the Supabase Storage bucket `inbody-reports`.";

// ─── Upload to Supabase Storage ───────────────────────────────────────────────
export async function uploadToStorage(
  fileBuffer: Buffer,
  mimeType: string,
  userId: string,
  fileName: string,
): Promise<string> {
  const ext = mimeType.includes("pdf") ? "pdf" : mimeType.split("/")[1] ?? "jpg";
  const storagePath = `${userId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

  const { error } = await storageClient.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    logger.error({ error: error.message }, "Supabase Storage upload failed");
    if (error.message.toLowerCase().includes("bucket not found")) {
      throw new Error(`Storage bucket '${BUCKET}' was not found. ${STORAGE_SETUP_HINT}`);
    }
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = storageClient.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

// ─── Groq Vision Extraction ────────────────────────────────────────────────────
// Uses the same GROQ_API_KEY already configured for text AI.
// Sends the InBody image directly to a vision model which understands the
// two-column report layout that confuses text-based OCR engines.
async function runGroqVisionExtraction(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<{ metrics: ExtractedInBodyMetrics; rawText: string }> {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY not set");
  if (mimeType.includes("pdf")) throw new Error("PDF not supported by Groq vision — falling through to text OCR");

  const groq = new Groq({ apiKey: GROQ_KEY });
  const base64 = fileBuffer.toString("base64");

  const VISION_PROMPT = `This is an InBody body composition report. Extract EVERY numeric metric you can read.

CRITICAL RULES:
- "weight" = total body weight in kg (the large number, e.g. 109.6 kg)
- "bodyFat" = PBF percent body fat (e.g. 41.5), NOT body fat mass in kg
- "visceralFat" = visceral fat LEVEL number (e.g. 22)
- "bmr" = Basal Metabolic Rate in kcal (e.g. 1756)
- "inbodyScore" = the score out of 100 (e.g. 49)
- All values must be numeric strings (e.g. "109.6") or null if not found
- Do NOT confuse body fat mass (kg) with percent body fat (%)

Return ONLY valid JSON — no markdown, no explanation:
{
  "weight": null,
  "height": null,
  "age": null,
  "gender": null,
  "bmi": null,
  "bodyFat": null,
  "skeletalMuscleMass": null,
  "leanBodyMass": null,
  "protein": null,
  "bodyWater": null,
  "bmr": null,
  "visceralFat": null,
  "metabolicAge": null,
  "waistHipRatio": null,
  "inbodyScore": null
}`;

  // Try primary vision model, fall back to secondary
  const VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.2-90b-vision-preview",
    "llama-3.2-11b-vision-preview",
  ];

  let content = "";
  for (const model of VISION_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              { type: "text", text: VISION_PROMPT },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });
      content = response.choices[0]?.message?.content ?? "";
      if (content) {
        logger.info({ model }, "Groq vision model succeeded");
        break;
      }
    } catch (err: any) {
      logger.warn({ err: err.message, model }, "Groq vision model failed, trying next");
    }
  }

  if (!content) throw new Error("All Groq vision models failed");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON returned from Groq vision model");

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, string | null>;

  const toStr = (v: string | null | undefined): string | undefined => {
    if (!v || v === "null" || v === "N/A" || v === "n/a") return undefined;
    const cleaned = String(v).replace(/[^\d.]/g, "");
    return cleaned && /^\d/.test(cleaned) ? cleaned : undefined;
  };

  const metrics: ExtractedInBodyMetrics = {
    weight: toStr(parsed.weight),
    bmi: toStr(parsed.bmi),
    bodyFat: toStr(parsed.bodyFat),
    skeletalMuscleMass: toStr(parsed.skeletalMuscleMass),
    leanBodyMass: toStr(parsed.leanBodyMass),
    protein: toStr(parsed.protein),
    bodyWater: toStr(parsed.bodyWater),
    bmr: toStr(parsed.bmr),
    visceralFat: toStr(parsed.visceralFat),
    metabolicAge: toStr(parsed.metabolicAge),
    waistHipRatio: toStr(parsed.waistHipRatio),
    inbodyScore: toStr(parsed.inbodyScore),
    height: toStr(parsed.height),
    age: toStr(parsed.age),
    gender: parsed.gender && parsed.gender !== "null" ? parsed.gender : undefined,
  };

  // Remove undefined keys
  const cleanMetrics = Object.fromEntries(
    Object.entries(metrics).filter(([, v]) => v !== undefined),
  ) as ExtractedInBodyMetrics;

  // Build a clean synthetic text for AI context
  const labelMap: Record<string, string> = {
    weight: "Weight",
    height: "Height",
    age: "Age",
    gender: "Gender",
    bmi: "BMI",
    bodyFat: "Body Fat %",
    skeletalMuscleMass: "Skeletal Muscle Mass",
    leanBodyMass: "Lean Body Mass",
    protein: "Protein",
    bodyWater: "Body Water",
    bmr: "BMR",
    visceralFat: "Visceral Fat Level",
    metabolicAge: "Metabolic Age",
    waistHipRatio: "Waist-Hip Ratio",
    inbodyScore: "InBody Score",
  };

  const rawText = Object.entries(cleanMetrics)
    .map(([k, v]) => `${labelMap[k] ?? k}: ${v}`)
    .join("\n");

  logger.info(
    { metricCount: Object.keys(cleanMetrics).length, rawText },
    "Groq Vision extraction result",
  );

  return { metrics: cleanMetrics, rawText };
}

// ─── Google Cloud Vision OCR ──────────────────────────────────────────────────
async function runGoogleVisionOCR(fileBuffer: Buffer, mimeType: string): Promise<string> {
  const GOOGLE_KEY = process.env.GOOGLE_VISION_API_KEY;
  if (!GOOGLE_KEY) throw new Error("GOOGLE_VISION_API_KEY not set");

  const base64 = fileBuffer.toString("base64");

  const requestBody = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
        imageContext: mimeType.includes("pdf") ? { languageHints: ["en"] } : {},
      },
    ],
  };

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Vision API error (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    responses: Array<{ fullTextAnnotation?: { text: string }; error?: { message: string } }>;
  };

  const result = data.responses[0];
  if (result?.error) throw new Error(`Vision API: ${result.error.message}`);

  return result?.fullTextAnnotation?.text ?? "";
}

// ─── OCR.space fallback ───────────────────────────────────────────────────────
async function runOCRSpaceFallback(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const OCR_KEY = process.env.OCR_SPACE_API_KEY;
  if (!OCR_KEY) throw new Error("OCR_SPACE_API_KEY not set");

  const form = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("apikey", OCR_KEY);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("detectOrientation", "true");
  form.append("scale", "true");
  form.append("OCREngine", "2"); // Engine 2 handles complex layouts better

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`OCR.space API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    ParsedResults?: Array<{ ParsedText: string }>;
    IsErroredOnProcessing?: boolean;
    ErrorMessage?: string;
  };

  if (data.IsErroredOnProcessing) {
    throw new Error(`OCR.space processing error: ${data.ErrorMessage}`);
  }

  return data.ParsedResults?.map((r) => r.ParsedText).join("\n") ?? "";
}

// ─── Main OCR orchestrator ────────────────────────────────────────────────────
export async function runOCR(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ rawText: string; metrics: ExtractedInBodyMetrics }> {

  // ── Attempt 1: Groq Vision (images only) ─────────────────────────────────
  // Most accurate for InBody reports — understands the two-column layout
  if (!mimeType.includes("pdf") && process.env.GROQ_API_KEY) {
    try {
      logger.info("Attempting Groq Vision extraction");
      const result = await runGroqVisionExtraction(fileBuffer, mimeType);
      const metricCount = Object.keys(result.metrics).length;
      logger.info({ metricCount }, "Groq Vision extraction complete");

      // Accept if we got at least 4 core metrics
      if (metricCount >= 4) {
        return result;
      }
      logger.warn({ metricCount }, "Groq Vision returned too few metrics, falling through");
    } catch (err: any) {
      logger.warn({ err: err.message }, "Groq Vision failed, trying text OCR");
    }
  }

  // ── Attempt 2: Google Cloud Vision (text OCR) ─────────────────────────────
  let rawText = "";
  if (process.env.GOOGLE_VISION_API_KEY) {
    try {
      logger.info("Using Google Cloud Vision for text OCR");
      rawText = await runGoogleVisionOCR(fileBuffer, mimeType);
    } catch (err: any) {
      logger.warn({ err: err.message }, "Google Vision failed, trying OCR.space");
    }
  }

  // ── Attempt 3: OCR.space ──────────────────────────────────────────────────
  if (!rawText && process.env.OCR_SPACE_API_KEY) {
    try {
      logger.info("Using OCR.space as text OCR fallback");
      rawText = await runOCRSpaceFallback(fileBuffer, mimeType, fileName);
    } catch (err: any) {
      logger.warn({ err: err.message }, "OCR.space also failed");
    }
  }

  // ── Attempt 4: Demo stub ──────────────────────────────────────────────────
  if (!rawText) {
    logger.warn("No OCR method succeeded — using demo stub");
    rawText = getDemoOCRText();
  }

  const metrics = extractMetrics(rawText);
  logger.info({ metricCount: Object.keys(metrics).length }, "Text OCR extraction complete");

  return { rawText: normalizeOCRText(rawText), metrics };
}

// ─── Demo stub for development without API keys ───────────────────────────────
function getDemoOCRText(): string {
  return `
InBody 770 Result Sheet
Height: 175 cm  Age: 28  Gender: Male
Weight: 78.4 kg
BMI: 25.6
Percent Body Fat (PBF): 22.1
Skeletal Muscle Mass: 33.8 kg
Lean Body Mass: 61.1 kg
Protein: 12.4 kg
Body Water: 51.2 L
Basal Metabolic Rate (BMR): 1680 kcal
Visceral Fat Level: 8
Waist-Hip Ratio: 0.86
InBody Score: 72/100
  `.trim();
}
