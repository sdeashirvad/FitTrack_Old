import { useColors } from "@/hooks/useColors";
import { useProgressAPI } from "@/hooks/useProgressAPI";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── RadarChart ───────────────────────────────────────────────────────────────

function RadarChart({ size = 220, strength = 0.78, agility = 0.65, endurance = 0.72 }: {
  size?: number; strength?: number; agility?: number; endurance?: number;
}) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const axes = [
    { label: "STRENGTH",  angle: -90,  value: Math.max(0.1, Math.min(1, strength))  },
    { label: "AGILITY",   angle: 30,   value: Math.max(0.1, Math.min(1, agility))   },
    { label: "ENDURANCE", angle: 150,  value: Math.max(0.1, Math.min(1, endurance)) },
  ];

  const axisColors = [colors.primary, "#888", colors.cyan];

  const toXY = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy + radius * Math.sin((angle * Math.PI) / 180),
  });

  const levels = [0.3, 0.55, 0.8, 1.0];
  const dataPoints = axes.map((a) => toXY(a.angle, r * a.value));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {levels.map((l, i) => {
        const pts = axes.map((a) => toXY(a.angle, r * l));
        return (
          <Polygon key={i} points={pts.map(p => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke={colors.border} strokeWidth="1" />
        );
      })}
      {axes.map((a, i) => {
        const end = toXY(a.angle, r);
        return <Line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={colors.border} strokeWidth="1" />;
      })}
      <Polygon points={polygonPoints} fill={colors.primary + "30"} stroke={colors.primary} strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={5} fill={colors.primary} />
      ))}
      {axes.map((a, i) => {
        const labelPos = toXY(a.angle, r * 1.25);
        return (
          <SvgText key={i} x={labelPos.x} y={labelPos.y} fontSize={9}
            fontFamily="Inter_600SemiBold" fill={axisColors[i]}
            textAnchor="middle" dominantBaseline="middle">{a.label}</SvgText>
        );
      })}
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalysisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { dashboard, aiInsights, loading, insightsLoading, fetchAIInsights } = useProgressAPI();
  const [aiLoaded, setAiLoaded] = useState(false);

  const reports = dashboard.inbodyReports;
  const latest  = reports[0] ?? null;
  const prev    = reports[1] ?? null;

  // Current metrics from latest InBody
  const cm = dashboard.currentMetrics;
  const bodyFatVal  = cm.bodyFat  ?? (latest?.bodyFat  ? parseFloat(latest.bodyFat)  : 18.4);
  const muscleVal   = cm.muscle   ?? (latest?.muscleMass ? parseFloat(latest.muscleMass) : 32.8);
  const bmiVal      = cm.bmi      ?? (latest?.bmi     ? parseFloat(latest.bmi)      : 24.1);
  const bmrVal      = cm.bmr      ?? 1780;
  const vfVal       = cm.visceralFat ?? 7;
  const weightVal   = cm.weight   ?? (latest?.weight   ? parseFloat(latest.weight)   : 78.2);
  const bodyScore   = latest?.score ?? dashboard.fitnessScore.score ?? 88;

  // Prev metrics for comparisons
  const prevBodyFat = prev?.bodyFat  ? parseFloat(prev.bodyFat)  : bodyFatVal + 1.7;
  const prevMuscle  = prev?.muscleMass ? parseFloat(prev.muscleMass) : muscleVal - 1.2;
  const prevWeight  = prev?.weight  ? parseFloat(prev.weight)  : weightVal + 2.3;
  const prevScore   = prev?.score ?? Math.max(0, bodyScore - 6);
  const scoreDiff   = bodyScore - prevScore;

  const weightDiff = (weightVal - prevWeight).toFixed(1);
  const fatDiff    = (bodyFatVal - prevBodyFat).toFixed(1);

  // Radar values derived from AI analysis if available
  const analysis = latest?.aiAnalysis as any;
  let strengthVal  = 0.78;
  let agilityVal   = 0.65;
  let enduranceVal = 0.72;

  if (analysis) {
    // Derive from body fat + muscle mass score
    const bfScore   = Math.max(0, 1 - (bodyFatVal - 10) / 25);  // lower fat → higher
    const muscScore = Math.min(1, muscleVal / 45);               // more muscle → higher
    strengthVal  = (bfScore * 0.4 + muscScore * 0.6);
    enduranceVal = (bfScore * 0.5 + (cm.visceralFat ? Math.max(0, 1 - vfVal / 15) : 0.65) * 0.5);
    agilityVal   = (bfScore * 0.6 + muscScore * 0.4);
  }

  // Key metrics grid
  const METRICS = [
    { label: "Body Fat",    value: `${bodyFatVal.toFixed(1)}%`,            change: `${parseFloat(fatDiff) <= 0 ? "" : "+"}${fatDiff}%`,   positive: parseFloat(fatDiff) <= 0,  color: colors.primary, icon: "body"    as const },
    { label: "Muscle Mass", value: `${muscleVal.toFixed(1)} kg`,           change: `+${(muscleVal - prevMuscle).toFixed(1)} kg`,           positive: true,                       color: "#22C55E",      icon: "barbell" as const },
    { label: "Visceral Fat",value: `${vfVal}`,                             change: vfVal <= 9 ? "Normal" : "High",                        positive: vfVal <= 9,                 color: "#8B5CF6",      icon: "fitness" as const },
    { label: "BMR",         value: bmrVal.toLocaleString(),                change: "+45",                                                  positive: true,                       color: "#3B82F6",      icon: "flame"   as const },
  ];

  // AI insights to show
  const insightStrings: string[] = aiLoaded && aiInsights.insights.length > 0
    ? aiInsights.insights
    : (analysis?.recommendations?.slice(0, 3) ?? [
        `Muscle mass improved by ${(muscleVal - prevMuscle).toFixed(1)} kg since last scan — great work!`,
        `Body fat trending ${parseFloat(fatDiff) <= 0 ? "down" : "up"}. ${parseFloat(fatDiff) <= 0 ? "Continue with current calorie deficit." : "Review your nutrition plan."}`,
        `Visceral fat at ${vfVal} is ${vfVal <= 9 ? "healthy" : "elevated"}. ${vfVal <= 9 ? "Maintain with regular cardio." : "Prioritise cardio and reduce refined carbs."}`,
      ]);

  const handleLoadAIInsights = async () => {
    setAiLoaded(true);
    await fetchAIInsights();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analysis</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Body composition insights</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/inbody"); }}
              style={[styles.scanBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.scanBtnText}>New Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Score card with radar ── */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, ...colors.shadow.medium }]}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>BODY SCORE</Text>
              <Text style={[styles.scoreNum, { color: colors.foreground }]}>{bodyScore}</Text>
              <Text style={[styles.scoreDesc, { color: colors.foreground }]}>
                {bodyScore >= 80 ? "Excellent body composition." :
                 bodyScore >= 65 ? "You are a healthy individual." :
                 bodyScore >= 50 ? "Good progress, keep going." : "Building a strong foundation."}
              </Text>
              <View style={styles.legendRow}>
                <LegendDot color={colors.primary} label="STRENGTH" />
                <LegendDot color="#8E8E93" label="AGILITY" />
                <LegendDot color={colors.cyan} label="ENDURANCE" />
              </View>
            </View>
            <RadarChart
              size={Math.min(SCREEN_W * 0.48, 200)}
              strength={strengthVal}
              agility={agilityVal}
              endurance={enduranceVal}
            />
          </View>
          <View style={[styles.improvePill, { backgroundColor: (scoreDiff >= 0 ? colors.green : colors.red) + "15" }]}>
            <Ionicons name={scoreDiff >= 0 ? "arrow-up" : "arrow-down"} size={12} color={scoreDiff >= 0 ? colors.green : colors.red} />
            <Text style={[styles.improveText, { color: scoreDiff >= 0 ? colors.green : colors.red }]}>
              {scoreDiff >= 0 ? "+" : ""}{scoreDiff} pts from last scan
            </Text>
          </View>
        </View>

        {/* ── 30-day comparison ── */}
        <View style={[styles.compareCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <View style={styles.compareHeader}>
            <Ionicons name="git-compare-outline" size={16} color={colors.primary} />
            <Text style={[styles.compareTitle, { color: colors.foreground }]}>
              {dashboard.transformationSummary.weeks > 0 ? `Last ${dashboard.transformationSummary.weeks} Weeks` : "Last 30 Days"}
            </Text>
          </View>
          <View style={styles.compareRow}>
            <CompareItem
              label="Weight"
              before={`${prevWeight.toFixed(1)} kg`}
              after={`${weightVal.toFixed(1)} kg`}
              diff={`${parseFloat(weightDiff) <= 0 ? "" : "+"}${weightDiff} kg`}
              positive={parseFloat(weightDiff) <= 0}
            />
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <CompareItem
              label="Body Fat"
              before={`${prevBodyFat.toFixed(1)}%`}
              after={`${bodyFatVal.toFixed(1)}%`}
              diff={`${parseFloat(fatDiff) <= 0 ? "" : "+"}${fatDiff}%`}
              positive={parseFloat(fatDiff) <= 0}
            />
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <CompareItem
              label="Muscle"
              before={`${prevMuscle.toFixed(1)} kg`}
              after={`${muscleVal.toFixed(1)} kg`}
              diff={`+${(muscleVal - prevMuscle).toFixed(1)} kg`}
              positive
            />
          </View>
        </View>

        {/* ── Key metrics ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {METRICS.map((m) => (
            <View key={m.label} style={[styles.metricCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + "15" }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={[styles.metricVal, { color: colors.foreground }]}>{m.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
              <View style={[styles.metricChange, { backgroundColor: m.positive ? colors.green + "15" : colors.red + "15" }]}>
                <Ionicons name={m.positive ? "trending-up" : "trending-down"} size={11} color={m.positive ? colors.green : colors.red} />
                <Text style={[styles.metricChangeText, { color: m.positive ? colors.green : colors.red }]}>{m.change}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Report history ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Report History</Text>
        {reports.length === 0 && !loading && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
            <Ionicons name="document-text-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No InBody reports yet. Upload your first scan.</Text>
          </View>
        )}
        {reports.map((rep, i) => (
          <TouchableOpacity
            key={rep.id}
            onPress={() => { Haptics.selectionAsync(); router.push("/inbody"); }}
            style={[styles.reportCard, { backgroundColor: colors.card, ...colors.shadow.soft, marginBottom: i < reports.length - 1 ? 8 : 0 }]}
          >
            <View style={[styles.reportIcon, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reportTitle, { color: colors.foreground }]}>InBody Report</Text>
              <Text style={[styles.reportMeta, { color: colors.mutedForeground }]}>
                {new Date(rep.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                {rep.weight && ` · ${parseFloat(rep.weight).toFixed(1)} kg`}
                {rep.bodyFat && ` · ${parseFloat(rep.bodyFat).toFixed(1)}% fat`}
              </Text>
            </View>
            {rep.score != null && (
              <View style={[styles.reportScore, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.reportScoreNum, { color: colors.primary }]}>{rep.score}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}

        {/* ── AI Insights ── */}
        <View style={[styles.aiCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <LinearGradient
            colors={[colors.primary + "12", colors.purple + "06"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.aiHeader}>
            <View style={[styles.aiIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.aiTitle, { color: colors.foreground }]}>AI Insights</Text>
            <View style={{ flex: 1 }} />
            {insightsLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : (
                <TouchableOpacity
                  onPress={handleLoadAIInsights}
                  style={[styles.refreshBtn, { backgroundColor: colors.primary + "15" }]}
                >
                  <Ionicons name="refresh" size={13} color={colors.primary} />
                  <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
                </TouchableOpacity>
              )
            }
          </View>
          {insightStrings.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
            </View>
          ))}
          {aiInsights.recoveryAdvice && aiLoaded && (
            <View style={[styles.recoveryPill, { backgroundColor: "#22C55E12", borderColor: "#22C55E30" }]}>
              <Ionicons name="bed-outline" size={12} color="#22C55E" />
              <Text style={[styles.recoveryText, { color: "#22C55E" }]}>{aiInsights.recoveryAdvice}</Text>
            </View>
          )}
        </View>

        {/* ── Upload CTA ── */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push("/inbody"); }}
          style={{ borderRadius: 20, overflow: "hidden" }}
        >
          <LinearGradient
            colors={[colors.purple, "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadBanner}
          >
            <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadTitle}>Upload New Report</Text>
              <Text style={styles.uploadSub}>Camera · Image · PDF supported</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components (unchanged design) ───────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendDotRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color }]}>{label}</Text>
    </View>
  );
}

