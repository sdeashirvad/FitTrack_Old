import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProgressRing } from "@/components/ui/ProgressRing";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEMO_REPORTS = [
  {
    id: "r1",
    date: "May 15, 2026",
    weight: "78.2",
    bodyFat: "18.4",
    muscleMass: "32.8",
    bmi: "24.1",
    score: 74,
  },
  {
    id: "r2",
    date: "Apr 10, 2026",
    weight: "80.5",
    bodyFat: "20.1",
    muscleMass: "31.6",
    bmi: "24.8",
    score: 68,
  },
  {
    id: "r3",
    date: "Mar 5, 2026",
    weight: "83.0",
    bodyFat: "22.3",
    muscleMass: "30.2",
    bmi: "25.6",
    score: 61,
  },
];

const METRICS_INFO = [
  { label: "Body Fat", value: "18.4%", change: "-1.7%", positive: true, color: "#FF8A00", icon: "body" as const },
  { label: "Muscle Mass", value: "32.8 kg", change: "+1.2 kg", positive: true, color: "#10B981", icon: "barbell" as const },
  { label: "Visceral Fat", value: "7", change: "-1", positive: true, color: "#8B5CF6", icon: "fitness" as const },
  { label: "BMR", value: "1,780", change: "+45", positive: true, color: "#06B6D4", icon: "flame" as const },
];

