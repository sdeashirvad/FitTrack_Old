import { useColors } from "@/hooks/useColors";
import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  useColorScheme,
} from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
}

export function GlassCard({
  children,
  style,
  onPress,
  elevated,
}: GlassCardProps) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";

  const cardStyle = [
    styles.card,
    {
      backgroundColor: elevated ? colors.surfaceElevated : colors.card,
      borderColor: colors.border,
      borderRadius: colors.radius,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