function CompareItem({ label, before, after, diff, positive }: {
  label: string; before: string; after: string; diff: string; positive: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.compareItem}>
      <Text style={[styles.compareItemLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.compareItemBefore, { color: colors.mutedForeground }]}>{before}</Text>
      <Text style={[styles.compareItemAfter, { color: colors.foreground }]}>{after}</Text>
      <Text style={[styles.compareItemDiff, { color: positive ? "#22C55E" : "#EF4444" }]}>{diff}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  scanBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  scoreCard: { borderRadius: 20, padding: 20, gap: 14 },
  scoreTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  scoreLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  scoreNum: { fontSize: 56, fontFamily: "Inter_700Bold", letterSpacing: -2, lineHeight: 60 },
  scoreDesc: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 4 },
  legendRow: { flexDirection: "column", gap: 5, marginTop: 10 },
  legendDotRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  improvePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" },
  improveText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  compareCard: { borderRadius: 20, padding: 16 },
  compareHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  compareTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  compareRow: { flexDirection: "row", alignItems: "center" },
  compareItem: { flex: 1, alignItems: "center", gap: 3 },
  compareItemLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  compareItemBefore: { fontSize: 11, fontFamily: "Inter_400Regular", textDecorationLine: "line-through" },
  compareItemAfter: { fontSize: 14, fontFamily: "Inter_700Bold" },
  compareItemDiff: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  compareDivider: { width: 0.5, height: 60 },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: -4 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "47%", borderRadius: 16, padding: 14, gap: 6, flexGrow: 1 },
  metricIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  metricVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  metricLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metricChange: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start" },
  metricChangeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  reportCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16 },
  reportIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  reportTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reportMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  reportScore: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  reportScoreNum: { fontSize: 15, fontFamily: "Inter_700Bold" },

  emptyCard: { borderRadius: 16, padding: 28, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  aiCard: { borderRadius: 20, padding: 18, gap: 12, overflow: "hidden" },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  aiTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  refreshText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  insightRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  insightText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },
  recoveryPill: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  recoveryText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },

  uploadBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20 },
  uploadTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  uploadSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