export default function AnalysisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const latestReport = DEMO_REPORTS[0];
  const prevReport = DEMO_REPORTS[1];
  const weightDiff = (parseFloat(latestReport.weight) - parseFloat(prevReport.weight)).toFixed(1);
  const fatDiff = (parseFloat(latestReport.bodyFat) - parseFloat(prevReport.bodyFat)).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "18", colors.background]}
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
            <Text style={[colors.typography.h1, { color: colors.foreground }]}>Analysis</Text>
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
              Body composition insights
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/inbody");
            }}
            style={[styles.newScanBtn, { backgroundColor: colors.primary, borderRadius: colors.radiusSmall }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[colors.typography.bodyMedium, { color: "#fff", fontSize: 13 }]}>New Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Latest score card */}
        <GlassCard style={styles.scoreCard} elevated shadowLevel="medium">
          <LinearGradient
            colors={[colors.primary + "22", colors.primaryDark + "08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.scoreInner}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[colors.typography.label, { color: colors.primary }]}>LATEST BODY SCORE</Text>
              <Text style={[colors.typography.h1, { color: colors.foreground, fontSize: 52 }]}>
                {latestReport.score}
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                {latestReport.date}
              </Text>
              <View style={styles.changeRow}>
                <View style={[styles.changePill, { backgroundColor: colors.green + "18" }]}>
                  <Ionicons name="arrow-up" size={12} color={colors.green} />
                  <Text style={[colors.typography.caption, { color: colors.green, fontSize: 12 }]}>
                    +{latestReport.score - prevReport.score} pts from last scan
                  </Text>
                </View>
              </View>
            </View>
            <ProgressRing
              size={130}
              strokeWidth={11}
              progress={latestReport.score / 100}
              color={colors.primary}
              trackColor={colors.border}
              label={`${latestReport.score}`}
              sublabel="/ 100"
            />
          </View>
        </GlassCard>

        {/* Comparison strip */}
        <GlassCard style={styles.compareCard}>
          <View style={styles.compareHeader}>
            <Ionicons name="git-compare" size={16} color={colors.primary} />
            <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
              Last 30 Days
            </Text>
          </View>
          <View style={styles.compareRow}>
            <CompareItem
              label="Weight"
              before={`${prevReport.weight} kg`}
              after={`${latestReport.weight} kg`}
              diff={`${parseFloat(weightDiff) <= 0 ? "" : "+"}${weightDiff} kg`}
              positive={parseFloat(weightDiff) <= 0}
            />
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <CompareItem
              label="Body Fat"
              before={`${prevReport.bodyFat}%`}
              after={`${latestReport.bodyFat}%`}
              diff={`${parseFloat(fatDiff) <= 0 ? "" : "+"}${fatDiff}%`}
              positive={parseFloat(fatDiff) <= 0}
            />
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <CompareItem
              label="Muscle"
              before={`${prevReport.muscleMass} kg`}
              after={`${latestReport.muscleMass} kg`}
              diff={`+${(parseFloat(latestReport.muscleMass) - parseFloat(prevReport.muscleMass)).toFixed(1)} kg`}
              positive
            />
          </View>
        </GlassCard>

        {/* Key metrics */}
        <SectionHeader title="Key Metrics" />
        <View style={styles.metricsGrid}>
          {METRICS_INFO.map((m) => (
            <GlassCard key={m.label} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + "18" }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={[colors.typography.h3, { color: colors.foreground }]}>{m.value}</Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{m.label}</Text>
              <View style={[styles.metricChange, { backgroundColor: m.positive ? colors.green + "15" : colors.red + "15" }]}>
                <Ionicons
                  name={m.positive ? "trending-up" : "trending-down"}
                  size={11}
                  color={m.positive ? colors.green : colors.red}
                />
                <Text style={[colors.typography.tiny, { color: m.positive ? colors.green : colors.red }]}>
                  {m.change}
                </Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Report History */}
        <SectionHeader title="Report History" />
        {DEMO_REPORTS.map((report, idx) => (
          <TouchableOpacity
            key={report.id}
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/inbody");
            }}
            activeOpacity={0.85}
          >
            <GlassCard style={[styles.reportCard, { marginBottom: idx < DEMO_REPORTS.length - 1 ? 8 : 0 }]}>
              <View style={[styles.reportIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                  InBody Report
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {report.date} · {report.weight} kg · {report.bodyFat}% fat
                </Text>
              </View>
              <View style={styles.reportScoreBubble}>
                <Text style={[colors.typography.label, { color: colors.primary, fontSize: 14 }]}>
                  {report.score}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </GlassCard>
          </TouchableOpacity>
        ))}

        {/* Upload new CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push("/inbody");
          }}
          activeOpacity={0.88}
          style={[styles.uploadCTA, { borderRadius: colors.radius, overflow: "hidden" }]}
        >
          <LinearGradient
            colors={[colors.purple, "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadCTAInner}
          >
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={[colors.typography.h3, { color: "#fff" }]}>Upload New Report</Text>
              <Text style={[colors.typography.caption, { color: "#fff9" }]}>
                Camera · Image · PDF supported
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff9" />
          </LinearGradient>
        </TouchableOpacity>

        {/* AI Insights */}
        <GlassCard style={styles.aiCard}>
          <LinearGradient
            colors={[colors.primary + "18", colors.purple + "08"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
              AI Insights
            </Text>
          </View>
          {[
            "Your muscle mass has improved by 1.2 kg in the last 30 days — great work!",
            "Body fat is trending down. Continue with your current calorie deficit.",
            "Visceral fat level of 7 is in the healthy range. Maintain with cardio.",
          ].map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
              <Text style={[colors.typography.body, { color: colors.foreground, flex: 1, fontSize: 13 }]}>
                {insight}
              </Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function CompareItem({ label, before, after, diff, positive }: {
  label: string; before: string; after: string; diff: string; positive: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.compareItem}>
      <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[colors.typography.caption, { color: colors.mutedForeground, textDecorationLine: "line-through" }]}>{before}</Text>
      <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 14 }]}>{after}</Text>
      <Text style={[colors.typography.tiny, { color: positive ? colors.green : colors.red }]}>{diff}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  newScanBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9 },
  scoreCard: { padding: 20 },
  scoreInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  changeRow: { flexDirection: "row" },
  changePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  compareCard: { padding: 16 },
  compareHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  compareItem: { flex: 1, alignItems: "center", gap: 3 },
  compareDivider: { width: 0.5, height: 60 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "47%", padding: 14, gap: 6, flexGrow: 1 },
  metricIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  metricChange: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start" },
  reportCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  reportIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  reportScoreBubble: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  uploadCTA: {},
  uploadCTAInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  aiCard: { padding: 16, gap: 12, overflow: "hidden" },
  aiHeader: { flexDirection: "row", alignItems: "center" },
  insightRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
});
