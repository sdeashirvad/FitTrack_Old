import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useFitness } from "@/context/FitnessContext";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ExerciseCard {
  name: string;
  muscle: string;
  sets: string;
  reps: string;
  rest: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  calories: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  tip: string;
}

const PUSH_EXERCISES: ExerciseCard[] = [
  { name: "Bench Press", muscle: "Chest", sets: "4", reps: "8–10", rest: "90s", difficulty: "Intermediate", calories: 55, icon: "barbell", color: "#FF8A00", tip: "Keep shoulder blades pinched together throughout." },
  { name: "Overhead Press", muscle: "Shoulders", sets: "3", reps: "10–12", rest: "75s", difficulty: "Intermediate", calories: 40, icon: "fitness", color: "#8B5CF6", tip: "Brace core and don't flare elbows wide." },
  { name: "Incline DB Press", muscle: "Upper Chest", sets: "3", reps: "10–12", rest: "60s", difficulty: "Beginner", calories: 45, icon: "barbell", color: "#10B981", tip: "Use 30–45° incline for best upper chest activation." },
  { name: "Tricep Pushdown", muscle: "Triceps", sets: "3", reps: "12–15", rest: "45s", difficulty: "Beginner", calories: 30, icon: "body", color: "#06B6D4", tip: "Keep elbows tucked at sides throughout the movement." },
];

const PULL_EXERCISES: ExerciseCard[] = [
  { name: "Pull-ups", muscle: "Back / Lats", sets: "4", reps: "6–10", rest: "90s", difficulty: "Intermediate", calories: 60, icon: "body", color: "#FF8A00", tip: "Full dead-hang at bottom for full range of motion." },
  { name: "Barbell Row", muscle: "Upper Back", sets: "4", reps: "8–10", rest: "75s", difficulty: "Intermediate", calories: 55, icon: "barbell", color: "#8B5CF6", tip: "Keep back neutral, pull to lower chest." },
  { name: "Face Pulls", muscle: "Rear Delts", sets: "3", reps: "15–20", rest: "45s", difficulty: "Beginner", calories: 25, icon: "fitness", color: "#10B981", tip: "External rotate wrists at the end of each rep." },
  { name: "Hammer Curls", muscle: "Biceps", sets: "3", reps: "10–12", rest: "45s", difficulty: "Beginner", calories: 28, icon: "body", color: "#06B6D4", tip: "Neutral grip targets brachialis for arm thickness." },
];

const LEG_EXERCISES: ExerciseCard[] = [
  { name: "Barbell Squat", muscle: "Quads / Glutes", sets: "4", reps: "8–10", rest: "120s", difficulty: "Advanced", calories: 80, icon: "barbell", color: "#EF4444", tip: "Drive knees out and keep chest tall." },
  { name: "Romanian Deadlift", muscle: "Hamstrings", sets: "3", reps: "10–12", rest: "75s", difficulty: "Intermediate", calories: 60, icon: "fitness", color: "#FF8A00", tip: "Hinge at hips, keep bar close to body." },
  { name: "Leg Press", muscle: "Quads", sets: "3", reps: "12–15", rest: "60s", difficulty: "Beginner", calories: 50, icon: "body", color: "#8B5CF6", tip: "Full range — but don't let knees lock out hard." },
  { name: "Calf Raises", muscle: "Calves", sets: "4", reps: "15–20", rest: "30s", difficulty: "Beginner", calories: 20, icon: "body", color: "#10B981", tip: "Pause at top for 1 second to maximise peak contraction." },
];

const PROGRAMS = [
  { name: "Push Day", desc: "Chest · Shoulders · Triceps", icon: "barbell" as const, color: "#FF8A00", exercises: PUSH_EXERCISES, duration: "45–55 min" },
  { name: "Pull Day", desc: "Back · Biceps · Rear Delts", icon: "fitness" as const, color: "#8B5CF6", exercises: PULL_EXERCISES, duration: "50–60 min" },
  { name: "Leg Day", desc: "Quads · Hamstrings · Glutes", icon: "body" as const, color: "#EF4444", exercises: LEG_EXERCISES, duration: "55–70 min" },
  { name: "HIIT Cardio", desc: "Full body fat burn", icon: "flame" as const, color: "#F59E0B", exercises: [], duration: "20 min" },
];

