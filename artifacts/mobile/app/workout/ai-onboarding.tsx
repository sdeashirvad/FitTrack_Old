/**
 * AI Workout Onboarding Screen
 * ----------------------------
 * First-time onboarding: goal selection + AI recommendation + plan generation.
 * Shown when user hasn't completed workout onboarding yet.
 */

import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type FitnessGoal =
  | "Fat Loss"
  | "Muscle Gain"
  | "Body Recomposition"
  | "Strength"
  | "Athletic Performance"
  | "General Fitness";

type Step = "goal" | "ai-loading" | "ai-result" | "generating" | "plan-ready";

interface AIRecommendation {
  recommendedGoal: FitnessGoal;
  reasoning: string;
  transformationPriority: string;
  estimatedTimeline: string;
  beginnerSuitability: string;
  confidence: number;
}

interface ExerciseCard {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  gifUrl: string;
  instructions: string[];
  sets: number;
  repsRange: string;
  restSeconds: number;
  estimatedCaloriesPerSet: number;
  difficulty: string;
}

interface PlanDay {
  dayName: string;
  focus: string;
  isRest: boolean;
  isCardio: boolean;
  estimatedCalories: number;
  estimatedDuration: string;
  exercises: ExerciseCard[];
}

interface WorkoutStrategy {
  split: string;
  splitName: string;
  daysPerWeek: number;
  sessionDuration: string;
  intensity: string;
  cardioFrequency: string;
  progressionStyle: string;
  beginnerFriendly: boolean;
}

// ─── Goal definitions ─────────────────────────────────────────────────────────

const GOALS: Array<{
  key: FitnessGoal;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}> = [
  { key: "Fat Loss", icon: "flame-outline", color: "#FF6B35", description: "Burn fat, improve metabolic health and body composition" },
  { key: "Muscle Gain", icon: "barbell-outline", color: "#8B5CF6", description: "Build lean muscle mass and increase overall strength" },
  { key: "Body Recomposition", icon: "swap-horizontal-outline", color: "#3B82F6", description: "Lose fat and gain muscle simultaneously" },
  { key: "Strength", icon: "fitness-outline", color: "#F59E0B", description: "Increase maximal strength in key compound movements" },
  { key: "Athletic Performance", icon: "bicycle-outline", color: "#22C55E", description: "Improve speed, power, and sports performance" },
  { key: "General Fitness", icon: "heart-outline", color: "#EC4899", description: "Build healthy habits and overall fitness baseline" },
];

const DIFF_COLOR: Record<string, string> = {
  Beginner: "#22C55E",
  Intermediate: "#F59E0B",
  Advanced: "#EF4444",
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onComplete: (plan: PlanDay[], goal: FitnessGoal, strategy: WorkoutStrategy) => void;
  onSkip: () => void;
}

