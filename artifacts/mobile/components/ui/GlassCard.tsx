import { useColors } from "@/hooks/useColors";
import React, { useEffect } from "react";
import { Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  shadowLevel?: "soft" | "medium" | "strong";
}

function getShadow(level: "soft" | "medium" | "strong") {
  if (Platform.OS === "web") {
    const shadows = {
      soft: "0 2px 8px rgba(0,0,0,0.06)",
      medium: "0 4px 16px rgba(0,0,0,0.10)",
      strong: "0 8px 24px rgba(0,0,0,0.14)",
    };
    return { boxShadow: shadows[level] } as any;
  }
  const shadows = {
    soft: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    medium: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 5 },
    strong: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 10 },
  };
  return shadows[level];
}

export function GlassCard({
  children,
  style,
  onPress,
  elevated,
  shadowLevel = "soft",
}: GlassCardProps) {
  const colors = useColors();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const shadowStyle = elevated ? getShadow(shadowLevel) : getShadow("soft");

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: colors.radius,
    },
    shadowStyle,
    style,
  ];

  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={cardStyle}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <Animated.View style={[animatedStyle, cardStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
