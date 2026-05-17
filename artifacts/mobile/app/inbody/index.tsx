import { GlassCard } from "@/components/ui/GlassCard";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

type Phase = "upload" | "analyzing" | "results" | "plan";
type PlanType = "trainer" | "ai" | null;

interface InBodyMetrics {
  weight: number;
  skeletalMuscleMass: number;
  bodyFatPct: number;
  bmi: number;
  visceralFat: number;
  waterRetention: number;
  proteinLevel: number;
  basalMetabolism: number;
  bodyFatMass: number;
}

const MOCK_METRICS: InBodyMetrics = {
  weight: 78.4,
  skeletalMuscleMass: 33.8,
  bodyFatPct: 22.1,
  bmi: 25.6,
  visceralFat: 8,
  waterRetention: 51.2,
  proteinLevel: 12.4,
  basalMetabolism: 1680,
  bodyFatMass: 17.3,
};

const getRating = (metric: string, value: number): { label: string; color: string } => {
  if (metric === "bodyFatPct") {
    if (value < 15) return { label: "Low", color: "#FBBF24" };
    if (value < 25) return { label: "Normal", color: "#00FF88" };
    return { label: "High", color: "#FF6B35" };
  }
  if (metric === "bmi") {
    if (value < 18.5) return { label: "Under", color: "#FBBF24" };
    if (value < 25) return { label: "Normal", color: "#00FF88" };
    return { label: "High", color: "#FF6B35" };
  }
  if (metric === "visceralFat") {
    if (value <= 9) return { label: "Normal", color: "#00FF88" };
    return { label: "High", color: "#FF6B35" };
  }
  return { label: "Normal", color: "#00D4FF" };
};

