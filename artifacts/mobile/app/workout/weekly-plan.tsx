import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DayPlan = {
  day: string;
  label: string;
  type: "push" | "pull" | "legs" | "upper" | "lower" | "cardio" | "rest";
  muscles: string[];
  duration: string;
  calories: number;
  exercises: Exercise[];
};

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes: string;
  muscle: string;
};

type WorkoutPlan = {
  name: string;
  description: string;
  level: string;
  goal: string;
  color: string;
  days: DayPlan[];
};

const TYPE_META: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  push: { color: "#00D4FF", icon: "barbell", label: "Push" },
  pull: { color: "#FF6B35", icon: "fitness", label: "Pull" },
  legs: { color: "#00FF88", icon: "walk", label: "Legs" },
  upper: { color: "#8B5CF6", icon: "body", label: "Upper" },
  lower: { color: "#FBBF24", icon: "walk", label: "Lower" },
  cardio: { color: "#FF4757", icon: "flame", label: "Cardio" },
  rest: { color: "#1A2540", icon: "moon", label: "Rest" },
};

const PPL_EXERCISES = {
  push: [
    { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest: "90s", notes: "Control the eccentric", muscle: "Chest" },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "75s", notes: "15-30° incline", muscle: "Chest" },
    { name: "Cable Fly", sets: 3, reps: "12-15", rest: "60s", notes: "Squeeze at peak contraction", muscle: "Chest" },
    { name: "Overhead Press", sets: 4, reps: "8-10", rest: "90s", notes: "Keep core tight", muscle: "Shoulders" },
    { name: "Lateral Raises", sets: 3, reps: "15-20", rest: "45s", notes: "Light weight, strict form", muscle: "Shoulders" },
    { name: "Tricep Pushdown", sets: 3, reps: "12-15", rest: "60s", notes: "Full extension at bottom", muscle: "Triceps" },
    { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", rest: "60s", notes: "Keep elbows tucked", muscle: "Triceps" },
  ],
  pull: [
    { name: "Deadlift", sets: 4, reps: "5-6", rest: "120s", notes: "Hinge at hips, keep back straight", muscle: "Back" },
    { name: "Pull-ups / Lat Pulldown", sets: 4, reps: "8-10", rest: "90s", notes: "Full stretch at top", muscle: "Back" },
    { name: "Seated Cable Row", sets: 3, reps: "10-12", rest: "75s", notes: "Elbows close to body", muscle: "Back" },
    { name: "Face Pulls", sets: 3, reps: "15-20", rest: "45s", notes: "External rotation at end", muscle: "Rear Delts" },
    { name: "Barbell Curl", sets: 3, reps: "10-12", rest: "60s", notes: "No momentum", muscle: "Biceps" },
    { name: "Hammer Curl", sets: 3, reps: "12-15", rest: "60s", notes: "Neutral grip", muscle: "Biceps" },
  ],
  legs: [
    { name: "Barbell Squat", sets: 4, reps: "8-10", rest: "120s", notes: "Break parallel, knees track toes", muscle: "Quads" },
    { name: "Romanian Deadlift", sets: 4, reps: "10-12", rest: "90s", notes: "Keep bar close to legs", muscle: "Hamstrings" },
    { name: "Leg Press", sets: 3, reps: "12-15", rest: "75s", notes: "Full range of motion", muscle: "Quads" },
    { name: "Leg Curl", sets: 3, reps: "12-15", rest: "60s", notes: "Slow eccentric", muscle: "Hamstrings" },
    { name: "Hip Thrust", sets: 3, reps: "12-15", rest: "75s", notes: "Full hip extension at top", muscle: "Glutes" },
    { name: "Standing Calf Raise", sets: 4, reps: "15-20", rest: "45s", notes: "Full stretch at bottom", muscle: "Calves" },
  ],
};