const DIFF_COLORS: Record<string, string> = {
  Beginner: "#10B981",
  Intermediate: "#F59E0B",
  Advanced: "#EF4444",
};

function ExerciseCardRow({ ex }: { ex: ExerciseCard }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        setExpanded(!expanded);
      }}
      activeOpacity={0.85}
    >
      <GlassCard style={styles.exCard}>
        <View style={[styles.exIcon, { backgroundColor: ex.color + "18" }]}>
          <Ionicons name={ex.icon} size={22} color={ex.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.exTopRow}>
            <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{ex.name}</Text>
            <View style={[styles.diffBadge, { backgroundColor: DIFF_COLORS[ex.difficulty] + "18" }]}>
              <Text style={[colors.typography.tiny, { color: DIFF_COLORS[ex.difficulty] }]}>
                {ex.difficulty}
              </Text>
            </View>
          </View>
          <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
            {ex.muscle}
          </Text>
          <View style={styles.exMeta}>
            <MetaChip icon="layers-outline" label={`${ex.sets} sets`} color={ex.color} />
            <MetaChip icon="repeat" label={`${ex.reps} reps`} color={ex.color} />
            <MetaChip icon="time-outline" label={ex.rest} color={colors.mutedForeground} />
            <MetaChip icon="flame-outline" label={`~${ex.calories} kcal`} color={colors.red} />
          </View>
          {expanded && (
            <View style={[styles.tipBox, { backgroundColor: colors.primary + "10", borderLeftColor: colors.primary }]}>
              <Ionicons name="bulb-outline" size={13} color={colors.primary} />
              <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
                {ex.tip}
              </Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </GlassCard>
    </TouchableOpacity>
  );
}

