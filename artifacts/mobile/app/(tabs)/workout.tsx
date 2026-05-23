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

const SUGGESTED = [
  { name: "Push Day", desc: "Chest, Shoulders, Triceps", duration: "45-60 min", icon: "barbell" as const, color: "#00D4FF", exercises: 6 },
  { name: "Pull Day", desc: "Back, Biceps, Rear Delts", duration: "50-65 min", icon: "fitness" as const, color: "#FF6B35", exercises: 7 },
  { name: "Leg Day", desc: "Quads, Hamstrings, Glutes", duration: "60-75 min", icon: "body" as const, color: "#00FF88", exercises: 6 },
  { name: "HIIT Cardio", desc: "Full body burn, 20 min", duration: "20 min", icon: "flame" as const, color: "#FBBF24", exercises: 8 },
];

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recentWorkouts, addWorkout } = useFitness();
  const [showQuick, setShowQuick] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

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
        colors={[colors.primary + "15", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <Text style={[colors.typography.h1, { color: colors.foreground }]}>
          Workouts
        </Text>

        {/* Feature cards row */}
        <View style={styles.featureRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/workout/weekly-plan" as any);
            }}
            activeOpacity={0.85}
            style={styles.featureCardHalf}
          >
            <LinearGradient
              colors={[colors.primary, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCardInner, { borderRadius: colors.radius }]}
            >
              <Ionicons name="calendar" size={28} color={colors.primaryForeground} />
              <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                Weekly Plan
              </Text>
              <Text style={[colors.typography.caption, { color: colors.primaryForeground + "99" }]}>
                PPL, Upper/Lower & more
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/inbody" as any);
            }}
            activeOpacity={0.85}
            style={styles.featureCardHalf}
          >
            <LinearGradient
              colors={[colors.secondary, colors.red]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCardInner, { borderRadius: colors.radius }]}
            >
              <Ionicons name="scan" size={28} color={colors.primaryForeground} />
              <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                InBody Analysis
              </Text>
              <Text style={[colors.typography.caption, { color: colors.primaryForeground + "99" }]}>
                AI body composition plan
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Start workout CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowQuick(true);
          }}
          activeOpacity={0.85}
          style={[styles.startBtn, { borderRadius: colors.radius }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnInner}
          >
            <View style={styles.startBtnContent}>
              <Ionicons name="play-circle" size={32} color={colors.primaryForeground} />
              <View>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                  Start Workout
                </Text>
                <Text style={[colors.typography.caption, { color: colors.primaryForeground + "99" }]}>
                  Quick log or choose a template
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.primaryForeground + "80"} />
          </LinearGradient>
        </TouchableOpacity>

        {/* AI Suggestions */}
        <View style={styles.section}>
          <SectionHeader title="Suggested Workouts" showAI />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizList}>
            {SUGGESTED.map((w) => (
              <TouchableOpacity
                key={w.name}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  addWorkout({ name: w.name, date: new Date().toISOString().split("T")[0], duration: 50, exercises: [], calories: 350 });
                  Alert.alert("Workout Started!", `${w.name} logged successfully.`);
                }}
                activeOpacity={0.85}
                style={[styles.suggestCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              >
                <View style={[styles.suggestIcon, { backgroundColor: w.color + "20" }]}>
                  <Ionicons name={w.icon} size={28} color={w.color} />
                </View>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                  {w.name}
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {w.desc}
                </Text>
                <View style={styles.suggestMeta}>
                  <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
                    {w.duration}
                  </Text>
                  <Text style={[colors.typography.tiny, { color: w.color }]}>
                    · {w.exercises} ex
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent workouts */}
        <View style={styles.section}>
          <SectionHeader title="Recent Workouts" />
          {recentWorkouts.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
                No workouts yet. Start your first one!
              </Text>
            </GlassCard>
          ) : (
            recentWorkouts.map((w) => (
              <GlassCard key={w.id} style={styles.workoutCard}>
                <View style={styles.workoutLeft}>
                  <View style={[styles.workoutIcon, { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons name="barbell" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                      {w.name}
                    </Text>
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                      {w.date} · {w.duration} min
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutRight}>
                  <Text style={[colors.typography.h2, { color: colors.primary }]}>
                    {w.calories}
                  </Text>
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
                    kcal
                  </Text>
                </View>
              </GlassCard>
            ))
          )}
        </View>
      </ScrollView>

      {/* Quick log modal */}
      <Modal visible={showQuick} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: colors.radiusLarge, borderTopRightRadius: colors.radiusLarge }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[colors.typography.h2, { color: colors.foreground }]}>
              Quick Log Workout
            </Text>
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
              <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground, fontSize: 16 }]}>
                Log Workout
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowQuick(false)}
              style={styles.modalCancel}
            >
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                Cancel
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
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  featureRow: { flexDirection: "row", gap: 10 },
  featureCardHalf: { flex: 1, borderRadius: 16, overflow: "hidden" },
  featureCardInner: { padding: 16, gap: 8, minHeight: 130, justifyContent: "flex-end" },
  startBtn: { overflow: "hidden" },
  startBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  startBtnContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  section: { gap: 10 },
  horizList: { gap: 12, paddingRight: 16 },
  suggestCard: { width: 160, borderWidth: 1, padding: 14, gap: 8 },
  suggestIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  suggestMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  emptyCard: { alignItems: "center", padding: 32, gap: 12 },
  workoutCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  workoutLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  workoutIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  workoutRight: { alignItems: "flex-end" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000060" },
  modalSheet: { padding: 24, borderWidth: 1, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalInput: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  modalBtn: { height: 52, alignItems: "center", justifyContent: "center" },
  modalCancel: { alignItems: "center", padding: 8 },
});