export default function InBodyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [phase, setPhase] = useState<Phase>("upload");
  const [metrics, setMetrics] = useState<InBodyMetrics | null>(null);
  const [showSmartPopup, setShowSmartPopup] = useState(false);
  const [planType, setPlanType] = useState<PlanType>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  const pulseAnim = useSharedValue(1);
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    if (phase === "analyzing") {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        false
      );
      progressAnim.value = withTiming(1, { duration: 3000 });
      let pct = 0;
      const interval = setInterval(() => {
        pct += 3;
        setAnalyzeProgress(Math.min(pct, 100));
        if (pct >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setMetrics(MOCK_METRICS);
            setPhase("results");
            setTimeout(() => setShowSmartPopup(true), 600);
          }, 400);
        }
      }, 90);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseAnim.value }] }));

  const handleUpload = (method: "camera" | "gallery" | "pdf") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("analyzing");
  };

  const handleSelectPlan = (type: "trainer" | "ai") => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPlanType(type);
    setShowSmartPopup(false);
    setPhase("plan");
  };

  const AI_PLAN = {
    calorieTarget: 1850,
    protein: 145,
    carbs: 185,
    fat: 58,
    water: 3.2,
    weeklyWorkouts: 4,
    cardioPerWeek: "2-3 sessions, 30 min each",
    goal: "Fat Loss + Muscle Preservation",
    deficit: -350,
    planType: "Moderate Cut",
    weekly: [
      { day: "Mon", focus: "Upper Body Strength", duration: "55 min" },
      { day: "Tue", focus: "Cardio LISS", duration: "30 min" },
      { day: "Wed", focus: "Lower Body Strength", duration: "60 min" },
      { day: "Thu", focus: "Rest / Active Recovery", duration: "—" },
      { day: "Fri", focus: "Full Body Strength", duration: "55 min" },
      { day: "Sat", focus: "Cardio HIIT", duration: "25 min" },
      { day: "Sun", focus: "Rest", duration: "—" },
    ],
    meals: [
      "Breakfast: Egg white omelette + Oats with banana",
      "Lunch: Grilled chicken + Brown rice + Dal",
      "Snack: Whey protein + Almonds",
      "Dinner: Paneer tikka + Salad + Roti (1)",
    ],
    insights: [
      "Your body fat (22.1%) is above ideal. A 350 kcal daily deficit is recommended.",
      "Skeletal muscle mass (33.8 kg) is good. Prioritize protein to preserve it.",
      "Visceral fat is borderline (8). Reduce refined carbs and increase fiber.",
      "Basal metabolism (1680 kcal) — you'll burn ~2200 kcal on active days.",
    ],
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#8B5CF615", colors.background]}
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
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
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
              <Text style={[styles.uploadTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Upload InBody Report
              </Text>
              <Text style={[styles.uploadSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Our AI will extract your body composition metrics and generate a personalized fitness plan.
              </Text>
            </GlassCard>

            <View style={styles.uploadOptions}>
              {[
                { method: "camera" as const, icon: "camera" as const, label: "Scan with Camera", sub: "Point at your printed report", color: colors.primary },
                { method: "gallery" as const, icon: "image" as const, label: "Upload Image", sub: "JPG, PNG from gallery", color: colors.secondary },
                { method: "pdf" as const, icon: "document-text" as const, label: "Upload PDF", sub: "Digital InBody PDF report", color: colors.purple },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.method}
                  onPress={() => handleUpload(opt.method)}
                  activeOpacity={0.85}
                  style={[styles.uploadBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.uploadBtnIcon, { backgroundColor: opt.color + "20" }]}>
                    <Ionicons name={opt.icon} size={24} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.uploadBtnLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.uploadBtnSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {opt.sub}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>

            <GlassCard style={styles.metricsPreview}>
              <Text style={[styles.metricsPreviewTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
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
                    <Text style={[styles.metricChipTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {m}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        )}

        {/* ── ANALYZING PHASE ── */}
        {phase === "analyzing" && (
          <View style={styles.analyzingWrap}>
            <Animated.View style={[styles.analyzeCircle, { borderColor: colors.purple }, pulseStyle]}>
              <Ionicons name="scan" size={60} color={colors.purple} />
            </Animated.View>
            <Text style={[styles.analyzingTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Analyzing your report...
            </Text>
            <Text style={[styles.analyzingSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              AI is extracting body composition data
            </Text>

            <View style={[styles.analyzeTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.analyzeFill, { width: `${analyzeProgress}%` as any, backgroundColor: colors.purple }]} />
            </View>
            <Text style={[styles.analyzePct, { color: colors.purple, fontFamily: "Inter_700Bold" }]}>
              {analyzeProgress}%
            </Text>

            <View style={styles.stepsWrap}>
              {[
                { label: "Extracting metrics", done: analyzeProgress > 20 },
                { label: "Analyzing body composition", done: analyzeProgress > 50 },
                { label: "Calculating recommendations", done: analyzeProgress > 80 },
                { label: "Generating insights", done: analyzeProgress >= 100 },
              ].map((step) => (
                <View key={step.label} style={styles.stepRow}>
                  <Ionicons
                    name={step.done ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={step.done ? colors.green : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.stepTxt,
                      { color: step.done ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_400Regular" },
                    ]}
                  >
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
              <LinearGradient
                colors={[colors.purple + "25", colors.primary + "10"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.reportBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={[styles.reportBadgeTxt, { color: colors.green, fontFamily: "Inter_600SemiBold" }]}>
                  Analysis Complete
                </Text>
              </View>
              <Text style={[styles.reportTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Your InBody Results
              </Text>
              <Text style={[styles.reportDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </Text>
            </GlassCard>

            {/* Main metrics */}
            <View style={styles.mainMetricsRow}>
              <MetricBig label="Weight" value={`${metrics.weight}`} unit="kg" color={colors.primary} />
              <MetricBig label="Body Fat" value={`${metrics.bodyFatPct}`} unit="%" color={colors.secondary} rating={getRating("bodyFatPct", metrics.bodyFatPct)} />
              <MetricBig label="BMI" value={`${metrics.bmi}`} unit="" color={colors.purple} rating={getRating("bmi", metrics.bmi)} />
            </View>

            {/* Detailed metrics */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Body Composition
            </Text>
            <View style={styles.metricsDetailGrid}>
              {[
                { label: "Skeletal Muscle Mass", value: `${metrics.skeletalMuscleMass} kg`, icon: "body" as const, color: colors.primary },
                { label: "Body Fat Mass", value: `${metrics.bodyFatMass} kg`, icon: "fitness" as const, color: colors.secondary },
                { label: "Water Retention", value: `${metrics.waterRetention} L`, icon: "water" as const, color: colors.cyan },
                { label: "Protein Level", value: `${metrics.proteinLevel} kg`, icon: "leaf" as const, color: colors.green },
                { label: "Visceral Fat", value: `Level ${metrics.visceralFat}`, icon: "alert-circle" as const, color: getRating("visceralFat", metrics.visceralFat).color },
                { label: "Basal Metabolism", value: `${metrics.basalMetabolism} kcal`, icon: "flash" as const, color: colors.yellow },
              ].map((m) => (
                <GlassCard key={m.label} style={styles.detailCard}>
                  <View style={[styles.detailIcon, { backgroundColor: m.color + "20" }]}>
                    <Ionicons name={m.icon} size={18} color={m.color} />
                  </View>
                  <Text style={[styles.detailVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {m.value}
                  </Text>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {m.label}
                  </Text>
                </GlassCard>
              ))}
            </View>

            {/* Segmental analysis */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Segmental Muscle Analysis
            </Text>
            <GlassCard style={styles.segmentalCard}>
              {[
                { part: "Right Arm", muscle: 3.2, fat: 0.8 },
                { part: "Left Arm", muscle: 3.1, fat: 0.9 },
                { part: "Trunk", muscle: 24.1, fat: 10.2 },
                { part: "Right Leg", muscle: 9.8, fat: 2.8 },
                { part: "Left Leg", muscle: 9.7, fat: 2.6 },
              ].map((seg, i, arr) => (
                <View
                  key={seg.part}
                  style={[
                    styles.segRow,
                    i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.segPart, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {seg.part}
                  </Text>
                  <View style={styles.segBars}>
                    <SegBar label="Muscle" value={seg.muscle} max={25} color={colors.primary} />
                    <SegBar label="Fat" value={seg.fat} max={12} color={colors.secondary} />
                  </View>
                </View>
              ))}
            </GlassCard>

            <TouchableOpacity
              onPress={() => setShowSmartPopup(true)}
              activeOpacity={0.85}
              style={[styles.getPlantBtn, { backgroundColor: colors.purple }]}
            >
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={[styles.getPlanBtnTxt, { fontFamily: "Inter_700Bold" }]}>
                Get Personalized Plan
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── AI PLAN PHASE ── */}
        {phase === "plan" && planType === "ai" && (
          <>
            <GlassCard style={styles.aiPlanHero}>
              <LinearGradient
                colors={[colors.primary + "25", colors.purple + "10"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.aiPlanBadge}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.aiPlanBadgeTxt, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  AI Generated Plan
                </Text>
              </View>
              <Text style={[styles.aiPlanTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {AI_PLAN.goal}
              </Text>
              <Text style={[styles.aiPlanSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Based on your InBody analysis · {AI_PLAN.planType}
              </Text>
            </GlassCard>

            {/* Calorie & Macros */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Daily Nutrition Target
            </Text>
            <GlassCard style={styles.nutritionCard}>
              <View style={styles.calorieRow}>
                <View>
                  <Text style={[styles.calorieVal, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                    {AI_PLAN.calorieTarget} kcal
                  </Text>
                  <Text style={[styles.calorieLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Daily target
                  </Text>
                </View>
                <View style={[styles.deficitBadge, { backgroundColor: colors.green + "20" }]}>
                  <Text style={[styles.deficitTxt, { color: colors.green, fontFamily: "Inter_600SemiBold" }]}>
                    {AI_PLAN.deficit} kcal deficit
                  </Text>
                </View>
              </View>
              <View style={styles.macrosRow}>
                {[
                  { label: "Protein", value: AI_PLAN.protein, unit: "g", color: colors.primary },
                  { label: "Carbs", value: AI_PLAN.carbs, unit: "g", color: colors.secondary },
                  { label: "Fat", value: AI_PLAN.fat, unit: "g", color: colors.yellow },
                  { label: "Water", value: AI_PLAN.water, unit: "L", color: colors.cyan },
                ].map((m) => (
                  <View key={m.label} style={[styles.macroBox, { backgroundColor: m.color + "15" }]}>
                    <Text style={[styles.macroVal, { color: m.color, fontFamily: "Inter_700Bold" }]}>
                      {m.value}{m.unit}
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Weekly plan */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Weekly Schedule
            </Text>
            <GlassCard style={styles.weeklyCard}>
              {AI_PLAN.weekly.map((w, i, arr) => (
                <View
                  key={w.day}
                  style={[
                    styles.weekRow,
                    i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.weekDay, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                    {w.day}
                  </Text>
                  <Text style={[styles.weekFocus, { color: colors.foreground, fontFamily: "Inter_400Regular", flex: 1 }]}>
                    {w.focus}
                  </Text>
                  <Text style={[styles.weekDur, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {w.duration}
                  </Text>
                </View>
              ))}
            </GlassCard>

            {/* Meal plan */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Meal Recommendations
            </Text>
            <GlassCard style={styles.mealCard}>
              {AI_PLAN.meals.map((meal, i) => (
                <View key={i} style={[styles.mealRow, i < AI_PLAN.meals.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
                  <View style={[styles.mealDot, { backgroundColor: colors.secondary }]} />
                  <Text style={[styles.mealTxt, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {meal}
                  </Text>
                </View>
              ))}
            </GlassCard>

            {/* AI Insights */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              AI Insights
            </Text>
            <GlassCard style={styles.insightsCard}>
              <LinearGradient
                colors={[colors.purple + "20", colors.primary + "08"]}
                style={StyleSheet.absoluteFillObject}
              />
              {AI_PLAN.insights.map((insight, i) => (
                <View key={i} style={styles.insightRow}>
                  <View style={[styles.insightDot, { backgroundColor: colors.purple }]} />
                  <Text style={[styles.insightTxt, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {insight}
                  </Text>
                </View>
              ))}
            </GlassCard>

            <TouchableOpacity
              onPress={() => router.push("/workout/weekly-plan" as any)}
              style={[styles.startPlanBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
              <Text style={[styles.startPlanBtnTxt, { fontFamily: "Inter_700Bold" }]}>
                View Weekly Workout Plan
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── TRAINER PLAN PHASE ── */}
        {phase === "plan" && planType === "trainer" && (
          <GlassCard style={styles.trainerConnectedCard}>
            <LinearGradient
              colors={[colors.green + "20", colors.primary + "10"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.trainerConnectedIcon, { backgroundColor: colors.green + "20" }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.green} />
            </View>
            <Text style={[styles.trainerConnectedTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Trainer Request Sent!
            </Text>
            <Text style={[styles.trainerConnectedSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Your InBody results have been shared with available trainers. You'll receive a personalized plan within 24 hours.
            </Text>
            <View style={styles.trainerList}>
              {[
                { name: "Rohit Verma", status: "Reviewing your report..." },
                { name: "Priya Patel", status: "Will respond in 2-3 hrs" },
              ].map((t) => (
                <View key={t.name} style={[styles.trainerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.trainerAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.trainerAvatarTxt, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.trainerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {t.name}
                    </Text>
                    <Text style={[styles.trainerStatus, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {t.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Smart popup */}
      <Modal visible={showSmartPopup} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={[styles.popupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient
              colors={[colors.purple + "20", colors.primary + "10"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.popupIcon, { backgroundColor: colors.purple + "20" }]}>
              <Ionicons name="sparkles" size={32} color={colors.purple} />
            </View>
            <Text style={[styles.popupTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              We analyzed your InBody report
            </Text>
            <Text style={[styles.popupSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Body fat: 22.1% · Muscle mass: 33.8kg{"\n"}What would you like next?
            </Text>

            <TouchableOpacity
              onPress={() => handleSelectPlan("ai")}
              activeOpacity={0.85}
              style={[styles.popupBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.popupBtnTitle, { fontFamily: "Inter_700Bold", color: "#FFFFFF" }]}>
                  Use AI Plan
                </Text>
                <Text style={[styles.popupBtnSub, { fontFamily: "Inter_400Regular", color: "#FFFFFF99" }]}>
                  Instant personalized plan
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF80" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectPlan("trainer")}
              activeOpacity={0.85}
              style={[styles.popupBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary }]}
            >
              <Ionicons name="person" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.popupBtnTitle, { fontFamily: "Inter_700Bold", color: colors.foreground }]}>
                  Connect with Trainer
                </Text>
                <Text style={[styles.popupBtnSub, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
                  Expert human guidance
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSmartPopup(false)}>
              <Text style={[styles.popupSkip, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
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
      <Text style={[styles.metricBigVal, { color, fontFamily: "Inter_700Bold" }]}>{value}<Text style={{ fontSize: 14 }}>{unit}</Text></Text>
      <Text style={[styles.metricBigLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      {rating && (
        <View style={[styles.ratingBadge, { backgroundColor: rating.color + "20" }]}>
          <Text style={[styles.ratingTxt, { color: rating.color, fontFamily: "Inter_600SemiBold" }]}>{rating.label}</Text>
        </View>
      )}
    </GlassCard>
  );
}

function SegBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.segBarWrap}>
      <View style={[styles.segBarTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.segBarFill, { width: `${(value / max) * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.segBarVal, { color, fontFamily: "Inter_600SemiBold" }]}>{value}kg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 24 },

  // Upload
  uploadHero: { padding: 24, alignItems: "center", gap: 14 },
  uploadIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  uploadTitle: { fontSize: 22 },
  uploadSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  uploadOptions: { gap: 10 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  uploadBtnIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  uploadBtnLabel: { fontSize: 15 },
  uploadBtnSub: { fontSize: 12, marginTop: 2 },
  metricsPreview: { padding: 16, gap: 12 },
  metricsPreviewTitle: { fontSize: 15 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  metricChipTxt: { fontSize: 12 },

  // Analyzing
  analyzingWrap: { alignItems: "center", paddingVertical: 40, gap: 16 },
  analyzeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  analyzingTitle: { fontSize: 22 },
  analyzingSub: { fontSize: 14 },
  analyzeTrack: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden" },
  analyzeFill: { height: 6, borderRadius: 3 },
  analyzePct: { fontSize: 20 },
  stepsWrap: { gap: 10, alignSelf: "stretch", paddingHorizontal: 20, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepTxt: { fontSize: 14 },

  // Results
  reportHeader: { padding: 20, gap: 8 },
  reportBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  reportBadgeTxt: { fontSize: 13 },
  reportTitle: { fontSize: 22 },
  reportDate: { fontSize: 13 },
  mainMetricsRow: { flexDirection: "row", gap: 10 },
  metricBigCard: { flex: 1, alignItems: "center", padding: 12, gap: 4 },
  metricBigVal: { fontSize: 22 },
  metricBigLabel: { fontSize: 11, textAlign: "center" },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  ratingTxt: { fontSize: 10 },
  sectionTitle: { fontSize: 17 },
  metricsDetailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailCard: { width: "47%", padding: 12, gap: 6 },
  detailIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  detailVal: { fontSize: 16 },
  detailLabel: { fontSize: 11 },
  segmentalCard: { padding: 14, gap: 0 },
  segRow: { paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  segPart: { fontSize: 13, width: 80 },
  segBars: { flex: 1, gap: 6 },
  segBarWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  segBarTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  segBarFill: { height: 5, borderRadius: 3 },
  segBarVal: { fontSize: 12, width: 36 },
  getPlantBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
  getPlanBtnTxt: { color: "#FFFFFF", fontSize: 16 },

  // AI Plan
  aiPlanHero: { padding: 20, gap: 10, overflow: "hidden" },
  aiPlanBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  aiPlanBadgeTxt: { fontSize: 13 },
  aiPlanTitle: { fontSize: 22 },
  aiPlanSub: { fontSize: 13 },
  nutritionCard: { padding: 16, gap: 16 },
  calorieRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calorieVal: { fontSize: 28 },
  calorieLabel: { fontSize: 13 },
  deficitBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  deficitTxt: { fontSize: 13 },
  macrosRow: { flexDirection: "row", gap: 8 },
  macroBox: { flex: 1, alignItems: "center", padding: 10, borderRadius: 12, gap: 4 },
  macroVal: { fontSize: 16 },
  macroLabel: { fontSize: 11 },
  weeklyCard: { padding: 0, overflow: "hidden" },
  weekRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  weekDay: { fontSize: 13, width: 36 },
  weekFocus: { fontSize: 13 },
  weekDur: { fontSize: 12 },
  mealCard: { padding: 0 },
  mealRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  mealDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  mealTxt: { flex: 1, fontSize: 13, lineHeight: 20 },
  insightsCard: { padding: 16, gap: 12, overflow: "hidden" },
  insightRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  insightTxt: { flex: 1, fontSize: 13, lineHeight: 20 },
  startPlanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
  startPlanBtnTxt: { color: "#FFFFFF", fontSize: 16 },

  // Trainer connected
  trainerConnectedCard: { padding: 24, alignItems: "center", gap: 16, overflow: "hidden" },
  trainerConnectedIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  trainerConnectedTitle: { fontSize: 22 },
  trainerConnectedSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  trainerList: { gap: 10, alignSelf: "stretch" },
  trainerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  trainerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  trainerAvatarTxt: { fontSize: 14 },
  trainerName: { fontSize: 14 },
  trainerStatus: { fontSize: 12, marginTop: 2 },

  // Smart popup
  popupOverlay: { flex: 1, backgroundColor: "#00000080", alignItems: "center", justifyContent: "center", padding: 24 },
  popupCard: { borderRadius: 28, padding: 24, gap: 16, borderWidth: 1, width: "100%", overflow: "hidden" },
  popupIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  popupTitle: { fontSize: 20, textAlign: "center" },
  popupSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  popupBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16 },
  popupBtnTitle: { fontSize: 15 },
  popupBtnSub: { fontSize: 12, marginTop: 2 },
  popupSkip: { fontSize: 13, textAlign: "center", paddingVertical: 4 },
});
