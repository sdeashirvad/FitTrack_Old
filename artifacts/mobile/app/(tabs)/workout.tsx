import { GlassCard } from "@/components/ui/GlassCard";
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
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Workouts
        </Text>

        {/* Start workout CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowQuick(true);
          }}
          activeOpacity={0.85}
          style={styles.startBtn}
        >
          <LinearGradient
            colors={[colors.primary, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnInner}
          >
            <View style={styles.startBtnContent}>
              <Ionicons name="play-circle" size={32} color="#FFFFFF" />
              <View>
                <Text style={[styles.startBtnTitle, { fontFamily: "Inter_700Bold" }]}>
                  Start Workout
                </Text>
                <Text style={[styles.startBtnSub, { fontFamily: "Inter_400Regular" }]}>
                  Quick log or choose a template
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#FFFFFF80" />
          </LinearGradient>
        </TouchableOpacity>

        {/* AI Suggestions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Suggested Workouts
            </Text>
            <View style={[styles.aiBadge, { backgroundColor: colors.purple + "20" }]}>
              <Ionicons name="sparkles" size={12} color={colors.purple} />
              <Text style={[styles.aiTxt, { color: colors.purple, fontFamily: "Inter_600SemiBold" }]}>
                AI
              </Text>
            </View>
          </View>
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
                style={[styles.suggestCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.suggestIcon, { backgroundColor: w.color + "20" }]}>
                  <Ionicons name={w.icon} size={28} color={w.color} />
                </View>
                <Text style={[styles.suggestName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {w.name}
                </Text>
                <Text style={[styles.suggestDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {w.desc}
                </Text>
                <View style={styles.suggestMeta}>
                  <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.suggestMetaTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {w.duration}
                  </Text>
                  <Text style={[styles.suggestMetaTxt, { color: w.color, fontFamily: "Inter_500Medium" }]}>
                    · {w.exercises} ex
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent workouts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Recent Workouts
          </Text>
          {recentWorkouts.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
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
                    <Text style={[styles.workoutName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {w.name}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {w.date} · {w.duration} min
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutRight}>
                  <Text style={[styles.workoutCal, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                    {w.calories}
                  </Text>
                  <Text style={[styles.workoutCalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
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
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Quick Log Workout
            </Text>
            <TextInput
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Workout name (e.g. Push Day)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_400Regular" },
              ]}
            />
            <TouchableOpacity
              onPress={startQuickWorkout}
              activeOpacity={0.85}
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.modalBtnTxt, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                Log Workout
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowQuick(false)}
              style={styles.modalCancel}
            >
              <Text style={[styles.modalCancelTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
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
  pageTitle: { fontSize: 28, marginBottom: 4 },
  startBtn: { borderRadius: 20, overflow: "hidden" },
  startBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  startBtnContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  startBtnTitle: { color: "#FFFFFF", fontSize: 18 },
  startBtnSub: { color: "#FFFFFF99", fontSize: 13, marginTop: 2 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 17 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  aiTxt: { fontSize: 11 },
  horizList: { gap: 12, paddingRight: 16 },
  suggestCard: { width: 160, borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  suggestIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  suggestName: { fontSize: 15 },
  suggestDesc: { fontSize: 12, lineHeight: 18 },
  suggestMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  suggestMetaTxt: { fontSize: 11 },
  emptyCard: { alignItems: "center", padding: 32, gap: 12 },
  emptyTxt: { fontSize: 14, textAlign: "center" },
  workoutCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  workoutLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  workoutIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  workoutName: { fontSize: 14 },
  workoutMeta: { fontSize: 12, marginTop: 2 },
  workoutRight: { alignItems: "flex-end" },
  workoutCal: { fontSize: 18 },
  workoutCalLabel: { fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000060" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20 },
  modalInput: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  modalBtn: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnTxt: { fontSize: 16 },
  modalCancel: { alignItems: "center", padding: 8 },
  modalCancelTxt: { fontSize: 14 },
});
