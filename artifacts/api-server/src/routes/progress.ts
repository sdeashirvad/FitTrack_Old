import { Router } from "express";
import { requireAuth } from "../lib/auth";
import {
  getProgressDashboard,
  saveCheckin,
  getTodayCheckin,
  logWeight,
  getAIInsights,
  getFitnessScore,
  getRecentCheckins,
} from "./progress.controller";

const router = Router();

router.get("/api/progress/dashboard", requireAuth, getProgressDashboard);
router.post("/api/progress/checkin", requireAuth, saveCheckin);
router.get("/api/progress/checkin/today", requireAuth, getTodayCheckin);
router.get("/api/progress/checkins/recent", requireAuth, getRecentCheckins);
router.post("/api/progress/weight", requireAuth, logWeight);
router.get("/api/progress/ai-insights", requireAuth, getAIInsights);
router.get("/api/progress/fitness-score", requireAuth, getFitnessScore);

export default router;
