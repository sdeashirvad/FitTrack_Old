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
  Dimensions,
} from "react-native";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle, Line } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  useEffect as useAnimatedEffect,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 64;
const CHART_H = 140;

const WEIGHT_DATA = [83.0, 82.5, 81.8, 81.2, 80.5, 79.8, 79.2, 78.2];
const FAT_DATA = [22.3, 22.0, 21.5, 21.0, 20.5, 19.8, 19.0, 18.4];
const MUSCLE_DATA = [30.2, 30.4, 30.7, 31.0, 31.2, 31.6, 32.1, 32.8];
const CAL_DATA = [1650, 1820, 1700, 2100, 1950, 2250, 1880, 2180];
const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

const ACHIEVEMENT_BADGES = [
  { icon: "flame" as const, label: "12 Day Streak", color: "#FF6B35", unlocked: true },
  { icon: "barbell" as const, label: "50 Workouts", color: "#3B82F6", unlocked: true },
  { icon: "trending-down" as const, label: "5 kg Lost", color: "#22C55E", unlocked: true },
  { icon: "trophy" as const, label: "Consistency", color: "#F59E0B", unlocked: true },
  { icon: "star" as const, label: "Top Form", color: "#8B5CF6", unlocked: false },
  { icon: "medal" as const, label: "10 kg Lost", color: "#EF4444", unlocked: false },
];

type Mode = "weight" | "fat" | "muscle" | "calories";
type Period = "1d" | "1w" | "1m" | "All";

