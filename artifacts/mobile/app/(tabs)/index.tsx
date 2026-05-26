import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { todayLog, calorieGoal, waterGoal, streak, bmi, activitySummary, weeklyCalories } = useFitness();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const caloriesLeft = Math.max(calorieGoal - todayLog.calories, 0);
  const maxCal = Math.max(...weeklyCalories, 2500);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 700));
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting()},</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user?.name?.split(" ")[0] ?? "Champ"} 👋
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.notifBtn, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
              <View style={[styles.notifDot, { backgroundColor: colors.primary }]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              style={[styles.avatarCircle, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Steps Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, ...colors.shadow.medium }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroNum, { color: colors.foreground }]}>
                {activitySummary.steps.toLocaleString()}
              </Text>
              <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>total steps</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.heroIcon, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <StatPill icon="flame" value={todayLog.calories.toString()} label="kcal" color={colors.primary} />
             <StatPill icon="location" value={activitySummary.distanceKm.toFixed(1)} label="kilometer" color={colors.mutedForeground} />
            <StatPill icon="time" value={(activitySummary.walkingMinutes + activitySummary.runningMinutes).toString()} label="minute" color={colors.cyan}/>
          </View>
        </View>

        {/* Calorie Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Calorie</Text>
            <TouchableOpacity>
              <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.bigNum, { color: colors.primary }]}>
            {todayLog.calories} <Text style={styles.bigNumUnit}>kcal</Text>
          </Text>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            Burn {caloriesLeft} calorie left.
          </Text>

          {/* Mini area chart */}
          <View style={styles.miniChart}>
            {weeklyCalories.map((cal, i) => {
              const h = Math.max((cal / maxCal) * 80, 6);
              const isActive = i === 5;
              return (
                <View key={i} style={styles.miniBarCol}>
                  <View
                    style={[
                      styles.miniBar,
                      {
                        height: h,
                        backgroundColor: isActive ? colors.primary : colors.primary + "30",
                        borderRadius: 4,
                      },
                    ]}
                  />
                  <Text style={[styles.miniBarLabel, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                    {DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.periodRow}>
            {["1d", "1w", "1m", "All"].map((p) => (
              <TouchableOpacity key={p} style={[styles.periodBtn, p === "1w" && { backgroundColor: colors.primary }]}>
                <Text style={[styles.periodLabel, { color: p === "1w" ? "#fff" : colors.mutedForeground }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Workout */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(tabs)/workout");
          }}
          activeOpacity={0.9}
          style={[styles.workoutHero, { ...colors.shadow.medium }]}
        >
          <LinearGradient
            colors={["#1A1A2E", "#2D1B4E", "#1A1A2E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.workoutGrad}
          >
            <View style={styles.workoutBadgeRow}>
              <View style={[styles.workoutBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.workoutBadgeText}>25 TOTAL</Text>
              </View>
              <TouchableOpacity style={styles.workoutSettingsBtn}>
                <Ionicons name="settings-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Back Workout</Text>
              <Text style={styles.workoutTrainer}>With Azunyan U. Wu</Text>
              <View style={styles.workoutStats}>
                <WorkoutStat value="58min" label="Time" />
                <WorkoutStat value="254kcal" label="Calorie" />
                <WorkoutStat value="3x4" label="Sets" />
              </View>
              <View style={styles.workoutBtns}>
                <TouchableOpacity style={styles.detailsBtn}>
                  <Text style={styles.detailsBtnText}>Details</Text>
                  <Ionicons name="document-text-outline" size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    router.push("/(tabs)/workout");
                  }}
                  style={[styles.startBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.startBtnText}>Start</Text>
                  <Ionicons name="flame" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: "barbell" as const, label: "Workout", color: colors.primary, route: "/(tabs)/workout" },
            { icon: "scan" as const, label: "InBody AI", color: colors.purple, route: "/inbody" },
            { icon: "trending-up" as const, label: "Progress", color: colors.green, route: "/(tabs)/progress" },
            { icon: "stats-chart" as const, label: "Analysis", color: colors.cyan, route: "/(tabs)/analysis" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(item.route as any);
              }}
              style={[styles.quickItem, { backgroundColor: colors.card, ...colors.shadow.soft }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + "15" }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Macros strip */}
        <View style={[styles.macrosCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 14 }]}>Today's Macros</Text>
          <View style={styles.macrosRow}>
            <MacroBar label="Protein" value={todayLog.meals.reduce((s, m) => s + m.protein, 0)} max={160} color={colors.primary} />
            <MacroBar label="Carbs" value={todayLog.meals.reduce((s, m) => s + m.carbs, 0)} max={220} color={colors.cyan} />
            <MacroBar label="Fat" value={todayLog.meals.reduce((s, m) => s + m.fat, 0)} max={70} color={colors.purple} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatPill({ icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.statPillIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statPillVal, { color: "#1C1C1E" }]}>{value}</Text>
      <Text style={[styles.statPillLabel, { color: "#8E8E93" }]}>{label}</Text>
    </View>
  );
}

function WorkoutStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.wStat}>
      <Text style={styles.wStatVal}>{value}</Text>
      <Text style={styles.wStatLabel}>{label}</Text>
    </View>
  );
}

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={styles.macroBarItem}>
      <View style={styles.macroBarTop}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={[styles.macroBarVal, { color }]}>{value}g</Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  notifDot: { width: 8, height: 8, borderRadius: 4, position: "absolute", top: 8, right: 8, borderWidth: 1.5, borderColor: "#F7F8FA" },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  heroCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  heroNum: { fontSize: 42, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  heroLabel: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 0 },
  statPill: { flex: 1, alignItems: "center", gap: 4 },
  statPillIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statPillVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statPillLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  sectionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  bigNum: { fontSize: 40, fontFamily: "Inter_700Bold", letterSpacing: -1, lineHeight: 46 },
  bigNumUnit: { fontSize: 20, fontFamily: "Inter_500Medium" },
  subLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, marginTop: 2 },
  miniChart: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 90, marginBottom: 14 },
  miniBarCol: { flex: 1, alignItems: "center", gap: 6, justifyContent: "flex-end" },
  miniBar: { width: "100%" },
  miniBarLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  periodRow: { flexDirection: "row", gap: 6 },
  periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: "center", backgroundColor: "#F3F4F6" },
  periodLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },

  workoutHero: { borderRadius: 20, overflow: "hidden" },
  workoutGrad: { padding: 20 },
  workoutBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 40 },
  workoutBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  workoutBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  workoutSettingsBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  workoutInfo: { gap: 8 },
  workoutTitle: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  workoutTrainer: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  workoutStats: { flexDirection: "row", gap: 24, marginVertical: 6 },
  wStat: { alignItems: "center", gap: 2 },
  wStatVal: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  wStatLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular" },
  workoutBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  detailsBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  detailsBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  startBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  startBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: -4 },
  quickGrid: { flexDirection: "row", gap: 10 },
  quickItem: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },

  macrosCard: { borderRadius: 20, padding: 18 },
  macrosRow: { gap: 12 },
  macroBarItem: { gap: 6 },
  macroBarTop: { flexDirection: "row", justifyContent: "space-between" },
  macroBarLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  macroBarVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  macroBarTrack: { height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" },
  macroBarFill: { height: 6, borderRadius: 3 },
});
