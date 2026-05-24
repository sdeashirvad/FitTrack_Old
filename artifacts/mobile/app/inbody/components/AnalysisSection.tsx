import { GlassCard } from "@/components/ui/GlassCard";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface AnalysisSectionProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  status: string;
  statusColor: string;
  description: string;
  recommendation: string;
}

export default function AnalysisSection({
  icon,
  iconColor,
  title,
  status,
  statusColor,
  description,
  recommendation,
}: AnalysisSectionProps) {
  const colors = useColors();

  return (
    <GlassCard style={styles.analysisCard}>
      <View style={styles.analysisHeader}>
        <View style={[styles.analysisIconWrap, { backgroundColor: iconColor + "18" }]}> 
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[colors.typography.h3, { color: colors.foreground, flex: 1 }]}>{title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}> 
          <Text style={[colors.typography.label, { color: statusColor, fontSize: 10 }]}>{status}</Text>
        </View>
      </View>
      <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>{description}</Text>
      <View style={[styles.recoBox, { backgroundColor: colors.primary + "10", borderLeftColor: colors.primary }]}> 
        <Ionicons name="bulb-outline" size={13} color={colors.primary} />
        <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>{recommendation}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  analysisCard: {
    padding: 16,
    gap: 12,
    overflow: "hidden",
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  analysisIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recoBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
});