function AreaChart({ data, color, width, height }: { data: number[]; color: string; width: number; height: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 10;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2 - 10);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `C${points[i - 1].x + (p.x - points[i - 1].x) / 2},${points[i - 1].y} ${points[i - 1].x + (p.x - points[i - 1].x) / 2},${p.y} ${p.x},${p.y}`))
    .join(" ");

  const areaPath = `${linePath} L${points[points.length - 1].x},${height - pad} L${points[0].x},${height - pad} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </SvgGradient>
      </Defs>
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path d={linePath} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3} fill={color} />
      ))}
    </Svg>
  );
}

function AnimatedBar({ targetH, color, delay }: { targetH: number; color: string; delay: number }) {
  const h = useSharedValue(0);
  useAnimatedEffect(() => { h.value = withDelay(delay, withSpring(targetH, { damping: 14 })); });
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ width: "100%", borderRadius: 6, minHeight: 4 }, style, { backgroundColor: color }]} />;
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { streak, recentWorkouts, todayLog, bmi, weeklyCalories } = useFitness();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [chartMode, setChartMode] = useState<Mode>("weight");
  const [period, setPeriod] = useState<Period>("1w");

  const modeMap: Record<Mode, { data: number[]; color: string; label: string; unit: string }> = {
    weight: { data: WEIGHT_DATA, color: colors.primary, label: "Weight", unit: "kg" },
    fat: { data: FAT_DATA, color: colors.purple, label: "Body Fat", unit: "%" },
    muscle: { data: MUSCLE_DATA, color: colors.green, label: "Muscle", unit: "kg" },
    calories: { data: CAL_DATA, color: colors.cyan, label: "Calories", unit: "kcal" },
  };

  const active = modeMap[chartMode];
  const latestVal = active.data[active.data.length - 1];
  const prevVal = active.data[0];
  const diff = latestVal - prevVal;
  const diffStr = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} ${active.unit}`;
  const isGoodChange = chartMode === "weight" ? diff < 0 : chartMode === "fat" ? diff < 0 : diff > 0;

  const totalLost = (WEIGHT_DATA[0] - WEIGHT_DATA[WEIGHT_DATA.length - 1]).toFixed(1);
  const muscleDiff = (MUSCLE_DATA[MUSCLE_DATA.length - 1] - MUSCLE_DATA[0]).toFixed(1);
  const fatDiff = (FAT_DATA[0] - FAT_DATA[FAT_DATA.length - 1]).toFixed(1);
  const totalWorkouts = recentWorkouts.length + 47;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Progress</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Your transformation journey</Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="flame" size={15} color={colors.primary} />
            <Text style={[styles.streakText, { color: colors.primary }]}>{streak}d streak</Text>
          </View>
        </View>

        {/* Transformation summary */}
        <View style={[styles.transformCard, { backgroundColor: colors.card, ...colors.shadow.medium }]}>
          <Text style={[styles.transformLabel, { color: colors.mutedForeground }]}>8-WEEK TRANSFORMATION</Text>
          <View style={styles.transformStats}>
            <TransformStat value={totalLost} unit="kg" label="Lost" color={colors.primary} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TransformStat value={muscleDiff} unit="kg" label="Muscle" color={colors.green} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TransformStat value={fatDiff} unit="%" label="Fat ↓" color={colors.purple} />
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.green, width: "74%" }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>74% to goal · Keep going!</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {[
            { label: "Total Workouts", value: totalWorkouts.toString(), icon: "barbell" as const, color: colors.primary },
            { label: "Active Days", value: "74", icon: "calendar" as const, color: colors.green },
            { label: "Calories Burned", value: "28.4k", icon: "flame" as const, color: colors.red },
            { label: "Current BMI", value: `${bmi}`, icon: "body" as const, color: colors.purple },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + "15" }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Area chart card */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <View style={styles.chartTop}>
            <View>
              <Text style={[styles.chartCurrVal, { color: active.color }]}>
                {latestVal.toFixed(chartMode === "calories" ? 0 : 1)} {active.unit}
              </Text>
              <View style={styles.chartDiffRow}>
                <Ionicons
                  name={isGoodChange ? "arrow-down" : "arrow-up"}
                  size={12}
                  color={isGoodChange ? colors.green : colors.red}
                />
                <Text style={[styles.chartDiff, { color: isGoodChange ? colors.green : colors.red }]}>
                  {diffStr} from W1
                </Text>
              </View>
            </View>
            <View style={styles.periodRow}>
              {(["1d", "1w", "1m", "All"] as Period[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => { Haptics.selectionAsync(); setPeriod(p); }}
                  style={[styles.periodBtn, period === p && { backgroundColor: active.color }]}
                >
                  <Text style={[styles.periodText, { color: period === p ? "#fff" : colors.mutedForeground }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Mode tabs */}
          <View style={styles.modeTabs}>
            {(Object.keys(modeMap) as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { Haptics.selectionAsync(); setChartMode(m); }}
                style={[styles.modeTab, chartMode === m && { backgroundColor: modeMap[m].color + "18", borderColor: modeMap[m].color }]}
              >
                <Text style={[styles.modeTabText, { color: chartMode === m ? modeMap[m].color : colors.mutedForeground }]}>
                  {modeMap[m].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* SVG Area Chart */}
          <AreaChart data={active.data} color={active.color} width={CHART_W} height={CHART_H} />

          {/* X labels */}
          <View style={styles.xLabels}>
            {WEEKS.map((w, i) => (
              <Text key={i} style={[styles.xLabel, { color: i === WEEKS.length - 1 ? active.color : colors.mutedForeground }]}>{w}</Text>
            ))}
          </View>
        </View>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
        <View style={styles.achieveGrid}>
          {ACHIEVEMENT_BADGES.map((badge) => (
            <View
              key={badge.label}
              style={[styles.achieveCard, { backgroundColor: colors.card, ...colors.shadow.soft, opacity: badge.unlocked ? 1 : 0.45 }]}
            >
              <View style={[styles.achieveIcon, { backgroundColor: badge.unlocked ? badge.color + "18" : colors.muted }]}>
                <Ionicons name={badge.icon} size={20} color={badge.unlocked ? badge.color : colors.mutedForeground} />
              </View>
              <Text style={[styles.achieveLabel, { color: badge.unlocked ? colors.foreground : colors.mutedForeground }]}>
                {badge.label}
              </Text>
              {!badge.unlocked && <Ionicons name="lock-closed" size={10} color={colors.mutedForeground} />}
            </View>
          ))}
        </View>

        {/* Upload CTA */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/inbody"); }}
          activeOpacity={0.88}
          style={{ borderRadius: 20, overflow: "hidden" }}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBanner}
          >
            <Ionicons name="scan-outline" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Upload Monthly Report</Text>
              <Text style={styles.ctaSub}>Track your transformation with AI</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function TransformStat({ value, unit, label, color }: { value: string; unit: string; label: string; color: string }) {
  return (
    <View style={styles.transformStat}>
      <Text style={[styles.transformVal, { color }]}>{value}<Text style={styles.transformUnit}>{unit}</Text></Text>
      <Text style={styles.transformStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  streakText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  transformCard: { borderRadius: 20, padding: 20, gap: 14 },
  transformLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  transformStats: { flexDirection: "row", alignItems: "center" },
  transformStat: { flex: 1, alignItems: "center", gap: 2 },
  transformVal: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  transformUnit: { fontSize: 14, fontFamily: "Inter_500Medium" },
  transformStatLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  divider: { width: 0.5, height: 50 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", borderRadius: 16, padding: 14, gap: 6, flexGrow: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  chartCard: { borderRadius: 20, padding: 18, gap: 14 },
  chartTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  chartCurrVal: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  chartDiffRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  chartDiff: { fontSize: 12, fontFamily: "Inter_500Medium" },
  periodRow: { flexDirection: "row", gap: 4 },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: "#F3F4F6" },
  periodText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modeTabs: { flexDirection: "row", gap: 6 },
  modeTab: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "#F0F0F2", alignItems: "center" },
  modeTabText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  xLabels: { flexDirection: "row", justifyContent: "space-between" },
  xLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: -4 },
  achieveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  achieveCard: { width: "30%", borderRadius: 16, padding: 12, gap: 4, alignItems: "center", flexGrow: 1 },
  achieveIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  achieveLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },

  ctaBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20 },
  ctaTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ctaSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
