import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  onAction?: () => void;
  actionLabel?: string;
  showAI?: boolean;
}

export function SectionHeader({
  title,
  onAction,
  actionLabel = "See All",
  showAI,
}: SectionHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[colors.typography.h3, { color: colors.foreground }]}>
          {title}
        </Text>
        {showAI && (
          <View style={[styles.aiBadge, { backgroundColor: colors.purple + "20" }]}>
            <Ionicons name="sparkles" size={12} color={colors.purple} />
            <Text style={[colors.typography.tiny, { color: colors.purple, marginLeft: 4 }]}>
              AI
            </Text>
          </View>
        )}
      </View>
      {onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[colors.typography.caption, { color: colors.primary }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
});
