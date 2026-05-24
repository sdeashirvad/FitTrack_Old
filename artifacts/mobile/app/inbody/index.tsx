import { GlassCard } from "@/components/ui/GlassCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  uploadInbodyReport,
  analyzeInbodyReport,
  type UploadProgress,
} from "@/hooks/useInbodyService";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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

type Phase = "upload" | "preview" | "analyzing" | "results" | "plan";
type PlanType = "trainer" | "ai" | null;

interface GeminiAnalysis {
  overallSummary: string;
  fitnessLevel: string;
  bodyFatAnalysis: { status: string; description: string; recommendation: string };
  muscleMassAnalysis: { status: string; description: string; recommendation: string };
  metabolismInsights: { bmr: string; metabolicAge: string; description: string };
  visceralFatAnalysis: { level: string; risk: string; recommendation: string };
  strengths: string[];
  weaknesses: string[];
  healthRisks: string[];
  recommendations: string[];
  workoutPlan: {
    goal: string;
    planType: string;
    weeklySchedule: Array<{ day: string; focus: string; duration?: string; exercises?: string[] } | string>;
    cardioRecommendation: string;
  };
  dietPlan: {
    calorieTarget: number;
    deficit: number;
    protein: number;
    carbs: number;
    fat: number;
    waterLiters: number;
    meals: Array<string | { name?: string; calories?: number; [key: string]: any }>;
    supplements: string[];
  };
  goalSuggestions: string[];
  __aiSource?: "groq" | "fallback";
  __aiModel?: string;
  __aiRawResponse?: string;
  __aiUsage?: unknown;
}

