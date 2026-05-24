import { useFitness } from "@/context/FitnessContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AIWorkoutOnboarding from "../workout/ai-onboarding";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseData {
  name: string;
  muscle: string;
  sets: string;
  reps: string;
  rest: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  calories: number;
  tip: string;
  gifUrl?: string;
  target?: string;
  equipment?: string;
  instructions?: string[];
}

interface ProgramCard {
  name: string;
  desc: string;
  duration: string;
  totalCal: number;
  exercises: ExerciseData[];
  color: string;
  gradient: [string, string];
}

// ─── Static fallback data ────────────────────────────────────────────────────

const PUSH_EXERCISES: ExerciseData[] = [
  { name: "Bench Press", muscle: "Chest", sets: "4", reps: "8–10", rest: "90s", difficulty: "Intermediate", calories: 55, tip: "Keep shoulder blades pinched together throughout." },
  { name: "Overhead Press", muscle: "Shoulders", sets: "3", reps: "10–12", rest: "75s", difficulty: "Intermediate", calories: 40, tip: "Brace core and don't flare elbows wide." },
  { name: "Incline DB Press", muscle: "Upper Chest", sets: "3", reps: "10–12", rest: "60s", difficulty: "Beginner", calories: 45, tip: "Use 30–45° incline for best upper chest activation." },
  { name: "Tricep Pushdown", muscle: "Triceps", sets: "3", reps: "12–15", rest: "45s", difficulty: "Beginner", calories: 30, tip: "Keep elbows tucked at sides throughout." },
];
const PULL_EXERCISES: ExerciseData[] = [
  { name: "Pull-ups", muscle: "Back / Lats", sets: "4", reps: "6–10", rest: "90s", difficulty: "Intermediate", calories: 60, tip: "Full dead-hang at bottom for full range of motion." },
  { name: "Barbell Row", muscle: "Upper Back", sets: "4", reps: "8–10", rest: "75s", difficulty: "Intermediate", calories: 55, tip: "Keep back neutral, pull to lower chest." },
  { name: "Face Pulls", muscle: "Rear Delts", sets: "3", reps: "15–20", rest: "45s", difficulty: "Beginner", calories: 25, tip: "External rotate wrists at the end of each rep." },
  { name: "Hammer Curls", muscle: "Biceps", sets: "3", reps: "10–12", rest: "45s", difficulty: "Beginner", calories: 28, tip: "Neutral grip targets brachialis for arm thickness." },
];
const LEG_EXERCISES: ExerciseData[] = [
  { name: "Barbell Squat", muscle: "Quads / Glutes", sets: "4", reps: "8–10", rest: "120s", difficulty: "Advanced", calories: 80, tip: "Drive knees out and keep chest tall." },
  { name: "Romanian Deadlift", muscle: "Hamstrings", sets: "3", reps: "10–12", rest: "75s", difficulty: "Intermediate", calories: 60, tip: "Hinge at hips, keep bar close to body." },
  { name: "Leg Press", muscle: "Quads", sets: "3", reps: "12–15", rest: "60s", difficulty: "Beginner", calories: 50, tip: "Full range but don't lock knees out hard." },
  { name: "Calf Raises", muscle: "Calves", sets: "4", reps: "15–20", rest: "30s", difficulty: "Beginner", calories: 20, tip: "Pause at top for 1 second for peak contraction." },
];

const STATIC_PROGRAMS: ProgramCard[] = [
  { name: "Push Day", desc: "Chest · Shoulders · Triceps", duration: "45–55 min", totalCal: 320, exercises: PUSH_EXERCISES, color: "#FF6B35", gradient: ["#FF6B35", "#E8521A"] },
  { name: "Pull Day", desc: "Back · Biceps · Rear Delts", duration: "50–60 min", totalCal: 370, exercises: PULL_EXERCISES, color: "#8B5CF6", gradient: ["#8B5CF6", "#6D28D9"] },
  { name: "Leg Day", desc: "Quads · Hamstrings · Glutes", duration: "55–70 min", totalCal: 420, exercises: LEG_EXERCISES, color: "#EF4444", gradient: ["#EF4444", "#DC2626"] },
  { name: "HIIT Cardio", desc: "Full body fat burn", duration: "20 min", totalCal: 280, exercises: [], color: "#22C55E", gradient: ["#22C55E", "#16A34A"] },
];

