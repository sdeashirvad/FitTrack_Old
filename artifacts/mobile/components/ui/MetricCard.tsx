import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  progress?: number;
  progressColor?: string;
  onPress?: () => void;
}

export function MetricCard({
  icon,
  iconColor,
  value,
  label,
  progress,
  progressColor,
  onPress,
}: MetricCardProps) {
  const colors = useColors();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    if (progress !== undefined) {
      animatedWidth.value = withTiming(progress, { duration: 800 });
    }
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + "20", borderRadius: colors.radiusSmall }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      </View>
      <Text style={[colors.typography.h2, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {progress !== undefined && (
        <View style={[styles.progressTrack, { backgroundColor: colors.border, borderRadius: 3 }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: progressColor ?? colors.primary, borderRadius: 3 },
              progressStyle,
            ]}
          />
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    gap: 6,
  },
  header: {
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 6,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
});
