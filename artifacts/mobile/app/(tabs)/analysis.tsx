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
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const DEMO_REPORTS = [
  { id: "r1", date: "May 15, 2026", weight: "78.2", bodyFat: "18.4", muscleMass: "32.8", bmi: "24.1", score: 74 },
  { id: "r2", date: "Apr 10, 2026", weight: "80.5", bodyFat: "20.1", muscleMass: "31.6", bmi: "24.8", score: 68 },
  { id: "r3", date: "Mar 5, 2026", weight: "83.0", bodyFat: "22.3", muscleMass: "30.2", bmi: "25.6", score: 61 },
];

const METRICS = [
  { label: "Body Fat", value: "18.4%", change: "-1.7%", positive: true, color: "#FF6B35", icon: "body" as const },
  { label: "Muscle Mass", value: "32.8 kg", change: "+1.2 kg", positive: true, color: "#22C55E", icon: "barbell" as const },
  { label: "Visceral Fat", value: "7", change: "-1", positive: true, color: "#8B5CF6", icon: "fitness" as const },
  { label: "BMR", value: "1,780", change: "+45", positive: true, color: "#3B82F6", icon: "flame" as const },
];

function RadarChart({ size = 220 }: { size?: number }) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const axes = [
    { label: "STRENGTH", angle: -90, value: 0.78 },
    { label: "AGILITY", angle: 30, value: 0.65 },
    { label: "ENDURANCE", angle: 150, value: 0.72 },
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
      {/* Grid circles */}
      {levels.map((l, i) => {
        const pts = axes.map((a) => toXY(a.angle, r * l));
        return (
          <Polygon
            key={i}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={colors.border}
            strokeWidth="1"
          />
        );
      })}

      {/* Axes */}
      {axes.map((a, i) => {
        const end = toXY(a.angle, r);
        return (
          <Line
            key={i}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke={colors.border}
            strokeWidth="1"
          />
        );
      })}

      {/* Data area */}
      <Polygon
        points={polygonPoints}
        fill={colors.primary + "30"}
        stroke={colors.primary}
        strokeWidth="2"
      />

      {/* Dots */}
      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={5} fill={colors.primary} />
      ))}

      {/* Labels */}
      {axes.map((a, i) => {
        const labelPos = toXY(a.angle, r * 1.25);
        return (
          <SvgText
            key={i}
            x={labelPos.x}
            y={labelPos.y}
            fontSize={9}
            fontFamily="Inter_600SemiBold"
            fill={axisColors[i]}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {a.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export default function AnalysisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const latest = DEMO_REPORTS[0];
  const prev = DEMO_REPORTS[1];
  const weightDiff = (parseFloat(latest.weight) - parseFloat(prev.weight)).toFixed(1);
  const fatDiff = (parseFloat(latest.bodyFat) - parseFloat(prev.bodyFat)).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analysis</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Body composition insights</Text>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/inbody"); }}
            style={[styles.scanBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.scanBtnText}>New Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Score card with radar */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, ...colors.shadow.medium }]}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>BODY SCORE</Text>
              <Text style={[styles.scoreNum, { color: colors.foreground }]}>88</Text>
              <Text style={[styles.scoreDesc, { color: colors.foreground }]}>You are a healthy individual.</Text>
              <View style={styles.legendRow}>
                <LegendDot color={colors.primary} label="STRENGTH" />
                <LegendDot color="#8E8E93" label="AGILITY" />
                <LegendDot color={colors.cyan} label="ENDURANCE" />
              </View>
            </View>
            <RadarChart size={Math.min(SCREEN_W * 0.48, 200)} />
          </View>
          <View style={[styles.improvePill, { backgroundColor: colors.green + "15" }]}>
            <Ionicons name="arrow-up" size={12} color={colors.green} />
            <Text style={[styles.improveText, { color: colors.green }]}>+{latest.score - prev.score} pts from last scan</Text>
          </View>
        </View>

        {/* 30-day comparison */}
        <View style={[styles.compareCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <View style={styles.compareHeader}>
            <Ionicons name="git-compare-outline" size={16} color={colors.primary} />
            <Text style={[styles.compareTitle, { color: colors.foreground }]}>Last 30 Days</Text>
          </View>
          <View style={styles.compareRow}>
            <CompareItem label="Weight" before={`${prev.weight} kg`} after={`${latest.weight} kg`} diff={`${parseFloat(weightDiff) <= 0 ? "" : "+"}${weightDiff} kg`} positive={parseFloat(weightDiff) <= 0} />
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <CompareItem label="Body Fat" before={`${prev.bodyFat}%`} after={`${latest.bodyFat}%`} diff={`${parseFloat(fatDiff) <= 0 ? "" : "+"}${fatDiff}%`} positive={parseFloat(fatDiff) <= 0} />
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <CompareItem label="Muscle" before={`${prev.muscleMass} kg`} after={`${latest.muscleMass} kg`} diff={`+${(parseFloat(latest.muscleMass) - parseFloat(prev.muscleMass)).toFixed(1)} kg`} positive />
          </View>
        </View>

        {/* Key metrics */}
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

        {/* Report history */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Report History</Text>
        {DEMO_REPORTS.map((rep, i) => (
          <TouchableOpacity
            key={rep.id}
            onPress={() => { Haptics.selectionAsync(); router.push("/inbody"); }}
            style={[styles.reportCard, { backgroundColor: colors.card, ...colors.shadow.soft, marginBottom: i < DEMO_REPORTS.length - 1 ? 8 : 0 }]}
          >
            <View style={[styles.reportIcon, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reportTitle, { color: colors.foreground }]}>InBody Report</Text>
              <Text style={[styles.reportMeta, { color: colors.mutedForeground }]}>
                {rep.date} · {rep.weight} kg · {rep.bodyFat}% fat
              </Text>
            </View>
            <View style={[styles.reportScore, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.reportScoreNum, { color: colors.primary }]}>{rep.score}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}

        {/* AI insights */}
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
          </View>
          {[
            "Your muscle mass improved by 1.2 kg in 30 days — great work!",
            "Body fat trending down. Continue with current calorie deficit.",
            "Visceral fat at 7 is healthy. Maintain with regular cardio.",
          ].map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
            </View>
          ))}
        </View>

        {/* Upload CTA */}
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

  aiCard: { borderRadius: 20, padding: 18, gap: 12, overflow: "hidden" },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  aiTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  insightRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  insightText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },

  uploadBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20 },
  uploadTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  uploadSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