const DIFF_COLOR: Record<string, string> = {
  Beginner: "#22C55E",
  Intermediate: "#F59E0B",
  Advanced: "#EF4444",
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function planDayToProgram(day: any, goalColor: string): ProgramCard {
  const exercises: ExerciseData[] = (day.exercises ?? []).map((ex: any) => ({
    name: ex.name,
    muscle: ex.target ?? ex.bodyPart ?? "",
    sets: String(ex.sets),
    reps: ex.repsRange ?? "10-12",
    rest: ex.restSeconds ? `${ex.restSeconds}s` : "60s",
    difficulty: (ex.difficulty ?? "Beginner") as any,
    calories: (ex.estimatedCaloriesPerSet ?? 12) * (ex.sets ?? 3),
    tip: ex.instructions?.[0] ?? "",
    gifUrl: ex.gifUrl,
    target: ex.target,
    equipment: ex.equipment,
    instructions: ex.instructions,
  }));

  return {
    name: day.focus ?? day.dayName,
    desc: day.isCardio ? "Cardio session" : (day.exercises?.map((e: any) => e.target).filter(Boolean).slice(0, 3).join(" · ") || "Strength training"),
    duration: day.estimatedDuration ?? "45 min",
    totalCal: day.estimatedCalories ?? 300,
    exercises,
    color: day.isCardio ? "#22C55E" : day.isRest ? "#6B7280" : goalColor,
    gradient: [day.isCardio ? "#22C55E" : goalColor, day.isCardio ? "#16A34A" : goalColor + "CC"],
  };
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recentWorkouts, addWorkout } = useFitness();
  const { token } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Onboarding state
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [dynamicPlan, setDynamicPlan] = useState<any[] | null>(null);
  const [dynamicStrategy, setDynamicStrategy] = useState<any | null>(null);

  // Dashboard state
  const [selectedProgram, setSelectedProgram] = useState<ProgramCard | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

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

      if (Platform.OS === "android" && host === "localhost") {
        return "10.0.2.2";
      }

      return host;
    }

    return Platform.OS === "android" ? "10.0.2.2" : "localhost";
  }

  function getApiBase() {
    const EXPO_PUBLIC_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
    if (EXPO_PUBLIC_DOMAIN) return `https://${EXPO_PUBLIC_DOMAIN}`;
    return `http://${resolveApiHost()}:5000`;
  }

  // ── Check onboarding status on mount ──────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setOnboardingChecked(true);
      return;
    }
    checkOnboarding();
  }, [token]);

  const checkOnboarding = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/workout/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.completed && data.workoutPlan) {
        // Already completed — load saved plan into dashboard
        setActiveGoal(data.fitnessGoal ?? null);
        setDynamicPlan(data.workoutPlan);
        setShowOnboarding(false);
      } else if (!data.completed) {
        setShowOnboarding(true);
      }
    } catch {
      // Network error — skip onboarding, show default dashboard
    } finally {
      setOnboardingChecked(true);
    }
  };

  // ── Build programs for the horizontal scroll ───────────────────────────────
  const programs: ProgramCard[] = dynamicPlan
    ? dynamicPlan
        .filter((d) => !d.isRest)
        .map((d) => planDayToProgram(d, colors.primary))
    : STATIC_PROGRAMS;

  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) {
      setSelectedProgram(programs[0]);
    }
  }, [dynamicPlan]);

  // ── Onboarding completion callback ────────────────────────────────────────
  const handleOnboardingComplete = (plan: any[], goal: string, strategy: any) => {
    setDynamicPlan(plan);
    setActiveGoal(goal);
    setDynamicStrategy(strategy);
    setShowOnboarding(false);

    // Pick first non-rest day as selected
    const firstActive = plan.find((d) => !d.isRest);
    if (firstActive) {
      setSelectedProgram(planDayToProgram(firstActive, colors.primary));
    }
  };

  // ── Reset onboarding (Change Workout System) ───────────────────────────────
  const handleChangeWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Change Workout System",
      "This will re-run the AI onboarding to build you a new personalised plan. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            try {
              await fetch(`${getApiBase()}/api/workout/onboarding/reset`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
            } catch {}
            setDynamicPlan(null);
            setActiveGoal(null);
            setSelectedProgram(null);
            setShowOnboarding(true);
          },
        },
      ],
    );
  };

  const logWorkout = () => {
    if (!workoutName.trim()) {
      Alert.alert("Name required", "Give your workout a name");
      return;
    }
    addWorkout({ name: workoutName, date: new Date().toISOString().split("T")[0], duration: 45, exercises: [], calories: 320 });
    setShowModal(false);
    setWorkoutName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Loading state while checking onboarding ───────────────────────────────
  if (!onboardingChecked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Show AI onboarding ────────────────────────────────────────────────────
  if (showOnboarding) {
    return (
      <AIWorkoutOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  // ── Normal workout dashboard ──────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Workouts</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            {activeGoal && (
              <View style={[styles.goalBadge, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="flag" size={11} color={colors.primary} />
                <Text style={[styles.goalBadgeText, { color: colors.primary }]}>{activeGoal}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            {token && (
              <TouchableOpacity
                onPress={handleChangeWorkout}
                style={[styles.changeBtn, { backgroundColor: colors.card, ...colors.shadow.soft }]}
              >
                <Ionicons name="options-outline" size={16} color={colors.primary} />
                <Text style={[styles.changeBtnText, { color: colors.primary }]}>Change</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push("/workout/weekly-plan" as any)}
              style={[styles.planBtn, { backgroundColor: colors.card, ...colors.shadow.soft }]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured workout hero */}
        {dynamicStrategy && (
          <View style={[styles.strategyBanner, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
            <LinearGradient
              colors={[colors.primary + "18", colors.card]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.strategyBannerContent}>
              <View>
                <Text style={[styles.strategyBannerTitle, { color: colors.foreground }]}>{dynamicStrategy.splitName}</Text>
                <Text style={[styles.strategyBannerSub, { color: colors.mutedForeground }]}>
                  {dynamicStrategy.daysPerWeek} days/week · {dynamicStrategy.sessionDuration}
                </Text>
              </View>
              <View style={styles.strategyBannerPills}>
                <StratPill label={dynamicStrategy.intensity} color={colors.primary} />
                <StratPill label={dynamicStrategy.cardioFrequency} color="#3B82F6" />
              </View>
            </View>
          </View>
        )}

        {!dynamicStrategy && (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowModal(true); }}
            style={[styles.heroCard, { ...colors.shadow.strong }]}
          >
            <LinearGradient
              colors={["#1A1A2E", "#16213E", "#0F3460"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGrad}
            >
              <View style={styles.heroBadgeRow}>
                <View style={[styles.heroBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.heroBadgeText}>INTENSE</Text>
                </View>
                <TouchableOpacity style={styles.heroSettings}>
                  <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.heroTitle}>Back Workout</Text>
                <Text style={styles.heroTrainer}>With Azunyan U. Wu</Text>
                <View style={styles.heroStatsRow}>
                  <HeroStat icon="time-outline" value="58min" label="Time" />
                  <HeroStat icon="flame-outline" value="254kcal" label="Calorie" />
                  <HeroStat icon="layers-outline" value="3×4" label="Sets" />
                </View>
                <View style={styles.heroBtns}>
                  <TouchableOpacity style={styles.detailsBtn}>
                    <Text style={styles.detailsText}>Details</Text>
                    <Ionicons name="document-text-outline" size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowModal(true); }}
                    style={[styles.startBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.startText}>Start</Text>
                    <Ionicons name="flame" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Programs */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {dynamicPlan ? "Your Training Days" : "Training Programs"}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.programList}>
          {programs.map((p) => (
            <TouchableOpacity
              key={p.name}
              onPress={() => { Haptics.selectionAsync(); setSelectedProgram(selectedProgram?.name === p.name ? null : p); }}
              style={[styles.programCard, { backgroundColor: colors.card, ...colors.shadow.soft, borderWidth: selectedProgram?.name === p.name ? 2 : 0, borderColor: p.color }]}
            >
              <LinearGradient colors={[p.color + "20", p.color + "08"]} style={StyleSheet.absoluteFillObject} />
              <View style={[styles.programIconWrap, { backgroundColor: p.color + "20" }]}>
                <Ionicons name="barbell-outline" size={22} color={p.color} />
              </View>
              <Text style={[styles.programName, { color: colors.foreground }]}>{p.name}</Text>
              <Text style={[styles.programDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
              <View style={styles.programMeta}>
                <Ionicons name="time-outline" size={11} color={colors.mutedForeground} />
                <Text style={[styles.programTime, { color: colors.mutedForeground }]}>{p.duration}</Text>
              </View>
              <View style={styles.programMeta}>
                <Ionicons name="flame-outline" size={11} color={colors.mutedForeground} />
                <Text style={[styles.programTime, { color: colors.mutedForeground }]}>{p.totalCal} kcal</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercises for selected program */}
        {selectedProgram && selectedProgram.exercises.length > 0 && (
          <>
            <View style={styles.exHeader}>
              <Text style={[styles.exHeaderTitle, { color: colors.foreground }]}>
                {selectedProgram.name} — {selectedProgram.exercises.length} exercises
              </Text>
              <TouchableOpacity
                onPress={() => {
                  addWorkout({ name: selectedProgram.name, date: new Date().toISOString().split("T")[0], duration: 55, exercises: [], calories: selectedProgram.totalCal });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("✓ Logged!", `${selectedProgram.name} recorded.`);
                }}
                style={[styles.logAllBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={styles.logAllText}>Log All</Text>
              </TouchableOpacity>
            </View>
            {selectedProgram.exercises.map((ex) => (
              <TouchableOpacity
                key={ex.name}
                onPress={() => { Haptics.selectionAsync(); setExpandedEx(expandedEx === ex.name ? null : ex.name); }}
                activeOpacity={0.85}
                style={[styles.exCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}
              >
                <View style={styles.exTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.exTitleRow}>
                      <Text style={[styles.exName, { color: colors.foreground }]}>{ex.name}</Text>
                      <View style={[styles.diffTag, { backgroundColor: (DIFF_COLOR[ex.difficulty] ?? "#aaa") + "18" }]}>
                        <Text style={[styles.diffText, { color: DIFF_COLOR[ex.difficulty] ?? "#aaa" }]}>{ex.difficulty}</Text>
                      </View>
                    </View>
                    <Text style={[styles.exMuscle, { color: colors.mutedForeground }]}>{ex.muscle}</Text>
                  </View>
                  <Ionicons name={expandedEx === ex.name ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                </View>
                <View style={styles.exChips}>
                  <ExChip label={`${ex.sets} sets`} color={colors.primary} />
                  <ExChip label={`${ex.reps} reps`} color={colors.primary} />
                  <ExChip label={ex.rest} color={colors.mutedForeground} />
                  <ExChip label={`~${ex.calories} kcal`} color={colors.red} />
                </View>
                {expandedEx === ex.name && (
                  <View style={[styles.tipBox, { backgroundColor: colors.primary + "10", borderLeftColor: colors.primary }]}>
                    <Ionicons name="bulb-outline" size={13} color={colors.primary} />
                    <Text style={[styles.tipText, { color: colors.foreground }]}>{ex.tip || ex.instructions?.[0] || "Focus on proper form throughout."}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* AI Onboarding prompt if no plan yet */}
        {!dynamicPlan && !token && (
          <View style={[styles.aiPromptCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
            <Text style={[styles.aiPromptTitle, { color: colors.foreground }]}>Get a personalised plan</Text>
            <Text style={[styles.aiPromptSub, { color: colors.mutedForeground }]}>Log in to unlock AI-generated workouts tailored to your body composition.</Text>
          </View>
        )}

        {/* Recent */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Workouts</Text>
        {recentWorkouts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
            <Ionicons name="barbell-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No workouts yet. Start your first one!</Text>
          </View>
        ) : (
          recentWorkouts.slice(0, 5).map((w) => (
            <View key={w.id} style={[styles.recentCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
              <View style={[styles.recentIcon, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="barbell" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentName, { color: colors.foreground }]}>{w.name}</Text>
                <Text style={[styles.recentMeta, { color: colors.mutedForeground }]}>{w.date} · {w.duration} min</Text>
              </View>
              <View style={styles.recentRight}>
                <Text style={[styles.recentCal, { color: colors.primary }]}>{w.calories}</Text>
                <Text style={[styles.recentCalLabel, { color: colors.mutedForeground }]}>kcal</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Log workout modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Quick Log Workout</Text>
            <TextInput
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Workout name (e.g. Push Day)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.sheetInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
            />
            <TouchableOpacity onPress={logWorkout} style={[styles.sheetBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.sheetBtnText}>Log Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.sheetCancel}>
              <Text style={[styles.sheetCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StratPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[stratPillStyles.pill, { backgroundColor: color + "18" }]}>
      <Text style={[stratPillStyles.text, { color }]}>{label}</Text>
    </View>
  );
}
const stratPillStyles = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  text: { fontSize: 11, fontFamily: "Inter_500Medium" },
});

function HeroStat({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={styles.heroStatItem}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.6)" />
      <Text style={styles.heroStatVal}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function ExChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.exChip, { backgroundColor: color + "12" }]}>
      <Text style={[styles.exChipText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  goalBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  goalBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  changeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  changeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  planBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },

  strategyBanner: { borderRadius: 16, padding: 14, overflow: "hidden" },
  strategyBannerContent: { gap: 8 },
  strategyBannerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  strategyBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  strategyBannerPills: { flexDirection: "row", gap: 6 },

  heroCard: { borderRadius: 20, overflow: "hidden" },
  heroGrad: { padding: 20, minHeight: 220, justifyContent: "space-between" },
  heroBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  heroBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  heroSettings: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  heroBody: { gap: 8 },
  heroTitle: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  heroTrainer: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_400Regular" },
  heroStatsRow: { flexDirection: "row", gap: 20, marginVertical: 4 },
  heroStatItem: { alignItems: "flex-start", gap: 2 },
  heroStatVal: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  heroStatLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular" },
  heroBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  detailsBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  detailsText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  startBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  startText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: -6 },
  programList: { gap: 10, paddingRight: 16 },
  programCard: { width: 155, borderRadius: 16, padding: 14, gap: 6, overflow: "hidden" },
  programIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  programName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  programDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  programMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  programTime: { fontSize: 11, fontFamily: "Inter_400Regular" },

  exHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exHeaderTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  logAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  logAllText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  exCard: { borderRadius: 16, padding: 14, gap: 8, marginBottom: 4 },
  exTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  exTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  exName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  exMuscle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  diffTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  exChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  exChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  exChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  tipBox: { flexDirection: "row", gap: 6, alignItems: "flex-start", padding: 10, borderRadius: 10, borderLeftWidth: 3 },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  aiPromptCard: { borderRadius: 16, padding: 20, alignItems: "center", gap: 10 },
  aiPromptTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  aiPromptSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  emptyCard: { borderRadius: 16, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  recentCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, marginBottom: 4 },
  recentIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  recentName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  recentMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  recentRight: { alignItems: "flex-end" },
  recentCal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  recentCalLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sheetInput: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular" },
  sheetBtn: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sheetCancel: { alignItems: "center", padding: 8 },
  sheetCancelText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
