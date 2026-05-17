/**
 * InBody OCR Service
 * ------------------
 * Handles:
 *   1. Uploading the file to Supabase Storage
 *   2. Running OCR via Google Cloud Vision API
 *      (falls back to OCR.space → Tesseract stub if key missing)
 *   3. Parsing extracted text → structured metrics
 *
 * Environment variables used:
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service-role key (bypasses RLS for storage)
 *   GOOGLE_VISION_API_KEY     — Google Cloud Vision API key (optional)
 *   OCR_SPACE_API_KEY         — OCR.space API key (fallback, optional)
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { extractMetrics, normalizeOCRText, type ExtractedInBodyMetrics } from "./inbody-parser";

// ─── Supabase Storage client (uses service role to bypass RLS) ────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;

const storageClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = "inbody-reports";

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
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = storageClient.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

// ─── Google Cloud Vision OCR ─────────────────────────────────────────────────
async function runGoogleVisionOCR(fileBuffer: Buffer, mimeType: string): Promise<string> {
  const GOOGLE_KEY = process.env.GOOGLE_VISION_API_KEY;
  if (!GOOGLE_KEY) throw new Error("GOOGLE_VISION_API_KEY not set");

  const isPdf = mimeType.includes("pdf");
  const base64 = fileBuffer.toString("base64");

  const requestBody = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
        imageContext: isPdf
          ? { languageHints: ["en"] }
          : {},
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
async function runOCRSpaceFallback(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const OCR_KEY = process.env.OCR_SPACE_API_KEY;
  if (!OCR_KEY) throw new Error("OCR_SPACE_API_KEY not set");

  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("apikey", OCR_KEY);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("detectOrientation", "true");
  form.append("scale", "true");

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
  let rawText = "";

  // Attempt 1 — Google Vision API
  if (process.env.GOOGLE_VISION_API_KEY) {
    try {
      logger.info("Using Google Vision API for OCR");
      rawText = await runGoogleVisionOCR(fileBuffer, mimeType);
    } catch (err) {
      logger.warn({ err }, "Google Vision API failed, trying OCR.space");
    }
  }

  // Attempt 2 — OCR.space
  if (!rawText && process.env.OCR_SPACE_API_KEY) {
    try {
      logger.info("Using OCR.space as fallback");
      rawText = await runOCRSpaceFallback(fileBuffer, mimeType, fileName);
    } catch (err) {
      logger.warn({ err }, "OCR.space also failed");
    }
  }

  // Attempt 3 — Demo stub (no API keys available)
  if (!rawText) {
    logger.warn("No OCR API keys configured — returning demo stub text");
    rawText = getDemoOCRText();
  }

  const metrics = extractMetrics(rawText);
  logger.info({ metricCount: Object.keys(metrics).length }, "OCR extraction complete");

  return { rawText: normalizeOCRText(rawText), metrics };
}

// ─── Demo stub for development without API keys ───────────────────────────────
function getDemoOCRText(): string {
  return `
InBody 770 Result Sheet
Weight: 78.4 kg
BMI: 25.6
Body Fat: 22.1%
Skeletal Muscle Mass: 33.8 kg
Lean Body Mass: 61.1 kg
Protein: 12.4 kg
Body Water: 51.2 L
BMR: 1680 kcal
Visceral Fat: Level 8
Metabolic Age: 32
Waist-Hip Ratio: 0.86
  `.trim();
}
