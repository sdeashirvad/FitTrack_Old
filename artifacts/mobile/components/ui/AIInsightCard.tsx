import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface AIInsightCardProps {
  insights: string[];
  title?: string;
}

export function AIInsightCard({
  insights,
  title = "AI Insights",
}: AIInsightCardProps) {
  const colors = useColors();

  return (
    <GlassCard style={styles.card}>
      <LinearGradient
        colors={[colors.purple + "25", colors.primary + "10"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={colors.purple} />
        <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8 }]}>
          {title}
        </Text>
      </View>
      <View style={styles.insightsList}>
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightRow}>
            <View style={[styles.dot, { backgroundColor: colors.purple }]} />
            <Text style={[colors.typography.caption, { color: colors.secondary, flex: 1 }]}>
              {insight}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightsList: {
    gap: 10,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
});
