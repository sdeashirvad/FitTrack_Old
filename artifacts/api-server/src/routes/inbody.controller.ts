/**
 * InBody Controller
 * -----------------
 * Handles the full upload → OCR → Gemini AI → persist → respond pipeline.
 */

import type { Request, Response } from "express";
import { db, inbodyReports } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { uploadToStorage, runOCR } from "../lib/inbody-ocr";
import { isValidExtraction } from "../lib/inbody-parser";
import { analyzeWithGemini, type GeminiAnalysis } from "../lib/gemini";
import type { AuthenticatedRequest } from "../lib/auth";

// ─── POST /api/inbody/upload ──────────────────────────────────────────────────
export async function uploadInbodyReport(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth!.sub;

  // multer attaches the file here
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded. Send a multipart/form-data request with field name 'report'.",
    });
  }

  // ── Validate file type ───────────────────────────────────────────────────────
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    return res.status(415).json({
      success: false,
      error: `Unsupported file type: ${file.mimetype}. Please upload a PDF or image (JPG, PNG, WebP).`,
    });
  }

  // ── Insert "pending" record ──────────────────────────────────────────────────
  let reportId: string;
  try {
    const [row] = await db
      .insert(inbodyReports)
      .values({
        userId,
        reportUrl: "",           // filled after upload
        fileType: file.mimetype,
        fileName: file.originalname,
        status: "processing",
      })
      .returning({ id: inbodyReports.id });

    reportId = row.id;
  } catch (err) {
    logger.error({ err }, "Failed to create inbody_reports record");
    return res.status(500).json({ success: false, error: "Database error — could not create report record." });
  }

  // ── Upload to Supabase Storage ───────────────────────────────────────────────
  let reportUrl: string;
  try {
    reportUrl = await uploadToStorage(
      file.buffer,
      file.mimetype,
      userId,
      file.originalname,
    );
  } catch (err: any) {
    await db
      .update(inbodyReports)
      .set({ status: "failed", errorMessage: err.message, updatedAt: new Date() })
      .where(eq(inbodyReports.id, reportId));

    logger.error({ err, reportId }, "Storage upload failed");
    return res.status(502).json({ success: false, error: "File upload to storage failed. Please try again." });
  }

  // ── Run OCR ──────────────────────────────────────────────────────────────────
  let rawText: string;
  let extractedMetrics: Record<string, string>;
  try {
    const result = await runOCR(file.buffer, file.mimetype, file.originalname);
    rawText = result.rawText;
    extractedMetrics = result.metrics as Record<string, string>;
  } catch (err: any) {
    await db
      .update(inbodyReports)
      .set({
        reportUrl,
        status: "failed",
        errorMessage: `OCR failed: ${err.message}`,
        updatedAt: new Date(),
      })
      .where(eq(inbodyReports.id, reportId));

    logger.error({ err, reportId }, "OCR extraction failed");
    return res.status(502).json({ success: false, error: "OCR processing failed. Please try a clearer image." });
  }

  // ── Validate extraction ──────────────────────────────────────────────────────
  if (!isValidExtraction(extractedMetrics)) {
    logger.warn({ reportId, metricCount: Object.keys(extractedMetrics).length }, "Low-quality extraction");
  }

  // ── Run Gemini AI Analysis ───────────────────────────────────────────────────
  let geminiAnalysis: GeminiAnalysis | null = null;
  try {
    logger.info({ reportId }, "Starting Gemini AI analysis");
    geminiAnalysis = await analyzeWithGemini(extractedMetrics);
    logger.info({ reportId }, "Gemini AI analysis complete");
  } catch (err: any) {
    logger.warn({ err: err.message, reportId }, "Gemini analysis failed — continuing without it");
  }

  // ── Persist results ──────────────────────────────────────────────────────────
  try {
    await db
      .update(inbodyReports)
      .set({
        reportUrl,
        extractedText: rawText,
        extractedMetrics,
        status: "done",
        updatedAt: new Date(),
      })
      .where(eq(inbodyReports.id, reportId));
  } catch (err) {
    logger.error({ err, reportId }, "Failed to persist OCR results");
  }

  logger.info({ userId, reportId, hasGemini: !!geminiAnalysis }, "InBody report processed successfully");

  return res.status(201).json({
    success: true,
    reportId,
    extractedMetrics,
    extractedText: rawText,
    geminiAnalysis,
  });
}

// ─── POST /api/inbody/analyze/:reportId ───────────────────────────────────────
export async function analyzeInbodyReport(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth!.sub;
  const { reportId } = req.params;

  // Fetch the report
  const [report] = await db
    .select()
    .from(inbodyReports)
    .where(eq(inbodyReports.id, reportId))
    .limit(1);

  if (!report) {
    return res.status(404).json({ success: false, error: "Report not found." });
  }

  if (report.userId !== userId) {
    return res.status(403).json({ success: false, error: "Access denied." });
  }

  if (!report.extractedMetrics) {
    return res.status(400).json({ success: false, error: "No extracted metrics available. Upload a report first." });
  }

  const metrics = report.extractedMetrics as Record<string, string>;

  // Run Gemini analysis
  try {
    logger.info({ reportId, userId }, "Starting Gemini AI analysis");
    const analysis = await analyzeWithGemini(metrics);
    logger.info({ reportId }, "Gemini AI analysis complete");

    return res.json({
      success: true,
      reportId,
      analysis,
    });
  } catch (err: any) {
    logger.error({ err: err.message, reportId }, "Gemini analysis failed");
    return res.status(502).json({ success: false, error: "AI analysis failed. Please try again." });
  }
}

// ─── GET /api/inbody/reports ──────────────────────────────────────────────────
export async function listInbodyReports(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth!.sub;

  const reports = await db
    .select({
      id: inbodyReports.id,
      reportUrl: inbodyReports.reportUrl,
      fileType: inbodyReports.fileType,
      fileName: inbodyReports.fileName,
      status: inbodyReports.status,
      extractedMetrics: inbodyReports.extractedMetrics,
      createdAt: inbodyReports.createdAt,
    })
    .from(inbodyReports)
    .where(eq(inbodyReports.userId, userId))
    .orderBy(inbodyReports.createdAt);

  return res.json({ success: true, reports });
}

// ─── GET /api/inbody/reports/:id ─────────────────────────────────────────────
export async function getInbodyReport(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth!.sub;
  const { id } = req.params;

  const [report] = await db
    .select()
    .from(inbodyReports)
    .where(eq(inbodyReports.id, id))
    .limit(1);

  if (!report) {
    return res.status(404).json({ success: false, error: "Report not found." });
  }

  if (report.userId !== userId) {
    return res.status(403).json({ success: false, error: "Access denied." });
  }

  return res.json({ success: true, report });
}