interface ExtractedMetrics {
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

interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

const DEMO_METRICS: ExtractedMetrics = {
  weight: "78.2",
  bmi: "24.1",
  bodyFat: "18.4",
  skeletalMuscleMass: "32.8",
  leanBodyMass: "63.8",
  protein: "12.2",
  bodyWater: "38.6",
  bmr: "1780",
  visceralFat: "7",
  metabolicAge: "29",
  waistHipRatio: "0.84",
};

const DEMO_ANALYSIS: GeminiAnalysis = {
  overallSummary: "Your body composition shows good overall fitness with room to optimize body fat levels. Skeletal muscle mass is above average, reflecting consistent training. Continue your current program with focus on progressive overload and slight caloric deficit.",
  fitnessLevel: "Intermediate",
  bodyFatAnalysis: {
    status: "Slightly High",
    description: "At 18.4% body fat, you're in the acceptable range for your age. Targeting 15–17% would significantly improve body composition and athletic performance.",
    recommendation: "Maintain a 300–400 kcal deficit, prioritise protein intake, and add 2–3 HIIT sessions per week.",
  },
  muscleMassAnalysis: {
    status: "Above Average",
    description: "Skeletal muscle mass of 32.8 kg is above the average for your age and height. This indicates consistent resistance training.",
    recommendation: "Continue progressive overload with compound movements. Prioritise recovery to maintain muscle during fat loss.",
  },
  metabolismInsights: {
    bmr: "1,780 kcal",
    metabolicAge: "29",
    description: "Your basal metabolic rate is healthy. Metabolic age of 29 suggests good metabolic health for your training age.",
  },
  visceralFatAnalysis: {
    level: "7",
    risk: "Low",
    recommendation: "Visceral fat level of 7 is within the healthy range (1–9). Maintain with regular cardio and controlled sugar intake.",
  },
  strengths: [
    "Above-average skeletal muscle mass",
    "Healthy visceral fat level (7/20)",
    "Good metabolic age (29 years)",
    "Strong lean body mass ratio",
  ],
  weaknesses: [
    "Body fat slightly above optimal range",
    "Body water percentage can improve with better hydration",
    "Protein mass could improve with diet optimisation",
  ],
  healthRisks: [
    "Mild cardiovascular risk if body fat is not reduced",
    "Risk of muscle loss during aggressive cutting without adequate protein",
  ],
  recommendations: [
    "Maintain 300–400 kcal daily deficit through diet",
    "Prioritise 1.8–2.2g protein per kg body weight",
    "Add 2x HIIT sessions per week",
    "Drink 3+ litres of water daily",
    "Sleep 7–9 hours for optimal recovery and hormonal balance",
  ],
  workoutPlan: {
    goal: "Fat Loss + Muscle Retention",
    planType: "PPL + Cardio",
    weeklySchedule: [
      { day: "Monday", focus: "Push", duration: "55 min", exercises: ["Bench Press", "OHP", "Incline DB", "Tricep Pushdown"] },
      { day: "Tuesday", focus: "Pull", duration: "55 min", exercises: ["Pull-ups", "Barbell Row", "Face Pulls", "Hammer Curls"] },
      { day: "Wednesday", focus: "HIIT Cardio", duration: "25 min", exercises: ["Jump Rope", "Burpees", "Sprint Intervals"] },
      { day: "Thursday", focus: "Legs", duration: "60 min", exercises: ["Squats", "Romanian DL", "Leg Press", "Calf Raises"] },
      { day: "Friday", focus: "Push + Core", duration: "55 min", exercises: ["DB Shoulder Press", "Cable Flyes", "Planks", "Ab Wheel"] },
      { day: "Saturday", focus: "Active Recovery / Walk", duration: "40 min", exercises: ["30-min brisk walk", "Stretching"] },
      { day: "Sunday", focus: "Rest", duration: "--" },
    ],
    cardioRecommendation: "2x HIIT (20–25 min) + 1x steady state (30 min walk) per week",
  },
  dietPlan: {
    calorieTarget: 2100,
    deficit: 350,
    protein: 160,
    carbs: 220,
    fat: 60,
    waterLiters: 3.5,
    meals: [
      "Breakfast: Oats with whey + banana (500 kcal)",
      "Mid-morning: Greek yogurt + nuts (250 kcal)",
      "Lunch: Dal rice + sabzi + curd (600 kcal)",
      "Pre-workout: Banana + black coffee (100 kcal)",
      "Dinner: Chicken/paneer + roti + salad (550 kcal)",
      "Post-workout: Whey protein shake (150 kcal)",
    ],
    supplements: ["Whey protein (post-workout)", "Creatine 5g/day", "Vitamin D3 + K2", "Omega-3 (2 caps/day)"],
  },
  goalSuggestions: [
    "Reach 15% body fat in 8–10 weeks",
    "Increase skeletal muscle to 34 kg",
    "Improve metabolic age to 27",
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

      // Check if Gemini analysis was included in the response
      if (response.geminiAnalysis) {
        console.log("🤖 Gemini analysis received in upload response");
        setGeminiAnalysis(response.geminiAnalysis as GeminiAnalysis);
      } else {
        console.log("⏳ No Gemini analysis in upload response. Fetching separately...");
        // Try to get analysis from the separate endpoint
        try {
          const analysisResult = await analyzeInbodyReport(response.reportId, token);
          console.log("🤖 Gemini analysis fetched from analyze endpoint");
          setGeminiAnalysis(analysisResult.analysis as GeminiAnalysis);
        } catch (analyzeErr: any) {
          console.error("❌ Gemini analysis failed:", analyzeErr.message);
          setError(`AI Analysis unavailable: ${analyzeErr.message}. Showing extracted metrics only.`);
          // Don't fall back to demo, show real metrics without analysis
        }
      }

      setPhase("results");
      setTimeout(() => setShowSmartPopup(true), 600);
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

  const getRating = (metric: string, value: number) => {
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

  const bodyScore = metrics
    ? Math.min(
        Math.round(
          (1 - Math.abs(parseFloat(metrics.bmi ?? "24") - 22) / 15) * 35 +
          (parseFloat(metrics.bodyFat ?? "20") < 22 ? 30 : 15) +
          (parseFloat(metrics.visceralFat ?? "8") <= 9 ? 20 : 8) +
          (parseFloat(metrics.skeletalMuscleMass ?? "30") > 30 ? 15 : 8)
        ),
        98
      )
    : 0;

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
                value={metrics.bodyFat ?? "--"}
                unit="%"
                color={colors.purple}
                rating={metrics.bodyFat ? getRating("bodyFat", parseFloat(metrics.bodyFat)) : undefined}
              />
              <MetricBig
                label="BMI"
                value={metrics.bmi ?? "--"}
                unit=""
                color={colors.cyan}
                rating={metrics.bmi ? getRating("bmi", parseFloat(metrics.bmi)) : undefined}
              />
            </View>

            {/* Secondary metrics */}
            <View style={styles.secMetricsRow}>
              {[
                { label: "Muscle Mass", value: metrics.skeletalMuscleMass, unit: "kg", color: colors.green },
                { label: "BMR", value: metrics.bmr, unit: "kcal", color: colors.orange },
                { label: "Visceral Fat", value: metrics.visceralFat, unit: "", color: colors.purple },
                { label: "Metabolic Age", value: metrics.metabolicAge, unit: "yr", color: colors.cyan },
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

                {/* Diet Plan */}
                <SectionHeader title="Diet Plan" />
                <GlassCard style={styles.dietCard}>
                  <View style={styles.macroTargets}>
                    {[
                      { label: "Calories", value: `${geminiAnalysis.dietPlan.calorieTarget}`, unit: "kcal", color: colors.primary },
                      { label: "Protein", value: `${geminiAnalysis.dietPlan.protein}`, unit: "g", color: colors.green },
                      { label: "Carbs", value: `${geminiAnalysis.dietPlan.carbs}`, unit: "g", color: colors.purple },
                      { label: "Fat", value: `${geminiAnalysis.dietPlan.fat}`, unit: "g", color: colors.yellow },
                    ].map((m) => (
                      <View key={m.label} style={[styles.macroTarget, { backgroundColor: m.color + "12" }]}>
                        <Text style={[colors.typography.h3, { color: m.color, fontSize: 18 }]}>{m.value}</Text>
                        <Text style={[colors.typography.tiny, { color: m.color }]}>{m.unit}</Text>
                        <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.waterRow, { backgroundColor: colors.cyan + "12" }]}>
                    <Ionicons name="water" size={16} color={colors.cyan} />
                    <Text style={[colors.typography.bodyMedium, { color: colors.cyan }]}>
                      {geminiAnalysis.dietPlan.waterLiters}L water daily
                    </Text>
                  </View>
                  {geminiAnalysis.dietPlan.meals.map((meal, i) => {
                    const mealText = typeof meal === "string" 
                      ? meal 
                      : (meal as any).name 
                        ? `${(meal as any).name}: ${(meal as any).calories ?? ""} kcal` 
                        : JSON.stringify(meal);
                    return (
                    <View key={i} style={styles.mealPlanRow}>
                      <View style={[styles.mealDot, { backgroundColor: colors.primary }]} />
                      <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>{mealText}</Text>
                    </View>
                  )})}
                </GlassCard>

                {/* Supplements */}
                <GlassCard style={styles.suppCard}>
                  <Text style={[colors.typography.label, { color: colors.purple }]}>SUPPLEMENTS</Text>
                  <View style={styles.suppGrid}>
                    {geminiAnalysis.dietPlan.supplements.map((s, i) => (
                      <View key={i} style={[styles.suppChip, { backgroundColor: colors.purple + "12" }]}>
                        <Ionicons name="flask" size={12} color={colors.purple} />
                        <Text style={[colors.typography.caption, { color: colors.foreground, fontSize: 12 }]}>
                          {typeof s === "string" ? s : JSON.stringify(s)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </GlassCard>
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

function MetricBig({ label, value, unit, color, rating }: {
  label: string; value: string; unit: string; color: string; rating?: { label: string; color: string };
}) {
  const colors = useColors();
  return (
    <GlassCard style={styles.metricBig}>
      <Text style={[colors.typography.h2, { color, fontSize: 24 }]}>{value}<Text style={{ fontSize: 14 }}>{unit}</Text></Text>
      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
      {rating && (
        <View style={[styles.ratingBadge, { backgroundColor: rating.color + "18" }]}>
          <Text style={[colors.typography.tiny, { color: rating.color }]}>{rating.label}</Text>
        </View>
      )}
    </GlassCard>
  );
}

function AnalysisSection({ icon, iconColor, title, status, statusColor, description, recommendation }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  status: string;
  statusColor: string;
  description: string;
  recommendation: string;
}) {
  const colors = useColors();
  return (
    <GlassCard style={styles.analysisCard}>
      <View style={styles.analysisHeader}>
        <View style={[styles.analysisIconWrap, { backgroundColor: iconColor + "18" }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[colors.typography.h3, { color: colors.foreground, flex: 1 }]}>{title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <Text style={[colors.typography.label, { color: statusColor, fontSize: 10 }]}>{status}</Text>
        </View>
      </View>
      <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>{description}</Text>
      <View style={[styles.recoBox, { backgroundColor: colors.primary + "10", borderLeftColor: colors.primary }]}>
        <Ionicons name="bulb-outline" size={13} color={colors.primary} />
        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>{recommendation}</Text>
      </View>
    </GlassCard>
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
  dietCard: { padding: 16, gap: 12 },
  macroTargets: { flexDirection: "row", gap: 8 },
  macroTarget: { flex: 1, padding: 10, borderRadius: 12, alignItems: "center", gap: 2 },
  waterRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  mealPlanRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  mealDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  suppCard: { padding: 16, gap: 12 },
  suppGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suppChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
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
