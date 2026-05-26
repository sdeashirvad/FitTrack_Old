import { GlassCard } from "@/components/ui/GlassCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  uploadInbodyReport,
  analyzeInbodyReport,
  getInbodyReport,
  type UploadProgress,
  type InBodyReport,
} from "@/hooks/useInbodyService";
import { useReports } from "@/hooks/useReports";
import ReportCard from "./components/ReportCard";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MetricBig from "./components/MetricBig";
import AnalysisSection from "./components/AnalysisSection";
import { parseGeminiAnalysis, getRating, safeNum, formatControl } from "./helpers";
import type { GeminiAnalysis, ExtractedMetrics, Phase, PlanType, SelectedFile } from "./types";

const DEMO_METRICS: ExtractedMetrics = {
  weight: "109.6",
  height: "180",
  age: "22",
  gender: "male",
  bmi: "33.8",
  bodyFat: "41.5",
  bodyFatMass: "45.4",
  skeletalMuscleMass: "36.2",
  leanBodyMass: "64.2",
  fatFreeMass: "64.2",
  softLeanMass: "60.3",
  protein: "12.6",
  mineral: "4.67",
  bodyWater: "46.9",
  bmr: "1756",
  visceralFat: "22",
  metabolicAge: "154",
  waistHipRatio: "1.14",
  obesityDegree: "154",
  recommendedCalorieIntake: "2966",
  targetWeight: "75.5",
  weightControl: "-34.1",
  fatControl: "-34.1",
  muscleControl: "0.0",
  smi: "8.5",
  inbodyScore: "49",
};

const DEMO_ANALYSIS: GeminiAnalysis = {
  overallSummary: "Body composition indicates significant health concerns with 41.5% body fat and visceral fat level 22/20. Priority is structured fat loss while preserving skeletal muscle mass of 36.2 kg. Metabolic age of 154 years signals urgent need for lifestyle intervention.",
  fitnessLevel: "Needs Attention",
  bodyFatAnalysis: {
    status: "Severely High",
    description: "At 41.5% body fat, you are in the severely obese range. This significantly elevates risk for cardiovascular disease, diabetes, and metabolic syndrome.",
    recommendation: "Combine a 600 kcal daily deficit with strength training 4x weekly and 150+ minutes of cardio per week.",
    idealRange: "Male: 10-20% | Female: 18-28%",
  },
  muscleMassAnalysis: {
    status: "Below Average",
    description: "Skeletal muscle mass of 36.2 kg needs improvement relative to body weight of 109.6 kg. Low muscle-to-fat ratio creates an unfavourable body composition.",
    recommendation: "Progressive resistance training with compound lifts (squats, deadlifts, rows) 4x weekly. Aim for 2g protein per kg body weight.",
    idealRange: "Male: 33-39 kg | Female: 21-27 kg",
  },
  metabolismInsights: {
    bmr: "1756",
    metabolicAge: "154",
    description: "BMR of 1756 kcal supports daily energy needs. Metabolic age of 154 yr is severely above actual age of 22, indicating critical metabolic dysfunction driven by excess body fat.",
    recommendation: "Build muscle mass to increase BMR. Every kg of muscle adds ~13 kcal/day to resting metabolism.",
  },
  visceralFatAnalysis: {
    level: "22",
    risk: "Very High",
    recommendation: "Visceral fat level 22 is critically high. Prioritise cardio (minimum 150 min/week), reduce sugar intake, and consider intermittent fasting to accelerate visceral fat reduction.",
    whrImplication: "WHR of 1.14 indicates severe central obesity with very high cardiovascular risk. Central fat distribution is the most dangerous type and a key driver of metabolic disease.",
  },
  bodyCompositionAnalysis: {
    hydrationStatus: "Within Range",
    proteinStatus: "Adequate",
    mineralStatus: "Within Range",
    description: "Total body water of 46.9L, protein 12.6 kg, and mineral 4.67 kg indicate adequate hydration and nutrient stores despite excess body fat of 45.4 kg.",
    recommendation: "Maintain hydration at 3+ litres/day. Increase dietary protein to 2g/kg to protect muscle during fat loss. Ensure adequate calcium and vitamin D for mineral density.",
  },
  obesityAnalysis: {
    bmiStatus: "Obese",
    pbfStatus: "Severely High",
    obesityDegreeInterpretation: "Obesity degree of 154% indicates body fat exceeds ideal by 54% — severe obesity classification.",
    riskLevel: "Very High",
    description: "BMI of 33.8 (Obese) combined with 41.5% body fat places you at very high risk for type 2 diabetes, hypertension, sleep apnea, and cardiovascular disease.",
    recommendation: "Target 0.5-1 kg weight loss per week through combined diet and exercise. Avoid crash diets which accelerate muscle loss.",
  },
  weightControlAnalysis: {
    targetWeight: "75.5",
    estimatedWeightToLose: "34.1",
    estimatedFatToLose: "34.1",
    timeline: "34-68 weeks at 0.5-1 kg/week",
    strategy: "Structured caloric deficit of 500-750 kcal/day combined with progressive resistance training to preserve lean mass while losing fat.",
  },
  metabolicHealthAnalysis: {
    description: "Metabolic profile shows severe dysfunction with BMR of 1756 kcal and metabolic age 132 years above chronological age. This indicates critical metabolic impairment driven by excess adipose tissue.",
    bmrInterpretation: "BMR of 1756 kcal is moderate for body weight. Building muscle will increase this figure, making long-term weight maintenance significantly easier.",
    metabolicAgeInterpretation: "Metabolic age of 154 yr vs actual age 22 suggests the body's internal systems are severely aged. Every 1 kg of fat lost and muscle gained will help reverse this rapidly.",
    recommendation: "Combine resistance training with adequate sleep (7-8 hours) and stress management to optimise hormone levels and metabolic function.",
  },
  recompositionGoals: {
    shortTerm: "4-8 weeks: Lose 4-8 kg fat, establish consistent training habit, reduce visceral fat from 22 toward 18",
    mediumTerm: "3-6 months: Reduce body fat to below 30%, reach approximately 90 kg, improve metabolic age by 50+ years",
    longTerm: "6-12 months: Reach target weight 75.5 kg, body fat below 20%, visceral fat below 10, metabolic age aligned with actual age",
  },
  strengths: [
    "Skeletal muscle mass of 36.2 kg provides metabolic foundation",
    "Body water 46.9L indicates adequate hydration",
    "Protein and mineral levels within acceptable range",
  ],
  weaknesses: [
    "Body fat at 41.5% — severely high classification",
    "Visceral fat level 22 — critically dangerous cardiovascular risk",
    "Metabolic age 154 yr — 132 years above chronological age",
    "BMI 33.8 — obese classification",
    "WHR 1.14 — severe central obesity",
  ],
  healthRisks: [
    "Very high risk of type 2 diabetes due to critical visceral fat",
    "High cardiovascular disease risk from central obesity and WHR 1.14",
    "Sleep apnea risk associated with severe BMI and visceral fat",
    "Metabolic syndrome — multiple risk factors present simultaneously",
    "Joint stress and mobility limitations from excess body weight",
  ],
  recommendations: [
    "Create 500-750 kcal daily deficit targeting 34.1 kg total fat loss",
    "Strength train 4x weekly with progressive overload to protect and build muscle",
    "150+ minutes moderate cardio per week (brisk walking, cycling, swimming)",
    "Consume 196-240g protein daily (2g/kg body weight)",
    "Reduce refined carbohydrates, sugar, and processed foods",
    "Monitor visceral fat with monthly InBody scans",
  ],
  workoutPlan: {
    goal: "Fat Loss + Muscle Preservation",
    planType: "Recomposition",
    weeklySchedule: [
      { day: "Monday", focus: "Lower Body Strength", duration: "60 min", exercises: ["Squats", "Leg Press", "Romanian Deadlift", "Calf Raises"] },
      { day: "Tuesday", focus: "Cardio — Moderate", duration: "45 min", exercises: ["Brisk Walk / Cycle", "Incline Treadmill"] },
      { day: "Wednesday", focus: "Upper Body Push", duration: "55 min", exercises: ["Chest Press", "Shoulder Press", "Tricep Extension", "Cable Flyes"] },
      { day: "Thursday", focus: "HIIT + Core", duration: "35 min", exercises: ["Burpees", "Mountain Climbers", "Planks", "Jump Rope"] },
      { day: "Friday", focus: "Upper Body Pull", duration: "55 min", exercises: ["Lat Pulldown", "Cable Row", "Face Pulls", "Bicep Curls"] },
      { day: "Saturday", focus: "Active Recovery", duration: "30 min", exercises: ["Yoga", "Light Walk", "Stretching"] },
      { day: "Sunday", focus: "Rest", duration: "—" },
    ],
    cardioRecommendation: "3x weekly: 2x moderate-intensity (40-45 min brisk walk/cycle) + 1x HIIT (25-30 min). Prioritise low-impact initially to protect joints.",
  },
  goalSuggestions: [
    "Reach target weight of 75.5 kg over 34-68 weeks",
    "Reduce body fat to below 20% through structured recomposition",
    "Lower visceral fat level to safe range (below 10)",
    "Improve metabolic age by 130+ years through fat loss and muscle gain",
    "Achieve BMI below 25 (Normal range)",
  ],
};

