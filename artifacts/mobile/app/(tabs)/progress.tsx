import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useFitness } from "@/context/FitnessContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
  withDelay,
  withSpring,
  useEffect as useAnimatedEffect,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
const WEIGHT_DATA = [83.0, 82.5, 81.8, 81.2, 80.5, 79.8, 79.2, 78.2];
const FAT_DATA = [22.3, 22.0, 21.5, 21.0, 20.5, 19.8, 19.0, 18.4];
const MUSCLE_DATA = [30.2, 30.4, 30.7, 31.0, 31.2, 31.6, 32.1, 32.8];

const ACHIEVEMENT_BADGES = [
  { icon: "flame" as const, label: "12 Day Streak", color: "#FF8A00", unlocked: true },
  { icon: "barbell" as const, label: "50 Workouts", color: "#06B6D4", unlocked: true },
  { icon: "trending-down" as const, label: "5 kg Lost", color: "#10B981", unlocked: true },
  { icon: "trophy" as const, label: "Consistency", color: "#F59E0B", unlocked: true },
  { icon: "star" as const, label: "Top Form", color: "#8B5CF6", unlocked: false },
  { icon: "medal" as const, label: "10 kg Lost", color: "#EF4444", unlocked: false },
];

type ChartMode = "weight" | "fat" | "muscle";

function AnimatedBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const h = useSharedValue(0);
  useAnimatedEffect(() => {
    h.value = withDelay(delay, withSpring(height, { damping: 14 }));
  });
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ width: "100%", borderRadius: 6, minHeight: 4 }, style, { backgroundColor: color }]} />;
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { streak, recentWorkouts, todayLog, bmi, weeklyCalories } = useFitness();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [chartMode, setChartMode] = useState<ChartMode>("weight");

  const chartData = chartMode === "weight" ? WEIGHT_DATA : chartMode === "fat" ? FAT_DATA : MUSCLE_DATA;
  const chartMin = Math.min(...chartData);
  const chartMax = Math.max(...chartData);
  const chartRange = chartMax - chartMin || 1;

  const latestWeight = WEIGHT_DATA[WEIGHT_DATA.length - 1];
  const startWeight = WEIGHT_DATA[0];
  const totalLost = (startWeight - latestWeight).toFixed(1);

  const totalWorkouts = recentWorkouts.length + 47;
  const activeDays = 74;

  const CHART_TABS: { key: ChartMode; label: string; color: string }[] = [
    { key: "weight", label: "Weight", color: colors.primary },
    { key: "fat", label: "Body Fat", color: colors.purple },
    { key: "muscle", label: "Muscle", color: colors.green },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.green + "14", colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 110 },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[colors.typography.h1, { color: colors.foreground }]}>Progress</Text>
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
              Your transformation journey
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}>
            <Ionicons name="flame" size={16} color={colors.primary} />
            <Text style={[colors.typography.bodyMedium, { color: colors.primary, fontSize: 14 }]}>
              {streak}d
            </Text>
          </View>
        </View>

        {/* Transformation summary */}
        <GlassCard style={styles.transformCard} elevated shadowLevel="medium">
          <LinearGradient
            colors={[colors.green + "18", colors.primary + "08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={[colors.typography.label, { color: colors.green }]}>YOUR TRANSFORMATION</Text>
          <View style={styles.transformRow}>
            <View style={styles.transformStat}>
              <Text style={[colors.typography.h1, { color: colors.foreground, fontSize: 36 }]}>
                {totalLost}
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>kg lost</Text>
            </View>
            <View style={[styles.transformDivider, { backgroundColor: colors.border }]} />
            <View style={styles.transformStat}>
              <Text style={[colors.typography.h1, { color: colors.foreground, fontSize: 36 }]}>
                {(parseFloat(MUSCLE_DATA[MUSCLE_DATA.length - 1]) - MUSCLE_DATA[0]).toFixed(1)}
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>kg muscle gain</Text>
            </View>
            <View style={[styles.transformDivider, { backgroundColor: colors.border }]} />
            <View style={styles.transformStat}>
              <Text style={[colors.typography.h1, { color: colors.foreground, fontSize: 36 }]}>
                {(FAT_DATA[0] - FAT_DATA[FAT_DATA.length - 1]).toFixed(1)}
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>% fat lost</Text>
            </View>
          </View>
          <View style={[styles.transformTimeline, { backgroundColor: colors.border + "60" }]}>
            <View style={[styles.timelineFill, { backgroundColor: colors.green, width: "74%" }]} />
          </View>
          <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
            8-week journey · 74% to goal
          </Text>
        </GlassCard>

        {/* Stats row */}
        <View style={styles.statsGrid}>
          {[
            { label: "Total Workouts", value: totalWorkouts.toString(), icon: "barbell" as const, color: colors.primary },
            { label: "Active Days", value: `${activeDays}`, icon: "calendar" as const, color: colors.green },
            { label: "Calories Burned", value: "28.4k", icon: "flame" as const, color: colors.red },
            { label: "Current BMI", value: `${bmi}`, icon: "body" as const, color: colors.purple },
          ].map((s) => (
            <GlassCard key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[colors.typography.h3, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{s.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Chart */}
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>8-Week Trend</Text>
          </View>
          <View style={styles.chartTabs}>
            {CHART_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setChartMode(tab.key);
                }}
                style={[
                  styles.chartTabBtn,
                  chartMode === tab.key && { backgroundColor: tab.color + "18", borderColor: tab.color + "40" },
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[
                  colors.typography.caption,
                  { color: chartMode === tab.key ? tab.color : colors.mutedForeground },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.barChart}>
            {chartData.map((val, i) => {
              const normalizedH = ((val - chartMin) / chartRange) * 100 + 20;
              const isLast = i === chartData.length - 1;
              const color = CHART_TABS.find((t) => t.key === chartMode)!.color;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barVal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {chartMode === "weight" ? val.toFixed(0) : val.toFixed(1)}
                  </Text>
                  <AnimatedBar
                    height={normalizedH}
                    color={isLast ? color : color + "60"}
                    delay={i * 60}
                  />
                  <Text style={[styles.barDay, { color: isLast ? color : colors.mutedForeground, fontFamily: isLast ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {WEEKS[i]}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.chartFooter, { borderTopColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={13} color={colors.mutedForeground} />
            <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
              Based on InBody reports & weigh-ins
            </Text>
          </View>
        </GlassCard>

        {/* Weekly calories */}
        <GlassCard style={styles.calCard}>
          <SectionHeader title="Weekly Calories" />
          <View style={styles.calBars}>
            {weeklyCalories.map((cal, i) => {
              const maxCal = Math.max(...weeklyCalories, 2000);
              const heightPct = cal > 0 ? (cal / maxCal) * 80 + 10 : 10;
              const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
              return (
                <View key={i} style={styles.calCol}>
                  <AnimatedBar
                    height={heightPct}
                    color={i === 5 ? colors.primary : cal >= 1800 ? colors.green : colors.border}
                    delay={i * 50}
                  />
                  <Text style={[colors.typography.tiny, { color: i === 5 ? colors.primary : colors.mutedForeground }]}>
                    {DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Achievements */}
        <SectionHeader title="Achievements" />
        <View style={styles.achieveGrid}>
          {ACHIEVEMENT_BADGES.map((badge) => (
            <GlassCard
              key={badge.label}
              style={[
                styles.achieveCard,
                !badge.unlocked && { opacity: 0.45 },
              ]}
            >
              <View style={[styles.achieveIcon, { backgroundColor: badge.unlocked ? badge.color + "18" : colors.muted }]}>
                <Ionicons name={badge.icon} size={22} color={badge.unlocked ? badge.color : colors.mutedForeground} />
              </View>
              <Text style={[colors.typography.tiny, { color: badge.unlocked ? colors.foreground : colors.mutedForeground, textAlign: "center" }]}>
                {badge.label}
              </Text>
              {!badge.unlocked && (
                <Ionicons name="lock-closed" size={10} color={colors.mutedForeground} />
              )}
            </GlassCard>
          ))}
        </View>

        {/* InBody CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/inbody");
          }}
          activeOpacity={0.88}
          style={[styles.inbodyCTA, { borderRadius: colors.radius, overflow: "hidden" }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inbodyCTAInner}
          >
            <Ionicons name="scan" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={[colors.typography.h3, { color: "#fff" }]}>Upload Monthly Report</Text>
              <Text style={[colors.typography.caption, { color: "#fff9" }]}>
                Track your transformation with AI
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#fff9" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  transformCard: { padding: 20, gap: 12 },
  transformRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  transformStat: { flex: 1, alignItems: "center", gap: 2 },
  transformDivider: { width: 0.5, height: 60 },
  transformTimeline: { height: 6, borderRadius: 3, overflow: "hidden" },
  timelineFill: { height: 6, borderRadius: 3 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", padding: 14, gap: 6, flexGrow: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  chartCard: { padding: 16, gap: 12 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartTabs: { flexDirection: "row", gap: 8 },
  chartTabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  barChart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 140 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barVal: { fontSize: 8 },
  barDay: { fontSize: 10 },
  chartFooter: { flexDirection: "row", alignItems: "center", gap: 5, paddingTop: 10, borderTopWidth: 0.5 },
  calCard: { padding: 16, gap: 14 },
  calBars: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 100 },
  calCol: { flex: 1, alignItems: "center", gap: 4 },
  achieveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  achieveCard: { width: "30%", padding: 12, gap: 6, alignItems: "center", flexGrow: 1 },
  achieveIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  inbodyCTA: {},
  inbodyCTAInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
});
