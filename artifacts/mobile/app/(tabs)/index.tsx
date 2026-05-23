import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatBadge } from "@/components/ui/StatBadge";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  useEffect as useAnimatedEffect,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_ACTIONS = [
  { icon: "barbell" as const, label: "Log Workout", color: "#FF8A00", route: "/(tabs)/workout" },
  { icon: "restaurant" as const, label: "Log Meal", color: "#10B981", route: "/(tabs)/diet" },
  { icon: "scan" as const, label: "InBody", color: "#8B5CF6", route: "/inbody" },
  { icon: "trending-up" as const, label: "Progress", color: "#06B6D4", route: "/(tabs)/progress" },
  { icon: "analytics" as const, label: "Analysis", color: "#F59E0B", route: "/(tabs)/analysis" },
  { icon: "calendar" as const, label: "Weekly Plan", color: "#EF4444", route: "/workout/weekly-plan" },
];

function AnimatedCard({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useAnimatedEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  });

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { todayLog, calorieGoal, waterGoal, streak, bmi, addWater, activitySummary } = useFitness();
  const [refreshing, setRefreshing] = React.useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const calorieProgress = Math.min(todayLog.calories / calorieGoal, 1);
  const waterProgress = Math.min(todayLog.water / waterGoal, 1);

  const bodyScore = Math.round(
    ((1 - Math.abs(bmi - 22) / 22) * 35 +
      (calorieProgress > 0.5 && calorieProgress < 1.1 ? 25 : 10) +
      (waterProgress > 0.6 ? 20 : 8) +
      (streak > 3 ? 20 : streak * 4)) * 1
  );
  const clampedScore = Math.min(Math.max(bodyScore, 30), 98);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const totalProtein = todayLog.meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = todayLog.meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = todayLog.meals.reduce((s, m) => s + m.fat, 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "22", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <AnimatedCard delay={0}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/(tabs)/profile");
              }}
              activeOpacity={0.7}
            >
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
                {greeting()},
              </Text>
              <Text style={[colors.typography.h1, { color: colors.foreground }]}>
                {user?.name?.split(" ")[0] ?? "Champ"} 👋
              </Text>
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push("/(tabs)/profile");
                }}
                style={[
                  styles.avatarBtn,
                  { backgroundColor: colors.primary + "25", borderColor: colors.primary },
                ]}
              >
                <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                  {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedCard>

        {/* Body Score + Streak hero */}
        <AnimatedCard delay={80}>
          <GlassCard style={styles.heroCard} elevated shadowLevel="medium">
            <LinearGradient
              colors={[colors.primary + "20", colors.primaryDark + "08"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroInner}>
              <View style={styles.heroLeft}>
                <Text style={[colors.typography.label, { color: colors.primary }]}>BODY SCORE</Text>
                <Text style={[colors.typography.h1, { color: colors.foreground, fontSize: 48 }]}>
                  {clampedScore}
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {clampedScore >= 80 ? "Excellent shape!" : clampedScore >= 65 ? "Good progress" : "Room to grow"}
                </Text>
                <View style={[styles.streakPill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}>
                  <Ionicons name="flame" size={14} color={colors.primary} />
                  <Text style={[colors.typography.bodyMedium, { color: colors.primary, fontSize: 13 }]}>
                    {streak} day streak
                  </Text>
                </View>
              </View>
              <ProgressRing
                size={120}
                strokeWidth={10}
                progress={clampedScore / 100}
                color={colors.primary}
                trackColor={colors.border}
                label={`${clampedScore}`}
                sublabel="/ 100"
              />
            </View>
          </GlassCard>
        </AnimatedCard>

        {/* Calorie + Water rings */}
        <AnimatedCard delay={140}>
          <View style={styles.ringsRow}>
            <GlassCard style={styles.ringCard}>
              <ProgressRing
                size={110}
                strokeWidth={9}
                progress={calorieProgress}
                color={colors.primary}
                trackColor={colors.border}
                label={todayLog.calories.toString()}
                sublabel={`/ ${calorieGoal}`}
              />
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>Calories</Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                {Math.max(calorieGoal - todayLog.calories, 0)} left
              </Text>
            </GlassCard>

            <GlassCard style={styles.ringCard}>
              <ProgressRing
                size={110}
                strokeWidth={9}
                progress={waterProgress}
                color={colors.cyan}
                trackColor={colors.border}
                label={`${todayLog.water}`}
                sublabel={`/ ${waterGoal} cups`}
              />
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>Hydration</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  addWater(1);
                }}
                style={[styles.addWaterBtn, { backgroundColor: colors.cyan + "18", borderColor: colors.cyan + "35" }]}
              >
                <Ionicons name="add" size={14} color={colors.cyan} />
                <Text style={[colors.typography.bodyMedium, { color: colors.cyan, fontSize: 12 }]}>+1 cup</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </AnimatedCard>

        {/* Activity stats */}
        <AnimatedCard delay={190}>
          <View style={styles.statsRow}>
            <StatBadge icon="walk" value={activitySummary.steps.toLocaleString()} label="Steps" color={colors.green} />
            <StatBadge icon="body" value={`${bmi}`} label="BMI" color={colors.purple} />
            <StatBadge
              icon="scale"
              value={`${todayLog.weight ?? "--"} kg`}
              label="Weight"
              color={colors.cyan}
            />
          </View>
        </AnimatedCard>

        {/* Macros */}
        <AnimatedCard delay={230}>
          <GlassCard style={styles.macrosCard}>
            <SectionHeader title="Today's Macros" />
            <View style={styles.macrosRow}>
              <MacroItem label="Protein" value={totalProtein} unit="g" color={colors.primary} max={160} />
              <MacroItem label="Carbs" value={totalCarbs} unit="g" color={colors.purple} max={220} />
              <MacroItem label="Fat" value={totalFat} unit="g" color={colors.yellow} max={70} />
            </View>
          </GlassCard>
        </AnimatedCard>

        {/* InBody CTA Banner */}
        <AnimatedCard delay={270}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/inbody");
            }}
            activeOpacity={0.88}
            style={[styles.inbodyCTA, { borderRadius: colors.radius, overflow: "hidden" }]}
          >
            <LinearGradient
              colors={[colors.purple, "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.inbodyCTAInner}
            >
              <View>
                <Text style={[colors.typography.label, { color: "#fff9" }]}>AI POWERED</Text>
                <Text style={[colors.typography.h3, { color: "#fff" }]}>InBody Analysis</Text>
                <Text style={[colors.typography.caption, { color: "#fff9" }]}>
                  Upload report → Get AI fitness plan
                </Text>
              </View>
              <View style={[styles.inbodyCTAIcon, { backgroundColor: "#ffffff20" }]}>
                <Ionicons name="scan" size={28} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard delay={310}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(item.route as any);
                }}
                activeOpacity={0.8}
                style={[
                  styles.quickBtn,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 12, textAlign: "center" }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedCard>

        {/* Recent Meals */}
        <AnimatedCard delay={350}>
          <SectionHeader title="Recent Meals" />
          {todayLog.meals.slice(0, 3).map((meal, idx) => (
            <GlassCard key={meal.id} style={[styles.mealRow, { marginBottom: idx < 2 ? 8 : 0 }]}>
              <View style={[styles.mealDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                  {meal.name}
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {meal.type} · {meal.time}
                </Text>
              </View>
              <Text style={[colors.typography.bodyMedium, { color: colors.primary }]}>
                {meal.calories} kcal
              </Text>
            </GlassCard>
          ))}
        </AnimatedCard>
      </ScrollView>
    </View>
  );
}

function MacroItem({ label, value, unit, color, max }: {
  label: string; value: number; unit: string; color: string; max: number;
}) {
  const colors = useColors();
  const progress = Math.min(value / max, 1);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={styles.macroRow}>
        <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 13 }]}>{value}{unit}</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.macroFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 260 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  heroCard: { padding: 20 },
  heroInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLeft: { flex: 1, gap: 6 },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start", marginTop: 4 },
  ringsRow: { flexDirection: "row", gap: 12 },
  ringCard: { flex: 1, alignItems: "center", padding: 16, gap: 8 },
  addWaterBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  statsRow: { flexDirection: "row", gap: 8 },
  macrosCard: { padding: 16 },
  macrosRow: { gap: 12, marginTop: 12 },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
  macroTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  macroFill: { height: 6, borderRadius: 3 },
  inbodyCTA: {},
  inbodyCTAInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  inbodyCTAIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: { width: "30%", borderWidth: 1, padding: 14, gap: 8, flexGrow: 1, alignItems: "center" },
  quickIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mealRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  mealDot: { width: 8, height: 8, borderRadius: 4 },
});