export default function InBodyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [phase, setPhase] = useState<Phase>("upload");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [metrics, setMetrics] = useState<ExtractedMetrics | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
  const [showSmartPopup, setShowSmartPopup] = useState(false);
  const [planType, setPlanType] = useState<PlanType>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const { reports, loading: reportsLoading, error: reportsError, refresh } = useReports(token);

  const pulseAnim = useSharedValue(1);
  const spinAnim = useSharedValue(0);

  useEffect(() => {
    if (phase === "analyzing") {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false
      );
      spinAnim.value = withRepeat(withTiming(1, { duration: 2000 }), -1, false);
    }
  }, [phase]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseAnim.value }] }));

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is needed to scan reports.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: `scan_${Date.now()}.jpg`, mimeType: "image/jpeg" });
      setPhase("preview");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.fileName ?? `image_${Date.now()}.jpg`, mimeType: asset.mimeType ?? "image/jpeg" });
      setPhase("preview");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: "application/pdf", size: asset.size });
      setPhase("preview");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setPhase("analyzing");
    setAnalyzeProgress(0);
    setError(null);

    if (!token) {
      setError("Authentication required. Please log in first.");
      setPhase("upload");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      console.log("📤 Starting InBody upload and analysis...");
      
      const response = await uploadInbodyReport(
        selectedFile.uri,
        selectedFile.mimeType,
        selectedFile.name,
        token,
        (progress) => {
          console.log(`⏳ Progress: ${progress.step} - ${progress.percent}%`);
          setUploadProgress(progress);
          setAnalyzeProgress(progress.percent);
        },
      );

      console.log("✅ Upload successful. Extracted metrics:", response.extractedMetrics);
      setMetrics(response.extractedMetrics as ExtractedMetrics);
      setCurrentReportId(response.reportId);

      const uploadedAnalysis = parseGeminiAnalysis(response.geminiAnalysis);
      if (uploadedAnalysis) {
        console.log("🤖 Gemini analysis received in upload response");
        setGeminiAnalysis(uploadedAnalysis);
      } else {
        console.log("⏳ No Gemini analysis in upload response. Fetching separately...");
        try {
          const analysisResult = await analyzeInbodyReport(response.reportId, token);
          const analysisData = parseGeminiAnalysis(analysisResult.analysis);

          if (analysisData) {
            console.log("🤖 Gemini analysis fetched from analyze endpoint");
            setGeminiAnalysis(analysisData);
          } else {
            console.warn("⚠️ Analyze endpoint returned no structured AI analysis", analysisResult);
          }
        } catch (analyzeErr: any) {
          console.error("❌ Gemini analysis failed:", analyzeErr?.message ?? analyzeErr);
          setError(`AI Analysis unavailable: ${analyzeErr?.message ?? "Unknown error"}. Showing extracted metrics only.`);
        }
      }

      setPhase("results");
      setTimeout(() => setShowSmartPopup(true), 600);
      refresh(); // Refresh reports list after successful upload
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("❌ InBody analysis failed:", err.message);
      setError(`Upload failed: ${err.message}. Please try again.`);
      setPhase("upload");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSelectPlan = (type: "trainer" | "ai") => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPlanType(type);
    setShowSmartPopup(false);
    setPhase("plan");
  };

  const handleOpenReport = useCallback(async (report: InBodyReport) => {
    if (!token) return;
    setLoadingReport(true);
    try {
      const full = await getInbodyReport(report.id, token);
      const m = full.extractedMetrics as ExtractedMetrics | undefined;
      setMetrics(m ?? null);
      const parsed = parseGeminiAnalysis(full.geminiAnalysis);
      setGeminiAnalysis(parsed);
      setCurrentReportId(full.id);
      setSelectedFile(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase("results");
      setTimeout(() => setShowSmartPopup(true), 600);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to load report. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  }, [token]);

  // Use the actual InBody score from the report if available; otherwise estimate
  const bodyScore = metrics
    ? metrics.inbodyScore
      ? Math.min(parseInt(metrics.inbodyScore, 10), 100)
      : Math.min(
          Math.round(
            (1 - Math.abs(parseFloat(metrics.bmi ?? "24") - 22) / 15) * 35 +
            (parseFloat(metrics.bodyFat ?? "20") < 22 ? 30 : 15) +
            (parseFloat(metrics.visceralFat ?? "8") <= 9 ? 20 : 8) +
            (parseFloat(metrics.skeletalMuscleMass ?? "30") > 30 ? 15 : 8)
          ),
          98
        )
    : 0;

  // Body fat: prefer OCR extracted value
  const rawBodyFat = metrics?.bodyFat;
  const displayBodyFat = rawBodyFat ?? "--";
  const displayBodyFatUnit = rawBodyFat ? "%" : "";

  // Muscle mass: prefer OCR extracted value
  const rawMuscleMass = metrics?.skeletalMuscleMass;
  const displayMuscleMass = rawMuscleMass ?? "--";
  const displayMuscleMassUnit = rawMuscleMass ? "kg" : "";

  // BMR: prefer OCR, then AI numeric value (already sanitized to digits only)
  const aiBmr = geminiAnalysis?.metabolismInsights?.bmr;
  const displayBmr =
    metrics?.bmr ||
    (aiBmr && /^\d+$/.test(aiBmr) ? aiBmr : null) ||
    "--";

  // Visceral fat: prefer OCR, then AI numeric level
  const aiVisceralLevel = geminiAnalysis?.visceralFatAnalysis?.level;
  const displayVisceralFat =
    metrics?.visceralFat ||
    (aiVisceralLevel && /^\d+(\.\d+)?$/.test(aiVisceralLevel) ? aiVisceralLevel : null) ||
    "--";

  // Metabolic age: prefer OCR, then AI numeric value
  const aiMetabolicAge = geminiAnalysis?.metabolismInsights?.metabolicAge;
  const displayMetabolicAge =
    metrics?.metabolicAge ||
    (aiMetabolicAge && /^\d+$/.test(aiMetabolicAge) ? aiMetabolicAge : null) ||
    "--";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.purple + "18", colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 50 },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => {
            if (phase === "results" || phase === "plan") {
              setPhase("upload");
              setSelectedFile(null);
              setMetrics(null);
              setGeminiAnalysis(null);
              setCurrentReportId(null);
            } else {
              router.back();
            }
          }}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[colors.typography.h2, { color: colors.foreground }]}>
            {phase === "results" ? "Your Results" : phase === "plan" ? "Your Plan" : "InBody Analysis"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ══ UPLOAD PHASE ══ */}
        {phase === "upload" && (
          <>
            <GlassCard style={styles.uploadHero}>
              <LinearGradient
                colors={[colors.purple + "28", colors.primary + "12"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.uploadIconCircle, { backgroundColor: colors.purple + "22", borderColor: colors.purple + "40" }]}>
                <Ionicons name="scan" size={44} color={colors.purple} />
              </View>
              <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
                Upload InBody Report
              </Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }]}>
                Our AI extracts your body composition metrics and generates a personalised fitness plan.
              </Text>
            </GlassCard>

            {error && (
              <GlassCard style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                <Text style={[colors.typography.body, { color: colors.destructive, flex: 1 }]}>{error}</Text>
              </GlassCard>
            )}

            <View style={styles.uploadOptions}>
              {[
                { method: "camera" as const, icon: "camera" as const, label: "Scan with Camera", sub: "Point at your printed report", color: colors.primary },
                { method: "gallery" as const, icon: "image" as const, label: "Upload Image", sub: "JPG, PNG from gallery", color: colors.purple },
                { method: "pdf" as const, icon: "document-text" as const, label: "Upload PDF", sub: "Digital InBody PDF report", color: "#06B6D4" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.method}
                  onPress={() => {
                    if (opt.method === "camera") handleCamera();
                    else if (opt.method === "gallery") handleGallery();
                    else handlePDF();
                  }}
                  activeOpacity={0.85}
                  style={[styles.uploadBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                >
                  <View style={[styles.uploadBtnIcon, { backgroundColor: opt.color + "18" }]}>
                    <Ionicons name={opt.icon} size={24} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{opt.label}</Text>
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{opt.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>

            <GlassCard style={styles.metricsPreview}>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>Metrics we'll extract</Text>
              <View style={styles.metricsGrid}>
                {["Weight", "Skeletal Muscle", "Body Fat %", "BMI", "Visceral Fat", "Body Water", "Protein", "BMR", "Metabolic Age"].map((m) => (
                  <View key={m} style={[styles.metricChip, { backgroundColor: colors.muted }]}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{m}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Demo button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedFile({ uri: "", name: "demo_report.jpg", mimeType: "image/jpeg" });
                setPhase("preview");
              }}
              activeOpacity={0.8}
              style={[styles.demoBtn, { borderColor: colors.border, borderRadius: colors.radiusSmall }]}
            >
              <Ionicons name="sparkles" size={16} color={colors.purple} />
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                Try with demo report
              </Text>
            </TouchableOpacity>

            {/* ── My Reports ─────────────────────────────────────────── */}
            <View style={styles.myReportsHeader}>
              <View style={styles.myReportsTitle}>
                <Ionicons name="time-outline" size={18} color={colors.foreground} />
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                  My Reports
                </Text>
                {reports.length > 0 && (
                  <View style={[styles.reportsCountBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[colors.typography.caption, { color: colors.primary }]}>
                      {reports.length}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => refresh()}
                disabled={reportsLoading}
                style={styles.refreshBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {reportsLoading
                  ? <ActivityIndicator size={14} color={colors.primary} />
                  : <Ionicons name="refresh-outline" size={18} color={colors.mutedForeground} />
                }
              </TouchableOpacity>
            </View>

            {/* Loading report overlay */}
            {loadingReport && (
              <GlassCard style={styles.loadingReportCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                  Loading report...
                </Text>
              </GlassCard>
            )}

            {/* Reports list */}
            {reportsLoading && reports.length === 0 ? (
              <View style={styles.reportsSkeletonWrap}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[styles.reportsSkeleton, { backgroundColor: colors.card, opacity: 0.5 + i * 0.15 }]}
                  />
                ))}
              </View>
            ) : reportsError ? (
              <GlassCard style={styles.reportsErrorCard}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.mutedForeground} />
                <Text style={[colors.typography.caption, { color: colors.mutedForeground, flex: 1 }]}>
                  {reportsError}
                </Text>
                <TouchableOpacity onPress={() => refresh()}>
                  <Text style={[colors.typography.caption, { color: colors.primary }]}>Retry</Text>
                </TouchableOpacity>
              </GlassCard>
            ) : reports.length === 0 ? (
              <GlassCard style={styles.reportsEmptyCard}>
                <Ionicons name="document-text-outline" size={32} color={colors.mutedForeground} />
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground, textAlign: "center" }]}>
                  No reports yet
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground, textAlign: "center" }]}>
                  Upload your first InBody report above to get started.
                </Text>
              </GlassCard>
            ) : (
              <View style={styles.reportsList}>
                {reports.map((r) => (
                  <ReportCard key={r.id} report={r} onPress={handleOpenReport} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ══ PREVIEW PHASE ══ */}
        {phase === "preview" && selectedFile && (
          <>
            <GlassCard style={styles.previewCard}>
              <LinearGradient
                colors={[colors.primary + "14", colors.purple + "08"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.previewIcon, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons
                  name={selectedFile.mimeType.includes("pdf") ? "document-text" : "image"}
                  size={44}
                  color={colors.primary}
                />
              </View>
              <Text style={[colors.typography.h3, { color: colors.foreground, textAlign: "center" }]}>
                {selectedFile.name || "Report ready"}
              </Text>
              {selectedFile.size ? (
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.mimeType}
                </Text>
              ) : (
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  Ready to analyse
                </Text>
              )}
            </GlassCard>

            <TouchableOpacity
              onPress={handleAnalyze}
              activeOpacity={0.87}
              style={[styles.analyzeBtn, { borderRadius: colors.radius, overflow: "hidden" }]}
            >
              <LinearGradient
                colors={[colors.purple, "#6D28D9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.analyzeBtnInner}
              >
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={[colors.typography.h3, { color: "#fff" }]}>Analyse with AI</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setSelectedFile(null); setPhase("upload"); }}
              style={styles.retakeBtn}
            >
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>Choose different file</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ══ ANALYZING PHASE ══ */}
        {phase === "analyzing" && (
          <View style={styles.analyzingWrap}>
            <Animated.View style={[styles.analyzeCircle, { borderColor: colors.purple + "60", backgroundColor: colors.purple + "10" }, pulseStyle]}>
              <Ionicons name="scan" size={60} color={colors.purple} />
            </Animated.View>
            <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
              Analysing your report...
            </Text>
            <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
              {uploadProgress?.step === "uploading" ? "Uploading file..." :
               uploadProgress?.step === "ocr" ? "Extracting text with OCR..." :
               uploadProgress?.step === "processing" ? "Gemini AI analysing body composition..." :
               "Processing with AI..."}
            </Text>

            <View style={[styles.analyzeTrack, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.analyzeFill, { width: `${analyzeProgress}%` as any, backgroundColor: colors.purple }]} />
            </View>
            <Text style={[colors.typography.h2, { color: colors.purple }]}>{analyzeProgress}%</Text>

            <View style={styles.stepsWrap}>
              {[
                { label: "Uploading report", done: analyzeProgress > 18 },
                { label: "Extracting metrics with OCR", done: analyzeProgress > 42 },
                { label: "Analysing with Gemini AI", done: analyzeProgress > 68 },
                { label: "Generating personalised plan", done: analyzeProgress >= 100 },
              ].map((step) => (
                <View key={step.label} style={styles.stepRow}>
                  <Ionicons
                    name={step.done ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={step.done ? colors.green : colors.mutedForeground}
                  />
                  <Text style={[colors.typography.body, { color: step.done ? colors.foreground : colors.mutedForeground }]}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ RESULTS PHASE ══ */}
        {phase === "results" && metrics && (
          <>
            {/* Header card with score */}
            <GlassCard style={styles.resultHeader} elevated shadowLevel="medium">
              <LinearGradient
                colors={[colors.purple + "25", colors.primary + "12"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.resultHeaderInner}>
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={styles.completeBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                    <Text style={[colors.typography.caption, { color: colors.green }]}>Analysis Complete</Text>
                  </View>
                  <Text style={[colors.typography.h2, { color: colors.foreground }]}>InBody Results</Text>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                    {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </Text>
                  {(metrics?.height || metrics?.age || metrics?.gender) && (
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                      {[
                        metrics.gender,
                        metrics.age ? `Age ${metrics.age}` : null,
                        metrics.height ? `${metrics.height} cm` : null,
                      ].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                  <View style={[styles.levelBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[colors.typography.label, { color: colors.primary }]}>
                      {geminiAnalysis?.fitnessLevel ?? "Intermediate"}
                    </Text>
                  </View>
                </View>
                <ProgressRing
                  size={110}
                  strokeWidth={10}
                  progress={bodyScore / 100}
                  color={colors.primary}
                  trackColor={colors.border}
                  label={`${bodyScore}`}
                  sublabel="score"
                />
              </View>
            </GlassCard>

            {/* Main metrics row */}
            <View style={styles.mainMetricsRow}>
              <MetricBig label="Weight" value={metrics.weight ?? "--"} unit="kg" color={colors.primary} />
              <MetricBig
                label="Body Fat"
                value={displayBodyFat}
                unit={displayBodyFatUnit}
                color={colors.purple}
                rating={metrics.bodyFat ? getRating("bodyFat", parseFloat(metrics.bodyFat), colors) : undefined}
              />
              <MetricBig
                label="BMI"
                value={metrics.bmi ?? "--"}
                unit=""
                color={colors.cyan}
                rating={metrics.bmi ? getRating("bmi", parseFloat(metrics.bmi), colors) : undefined}
              />
            </View>

            {/* Secondary metrics row 1 */}
            <View style={styles.secMetricsRow}>
              {[
                { label: "Muscle Mass", value: displayMuscleMass, unit: displayMuscleMassUnit, color: colors.green },
                { label: "BMR", value: displayBmr, unit: "kcal", color: colors.orange },
                { label: "Visceral Fat", value: displayVisceralFat, unit: "", color: colors.purple },
                { label: "Metabolic Age", value: displayMetabolicAge, unit: "yr", color: colors.cyan },
              ].map((m) => (
                <GlassCard key={m.label} style={styles.secMetricCard}>
                  <Text style={[colors.typography.h3, { color: m.color, fontSize: 18 }]}> 
                    {m.value ?? "--"}{m.unit}
                  </Text>
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground, textAlign: "center" }]}> 
                    {m.label}
                  </Text>
                </GlassCard>
              ))}
            </View>

            {/* Extended metrics row 2 — body composition detail */}
            {(metrics.bodyFatMass || metrics.fatFreeMass || metrics.waistHipRatio || metrics.bodyWater) && (
              <View style={styles.secMetricsRow}>
                {[
                  metrics.bodyFatMass ? { label: "Fat Mass", value: metrics.bodyFatMass, unit: "kg", color: colors.red } : null,
                  metrics.fatFreeMass ? { label: "Fat Free", value: metrics.fatFreeMass, unit: "kg", color: colors.green } : null,
                  metrics.waistHipRatio ? { label: "WHR", value: metrics.waistHipRatio, unit: "", color: colors.orange } : null,
                  metrics.bodyWater ? { label: "Body Water", value: metrics.bodyWater, unit: "L", color: colors.cyan } : null,
                ].filter(Boolean).slice(0, 4).map((m) => m && (
                  <GlassCard key={m.label} style={styles.secMetricCard}>
                    <Text style={[colors.typography.h3, { color: m.color, fontSize: 18 }]}>{m.value}{m.unit}</Text>
                    <Text style={[colors.typography.tiny, { color: colors.mutedForeground, textAlign: "center" }]}>{m.label}</Text>
                  </GlassCard>
                ))}
              </View>
            )}

            {/* Extended metrics row 3 — protein, mineral, recommended calories, obesity */}
            {(metrics.protein || metrics.mineral || metrics.recommendedCalorieIntake || metrics.obesityDegree) && (
              <View style={styles.secMetricsRow}>
                {[
                  metrics.protein ? { label: "Protein", value: metrics.protein, unit: "kg", color: colors.primary } : null,
                  metrics.mineral ? { label: "Mineral", value: metrics.mineral, unit: "kg", color: colors.cyan } : null,
                  metrics.recommendedCalorieIntake ? { label: "Rec. kcal", value: metrics.recommendedCalorieIntake, unit: "", color: colors.orange } : null,
                  metrics.obesityDegree ? { label: "Obesity °", value: metrics.obesityDegree, unit: "%", color: colors.red } : null,
                ].filter(Boolean).slice(0, 4).map((m) => m && (
                  <GlassCard key={m.label} style={styles.secMetricCard}>
                    <Text style={[colors.typography.h3, { color: m.color, fontSize: 16 }]}>{m.value}{m.unit}</Text>
                    <Text style={[colors.typography.tiny, { color: colors.mutedForeground, textAlign: "center" }]}>{m.label}</Text>
                  </GlassCard>
                ))}
              </View>
            )}

            {/* Weight Control row */}
            {(metrics.targetWeight || metrics.weightControl || metrics.fatControl) && (
              <GlassCard style={{ padding: 14, gap: 10, overflow: "hidden" }}>
                <View style={[styles.analysisHeader, { marginBottom: 4 }]}>
                  <View style={[styles.analysisIconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="trending-down" size={18} color={colors.primary} />
                  </View>
                  <Text style={[colors.typography.h3, { color: colors.foreground }]}>Weight Control Target</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {metrics.targetWeight && (
                    <View style={[styles.metaChipLarge, { backgroundColor: colors.primary + "14" }]}>
                      <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>TARGET WEIGHT</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.primary, fontWeight: "700" }]}>{metrics.targetWeight} kg</Text>
                    </View>
                  )}
                  {metrics.weightControl && (
                    <View style={[styles.metaChipLarge, { backgroundColor: colors.orange + "14" }]}>
                      <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>WEIGHT TO LOSE</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.orange, fontWeight: "700" }]}>{formatControl(metrics.weightControl)}</Text>
                    </View>
                  )}
                  {metrics.fatControl && (
                    <View style={[styles.metaChipLarge, { backgroundColor: colors.red + "12" }]}>
                      <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>FAT TO LOSE</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.red, fontWeight: "700" }]}>{formatControl(metrics.fatControl)}</Text>
                    </View>
                  )}
                  {metrics.muscleControl && (
                    <View style={[styles.metaChipLarge, { backgroundColor: colors.green + "12" }]}>
                      <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>MUSCLE GOAL</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.green, fontWeight: "700" }]}>{formatControl(metrics.muscleControl)}</Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            )}
            {/* AI Summary */}
            {geminiAnalysis && (
              <>
                <GlassCard style={styles.summaryCard}>
                  <LinearGradient
                    colors={[colors.primary + "14", colors.purple + "08"]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.summaryHeader}>
                    <View style={[styles.sparkleIcon, { backgroundColor: colors.purple + "20" }]}>
                      <Ionicons name="sparkles" size={16} color={colors.purple} />
                    </View>
                    <Text style={[colors.typography.h3, { color: colors.foreground }]}>
                      AI Assessment
                    </Text>
                  </View>
                  <Text style={[colors.typography.body, { color: colors.mutedForeground, lineHeight: 24 }]}>
                    {geminiAnalysis.overallSummary}
                  </Text>
                </GlassCard>

                <View style={styles.aiSourceRow}>
                  <View style={[styles.aiDebugBadge, { backgroundColor: geminiAnalysis.__aiSource === "groq" ? colors.green + "18" : colors.orange + "18" }]}>
                    <Text style={[colors.typography.label, { color: geminiAnalysis.__aiSource === "groq" ? colors.green : colors.orange, fontSize: 10 }]}>
                      {geminiAnalysis.__aiSource === "groq" ? "AI GENERATED" : "FALLBACK ANALYSIS"}
                    </Text>
                  </View>
                  {geminiAnalysis.__aiModel && (
                    <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
                      {geminiAnalysis.__aiModel}
                    </Text>
                  )}
                </View>

                {/* Strengths & Weaknesses */}
                <View style={styles.swRow}>
                  <GlassCard style={styles.swCard}>
                    <Text style={[colors.typography.label, { color: colors.green }]}>STRENGTHS</Text>
                    {geminiAnalysis.strengths.slice(0, 3).map((s, i) => (
                      <View key={i} style={styles.swItem}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                          {typeof s === "string" ? s : JSON.stringify(s)}
                        </Text>
                      </View>
                    ))}
                  </GlassCard>
                  <GlassCard style={styles.swCard}>
                    <Text style={[colors.typography.label, { color: colors.orange }]}>IMPROVE</Text>
                    {geminiAnalysis.weaknesses.slice(0, 3).map((w, i) => (
                      <View key={i} style={styles.swItem}>
                        <Ionicons name="alert-circle" size={14} color={colors.orange} />
                        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                          {typeof w === "string" ? w : JSON.stringify(w)}
                        </Text>
                      </View>
                    ))}
                  </GlassCard>
                </View>

                {/* Body Fat Analysis */}
                <AnalysisSection
                  icon="body"
                  iconColor={colors.purple}
                  title="Body Fat Analysis"
                  status={geminiAnalysis.bodyFatAnalysis.status}
                  statusColor={geminiAnalysis.bodyFatAnalysis.status === "Normal" || geminiAnalysis.bodyFatAnalysis.status === "Optimal" ? colors.green : colors.orange}
                  description={geminiAnalysis.bodyFatAnalysis.description}
                  recommendation={geminiAnalysis.bodyFatAnalysis.recommendation}
                />

                {/* Muscle Mass */}
                <AnalysisSection
                  icon="barbell"
                  iconColor={colors.primary}
                  title="Muscle Mass"
                  status={geminiAnalysis.muscleMassAnalysis.status}
                  statusColor={colors.green}
                  description={geminiAnalysis.muscleMassAnalysis.description}
                  recommendation={geminiAnalysis.muscleMassAnalysis.recommendation}
                />

                {/* Metabolism */}
                <GlassCard style={styles.analysisCard}>
                  <View style={styles.analysisHeader}>
                    <View style={[styles.analysisIconWrap, { backgroundColor: colors.cyan + "18" }]}>
                      <Ionicons name="flame" size={18} color={colors.cyan} />
                    </View>
                    <Text style={[colors.typography.h3, { color: colors.foreground }]}>Metabolism</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={[styles.metaChipLarge, { backgroundColor: colors.muted }]}>
                      <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>BMR</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                        {geminiAnalysis.metabolismInsights.bmr}
                      </Text>
                    </View>
                    <View style={[styles.metaChipLarge, { backgroundColor: colors.muted }]}>
                      <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>MET AGE</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                        {geminiAnalysis.metabolismInsights.metabolicAge}
                      </Text>
                    </View>
                  </View>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                    {geminiAnalysis.metabolismInsights.description}
                  </Text>
                </GlassCard>

                {/* Recommendations */}
                <GlassCard style={styles.recoCard}>
                  <View style={styles.analysisHeader}>
                    <View style={[styles.analysisIconWrap, { backgroundColor: colors.primary + "18" }]}>
                      <Ionicons name="sparkles" size={18} color={colors.primary} />
                    </View>
                    <Text style={[colors.typography.h3, { color: colors.foreground }]}>
                      Recommendations
                    </Text>
                  </View>
                  {geminiAnalysis.recommendations.map((r, i) => (
                    <View key={i} style={styles.recoRow}>
                      <View style={[styles.recoNum, { backgroundColor: colors.primary + "18" }]}>
                        <Text style={[colors.typography.tiny, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{i + 1}</Text>
                      </View>
                      <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1, lineHeight: 20 }]}>
                        {typeof r === "string" ? r : JSON.stringify(r)}
                      </Text>
                    </View>
                  ))}
                </GlassCard>

                {/* Body Composition Analysis */}
                {geminiAnalysis.bodyCompositionAnalysis && (
                  <GlassCard style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.cyan + "18" }]}>
                        <Ionicons name="water" size={18} color={colors.cyan} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground }]}>Body Composition</Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {[
                        { label: "HYDRATION", value: geminiAnalysis.bodyCompositionAnalysis.hydrationStatus },
                        { label: "PROTEIN", value: geminiAnalysis.bodyCompositionAnalysis.proteinStatus },
                        { label: "MINERAL", value: geminiAnalysis.bodyCompositionAnalysis.mineralStatus },
                      ].filter(m => m.value).map((m) => (
                        <View key={m.label} style={[styles.metaChipLarge, { backgroundColor: colors.muted }]}>
                          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>{m.label}</Text>
                          <Text style={[colors.typography.caption, { color: colors.foreground, fontWeight: "600" }]}>{m.value}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                      {geminiAnalysis.bodyCompositionAnalysis.description}
                    </Text>
                    <View style={[styles.recoBox, { backgroundColor: colors.cyan + "10", borderLeftColor: colors.cyan }]}>
                      <Ionicons name="bulb-outline" size={13} color={colors.cyan} />
                      <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                        {geminiAnalysis.bodyCompositionAnalysis.recommendation}
                      </Text>
                    </View>
                  </GlassCard>
                )}

                {/* Obesity Analysis */}
                {geminiAnalysis.obesityAnalysis && (
                  <GlassCard style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.red + "18" }]}>
                        <Ionicons name="warning" size={18} color={colors.red} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground, flex: 1 }]}>Obesity Analysis</Text>
                      <View style={[styles.statusBadge, { backgroundColor: geminiAnalysis.obesityAnalysis.riskLevel === "Very High" ? colors.red + "18" : geminiAnalysis.obesityAnalysis.riskLevel === "High" ? colors.orange + "18" : colors.green + "18" }]}>
                        <Text style={[colors.typography.label, { color: geminiAnalysis.obesityAnalysis.riskLevel === "Very High" ? colors.red : geminiAnalysis.obesityAnalysis.riskLevel === "High" ? colors.orange : colors.green, fontSize: 10 }]}>
                          {geminiAnalysis.obesityAnalysis.riskLevel} RISK
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {[
                        { label: "BMI STATUS", value: geminiAnalysis.obesityAnalysis.bmiStatus },
                        { label: "BODY FAT STATUS", value: geminiAnalysis.obesityAnalysis.pbfStatus },
                      ].filter(m => m.value).map((m) => (
                        <View key={m.label} style={[styles.metaChipLarge, { backgroundColor: colors.muted }]}>
                          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>{m.label}</Text>
                          <Text style={[colors.typography.caption, { color: colors.foreground, fontWeight: "600" }]}>{m.value}</Text>
                        </View>
                      ))}
                    </View>
                    {geminiAnalysis.obesityAnalysis.obesityDegreeInterpretation ? (
                      <Text style={[colors.typography.caption, { color: colors.mutedForeground, fontStyle: "italic" }]}>
                        {geminiAnalysis.obesityAnalysis.obesityDegreeInterpretation}
                      </Text>
                    ) : null}
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                      {geminiAnalysis.obesityAnalysis.description}
                    </Text>
                    <View style={[styles.recoBox, { backgroundColor: colors.orange + "10", borderLeftColor: colors.orange }]}>
                      <Ionicons name="bulb-outline" size={13} color={colors.orange} />
                      <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                        {geminiAnalysis.obesityAnalysis.recommendation}
                      </Text>
                    </View>
                  </GlassCard>
                )}

                {/* Weight Control (AI version with strategy) */}
                {geminiAnalysis.weightControlAnalysis && (
                  <GlassCard style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.primary + "18" }]}>
                        <Ionicons name="trending-down" size={18} color={colors.primary} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground }]}>Weight Control Plan</Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {geminiAnalysis.weightControlAnalysis.targetWeight ? (
                        <View style={[styles.metaChipLarge, { backgroundColor: colors.primary + "14" }]}>
                          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>TARGET</Text>
                          <Text style={[colors.typography.bodyMedium, { color: colors.primary, fontWeight: "700" }]}>{geminiAnalysis.weightControlAnalysis.targetWeight} kg</Text>
                        </View>
                      ) : null}
                      {geminiAnalysis.weightControlAnalysis.estimatedWeightToLose ? (
                        <View style={[styles.metaChipLarge, { backgroundColor: colors.orange + "14" }]}>
                          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>TO LOSE</Text>
                          <Text style={[colors.typography.bodyMedium, { color: colors.orange, fontWeight: "700" }]}>{geminiAnalysis.weightControlAnalysis.estimatedWeightToLose} kg</Text>
                        </View>
                      ) : null}
                      {geminiAnalysis.weightControlAnalysis.timeline ? (
                        <View style={[styles.metaChipLarge, { backgroundColor: colors.muted, flex: 1, minWidth: "100%" }]}>
                          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>TIMELINE</Text>
                          <Text style={[colors.typography.caption, { color: colors.foreground }]}>{geminiAnalysis.weightControlAnalysis.timeline}</Text>
                        </View>
                      ) : null}
                    </View>
                    {geminiAnalysis.weightControlAnalysis.strategy ? (
                      <Text style={[colors.typography.caption, { color: colors.mutedForeground, lineHeight: 20 }]}>
                        {geminiAnalysis.weightControlAnalysis.strategy}
                      </Text>
                    ) : null}
                  </GlassCard>
                )}

                {/* Metabolic Health Analysis */}
                {geminiAnalysis.metabolicHealthAnalysis && (
                  <GlassCard style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.orange + "18" }]}>
                        <Ionicons name="flame" size={18} color={colors.orange} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground }]}>Metabolic Health</Text>
                    </View>
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground, lineHeight: 20 }]}>
                      {geminiAnalysis.metabolicHealthAnalysis.description}
                    </Text>
                    <View style={{ gap: 8 }}>
                      {geminiAnalysis.metabolicHealthAnalysis.bmrInterpretation ? (
                        <View style={[styles.metaChipLarge, { backgroundColor: colors.muted }]}>
                          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>BMR INTERPRETATION</Text>
                          <Text style={[colors.typography.caption, { color: colors.foreground }]}>{geminiAnalysis.metabolicHealthAnalysis.bmrInterpretation}</Text>
                        </View>
                      ) : null}
                      {geminiAnalysis.metabolicHealthAnalysis.metabolicAgeInterpretation ? (
                        <View style={[styles.metaChipLarge, { backgroundColor: colors.muted }]}>
                          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>METABOLIC AGE</Text>
                          <Text style={[colors.typography.caption, { color: colors.foreground }]}>{geminiAnalysis.metabolicHealthAnalysis.metabolicAgeInterpretation}</Text>
                        </View>
                      ) : null}
                    </View>
                    {geminiAnalysis.metabolicHealthAnalysis.recommendation ? (
                      <View style={[styles.recoBox, { backgroundColor: colors.orange + "10", borderLeftColor: colors.orange }]}>
                        <Ionicons name="bulb-outline" size={13} color={colors.orange} />
                        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                          {geminiAnalysis.metabolicHealthAnalysis.recommendation}
                        </Text>
                      </View>
                    ) : null}
                  </GlassCard>
                )}

                {/* Recomposition Goals timeline */}
                {geminiAnalysis.recompositionGoals && (
                  <GlassCard style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.green + "18" }]}>
                        <Ionicons name="flag" size={18} color={colors.green} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground }]}>Recomposition Timeline</Text>
                    </View>
                    {[
                      { phase: "Short Term", icon: "flash" as const, color: colors.orange, value: geminiAnalysis.recompositionGoals.shortTerm },
                      { phase: "Mid Term", icon: "trending-up" as const, color: colors.primary, value: geminiAnalysis.recompositionGoals.mediumTerm },
                      { phase: "Long Term", icon: "trophy" as const, color: colors.green, value: geminiAnalysis.recompositionGoals.longTerm },
                    ].filter(p => p.value).map((p) => (
                      <View key={p.phase} style={[styles.recoBox, { backgroundColor: p.color + "10", borderLeftColor: p.color }]}>
                        <Ionicons name={p.icon} size={13} color={p.color} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[colors.typography.label, { color: p.color }]}>{p.phase.toUpperCase()}</Text>
                          <Text style={[colors.typography.caption, { color: colors.foreground, lineHeight: 20 }]}>{p.value}</Text>
                        </View>
                      </View>
                    ))}
                  </GlassCard>
                )}

                {/* Health Risks */}
                {geminiAnalysis.healthRisks && geminiAnalysis.healthRisks.length > 0 && (
                  <GlassCard style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.red + "18" }]}>
                        <Ionicons name="alert-circle" size={18} color={colors.red} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground }]}>Health Risks</Text>
                    </View>
                    {geminiAnalysis.healthRisks.map((risk, i) => (
                      <View key={i} style={styles.swItem}>
                        <Ionicons name="alert-circle" size={14} color={colors.red} />
                        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                          {typeof risk === "string" ? risk : JSON.stringify(risk)}
                        </Text>
                      </View>
                    ))}
                  </GlassCard>
                )}

                {/* Visceral Fat — WHR implications */}
                {geminiAnalysis.visceralFatAnalysis && (
                  <GlassCard style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.red + "18" }]}>
                        <Ionicons name="pulse" size={18} color={colors.red} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground, flex: 1 }]}>Visceral Fat</Text>
                      <View style={[styles.statusBadge, { backgroundColor: (geminiAnalysis.visceralFatAnalysis.risk === "High" || geminiAnalysis.visceralFatAnalysis.risk === "Very High") ? colors.red + "18" : colors.orange + "18" }]}>
                        <Text style={[colors.typography.label, { color: (geminiAnalysis.visceralFatAnalysis.risk === "High" || geminiAnalysis.visceralFatAnalysis.risk === "Very High") ? colors.red : colors.orange, fontSize: 10 }]}>
                          {geminiAnalysis.visceralFatAnalysis.risk}
                        </Text>
                      </View>
                    </View>
                    {geminiAnalysis.visceralFatAnalysis.whrImplication ? (
                      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                        {geminiAnalysis.visceralFatAnalysis.whrImplication}
                      </Text>
                    ) : null}
                    <View style={[styles.recoBox, { backgroundColor: colors.red + "10", borderLeftColor: colors.red }]}>
                      <Ionicons name="bulb-outline" size={13} color={colors.red} />
                      <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                        {geminiAnalysis.visceralFatAnalysis.recommendation}
                      </Text>
                    </View>
                  </GlassCard>
                )}
              </>
            )}

            {/* Get plan CTA */}
            <TouchableOpacity
              onPress={() => setShowSmartPopup(true)}
              activeOpacity={0.87}
              style={[styles.planCTA, { borderRadius: colors.radius, overflow: "hidden" }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.planCTAInner}
              >
                <Ionicons name="rocket" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={[colors.typography.h3, { color: "#fff" }]}>Get Your Plan</Text>
                  <Text style={[colors.typography.caption, { color: "#fff9" }]}>AI workout + diet + recovery</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#fff9" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ══ PLAN PHASE ══ */}
        {phase === "plan" && geminiAnalysis && (
          <>
            {planType === "ai" && (
              <>
                {/* Plan header */}
                <GlassCard style={styles.planHeader} elevated shadowLevel="medium">
                  <LinearGradient
                    colors={[colors.primary + "22", colors.primaryDark + "08"]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={[styles.planHeaderIcon, { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons name="rocket" size={32} color={colors.primary} />
                  </View>
                  <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
                    Your AI Plan
                  </Text>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground, textAlign: "center" }]}>
                    {geminiAnalysis.workoutPlan.goal}
                  </Text>
                </GlassCard>

                {/* Goal suggestions */}
                <GlassCard style={styles.goalsCard}>
                  <Text style={[colors.typography.label, { color: colors.primary }]}>YOUR GOALS</Text>
                  {geminiAnalysis.goalSuggestions.map((g, i) => (
                    <View key={i} style={styles.goalRow}>
                      <View style={[styles.goalDot, { backgroundColor: colors.primary }]} />
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground, flex: 1, fontSize: 14 }]}>
                        {typeof g === "string" ? g : JSON.stringify(g)}
                      </Text>
                    </View>
                  ))}
                </GlassCard>

                {/* Workout Plan */}
                <SectionHeader title="Weekly Workout Schedule" />
                {geminiAnalysis.workoutPlan.weeklySchedule.map((dayObj, i) => {
                  const day = typeof dayObj === 'string' 
                    ? { day: dayObj.includes(":") ? dayObj.split(":")[0] : `Day ${i + 1}`, focus: dayObj.includes(":") ? dayObj.split(":")[1].trim() : dayObj, duration: "--", exercises: [] } 
                    : dayObj;
                  const dayName = (day.day || `Day ${i + 1}`).slice(0, 3).toUpperCase();
                  return (
                  <GlassCard key={i} style={{ ...styles.dayCard, marginBottom: 8 }}>
                    <View style={[styles.dayBadge, { backgroundColor: day.focus?.includes("Rest") ? colors.muted : colors.primary + "18" }]}>
                      <Text style={[colors.typography.label, { color: day.focus?.includes("Rest") ? colors.mutedForeground : colors.primary, fontSize: 10 }]}>
                        {dayName}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{day.focus}</Text>
                      {Array.isArray(day.exercises) && day.exercises.length > 0 && (
                        <Text style={[colors.typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {day.exercises.join(" · ")}
                        </Text>
                      )}
                    </View>
                    {day.duration && day.duration !== "--" && (
                      <View style={[styles.durationBadge, { backgroundColor: colors.muted }]}>
                        <Ionicons name="time-outline" size={11} color={colors.mutedForeground} />
                        <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{day.duration}</Text>
                      </View>
                    )}
                  </GlassCard>
                )})}

                {/* Cardio recommendation */}
                {geminiAnalysis.workoutPlan.cardioRecommendation ? (
                  <GlassCard style={{ padding: 14, gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={[styles.analysisIconWrap, { backgroundColor: colors.cyan + "18" }]}>
                        <Ionicons name="pulse" size={16} color={colors.cyan} />
                      </View>
                      <Text style={[colors.typography.h3, { color: colors.foreground }]}>Cardio</Text>
                    </View>
                    <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                      {geminiAnalysis.workoutPlan.cardioRecommendation}
                    </Text>
                  </GlassCard>
                ) : null}
              </>
            )}

            {planType === "trainer" && (
              <GlassCard style={styles.trainerCard}>
                <LinearGradient
                  colors={[colors.purple + "22", colors.primary + "10"]}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={[styles.trainerIcon, { backgroundColor: colors.purple + "20" }]}>
                  <Ionicons name="person" size={40} color={colors.purple} />
                </View>
                <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
                  Connect with a Trainer
                </Text>
                <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", lineHeight: 24 }]}>
                  A certified trainer will review your InBody results and build a personalised plan for you.
                </Text>
                <TouchableOpacity
                  onPress={() => Alert.alert("Coming Soon", "Trainer marketplace launching soon!")}
                  style={[styles.trainerBtn, { backgroundColor: colors.purple, borderRadius: colors.radiusSmall }]}
                >
                  <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>Browse Trainers</Text>
                </TouchableOpacity>
              </GlassCard>
            )}

            <TouchableOpacity
              onPress={() => { setPhase("results"); setPlanType(null); }}
              style={styles.backToResults}
            >
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>← Back to results</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Smart popup — choose plan */}
      <Modal visible={showSmartPopup} transparent animationType="slide">
        <View style={styles.popupOverlay}>
          <View style={[styles.popupSheet, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: colors.radiusLarge, borderTopRightRadius: colors.radiusLarge }]}>
            <View style={[styles.popupHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.popupCheckIcon, { backgroundColor: colors.green + "20" }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.green} />
            </View>
            <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
              Report Analysed!
            </Text>
            <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
              Choose how you'd like to proceed
            </Text>

            <TouchableOpacity
              onPress={() => handleSelectPlan("ai")}
              activeOpacity={0.87}
              style={[styles.popupBtn, { borderRadius: colors.radius, overflow: "hidden" }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.popupBtnInner}
              >
                <Ionicons name="sparkles" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={[colors.typography.h3, { color: "#fff" }]}>Get AI Plan</Text>
                  <Text style={[colors.typography.caption, { color: "#fff9" }]}>Instant workout + diet plan</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#fff9" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectPlan("trainer")}
              activeOpacity={0.87}
              style={[styles.popupSecBtn, { backgroundColor: colors.purple + "15", borderColor: colors.purple + "40", borderRadius: colors.radius }]}
            >
              <Ionicons name="person" size={22} color={colors.purple} />
              <View style={{ flex: 1 }}>
                <Text style={[colors.typography.h3, { color: colors.purple }]}>Connect with Trainer</Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Expert personalised coaching</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.purple + "80"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowSmartPopup(false)}
              style={styles.popupSkip}
            >
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>View results only</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  uploadHero: { padding: 28, alignItems: "center", gap: 14 },
  uploadIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  uploadOptions: { gap: 10 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1 },
  uploadBtnIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  metricsPreview: { padding: 16, gap: 12 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  demoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderWidth: 1 },
  myReportsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  myReportsTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  reportsCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  refreshBtn: { padding: 4 },
  loadingReportCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  reportsSkeletonWrap: { gap: 10 },
  reportsSkeleton: { height: 80, borderRadius: 14 },
  reportsErrorCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  reportsEmptyCard: { alignItems: "center", padding: 28, gap: 10 },
  reportsList: { gap: 10 },
  previewCard: { alignItems: "center", padding: 32, gap: 12 },
  previewIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  analyzeBtn: {},
  analyzeBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  retakeBtn: { alignItems: "center", padding: 12 },
  analyzingWrap: { alignItems: "center", gap: 18, paddingVertical: 20 },
  analyzeCircle: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", borderWidth: 3 },
  analyzeTrack: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden" },
  analyzeFill: { height: 6, borderRadius: 3 },
  stepsWrap: { width: "85%", gap: 10, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultHeader: { padding: 20 },
  resultHeaderInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  completeBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start" },
  mainMetricsRow: { flexDirection: "row", gap: 10 },
  metricBig: { flex: 1, padding: 14, gap: 4, alignItems: "center" },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  secMetricsRow: { flexDirection: "row", gap: 10 },
  secMetricCard: { flex: 1, padding: 12, gap: 4, alignItems: "center" },
  summaryCard: { padding: 18, gap: 12, overflow: "hidden" },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sparkleIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  aiSourceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 2 },
  aiDebugBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  swRow: { flexDirection: "row", gap: 10 },
  swCard: { flex: 1, padding: 14, gap: 8 },
  swItem: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  analysisCard: { padding: 16, gap: 12, overflow: "hidden" },
  analysisHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  analysisIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  recoBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 10, borderLeftWidth: 3 },
  metaRow: { flexDirection: "row", gap: 10 },
  metaChipLarge: { flex: 1, padding: 10, borderRadius: 10, gap: 2 },
  recoCard: { padding: 16, gap: 12 },
  recoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  recoNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  planCTA: { marginTop: 4 },
  planCTAInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  planHeader: { alignItems: "center", padding: 24, gap: 10 },
  planHeaderIcon: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  goalsCard: { padding: 16, gap: 10 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  dayCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  dayBadge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  durationBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  trainerCard: { alignItems: "center", padding: 28, gap: 16, overflow: "hidden" },
  trainerIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  trainerBtn: { paddingHorizontal: 28, paddingVertical: 14 },
  backToResults: { alignItems: "center", padding: 14 },
  popupOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000065" },
  popupSheet: { padding: 28, borderWidth: 1, gap: 14 },
  popupHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  popupCheckIcon: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  popupBtn: {},
  popupBtnInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  popupSecBtn: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderWidth: 1 },
  popupSkip: { alignItems: "center", padding: 10 },
});