export default function AIWorkoutOnboarding({ onComplete, onSkip }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState<Step>("goal");
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
  const [aiRecommendation, setAIRecommendation] = useState<AIRecommendation | null>(null);
  const [noReportFound, setNoReportFound] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<PlanDay[]>([]);
  const [strategy, setStrategy] = useState<WorkoutStrategy | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  function getApiBase() {
    const EXPO_PUBLIC_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
    if (EXPO_PUBLIC_DOMAIN) return `https://${EXPO_PUBLIC_DOMAIN}`;
    if (Platform.OS === "android") return "http://10.0.2.2:3001";
    return "http://localhost:3001";
  }

  async function apiCall(path: string, method = "GET", body?: unknown) {
    const res = await fetch(`${getApiBase()}/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  }

  const transition = useCallback((fn: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  // ── Ask AI ──────────────────────────────────────────────────────────────────
  const handleAskAI = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    transition(() => setStep("ai-loading"));

    try {
      const data = await apiCall("/workout/onboarding/ai-recommend", "POST");

      if (data.noReport) {
        transition(() => {
          setNoReportFound(true);
          setStep("ai-result");
        });
        return;
      }

      if (data.success && data.recommendation) {
        transition(() => {
          setAIRecommendation(data.recommendation);
          setNoReportFound(false);
          setStep("ai-result");
        });
      } else {
        throw new Error(data.error ?? "Unknown error");
      }
    } catch {
      transition(() => setStep("goal"));
      Alert.alert("AI Unavailable", "Could not reach AI service. Please select a goal manually.");
    }
  };

  // ── Generate Plan ───────────────────────────────────────────────────────────
  const handleGeneratePlan = async (goal: FitnessGoal) => {
    setSelectedGoal(goal);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    transition(() => setStep("generating"));

    try {
      const data = await apiCall("/workout/onboarding/generate-plan", "POST", { goal, level: "beginner" });

      if (data.success && data.plan) {
        transition(() => {
          setGeneratedPlan(data.plan);
          setStrategy(data.strategy);
          setStep("plan-ready");
        });
      } else {
        throw new Error(data.error ?? "Plan generation failed");
      }
    } catch {
      transition(() => setStep(aiRecommendation ? "ai-result" : "goal"));
      Alert.alert("Plan generation failed", "Could not build your workout plan. Please try again.");
    }
  };

  // ── Save & Finish ────────────────────────────────────────────────────────────
  const handleSaveAndFinish = async () => {
    if (!selectedGoal) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await apiCall("/workout/onboarding/save", "POST", {
        goal: selectedGoal,
        aiRecommendedGoal: aiRecommendation?.recommendedGoal ?? null,
        workoutPlan: generatedPlan,
        strategy,
      });
    } catch {
      // Best-effort — still proceed to dashboard
    }

    onComplete(generatedPlan, selectedGoal, strategy!);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "12", colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {step === "goal" && (
          <GoalStep
            colors={colors}
            topPad={topPad}
            insets={insets}
            selectedGoal={selectedGoal}
            onSelectGoal={setSelectedGoal}
            onGeneratePlan={handleGeneratePlan}
            onAskAI={handleAskAI}
            onSkip={onSkip}
          />
        )}

        {step === "ai-loading" && (
          <LoadingStep
            colors={colors}
            title="Analyzing Your Body Composition"
            subtitle="AI is reviewing your InBody metrics to find the perfect starting goal…"
          />
        )}

        {step === "ai-result" && (
          <AIResultStep
            colors={colors}
            topPad={topPad}
            insets={insets}
            recommendation={aiRecommendation}
            noReport={noReportFound}
            onUseGoal={(goal) => handleGeneratePlan(goal)}
            onChooseManually={() => transition(() => setStep("goal"))}
            onUploadReport={() => router.push("/inbody" as any)}
          />
        )}

        {step === "generating" && (
          <LoadingStep
            colors={colors}
            title="Building Your Personalised Plan"
            subtitle="AI is designing your workout strategy and fetching exercises…"
          />
        )}

        {step === "plan-ready" && strategy && (
          <PlanReadyStep
            colors={colors}
            topPad={topPad}
            insets={insets}
            goal={selectedGoal!}
            strategy={strategy}
            plan={generatedPlan}
            expandedDay={expandedDay}
            expandedEx={expandedEx}
            onToggleDay={(d) => setExpandedDay(expandedDay === d ? null : d)}
            onToggleEx={(e) => setExpandedEx(expandedEx === e ? null : e)}
            onSave={handleSaveAndFinish}
            onBack={() => transition(() => setStep(aiRecommendation ? "ai-result" : "goal"))}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ─── Goal Selection Step ──────────────────────────────────────────────────────

function GoalStep({ colors, topPad, insets, selectedGoal, onSelectGoal, onGeneratePlan, onAskAI, onSkip }: any) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.onboardingHeader}>
        <View style={[styles.sparkBadge, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[styles.sparkText, { color: colors.primary }]}>AI Workout Coach</Text>
        </View>
        <Text style={[styles.onboardingTitle, { color: colors.foreground }]}>What's your{"\n"}fitness goal?</Text>
        <Text style={[styles.onboardingSubtitle, { color: colors.mutedForeground }]}>
          Select a goal to generate your personalised workout plan, or let AI recommend based on your body data.
        </Text>
      </View>

      <View style={styles.goalGrid}>
        {GOALS.map((g) => {
          const active = selectedGoal === g.key;
          return (
            <TouchableOpacity
              key={g.key}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectGoal(g.key);
              }}
              activeOpacity={0.85}
              style={[
                styles.goalCard,
                { backgroundColor: colors.card, ...colors.shadow.soft },
                active && { borderWidth: 2, borderColor: g.color },
              ]}
            >
              {active && (
                <LinearGradient
                  colors={[g.color + "18", g.color + "04"]}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <View style={[styles.goalIconWrap, { backgroundColor: g.color + (active ? "25" : "15") }]}>
                <Ionicons name={g.icon} size={24} color={g.color} />
              </View>
              <Text style={[styles.goalCardTitle, { color: colors.foreground }]}>{g.key}</Text>
              <Text style={[styles.goalCardDesc, { color: colors.mutedForeground }]}>{g.description}</Text>
              {active && (
                <View style={[styles.checkBadge, { backgroundColor: g.color }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.aiSuggestionBox, { backgroundColor: colors.card, borderColor: colors.primary + "30", ...colors.shadow.soft }]}>
        <View style={styles.aiSuggestionTop}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={[styles.aiSuggestionTitle, { color: colors.foreground }]}>Not sure what's best for you?</Text>
        </View>
        <Text style={[styles.aiSuggestionDesc, { color: colors.mutedForeground }]}>
          AI will analyse your InBody report — body fat %, muscle mass, visceral fat, and more — to recommend the perfect starting goal.
        </Text>
        <TouchableOpacity
          onPress={onAskAI}
          style={[styles.askAIBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={styles.askAIBtnText}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBtns}>
        {selectedGoal && (
          <TouchableOpacity
            onPress={() => onGeneratePlan(selectedGoal)}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Generate My Plan</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onSkip} style={styles.skipLink}>
          <Text style={[styles.skipLinkText, { color: colors.mutedForeground }]}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Loading Step ─────────────────────────────────────────────────────────────

function LoadingStep({ colors, title, subtitle }: any) {
  return (
    <View style={styles.loadingContainer}>
      <View style={[styles.loadingCard, { backgroundColor: colors.card, ...colors.shadow.strong }]}>
        <View style={[styles.loadingIconWrap, { backgroundColor: colors.primary + "15" }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.loadingTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.loadingSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        <View style={[styles.loadingDots, { backgroundColor: colors.muted }]}>
          {["Reviewing metrics", "Selecting strategy", "Fetching exercises"].map((label, i) => (
            <View key={label} style={styles.loadingDotRow}>
              <View style={[styles.loadingDotDot, { backgroundColor: colors.primary + "40" }]} />
              <Text style={[styles.loadingDotText, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── AI Result Step ───────────────────────────────────────────────────────────

function AIResultStep({ colors, topPad, insets, recommendation, noReport, onUseGoal, onChooseManually, onUploadReport }: any) {
  if (noReport) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.loadingCard, { backgroundColor: colors.card, ...colors.shadow.strong }]}>
          <View style={[styles.loadingIconWrap, { backgroundColor: colors.yellow + "15" }]}>
            <Ionicons name="document-text-outline" size={36} color={colors.yellow} />
          </View>
          <Text style={[styles.loadingTitle, { color: colors.foreground }]}>InBody Report Needed</Text>
          <Text style={[styles.loadingSubtitle, { color: colors.mutedForeground }]}>
            To give accurate AI recommendations, upload your InBody report first. We'll analyse your body fat, muscle mass, and more.
          </Text>
          <TouchableOpacity
            onPress={onUploadReport}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Upload InBody Report</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onChooseManually} style={[styles.outlineBtn, { borderColor: colors.border, marginTop: 10 }]}>
            <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>Choose Goal Manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!recommendation) return null;

  const goal = GOALS.find((g) => g.key === recommendation.recommendedGoal) ?? GOALS[0];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.onboardingHeader}>
        <View style={[styles.sparkBadge, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[styles.sparkText, { color: colors.primary }]}>AI Recommendation</Text>
        </View>
        <Text style={[styles.onboardingTitle, { color: colors.foreground }]}>Your Personalised{"\n"}Goal</Text>
      </View>

      <View style={[styles.aiResultCard, { backgroundColor: colors.card, borderColor: goal.color + "40", ...colors.shadow.strong }]}>
        <LinearGradient
          colors={[goal.color + "15", goal.color + "04"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.aiResultTop}>
          <View style={[styles.aiResultIconWrap, { backgroundColor: goal.color + "20" }]}>
            <Ionicons name={goal.icon} size={28} color={goal.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.aiResultGoalName, { color: colors.foreground }]}>{recommendation.recommendedGoal}</Text>
            <View style={[styles.aiResultConfBadge, { backgroundColor: goal.color + "20" }]}>
              <Text style={[styles.aiResultConfText, { color: goal.color }]}>{recommendation.confidence}% confidence</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.aiResultReasoning, { color: colors.foreground }]}>{recommendation.reasoning}</Text>

        <View style={[styles.aiResultDivider, { backgroundColor: colors.border }]} />

        <View style={styles.aiResultMeta}>
          <AIMetaRow icon="flag-outline" label="Priority" value={recommendation.transformationPriority} color={goal.color} colors={colors} />
          <AIMetaRow icon="time-outline" label="Timeline" value={recommendation.estimatedTimeline} color={goal.color} colors={colors} />
          <AIMetaRow icon="person-outline" label="Suitability" value={recommendation.beginnerSuitability} color={goal.color} colors={colors} />
        </View>
      </View>

      <View style={styles.bottomBtns}>
        <TouchableOpacity
          onPress={() => onUseGoal(recommendation.recommendedGoal)}
          style={[styles.primaryBtn, { backgroundColor: goal.color }]}
        >
          <Ionicons name="flash" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Use This Goal & Generate Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onChooseManually} style={[styles.outlineBtn, { borderColor: colors.border }]}>
          <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>Choose Goal Manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AIMetaRow({ icon, label, value, color, colors }: any) {
  return (
    <View style={styles.aiMetaRow}>
      <View style={[styles.aiMetaIconWrap, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View>
        <Text style={[styles.aiMetaLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.aiMetaValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Plan Ready Step ──────────────────────────────────────────────────────────

function PlanReadyStep({ colors, topPad, insets, goal, strategy, plan, expandedDay, expandedEx, onToggleDay, onToggleEx, onSave, onBack }: any) {
  const goalMeta = GOALS.find((g) => g.key === goal) ?? GOALS[0];
  const activeDays = plan.filter((d: PlanDay) => !d.isRest);
  const totalCals = activeDays.reduce((s: number, d: PlanDay) => s + d.estimatedCalories, 0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.planHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={[styles.sparkBadge, { backgroundColor: goalMeta.color + "15" }]}>
            <Ionicons name="checkmark-circle" size={14} color={goalMeta.color} />
            <Text style={[styles.sparkText, { color: goalMeta.color }]}>Plan Ready</Text>
          </View>
          <Text style={[styles.planTitle, { color: colors.foreground }]}>{strategy.splitName}</Text>
          <Text style={[styles.planSubtitle, { color: colors.mutedForeground }]}>for {goal}</Text>
        </View>
      </View>

      {/* Strategy overview */}
      <View style={[styles.strategyCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
        <LinearGradient
          colors={[goalMeta.color + "12", goalMeta.color + "04"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.strategyGrid}>
          <StratStat icon="calendar-outline" label="Days/Week" value={String(strategy.daysPerWeek)} color={goalMeta.color} colors={colors} />
          <StratStat icon="time-outline" label="Duration" value={strategy.sessionDuration} color={goalMeta.color} colors={colors} />
          <StratStat icon="flame-outline" label="Calories/Wk" value={`~${totalCals}`} color={goalMeta.color} colors={colors} />
          <StratStat icon="pulse-outline" label="Intensity" value={strategy.intensity} color={goalMeta.color} colors={colors} />
        </View>
        <View style={[styles.strategyPillRow]}>
          <Pill label={strategy.split} color={goalMeta.color} />
          <Pill label={strategy.cardioFrequency} color="#3B82F6" />
          <Pill label={strategy.progressionStyle} color="#22C55E" />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly Schedule</Text>

      {plan.map((day: PlanDay) => (
        <DayCard
          key={day.dayName}
          day={day}
          colors={colors}
          goalColor={goalMeta.color}
          expanded={expandedDay === day.dayName}
          expandedEx={expandedEx}
          onToggle={() => !day.isRest && onToggleDay(day.dayName)}
          onToggleEx={onToggleEx}
        />
      ))}

      <TouchableOpacity
        onPress={onSave}
        style={[styles.saveBtn, { backgroundColor: goalMeta.color, ...colors.shadow.strong }]}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Start This Plan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StratStat({ icon, label, value, color, colors }: any) {
  return (
    <View style={styles.stratStatItem}>
      <View style={[styles.stratStatIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.stratStatValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.stratStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + "18" }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function DayCard({ day, colors, goalColor, expanded, expandedEx, onToggle, onToggleEx }: any) {
  const isRest = day.isRest;
  const dayColor = day.isCardio ? "#22C55E" : isRest ? colors.mutedForeground : goalColor;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={isRest ? 1 : 0.85}
      style={[styles.dayCard, { backgroundColor: colors.card, ...colors.shadow.soft, borderColor: expanded ? dayColor + "60" : "transparent", borderWidth: 1.5 }]}
    >
      <View style={styles.dayCardHeader}>
        <View style={[styles.dayCardIconWrap, { backgroundColor: dayColor + "18" }]}>
          <Ionicons
            name={day.isCardio ? "flame" : isRest ? "moon" : "barbell"}
            size={20}
            color={dayColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dayCardName, { color: colors.foreground }]}>{day.dayName}</Text>
          <Text style={[styles.dayCardFocus, { color: colors.mutedForeground }]}>{day.focus}</Text>
        </View>
        {!isRest && (
          <View style={styles.dayCardRight}>
            <Text style={[styles.dayCardCals, { color: dayColor }]}>{day.estimatedCalories > 0 ? `~${day.estimatedCalories} kcal` : day.estimatedDuration}</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </View>
        )}
        {isRest && (
          <View style={[styles.restTag, { backgroundColor: colors.muted }]}>
            <Text style={[styles.restTagText, { color: colors.mutedForeground }]}>Rest</Text>
          </View>
        )}
      </View>

      {expanded && !isRest && day.exercises.length > 0 && (
        <View style={styles.exerciseList}>
          {day.exercises.map((ex: ExerciseCard) => (
            <ExerciseItem
              key={ex.id + ex.name}
              ex={ex}
              colors={colors}
              accentColor={dayColor}
              expanded={expandedEx === `${day.dayName}-${ex.id}`}
              onToggle={() => onToggleEx(`${day.dayName}-${ex.id}`)}
            />
          ))}
        </View>
      )}
      {expanded && !isRest && day.exercises.length === 0 && (
        <Text style={[styles.noExText, { color: colors.mutedForeground }]}>Cardio session — choose your preferred activity</Text>
      )}
    </TouchableOpacity>
  );
}

function ExerciseItem({ ex, colors, accentColor, expanded, onToggle }: any) {
  const diffColor = DIFF_COLOR[ex.difficulty] ?? colors.mutedForeground;

  return (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onToggle(); }}
      activeOpacity={0.85}
      style={[styles.exerciseItem, { borderColor: colors.border }]}
    >
      <View style={styles.exerciseItemTop}>
        {ex.gifUrl ? (
          <Image source={{ uri: ex.gifUrl }} style={styles.exerciseGif} resizeMode="cover" />
        ) : (
          <View style={[styles.exerciseGifPlaceholder, { backgroundColor: accentColor + "15" }]}>
            <Ionicons name="barbell-outline" size={22} color={accentColor} />
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.exerciseName, { color: colors.foreground }]} numberOfLines={2}>{ex.name}</Text>
          <Text style={[styles.exerciseTarget, { color: colors.mutedForeground }]}>{ex.target} · {ex.equipment}</Text>
          <View style={styles.exerciseChips}>
            <ExChip label={`${ex.sets} sets`} color={accentColor} />
            <ExChip label={ex.repsRange} color={accentColor} />
            <ExChip label={`${ex.restSeconds}s rest`} color={colors.mutedForeground} />
            <View style={[styles.diffChip, { backgroundColor: diffColor + "18" }]}>
              <Text style={[styles.diffChipText, { color: diffColor }]}>{ex.difficulty}</Text>
            </View>
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </View>

      {expanded && ex.instructions?.length > 0 && (
        <View style={[styles.instructionBox, { backgroundColor: accentColor + "08", borderLeftColor: accentColor }]}>
          {ex.instructions.slice(0, 3).map((inst: string, i: number) => (
            <View key={i} style={styles.instructionRow}>
              <Text style={[styles.instructionNum, { color: accentColor }]}>{i + 1}.</Text>
              <Text style={[styles.instructionText, { color: colors.foreground }]}>{inst}</Text>
            </View>
          ))}
          {ex.secondaryMuscles?.length > 0 && (
            <Text style={[styles.secondaryMuscles, { color: colors.mutedForeground }]}>
              Also works: {ex.secondaryMuscles.slice(0, 3).join(", ")}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function ExChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.exChip, { backgroundColor: color + "12" }]}>
      <Text style={[styles.exChipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },

  onboardingHeader: { gap: 8 },
  sparkBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  sparkText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  onboardingTitle: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 36 },
  onboardingSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },

  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  goalCard: { width: (width - 42) / 2, borderRadius: 16, padding: 14, gap: 8, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  goalIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  goalCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  goalCardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  checkBadge: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  aiSuggestionBox: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1.5 },
  aiSuggestionTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiSuggestionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  aiSuggestionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  askAIBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 44, borderRadius: 12 },
  askAIBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  bottomBtns: { gap: 10, marginTop: 4 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  outlineBtn: { height: 48, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  outlineBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  skipLink: { alignItems: "center", padding: 8 },
  skipLinkText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingCard: { width: "100%", maxWidth: 360, borderRadius: 24, padding: 28, alignItems: "center", gap: 14 },
  loadingIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  loadingTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  loadingSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  loadingDots: { width: "100%", borderRadius: 12, padding: 12, gap: 8 },
  loadingDotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingDotDot: { width: 6, height: 6, borderRadius: 3 },
  loadingDotText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  aiResultCard: { borderRadius: 20, padding: 18, gap: 12, borderWidth: 1.5, overflow: "hidden" },
  aiResultTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiResultIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  aiResultGoalName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  aiResultConfBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  aiResultConfText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  aiResultReasoning: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  aiResultDivider: { height: 1 },
  aiResultMeta: { gap: 10 },
  aiMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiMetaIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiMetaLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  aiMetaValue: { fontSize: 13, fontFamily: "Inter_500Medium" },

  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: { paddingTop: 4 },
  planTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  planSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  strategyCard: { borderRadius: 18, padding: 16, overflow: "hidden", gap: 12 },
  strategyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stratStatItem: { flex: 1, minWidth: "45%", alignItems: "center", gap: 4 },
  stratStatIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stratStatValue: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  stratStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  strategyPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  dayCard: { borderRadius: 16, overflow: "hidden", backgroundColor: "transparent" },
  dayCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  dayCardIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dayCardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dayCardFocus: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  dayCardRight: { alignItems: "flex-end", gap: 4 },
  dayCardCals: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  restTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  restTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  noExText: { fontSize: 13, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 14, fontStyle: "italic" },

  exerciseList: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", paddingTop: 2 },
  exerciseItem: { padding: 12, borderTopWidth: 0.5, gap: 10 },
  exerciseItemTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  exerciseGif: { width: 64, height: 64, borderRadius: 10 },
  exerciseGifPlaceholder: { width: 64, height: 64, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  exerciseName: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  exerciseTarget: { fontSize: 11, fontFamily: "Inter_400Regular" },
  exerciseChips: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  exChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  exChipText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  diffChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  diffChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  instructionBox: { borderLeftWidth: 3, borderRadius: 8, padding: 10, gap: 6 },
  instructionRow: { flexDirection: "row", gap: 6 },
  instructionNum: { fontSize: 12, fontFamily: "Inter_700Bold", minWidth: 16 },
  instructionText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  secondaryMuscles: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 56, borderRadius: 16, marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