function MetaChip({ icon, label, color }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[colors.typography.tiny, { color }]}>{label}</Text>
    </View>
  );
}

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recentWorkouts, addWorkout } = useFitness();
  const [showQuick, setShowQuick] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<typeof PROGRAMS[0] | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const startQuickWorkout = () => {
    if (!workoutName.trim()) {
      Alert.alert("Name required", "Give your workout a name");
      return;
    }
    addWorkout({
      name: workoutName,
      date: new Date().toISOString().split("T")[0],
      duration: 45,
      exercises: [],
      calories: 320,
    });
    setShowQuick(false);
    setWorkoutName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Workout Logged!", "Great job! Keep it up.");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "16", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[colors.typography.h1, { color: colors.foreground }]}>Workouts</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/workout/weekly-plan" as any);
            }}
            style={[styles.planBtn, { backgroundColor: colors.primary + "18", borderRadius: colors.radiusSmall }]}
          >
            <Ionicons name="calendar" size={16} color={colors.primary} />
            <Text style={[colors.typography.caption, { color: colors.primary }]}>Weekly Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Start workout CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowQuick(true);
          }}
          activeOpacity={0.87}
          style={[styles.startBtn, { borderRadius: colors.radius, overflow: "hidden" }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnInner}
          >
            <View style={styles.startBtnContent}>
              <View style={[styles.playIcon, { backgroundColor: "#ffffff25" }]}>
                <Ionicons name="play" size={20} color="#fff" />
              </View>
              <View>
                <Text style={[colors.typography.h3, { color: "#fff" }]}>Start Workout</Text>
                <Text style={[colors.typography.caption, { color: "#fff9" }]}>
                  Quick log · Free form
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#fff6" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Feature cards */}
        <View style={styles.featureRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/inbody" as any);
            }}
            activeOpacity={0.87}
            style={styles.featureCardHalf}
          >
            <LinearGradient
              colors={[colors.purple, "#6D28D9"]}
              style={[styles.featureCardInner, { borderRadius: colors.radius }]}
            >
              <Ionicons name="scan" size={26} color="#fff" />
              <Text style={[colors.typography.h3, { color: "#fff" }]}>InBody AI</Text>
              <Text style={[colors.typography.caption, { color: "#fff9" }]}>Body composition plan</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(tabs)/progress" as any);
            }}
            activeOpacity={0.87}
            style={styles.featureCardHalf}
          >
            <LinearGradient
              colors={[colors.green, "#059669"]}
              style={[styles.featureCardInner, { borderRadius: colors.radius }]}
            >
              <Ionicons name="trending-up" size={26} color="#fff" />
              <Text style={[colors.typography.h3, { color: "#fff" }]}>Progress</Text>
              <Text style={[colors.typography.caption, { color: "#fff9" }]}>Track your gains</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Programs */}
        <SectionHeader title="Training Programs" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.programList}>
          {PROGRAMS.map((p) => (
            <TouchableOpacity
              key={p.name}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedProgram(selectedProgram?.name === p.name ? null : p);
              }}
              activeOpacity={0.85}
            >
              <GlassCard
                style={[
                  styles.programCard,
                  selectedProgram?.name === p.name && { borderColor: p.color },
                ]}
              >
                <View style={[styles.programIcon, { backgroundColor: p.color + "18" }]}>
                  <Ionicons name={p.icon} size={26} color={p.color} />
                </View>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{p.name}</Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground, fontSize: 11 }]}>{p.desc}</Text>
                <View style={styles.programMeta}>
                  <Ionicons name="time-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{p.duration}</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise cards for selected program */}
        {selectedProgram && selectedProgram.exercises.length > 0 && (
          <>
            <View style={styles.programExHeader}>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                {selectedProgram.name} Exercises
              </Text>
              <TouchableOpacity
                onPress={() => {
                  addWorkout({
                    name: selectedProgram.name,
                    date: new Date().toISOString().split("T")[0],
                    duration: 55,
                    exercises: [],
                    calories: selectedProgram.exercises.reduce((s, e) => s + e.calories * parseInt(e.sets), 0),
                  });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("Workout Logged!", `${selectedProgram.name} recorded.`);
                }}
                style={[styles.logBtn, { backgroundColor: colors.primary, borderRadius: colors.radiusSmall }]}
              >
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={[colors.typography.caption, { color: "#fff" }]}>Log All</Text>
              </TouchableOpacity>
            </View>
            {selectedProgram.exercises.map((ex) => (
              <ExerciseCardRow key={ex.name} ex={ex} />
            ))}
          </>
        )}

        {/* Recent workouts */}
        <SectionHeader title="Recent Workouts" />
        {recentWorkouts.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
            <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
              No workouts yet. Start your first one!
            </Text>
          </GlassCard>
        ) : (
          recentWorkouts.slice(0, 5).map((w) => (
            <GlassCard key={w.id} style={styles.workoutCard}>
              <View style={[styles.workoutIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="barbell" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{w.name}</Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {w.date} · {w.duration} min
                </Text>
              </View>
              <View style={styles.workoutRight}>
                <Text style={[colors.typography.h3, { color: colors.primary }]}>{w.calories}</Text>
                <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>kcal</Text>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>

      {/* Quick log modal */}
      <Modal visible={showQuick} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: colors.radiusLarge, borderTopRightRadius: colors.radiusLarge }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[colors.typography.h2, { color: colors.foreground }]}>Quick Log Workout</Text>
            <TextInput
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Workout name (e.g. Push Day)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radiusSmall },
                colors.typography.body,
              ]}
            />
            <TouchableOpacity
              onPress={startQuickWorkout}
              activeOpacity={0.85}
              style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: colors.radiusSmall }]}
            >
              <Text style={[colors.typography.bodyMedium, { color: "#fff", fontSize: 16 }]}>Log Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQuick(false)} style={styles.modalCancel}>
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  scroll: { paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  startBtn: {},
  startBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  startBtnContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  playIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  featureRow: { flexDirection: "row", gap: 10 },
  featureCardHalf: { flex: 1, borderRadius: 16, overflow: "hidden" },
  featureCardInner: { padding: 16, gap: 6, minHeight: 120, justifyContent: "flex-end" },
  programList: { gap: 10, paddingRight: 16 },
  programCard: { width: 150, padding: 14, gap: 8 },
  programIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  programMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  programExHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6 },
  exCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, marginBottom: 8 },
  exIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 2 },
  exTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  exMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  tipBox: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 8, padding: 10, borderRadius: 10, borderLeftWidth: 3 },
  emptyCard: { alignItems: "center", padding: 32, gap: 12 },
  workoutCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 8 },
  workoutIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  workoutRight: { alignItems: "flex-end" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000060" },
  modalSheet: { padding: 24, borderWidth: 1, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalInput: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  modalBtn: { height: 52, alignItems: "center", justifyContent: "center" },
  modalCancel: { alignItems: "center", padding: 8 },
});
