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
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { todayLog, calorieGoal, waterGoal, streak, bmi, addWater } = useFitness();
  const [refreshing, setRefreshing] = React.useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const calorieProgress = todayLog.calories / calorieGoal;
  const waterProgress = todayLog.water / waterGoal;

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
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
        colors={[colors.primary + "18", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 },
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
              {user?.name?.split(" ")[0] ?? "Champ"}
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
                { backgroundColor: colors.primary + "30", borderColor: colors.primary },
              ]}
            >
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak banner */}
        <GlassCard style={styles.streakCard}>
          <LinearGradient
            colors={[colors.secondary + "30", colors.secondary + "08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.streakInner}>
            <View>
              <Text style={[colors.typography.h1, { color: colors.secondary }]}>
                {streak} days
              </Text>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                Workout Streak
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                Don't break the chain!
              </Text>
            </View>
            <View style={[styles.streakIconWrap, { backgroundColor: colors.secondary + "20" }]}>
              <Ionicons name="flame" size={36} color={colors.secondary} />
            </View>
          </View>
        </GlassCard>

        {/* Calorie + Water rings */}
        <View style={styles.ringsRow}>
          <GlassCard style={styles.ringCard}>
            <ProgressRing
              size={130}
              strokeWidth={10}
              progress={calorieProgress}
              color={colors.primary}
              trackColor={colors.border}
              label={todayLog.calories.toString()}
              sublabel={`/ ${calorieGoal} kcal`}
            />
            <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
              Calories
            </Text>
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
              {calorieGoal - todayLog.calories} left
            </Text>
          </GlassCard>

          <GlassCard style={styles.ringCard}>
            <ProgressRing
              size={130}
              strokeWidth={10}
              progress={waterProgress}
              color={colors.cyan}
              trackColor={colors.border}
              label={`${todayLog.water}`}
              sublabel={`/ ${waterGoal} cups`}
            />
            <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
              Water
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                addWater(1);
              }}
              style={[styles.addWaterBtn, { backgroundColor: colors.cyan + "20", borderColor: colors.cyan + "40" }]}
            >
              <Ionicons name="add" size={14} color={colors.cyan} />
              <Text style={[colors.typography.bodyMedium, { color: colors.cyan, fontSize: 12 }]}>
                +1 cup
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Macros */}
        <GlassCard style={styles.macrosCard}>
          <SectionHeader title="Today's Macros" />
          <View style={styles.macrosRow}>
            <MacroItem label="Protein" value={totalProtein} unit="g" color={colors.primary} max={160} />
            <MacroItem label="Carbs" value={totalCarbs} unit="g" color={colors.secondary} max={220} />
            <MacroItem label="Fat" value={totalFat} unit="g" color={colors.yellow} max={70} />
          </View>
        </GlassCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBadge icon="walk" value={todayLog.steps.toLocaleString()} label="Steps" color={colors.green} />
          <StatBadge icon="body" value={`${bmi}`} label="BMI" color={colors.purple} />
          <StatBadge
            icon="scale"
            value={`${todayLog.weight ?? "--"} kg`}
            label="Weight"
            color={colors.cyan}
          />
        </View>

        {/* Quick actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickGrid}>
          {[
            { icon: "barbell" as const, label: "Log Workout", color: colors.primary, route: "/(tabs)/workout" },
            { icon: "restaurant" as const, label: "Log Meal", color: colors.secondary, route: "/(tabs)/diet" },
            { icon: "qr-code" as const, label: "QR Check-in", color: colors.green, route: "/(tabs)/gym" },
            { icon: "analytics" as const, label: "Analytics", color: colors.purple, route: "/analytics" },
            { icon: "calendar" as const, label: "Weekly Plan", color: colors.cyan, route: "/workout/weekly-plan" },
            { icon: "scan" as const, label: "InBody", color: colors.orange, route: "/inbody" },
          ].map((item) => (
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
              <View style={[styles.quickIconWrap, { backgroundColor: item.color + "20" }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 12 }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent meals */}
        <SectionHeader title="Recent Meals" />
        {todayLog.meals.slice(0, 3).map((meal) => (
          <GlassCard key={meal.id} style={styles.mealRow}>
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
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  streakCard: { padding: 16, marginBottom: 2 },
  streakInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streakIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  ringsRow: { flexDirection: "row", gap: 12 },
  ringCard: { flex: 1, alignItems: "center", padding: 16, gap: 8 },
  addWaterBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  macrosCard: { padding: 16 },
  macrosRow: { gap: 12, marginTop: 12 },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
  macroTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  macroFill: { height: 6, borderRadius: 3 },
  statsRow: { flexDirection: "row", gap: 8 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: { width: "30%", borderWidth: 1, padding: 14, gap: 8, flexGrow: 1 },
  quickIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mealRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  mealDot: { width: 8, height: 8, borderRadius: 4 },
});
