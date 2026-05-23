import { GlassCard } from "@/components/ui/GlassCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
    weeklySchedule: Array<{ day: string; focus: string; duration?: string; exercises?: string[] }>;
    cardioRecommendation: string;
  };
  dietPlan: {
    calorieTarget: number;
    deficit: number;
    protein: number;
    carbs: number;
    fat: number;
    waterLiters: number;
    meals: string[];
    supplements: string[];
  };
  goalSuggestions: string[];
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

  useEffect(() => {
    if (phase === "analyzing") {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        false
      );
    }
  }, [phase]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseAnim.value }] }));

  // ── File picking ─────────────────────────────────────────────────────────────
  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is needed to scan reports.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: `scan_${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      });
      setPhase("preview");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName ?? `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      setPhase("preview");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: "application/pdf",
        size: asset.size,
      });
      setPhase("preview");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // ── Upload & analyze ─────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!selectedFile || !token) return;

    setPhase("analyzing");
    setAnalyzeProgress(0);
    setError(null);

    try {
      const response = await uploadInbodyReport(
        selectedFile.uri,
        selectedFile.mimeType,
        selectedFile.name,
        token,
        (progress) => {
          setUploadProgress(progress);
          setAnalyzeProgress(progress.percent);
        },
      );

      setMetrics(response.extractedMetrics as ExtractedMetrics);
      setGeminiAnalysis(response.geminiAnalysis as GeminiAnalysis | null);

      // If Gemini wasn't included in upload, try separate analyze call
      if (!response.geminiAnalysis && response.reportId) {
        try {
          const analysisResult = await analyzeInbodyReport(response.reportId, token);
          setGeminiAnalysis(analysisResult.analysis as GeminiAnalysis);
        } catch {
          // Gemini failed, but we still have OCR metrics
        }
      }

      setPhase("results");
      setTimeout(() => setShowSmartPopup(true), 600);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Please try again.");
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

  const getRating = (metric: string, value: number): { label: string; color: string } => {
    if (metric === "bodyFatPct") {
      if (value < 15) return { label: "Low", color: colors.yellow };
      if (value < 25) return { label: "Normal", color: colors.green };
      return { label: "High", color: colors.orange };
    }
    if (metric === "bmi") {
      if (value < 18.5) return { label: "Under", color: colors.yellow };
      if (value < 25) return { label: "Normal", color: colors.green };
      return { label: "High", color: colors.orange };
    }
    if (metric === "visceralFat") {
      if (value <= 9) return { label: "Normal", color: colors.green };
      return { label: "High", color: colors.orange };
    }
    return { label: "Normal", color: colors.cyan };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.purple + "15", colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[colors.typography.h2, { color: colors.foreground }]}>
            InBody Analysis
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ── UPLOAD PHASE ── */}
        {phase === "upload" && (
          <>
            <GlassCard style={styles.uploadHero}>
              <LinearGradient
                colors={[colors.purple + "25", colors.primary + "10"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.uploadIconCircle, { backgroundColor: colors.purple + "20", borderColor: colors.purple + "40" }]}>
                <Ionicons name="scan" size={44} color={colors.purple} />
              </View>
              <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
                Upload InBody Report
              </Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
                Our AI will extract your body composition metrics and generate a personalized fitness plan.
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
                { method: "gallery" as const, icon: "image" as const, label: "Upload Image", sub: "JPG, PNG from gallery", color: colors.secondary },
                { method: "pdf" as const, icon: "document-text" as const, label: "Upload PDF", sub: "Digital InBody PDF report", color: colors.purple },
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
                  <View style={[styles.uploadBtnIcon, { backgroundColor: opt.color + "20" }]}>
                    <Ionicons name={opt.icon} size={24} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                      {opt.label}
                    </Text>
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                      {opt.sub}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>

            <GlassCard style={styles.metricsPreview}>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                We'll extract these metrics
              </Text>
              <View style={styles.metricsGrid}>
                {[
                  "Weight", "Skeletal Muscle Mass", "Body Fat %", "BMI",
                  "Visceral Fat", "Water Retention", "Protein Level",
                  "Basal Metabolism", "Segmental Analysis",
                ].map((m) => (
                  <View key={m} style={[styles.metricChip, { backgroundColor: colors.muted }]}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{m}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        )}

        {/* ── PREVIEW PHASE ── */}
        {phase === "preview" && selectedFile && (
          <>
            <GlassCard style={styles.previewCard}>
              <View style={[styles.previewIcon, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons
                  name={selectedFile.mimeType.includes("pdf") ? "document-text" : "image"}
                  size={40}
                  color={colors.primary}
                />
              </View>
              <Text style={[colors.typography.h3, { color: colors.foreground, textAlign: "center" }]}>
                {selectedFile.name}
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                {selectedFile.mimeType} {selectedFile.size ? `· ${(selectedFile.size / 1024).toFixed(0)} KB` : ""}
              </Text>
            </GlassCard>

            <TouchableOpacity
              onPress={handleAnalyze}
              activeOpacity={0.85}
              style={[styles.analyzeBtn, { backgroundColor: colors.purple, borderRadius: colors.radius }]}
            >
              <Ionicons name="sparkles" size={20} color={colors.primaryForeground} />
              <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                Analyze with AI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setSelectedFile(null); setPhase("upload"); }}
              style={styles.retakeBtn}
            >
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>Choose different file</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── ANALYZING PHASE ── */}
        {phase === "analyzing" && (
          <View style={styles.analyzingWrap}>
            <Animated.View style={[styles.analyzeCircle, { borderColor: colors.purple }, pulseStyle]}>
              <Ionicons name="scan" size={60} color={colors.purple} />
            </Animated.View>
            <Text style={[colors.typography.h2, { color: colors.foreground }]}>
              Analyzing your report...
            </Text>
            <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
              {uploadProgress?.step === "uploading" ? "Uploading file..." :
               uploadProgress?.step === "ocr" ? "Extracting text with OCR..." :
               uploadProgress?.step === "processing" ? "AI is analyzing body composition..." :
               "Processing..."}
            </Text>

            <View style={[styles.analyzeTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.analyzeFill, { width: `${analyzeProgress}%` as any, backgroundColor: colors.purple }]} />
            </View>
            <Text style={[colors.typography.h2, { color: colors.purple }]}>
              {analyzeProgress}%
            </Text>

            <View style={styles.stepsWrap}>
              {[
                { label: "Uploading report", done: analyzeProgress > 15 },
                { label: "Extracting metrics with OCR", done: analyzeProgress > 40 },
                { label: "Analyzing with Gemini AI", done: analyzeProgress > 70 },
                { label: "Generating personalized plan", done: analyzeProgress >= 100 },
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

        {/* ── RESULTS PHASE ── */}
        {phase === "results" && metrics && (
          <>
            <GlassCard style={styles.reportHeader}>
              <LinearGradient colors={[colors.purple + "25", colors.primary + "10"]} style={StyleSheet.absoluteFillObject} />
              <View style={styles.reportBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={[colors.typography.bodyMedium, { color: colors.green }]}>Analysis Complete</Text>
              </View>
              <Text style={[colors.typography.h2, { color: colors.foreground }]}>Your InBody Results</Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </Text>
            </GlassCard>

            {/* Main metrics */}
            <View style={styles.mainMetricsRow}>
              <MetricBig label="Weight" value={metrics.weight ?? "--"} unit="kg" color={colors.primary} />
              <MetricBig label="Body Fat" value={metrics.bodyFat ?? "--"} unit="%" color={colors.secondary} rating={metrics.bodyFat ? getRating("bodyFatPct", parseFloat(metrics.bodyFat)) : undefined} />
              <MetricBig label="BMI" value={metrics.bmi ?? "--"} unit="" color={colors.purple} rating={metrics.bmi ? getRating("bmi", parseFloat(metrics.bmi)) : undefined} />
            </View>

            {/* Gemini AI Summary */}
            {geminiAnalysis && (
              <>
                <GlassCard style={styles.summaryCard}>
                  <LinearGradient colors={[colors.primary + "15", colors.purple + "08"]} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.summaryHeader}>
                    <Ionicons name="sparkles" size={18} color={colors.purple} />
                    <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
                      AI Fitness Assessment
                    </Text>
                    <View style={[styles.levelBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[colors.typography.label, { color: colors.primary }]}>
                        {geminiAnalysis.fitnessLevel}
                      </Text>
                    </View>
                  </View>
                  <Text style={[colors.typography.body, { color: colors.mutedForeground, lineHeight: 24 }]}>
                    {geminiAnalysis.overallSummary}
                  </Text>
                </GlassCard>

                {/* Strengths & Weaknesses */}
                <View style={styles.strengthWeakRow}>
                  <GlassCard style={styles.strengthCard}>
                    <Text style={[colors.typography.label, { color: colors.green }]}>STRENGTHS</Text>
                    {geminiAnalysis.strengths.slice(0, 3).map((s, i) => (
                      <View key={i} style={styles.swRow}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>{s}</Text>
                      </View>
                    ))}
                  </GlassCard>
                  <GlassCard style={styles.weakCard}>
                    <Text style={[colors.typography.label, { color: colors.orange }]}>IMPROVE</Text>
                    {geminiAnalysis.weaknesses.slice(0, 3).map((w, i) => (
                      <View key={i} style={styles.swRow}>
                        <Ionicons name="alert-circle" size={14} color={colors.orange} />
                        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>{w}</Text>
                      </View>
                    ))}
                  </GlassCard>
                </View>

                {/* Body Fat Analysis */}
                <GlassCard style={styles.analysisCard}>
                  <View style={styles.analysisHeader}>
                    <Ionicons name="body" size={20} color={colors.secondary} />
                    <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
                      Body Fat Analysis
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: (geminiAnalysis.bodyFatAnalysis.status === "Normal" ? colors.green : colors.orange) + "20" }]}>
                      <Text style={[colors.typography.label, { color: geminiAnalysis.bodyFatAnalysis.status === "Normal" ? colors.green : colors.orange }]}>
                        {geminiAnalysis.bodyFatAnalysis.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                    {geminiAnalysis.bodyFatAnalysis.description}
                  </Text>
                  <View style={[styles.recommendationBox, { backgroundColor: colors.primary + "10", borderLeftColor: colors.primary }]}>
                    <Text style={[colors.typography.caption, { color: colors.foreground }]}>
                      {geminiAnalysis.bodyFatAnalysis.recommendation}
                    </Text>
                  </View>
                </GlassCard>

                {/* Muscle Mass Analysis */}
                <GlassCard style={styles.analysisCard}>
                  <View style={styles.analysisHeader}>
                    <Ionicons name="barbell" size={20} color={colors.primary} />
                    <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
                      Muscle Mass Analysis
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[colors.typography.label, { color: colors.primary }]}>
                        {geminiAnalysis.muscleMassAnalysis.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                    {geminiAnalysis.muscleMassAnalysis.description}
                  </Text>
                  <View style={[styles.recommendationBox, { backgroundColor: colors.primary + "10", borderLeftColor: colors.primary }]}>
                    <Text style={[colors.typography.caption, { color: colors.foreground }]}>
                      {geminiAnalysis.muscleMassAnalysis.recommendation}
                    </Text>
                  </View>
                </GlassCard>

                {/* Metabolism Insights */}
                <GlassCard style={styles.analysisCard}>
                  <View style={styles.analysisHeader}>
                    <Ionicons name="flash" size={20} color={colors.yellow} />
                    <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
                      Metabolism Insights
                    </Text>
                  </View>
                  <View style={styles.metabolismRow}>
                    <View style={styles.metabolismItem}>
                      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>BMR</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{metrics.bmr ?? "--"} kcal</Text>
                    </View>
                    <View style={styles.metabolismItem}>
                      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Metabolic Age</Text>
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{metrics.metabolicAge ?? "--"}</Text>
                    </View>
                  </View>
                  <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                    {geminiAnalysis.metabolismInsights.description}
                  </Text>
                </GlassCard>

                {/* Visceral Fat */}
                <GlassCard style={styles.analysisCard}>
                  <View style={styles.analysisHeader}>
                    <Ionicons name="shield" size={20} color={colors.red} />
                    <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
                      Visceral Fat
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: (geminiAnalysis.visceralFatAnalysis.level === "Normal" ? colors.green : colors.red) + "20" }]}>
                      <Text style={[colors.typography.label, { color: geminiAnalysis.visceralFatAnalysis.level === "Normal" ? colors.green : colors.red }]}>
                        {geminiAnalysis.visceralFatAnalysis.level}
                      </Text>
                    </View>
                  </View>
                  <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                    {geminiAnalysis.visceralFatAnalysis.recommendation}
                  </Text>
                </GlassCard>

                {/* Recommendations */}
                <AIInsightCard title="AI Recommendations" insights={geminiAnalysis.recommendations} />

                {/* Goal Suggestions */}
                <GlassCard style={styles.goalsCard}>
                  <View style={styles.analysisHeader}>
                    <Ionicons name="trophy" size={20} color={colors.yellow} />
                    <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
                      Goal Suggestions
                    </Text>
                  </View>
                  {geminiAnalysis.goalSuggestions.map((goal, i) => (
                    <View key={i} style={styles.goalRow}>
                      <View style={[styles.goalNumber, { backgroundColor: colors.primary }]}>
                        <Text style={[colors.typography.label, { color: colors.primaryForeground }]}>{i + 1}</Text>
                      </View>
                      <Text style={[colors.typography.body, { color: colors.foreground, flex: 1 }]}>{goal}</Text>
                    </View>
                  ))}
                </GlassCard>
              </>
            )}

            {/* Detailed metrics */}
            <SectionHeader title="Body Composition" />
            <View style={styles.metricsDetailGrid}>
              {[
                { label: "Skeletal Muscle Mass", value: `${metrics.skeletalMuscleMass ?? "--"} kg`, icon: "body" as const, color: colors.primary },
                { label: "Lean Body Mass", value: `${metrics.leanBodyMass ?? "--"} kg`, icon: "fitness" as const, color: colors.secondary },
                { label: "Body Water", value: `${metrics.bodyWater ?? "--"} L`, icon: "water" as const, color: colors.cyan },
                { label: "Protein", value: `${metrics.protein ?? "--"} kg`, icon: "leaf" as const, color: colors.green },
                { label: "Visceral Fat", value: `Level ${metrics.visceralFat ?? "--"}`, icon: "alert-circle" as const, color: metrics.visceralFat ? getRating("visceralFat", parseInt(metrics.visceralFat)).color : colors.mutedForeground },
                { label: "BMR", value: `${metrics.bmr ?? "--"} kcal`, icon: "flash" as const, color: colors.yellow },
              ].map((m) => (
                <GlassCard key={m.label} style={styles.detailCard}>
                  <View style={[styles.detailIcon, { backgroundColor: m.color + "20" }]}>
                    <Ionicons name={m.icon} size={18} color={m.color} />
                  </View>
                  <Text style={[colors.typography.h3, { color: colors.foreground }]}>{m.value}</Text>
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{m.label}</Text>
                </GlassCard>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setShowSmartPopup(true)}
              activeOpacity={0.85}
              style={[styles.getPlantBtn, { backgroundColor: colors.purple, borderRadius: colors.radius }]}
            >
              <Ionicons name="sparkles" size={20} color={colors.primaryForeground} />
              <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                Get Personalized Plan
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── AI PLAN PHASE ── */}
        {phase === "plan" && planType === "ai" && geminiAnalysis && (
          <>
            <GlassCard style={styles.aiPlanHero}>
              <LinearGradient colors={[colors.primary + "25", colors.purple + "10"]} style={StyleSheet.absoluteFillObject} />
              <View style={styles.aiPlanBadge}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[colors.typography.bodyMedium, { color: colors.primary }]}>AI Generated Plan</Text>
              </View>
              <Text style={[colors.typography.h2, { color: colors.foreground }]}>{geminiAnalysis.workoutPlan.goal}</Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                Based on your InBody analysis · {geminiAnalysis.workoutPlan.planType}
              </Text>
            </GlassCard>

            {/* Nutrition Target */}
            <SectionHeader title="Daily Nutrition Target" />
            <GlassCard style={styles.nutritionCard}>
              <View style={styles.calorieRow}>
                <View>
                  <Text style={[colors.typography.h1, { color: colors.primary }]}>
                    {geminiAnalysis.dietPlan.calorieTarget} kcal
                  </Text>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Daily target</Text>
                </View>
                <View style={[styles.deficitBadge, { backgroundColor: (geminiAnalysis.dietPlan.deficit < 0 ? colors.green : colors.primary) + "20" }]}>
                  <Text style={[colors.typography.bodyMedium, { color: geminiAnalysis.dietPlan.deficit < 0 ? colors.green : colors.primary }]}>
                    {geminiAnalysis.dietPlan.deficit > 0 ? "+" : ""}{geminiAnalysis.dietPlan.deficit} kcal
                  </Text>
                </View>
              </View>
              <View style={styles.macrosRow}>
                {[
                  { label: "Protein", value: geminiAnalysis.dietPlan.protein, unit: "g", color: colors.primary },
                  { label: "Carbs", value: geminiAnalysis.dietPlan.carbs, unit: "g", color: colors.secondary },
                  { label: "Fat", value: geminiAnalysis.dietPlan.fat, unit: "g", color: colors.yellow },
                  { label: "Water", value: geminiAnalysis.dietPlan.waterLiters, unit: "L", color: colors.cyan },
                ].map((m) => (
                  <View key={m.label} style={[styles.macroBox, { backgroundColor: m.color + "15" }]}>
                    <Text style={[colors.typography.h3, { color: m.color }]}>{m.value}{m.unit}</Text>
                    <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Weekly Schedule */}
            <SectionHeader title="Weekly Schedule" />
            <GlassCard style={styles.weeklyCard}>
              {geminiAnalysis.workoutPlan.weeklySchedule.map((w, i, arr) => (
                <View key={w.day} style={[styles.weekRow, i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
                  <Text style={[colors.typography.bodyMedium, { color: colors.primary, width: 36 }]}>{w.day}</Text>
                  <Text style={[colors.typography.body, { color: colors.foreground, flex: 1 }]}>{w.focus}</Text>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{w.duration ?? "—"}</Text>
                </View>
              ))}
            </GlassCard>
            <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
              {geminiAnalysis.workoutPlan.cardioRecommendation}
            </Text>

            {/* Meal Plan */}
            <SectionHeader title="Meal Recommendations" />
            <GlassCard style={styles.mealCard}>
              {geminiAnalysis.dietPlan.meals.map((meal, i) => (
                <View key={i} style={[styles.mealRow, i < geminiAnalysis.dietPlan.meals.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
                  <View style={[styles.mealDot, { backgroundColor: colors.secondary }]} />
                  <Text style={[colors.typography.body, { color: colors.foreground, flex: 1 }]}>{meal}</Text>
                </View>
              ))}
            </GlassCard>

            {/* Supplements */}
            {geminiAnalysis.dietPlan.supplements.length > 0 && (
              <>
                <SectionHeader title="Recommended Supplements" />
                <GlassCard style={styles.supplementCard}>
                  {geminiAnalysis.dietPlan.supplements.map((sup, i) => (
                    <View key={i} style={styles.supplementRow}>
                      <Ionicons name="pill" size={14} color={colors.cyan} />
                      <Text style={[colors.typography.body, { color: colors.foreground }]}>{sup}</Text>
                    </View>
                  ))}
                </GlassCard>
              </>
            )}

            {/* Health Risks */}
            {geminiAnalysis.healthRisks.length > 0 && (
              <AIInsightCard title="Health Risk Factors" insights={geminiAnalysis.healthRisks} />
            )}

            <TouchableOpacity
              onPress={() => router.push("/workout/weekly-plan" as any)}
              style={[styles.startPlanBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            >
              <Ionicons name="calendar" size={20} color={colors.primaryForeground} />
              <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                View Weekly Workout Plan
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── TRAINER PLAN PHASE ── */}
        {phase === "plan" && planType === "trainer" && (
          <GlassCard style={styles.trainerConnectedCard}>
            <LinearGradient colors={[colors.green + "20", colors.primary + "10"]} style={StyleSheet.absoluteFillObject} />
            <View style={[styles.trainerConnectedIcon, { backgroundColor: colors.green + "20" }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.green} />
            </View>
            <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
              Trainer Request Sent!
            </Text>
            <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
              Your InBody results have been shared with available trainers. You'll receive a personalized plan within 24 hours.
            </Text>
          </GlassCard>
        )}
      </ScrollView>

      {/* Smart popup */}
      <Modal visible={showSmartPopup} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={[styles.popupCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLarge }]}>
            <LinearGradient colors={[colors.purple + "20", colors.primary + "10"]} style={StyleSheet.absoluteFillObject} />
            <View style={[styles.popupIcon, { backgroundColor: colors.purple + "20" }]}>
              <Ionicons name="sparkles" size={32} color={colors.purple} />
            </View>
            <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
              AI Analysis Complete
            </Text>
            <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
              {metrics?.bodyFat ? `Body fat: ${metrics.bodyFat}%` : ""} {metrics?.skeletalMuscleMass ? `· Muscle: ${metrics.skeletalMuscleMass}kg` : ""}
              {"\n"}What would you like next?
            </Text>

            <TouchableOpacity
              onPress={() => handleSelectPlan("ai")}
              activeOpacity={0.85}
              style={[styles.popupBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            >
              <Ionicons name="sparkles" size={20} color={colors.primaryForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Use AI Plan</Text>
                <Text style={[colors.typography.caption, { color: colors.primaryForeground + "99" }]}>Instant personalized plan</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primaryForeground + "80"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectPlan("trainer")}
              activeOpacity={0.85}
              style={[styles.popupBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary, borderRadius: colors.radius }]}
            >
              <Ionicons name="person" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[colors.typography.h3, { color: colors.foreground }]}>Connect with Trainer</Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Expert human guidance</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSmartPopup(false)}>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 4 }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetricBig({ label, value, unit, color, rating }: {
  label: string; value: string; unit: string; color: string;
  rating?: { label: string; color: string };
}) {
  const colors = useColors();
  return (
    <GlassCard style={styles.metricBigCard}>
      <Text style={[colors.typography.h2, { color }]}>{value}<Text style={{ fontSize: 14 }}>{unit}</Text></Text>
      <Text style={[colors.typography.tiny, { color: colors.mutedForeground, textAlign: "center" }]}>{label}</Text>
      {rating && (
        <View style={[styles.ratingBadge, { backgroundColor: rating.color + "20" }]}>
          <Text style={[colors.typography.label, { color: rating.color }]}>{rating.label}</Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  // Upload
  uploadHero: { padding: 24, alignItems: "center", gap: 14 },
  uploadIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  uploadOptions: { gap: 10 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1 },
  uploadBtnIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  metricsPreview: { padding: 16, gap: 12 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderColor: "#EF444440", borderWidth: 1 },

  // Preview
  previewCard: { padding: 24, alignItems: "center", gap: 14 },
  previewIcon: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56 },
  retakeBtn: { alignItems: "center", padding: 8 },

  // Analyzing
  analyzingWrap: { alignItems: "center", paddingVertical: 40, gap: 16 },
  analyzeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  analyzeTrack: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden" },
  analyzeFill: { height: 6, borderRadius: 3 },
  stepsWrap: { gap: 10, alignSelf: "stretch", paddingHorizontal: 20, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  // Results
  reportHeader: { padding: 20, gap: 8 },
  reportBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  mainMetricsRow: { flexDirection: "row", gap: 10 },
  metricBigCard: { flex: 1, alignItems: "center", padding: 12, gap: 4 },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },

  // AI Summary
  summaryCard: { padding: 16, gap: 12 },
  summaryHeader: { flexDirection: "row", alignItems: "center" },
  levelBadge: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  strengthWeakRow: { flexDirection: "row", gap: 10 },
  strengthCard: { flex: 1, padding: 14, gap: 8 },
  weakCard: { flex: 1, padding: 14, gap: 8 },
  swRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },

  // Analysis cards
  analysisCard: { padding: 16, gap: 10 },
  analysisHeader: { flexDirection: "row", alignItems: "center" },
  statusBadge: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  recommendationBox: { padding: 12, borderLeftWidth: 3, borderRadius: 8 },
  metabolismRow: { flexDirection: "row", gap: 20 },
  metabolismItem: { gap: 4 },

  // Detailed metrics
  metricsDetailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailCard: { width: "47%", padding: 12, gap: 6 },
  detailIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // Goals
  goalsCard: { padding: 16, gap: 12 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  goalNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  getPlantBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52 },

  // AI Plan
  aiPlanHero: { padding: 20, gap: 10 },
  aiPlanBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  nutritionCard: { padding: 16, gap: 16 },
  calorieRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deficitBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  macrosRow: { flexDirection: "row", gap: 8 },
  macroBox: { flex: 1, alignItems: "center", padding: 10, borderRadius: 12, gap: 4 },
  weeklyCard: { padding: 0 },
  weekRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  mealCard: { padding: 0 },
  mealRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  mealDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  supplementCard: { padding: 14, gap: 10 },
  supplementRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  startPlanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52 },

  // Trainer
  trainerConnectedCard: { padding: 24, alignItems: "center", gap: 16 },
  trainerConnectedIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },

  // Popup
  popupOverlay: { flex: 1, backgroundColor: "#00000080", alignItems: "center", justifyContent: "center", padding: 24 },
  popupCard: { padding: 24, gap: 16, borderWidth: 1, width: "100%" },
  popupIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  popupBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
});
