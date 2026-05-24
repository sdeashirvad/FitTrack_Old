import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MetricBigProps {
  label: string;
  value: string;
  unit: string;
  color: string;
  rating?: { label: string; color: string };
}

export default function MetricBig({ label, value, unit, color, rating }: MetricBigProps) {
  const colors = useColors();

  return (
    <GlassCard style={styles.metricBig}>
      <Text style={[colors.typography.h2, { color, fontSize: 24 }]}> 
        {value}
        <Text style={{ fontSize: 14 }}>{unit}</Text>
      </Text>
      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
      {rating && (
        <View style={[styles.ratingBadge, { backgroundColor: rating.color + "18" }]}> 
          <Text style={[colors.typography.tiny, { color: rating.color }]}>{rating.label}</Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  metricBig: {
    flex: 1,
    padding: 14,
    gap: 4,
    alignItems: "center",
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