const PLANS: WorkoutPlan[] = [
  {
    name: "Push Pull Legs",
    description: "The gold standard split for intermediate lifters. 6 days per week.",
    level: "Intermediate",
    goal: "Muscle Gain",
    color: "#00D4FF",
    days: [
      { day: "Mon", label: "Monday", type: "push", muscles: ["Chest", "Shoulders", "Triceps"], duration: "55 min", calories: 380, exercises: PPL_EXERCISES.push },
      { day: "Tue", label: "Tuesday", type: "pull", muscles: ["Back", "Biceps", "Rear Delts"], duration: "60 min", calories: 360, exercises: PPL_EXERCISES.pull },
      { day: "Wed", label: "Wednesday", type: "legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"], duration: "65 min", calories: 480, exercises: PPL_EXERCISES.legs },
      { day: "Thu", label: "Thursday", type: "push", muscles: ["Chest", "Shoulders", "Triceps"], duration: "55 min", calories: 380, exercises: PPL_EXERCISES.push },
      { day: "Fri", label: "Friday", type: "pull", muscles: ["Back", "Biceps", "Rear Delts"], duration: "60 min", calories: 360, exercises: PPL_EXERCISES.pull },
      { day: "Sat", label: "Saturday", type: "legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"], duration: "65 min", calories: 480, exercises: PPL_EXERCISES.legs },
      { day: "Sun", label: "Sunday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
    ],
  },
  {
    name: "Upper Lower",
    description: "4 day split focusing on upper and lower body. Great for strength.",
    level: "Beginner–Intermediate",
    goal: "Strength & Size",
    color: "#8B5CF6",
    days: [
      { day: "Mon", label: "Monday", type: "upper", muscles: ["Chest", "Back", "Shoulders", "Arms"], duration: "60 min", calories: 400, exercises: [...PPL_EXERCISES.push.slice(0, 3), ...PPL_EXERCISES.pull.slice(1, 4)] },
      { day: "Tue", label: "Tuesday", type: "lower", muscles: ["Quads", "Hamstrings", "Glutes"], duration: "65 min", calories: 500, exercises: PPL_EXERCISES.legs },
      { day: "Wed", label: "Wednesday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
      { day: "Thu", label: "Thursday", type: "upper", muscles: ["Chest", "Back", "Shoulders", "Arms"], duration: "60 min", calories: 400, exercises: [...PPL_EXERCISES.push.slice(3), ...PPL_EXERCISES.pull.slice(4)] },
      { day: "Fri", label: "Friday", type: "lower", muscles: ["Quads", "Hamstrings", "Glutes"], duration: "65 min", calories: 500, exercises: PPL_EXERCISES.legs },
      { day: "Sat", label: "Saturday", type: "cardio", muscles: ["Full Body"], duration: "30 min", calories: 280, exercises: [] },
      { day: "Sun", label: "Sunday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
    ],
  },
  {
    name: "Fat Loss Routine",
    description: "High volume, compound-first training with cardio finishers.",
    level: "All Levels",
    goal: "Fat Loss",
    color: "#FF6B35",
    days: [
      { day: "Mon", label: "Monday", type: "upper", muscles: ["Chest", "Back", "Core"], duration: "50 min", calories: 450, exercises: PPL_EXERCISES.push.slice(0, 4) },
      { day: "Tue", label: "Tuesday", type: "cardio", muscles: ["Full Body"], duration: "30 min", calories: 350, exercises: [] },
      { day: "Wed", label: "Wednesday", type: "lower", muscles: ["Quads", "Glutes", "Core"], duration: "50 min", calories: 520, exercises: PPL_EXERCISES.legs.slice(0, 4) },
      { day: "Thu", label: "Thursday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
      { day: "Fri", label: "Friday", type: "upper", muscles: ["Back", "Shoulders", "Arms"], duration: "50 min", calories: 400, exercises: PPL_EXERCISES.pull.slice(0, 4) },
      { day: "Sat", label: "Saturday", type: "cardio", muscles: ["Full Body"], duration: "45 min", calories: 420, exercises: [] },
      { day: "Sun", label: "Sunday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
    ],
  },
  {
    name: "Beginner Routine",
    description: "Full body 3x per week. Perfect for gym newcomers.",
    level: "Beginner",
    goal: "General Fitness",
    color: "#00FF88",
    days: [
      { day: "Mon", label: "Monday", type: "upper", muscles: ["Full Body"], duration: "45 min", calories: 300, exercises: [PPL_EXERCISES.push[0], PPL_EXERCISES.pull[1], PPL_EXERCISES.push[3], PPL_EXERCISES.pull[4]] },
      { day: "Tue", label: "Tuesday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
      { day: "Wed", label: "Wednesday", type: "lower", muscles: ["Full Body"], duration: "45 min", calories: 350, exercises: PPL_EXERCISES.legs.slice(0, 4) },
      { day: "Thu", label: "Thursday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
      { day: "Fri", label: "Friday", type: "upper", muscles: ["Full Body"], duration: "45 min", calories: 300, exercises: [PPL_EXERCISES.push[0], PPL_EXERCISES.pull[1], PPL_EXERCISES.push[3], PPL_EXERCISES.pull[4]] },
      { day: "Sat", label: "Saturday", type: "cardio", muscles: ["Cardio"], duration: "20 min", calories: 200, exercises: [] },
      { day: "Sun", label: "Sunday", type: "rest", muscles: [], duration: "—", calories: 0, exercises: [] },
    ],
  },
];

export default function WeeklyPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [showExercise, setShowExercise] = useState<Exercise | null>(null);

  const plan = PLANS[selectedPlanIdx];
  const dayPlan = plan.days[selectedDayIdx];
  const meta = TYPE_META[dayPlan.type];

  const toggleComplete = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCompletedDays((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const weekDone = plan.days.filter((d) => completedDays.has(`${selectedPlanIdx}-${d.day}`)).length;
  const weekPct = weekDone / plan.days.filter((d) => d.type !== "rest").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[plan.color + "18", colors.background]}
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
            Weekly Plan
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Plan selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.planList}
        >
          {PLANS.map((p, i) => (
            <TouchableOpacity
              key={p.name}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedPlanIdx(i);
                setSelectedDayIdx(0);
              }}
              style={[
                styles.planChip,
                {
                  backgroundColor: selectedPlanIdx === i ? p.color + "20" : colors.card,
                  borderColor: selectedPlanIdx === i ? p.color : colors.border,
                },
              ]}
            >
              <View style={[styles.planDot, { backgroundColor: p.color }]} />
              <View>
                <Text
                  style={[
                    styles.planChipName,
                    {
                      color: selectedPlanIdx === i ? p.color : colors.foreground,
                      fontFamily: selectedPlanIdx === i ? "Inter_600SemiBold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {p.name}
                </Text>
                <Text style={[styles.planChipLevel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {p.level}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Plan info */}
        <GlassCard style={styles.planInfoCard}>
          <View style={styles.planInfoTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planInfoName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {plan.name}
              </Text>
              <Text style={[styles.planInfoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {plan.description}
              </Text>
            </View>
            <View style={[styles.planGoalBadge, { backgroundColor: plan.color + "20" }]}>
              <Text style={[styles.planGoalTxt, { color: plan.color, fontFamily: "Inter_600SemiBold" }]}>
                {plan.goal}
              </Text>
            </View>
          </View>

          {/* Weekly progress */}
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              This week: {weekDone}/{plan.days.filter((d) => d.type !== "rest").length} sessions
            </Text>
            <Text style={[styles.progressPct, { color: plan.color, fontFamily: "Inter_700Bold" }]}>
              {Math.round(weekPct * 100)}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${weekPct * 100}%` as any, backgroundColor: plan.color },
              ]}
            />
          </View>
        </GlassCard>

        {/* Day selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayList}
        >
          {plan.days.map((d, i) => {
            const dm = TYPE_META[d.type];
            const key = `${selectedPlanIdx}-${d.day}`;
            const done = completedDays.has(key);
            const isSelected = selectedDayIdx === i;
            return (
              <TouchableOpacity
                key={d.day}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDayIdx(i);
                }}
                style={[
                  styles.dayBtn,
                  {
                    backgroundColor: isSelected
                      ? dm.color + "20"
                      : done
                        ? colors.green + "10"
                        : colors.card,
                    borderColor: isSelected ? dm.color : done ? colors.green : colors.border,
                  },
                ]}
              >
                {done && (
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} style={styles.dayCheck} />
                )}
                <Text
                  style={[
                    styles.dayBtnLabel,
                    { color: isSelected ? dm.color : colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {d.day}
                </Text>
                <View style={[styles.dayTypeDot, { backgroundColor: dm.color }]} />
                <Text
                  style={[
                    styles.dayTypeTxt,
                    { color: isSelected ? dm.color : colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {dm.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day detail */}
        <GlassCard style={styles.dayCard}>
          <View style={styles.dayCardHeader}>
            <View style={[styles.dayCardIcon, { backgroundColor: meta.color + "20" }]}>
              <Ionicons name={meta.icon} size={24} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dayCardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {dayPlan.label} — {meta.label}
              </Text>
              {dayPlan.muscles.length > 0 && (
                <Text style={[styles.dayCardMuscles, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {dayPlan.muscles.join(" · ")}
                </Text>
              )}
            </View>
            {dayPlan.type !== "rest" && (
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={[styles.dayCardDuration, { color: meta.color, fontFamily: "Inter_600SemiBold" }]}>
                  {dayPlan.duration}
                </Text>
                <Text style={[styles.dayCardCalories, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  ~{dayPlan.calories} kcal
                </Text>
              </View>
            )}
          </View>

          {dayPlan.type === "rest" ? (
            <View style={styles.restCard}>
              <Ionicons name="moon" size={36} color={colors.mutedForeground} />
              <Text style={[styles.restTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Rest Day
              </Text>
              <Text style={[styles.restSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Recovery is part of the plan. Sleep well, stay hydrated, and eat enough protein.
              </Text>
            </View>
          ) : dayPlan.type === "cardio" ? (
            <View style={styles.cardioCard}>
              <Ionicons name="flame" size={36} color="#FF4757" />
              <Text style={[styles.restTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Cardio Session
              </Text>
              <Text style={[styles.restSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {dayPlan.duration} of moderate-intensity cardio. Options: treadmill, cycling, jump rope, or stair climber.
              </Text>
            </View>
          ) : (
            <View style={styles.exerciseList}>
              {dayPlan.exercises.map((ex, idx) => (
                <TouchableOpacity
                  key={ex.name}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowExercise(ex);
                  }}
                  activeOpacity={0.85}
                  style={[styles.exerciseRow, { borderBottomColor: colors.border }]}
                >
                  <View style={[styles.exNum, { backgroundColor: meta.color + "20" }]}>
                    <Text style={[styles.exNumTxt, { color: meta.color, fontFamily: "Inter_700Bold" }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {ex.name}
                    </Text>
                    <Text style={[styles.exMuscle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {ex.muscle}
                    </Text>
                  </View>
                  <View style={styles.exMeta}>
                    <Text style={[styles.exSets, { color: meta.color, fontFamily: "Inter_700Bold" }]}>
                      {ex.sets}×{ex.reps}
                    </Text>
                    <Text style={[styles.exRest, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {ex.rest} rest
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {dayPlan.type !== "rest" && (
            <TouchableOpacity
              onPress={() => {
                const key = `${selectedPlanIdx}-${dayPlan.day}`;
                toggleComplete(key);
                if (!completedDays.has(key)) {
                  Alert.alert("Workout Complete!", `${dayPlan.label} session logged. +${dayPlan.calories} kcal burned.`);
                }
              }}
              style={[
                styles.markDoneBtn,
                {
                  backgroundColor: completedDays.has(`${selectedPlanIdx}-${dayPlan.day}`)
                    ? colors.green + "20"
                    : meta.color,
                  borderWidth: completedDays.has(`${selectedPlanIdx}-${dayPlan.day}`) ? 1.5 : 0,
                  borderColor: colors.green,
                },
              ]}
            >
              <Ionicons
                name={
                  completedDays.has(`${selectedPlanIdx}-${dayPlan.day}`)
                    ? "checkmark-circle"
                    : "checkmark-circle-outline"
                }
                size={20}
                color={
                  completedDays.has(`${selectedPlanIdx}-${dayPlan.day}`)
                    ? colors.green
                    : "#FFFFFF"
                }
              />
              <Text
                style={[
                  styles.markDoneTxt,
                  {
                    color: completedDays.has(`${selectedPlanIdx}-${dayPlan.day}`)
                      ? colors.green
                      : "#FFFFFF",
                    fontFamily: "Inter_700Bold",
                  },
                ]}
              >
                {completedDays.has(`${selectedPlanIdx}-${dayPlan.day}`)
                  ? "Completed"
                  : "Mark as Done"}
              </Text>
            </TouchableOpacity>
          )}
        </GlassCard>
      </ScrollView>

      {/* Exercise detail modal */}
      <Modal visible={!!showExercise} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            {showExercise && (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {showExercise.name}
                </Text>
                <View style={[styles.modalMuscleBadge, { backgroundColor: meta.color + "20" }]}>
                  <Text style={[styles.modalMuscleTxt, { color: meta.color, fontFamily: "Inter_600SemiBold" }]}>
                    {showExercise.muscle}
                  </Text>
                </View>
                <View style={styles.modalStats}>
                  {[
                    { label: "Sets", value: String(showExercise.sets) },
                    { label: "Reps", value: showExercise.reps },
                    { label: "Rest", value: showExercise.rest },
                  ].map((s) => (
                    <View key={s.label} style={[styles.modalStat, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                      <Text style={[styles.modalStatVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                        {s.value}
                      </Text>
                      <Text style={[styles.modalStatLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {s.label}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.notesBox, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.notesTxt, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {showExercise.notes}
                  </Text>
                </View>
                <View style={[styles.videoPlaceholder, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                  <Ionicons name="play-circle" size={40} color={meta.color} />
                  <Text style={[styles.videoTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Exercise demo video
                  </Text>
                </View>
              </>
            )}
            <TouchableOpacity
              onPress={() => setShowExercise(null)}
              style={[styles.closeBtn, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.closeBtnTxt, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Close
              </Text>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 24 },
  planList: { gap: 10, paddingRight: 16 },
  planChip: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  planDot: { width: 8, height: 8, borderRadius: 4 },
  planChipName: { fontSize: 14 },
  planChipLevel: { fontSize: 11, marginTop: 1 },
  planInfoCard: { padding: 16, gap: 12 },
  planInfoTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  planInfoName: { fontSize: 18 },
  planInfoDesc: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  planGoalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  planGoalTxt: { fontSize: 12 },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 13 },
  progressPct: { fontSize: 13 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  dayList: { gap: 8, paddingRight: 16 },
  dayBtn: { alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, minWidth: 60, gap: 4, position: "relative" },
  dayCheck: { position: "absolute", top: -6, right: -6 },
  dayBtnLabel: { fontSize: 13 },
  dayTypeDot: { width: 6, height: 6, borderRadius: 3 },
  dayTypeTxt: { fontSize: 10 },
  dayCard: { padding: 16, gap: 14 },
  dayCardHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  dayCardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  dayCardTitle: { fontSize: 16 },
  dayCardMuscles: { fontSize: 12, marginTop: 2 },
  dayCardDuration: { fontSize: 14 },
  dayCardCalories: { fontSize: 12 },
  restCard: { alignItems: "center", gap: 10, paddingVertical: 20 },
  cardioCard: { alignItems: "center", gap: 10, paddingVertical: 20 },
  restTitle: { fontSize: 18 },
  restSub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  exerciseList: { gap: 0 },
  exerciseRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  exNum: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  exNumTxt: { fontSize: 14 },
  exName: { fontSize: 14 },
  exMuscle: { fontSize: 12, marginTop: 1 },
  exMeta: { alignItems: "flex-end" },
  exSets: { fontSize: 14 },
  exRest: { fontSize: 11 },
  markDoneBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, marginTop: 4 },
  markDoneTxt: { fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000070" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, gap: 14 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
  modalTitle: { fontSize: 20 },
  modalMuscleBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  modalMuscleTxt: { fontSize: 13 },
  modalStats: { flexDirection: "row", gap: 10 },
  modalStat: { flex: 1, alignItems: "center", padding: 14, gap: 4 },
  modalStatVal: { fontSize: 20 },
  modalStatLabel: { fontSize: 12 },
  notesBox: { flexDirection: "row", gap: 10, padding: 12, alignItems: "flex-start" },
  notesTxt: { flex: 1, fontSize: 13, lineHeight: 20 },
  videoPlaceholder: { height: 100, alignItems: "center", justifyContent: "center", gap: 8 },
  videoTxt: { fontSize: 13 },
  closeBtn: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  closeBtnTxt: { fontSize: 15 },
});
