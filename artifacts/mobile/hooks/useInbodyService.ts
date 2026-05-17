/**
 * InBody API Service
 * ------------------
 * Reusable service that calls the backend InBody endpoints.
 * Mirrors the requestJson pattern from AuthContext.
 */

import Constants from "expo-constants";
import { Platform } from "react-native";

// ─── Resolve API base URL (same logic as AuthContext) ─────────────────────────
function resolveApiHost() {
  const hostUri =
    typeof Constants.manifest?.debuggerHost === "string"
      ? Constants.manifest.debuggerHost
      : typeof Constants.expoConfig?.hostUri === "string"
      ? Constants.expoConfig.hostUri
      : null;

  if (hostUri) {
    const host = hostUri.includes("//")
      ? hostUri.split("//")[1].split(":")[0]
      : hostUri.split(":")[0];
    return Platform.OS === "android"
      ? host === "localhost" ? "10.0.2.2" : host
      : host;
  }
  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
}

function getApiBaseUrl() {
  return `http://${resolveApiHost()}:5000`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface InBodyMetrics {
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

export interface UploadResponse {
  success: boolean;
  reportId: string;
  extractedMetrics: InBodyMetrics;
  extractedText: string;
}

export interface InBodyReport {
  id: string;
  reportUrl: string;
  fileType: string;
  fileName?: string;
  status: "pending" | "processing" | "done" | "failed";
  extractedMetrics?: InBodyMetrics;
  createdAt: string;
}

export interface UploadProgress {
  step: "uploading" | "ocr" | "processing" | "done";
  percent: number;
}

// ─── Upload a file (multipart/form-data) ─────────────────────────────────────
export async function uploadInbodyReport(
  uri: string,
  mimeType: string,
  fileName: string,
  token: string,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResponse> {
  const url = `${getApiBaseUrl()}/api/inbody/upload`;

  onProgress?.({ step: "uploading", percent: 20 });

  const formData = new FormData();
  // React Native FormData accepts { uri, type, name }
  formData.append("report", {
    uri,
    type: mimeType,
    name: fileName,
  } as any);

  onProgress?.({ step: "uploading", percent: 50 });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — let fetch set multipart boundary automatically
    },
    body: formData,
  });

  onProgress?.({ step: "ocr", percent: 70 });

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { success: false, error: text };
  }

  onProgress?.({ step: "processing", percent: 90 });

  if (!response.ok) {
    const msg =
      typeof body === "object" && body !== null
        ? (body as { error?: string }).error ?? "Upload failed"
        : "Upload failed";
    throw new Error(msg);
  }

  onProgress?.({ step: "done", percent: 100 });

  return body as UploadResponse;
}

// ─── List user's reports ──────────────────────────────────────────────────────
export async function listInbodyReports(token: string): Promise<InBodyReport[]> {
  const url = `${getApiBaseUrl()}/api/inbody/reports`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch reports");
  const data = await res.json() as { success: boolean; reports: InBodyReport[] };
  return data.reports;
}

// ─── Get a single report ──────────────────────────────────────────────────────
export async function getInbodyReport(id: string, token: string): Promise<InBodyReport> {
  const url = `${getApiBaseUrl()}/api/inbody/reports/${id}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch report");
  const data = await res.json() as { success: boolean; report: InBodyReport };
  return data.report;
}
