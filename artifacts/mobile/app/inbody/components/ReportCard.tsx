/**
 * ReportCard
 * ----------
 * Compact card for displaying a saved InBody report summary.
 * Shows body score, fitness level, weight, body fat %, and upload date.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import type { InBodyReport } from "@/hooks/useInbodyService";

interface ReportCardProps {
  report: InBodyReport;
  onPress: (report: InBodyReport) => void;
}

function computeBodyScore(metrics: InBodyReport["extractedMetrics"]): number {
  if (!metrics) return 0;
  if (metrics.inbodyScore) {
    const n = parseInt(metrics.inbodyScore, 10);
    if (!isNaN(n)) return Math.min(n, 100);
  }
  return Math.min(
    Math.round(
      (1 - Math.abs(parseFloat(metrics.bmi ?? "24") - 22) / 15) * 35 +
        (parseFloat(metrics.bodyFat ?? "20") < 22 ? 30 : 15) +
        (parseFloat(metrics.visceralFat ?? "8") <= 9 ? 20 : 8) +
        (parseFloat(metrics.skeletalMuscleMass ?? "30") > 30 ? 15 : 8),
    ),
    98,
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getFitnessLevel(report: InBodyReport): string | null {
  if (!report.geminiAnalysis) return null;
  const a = report.geminiAnalysis as Record<string, unknown>;
  if (typeof a.fitnessLevel === "string") return a.fitnessLevel;
  return null;
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 70) return colors.green;
  if (score >= 50) return colors.primary;
  return "#F59E0B";
}

export default function ReportCard({ report, onPress }: ReportCardProps) {
  const colors = useColors();
  const metrics = report.extractedMetrics;
  const score = computeBodyScore(metrics);
  const fitnessLevel = getFitnessLevel(report);
  const scoreColor = getScoreColor(score, colors);
  const weight = metrics?.weight;
  const bodyFat = metrics?.bodyFat;

  return (
    <TouchableOpacity onPress={() => onPress(report)} activeOpacity={0.82}>
      <GlassCard style={styles.card}>
        {/* Score circle */}
        <View style={[styles.scoreCircle, { borderColor: scoreColor + "60", backgroundColor: scoreColor + "14" }]}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color: scoreColor + "CC" }]}>score</Text>
        </View>

        {/* Main info */}
        <View style={styles.info}>
          <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]} numberOfLines={1}>
            {formatDate(report.createdAt)}
          </Text>
          <View style={styles.pillRow}>
            {weight && (
              <View style={[styles.pill, { backgroundColor: colors.muted }]}>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {weight} kg
                </Text>
              </View>
            )}
            {bodyFat && (
              <View style={[styles.pill, { backgroundColor: colors.muted }]}>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {bodyFat}% fat
                </Text>
              </View>
            )}
            {fitnessLevel && (
              <View style={[styles.pill, { backgroundColor: scoreColor + "18" }]}>
                <Text style={[colors.typography.caption, { color: scoreColor }]}>
                  {fitnessLevel}
                </Text>
              </View>
            )}
          </View>
          {!metrics && (
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
              {report.status === "failed" ? "Processing failed" : "Processing..."}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  scoreCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
