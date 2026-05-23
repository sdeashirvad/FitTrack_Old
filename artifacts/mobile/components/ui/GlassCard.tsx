import { useColors } from "@/hooks/useColors";
import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
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

  const shadowStyle = elevated ? colors.shadow[shadowLevel] : {};

  const cardStyle = [
    styles.card,
    {
      backgroundColor: elevated ? colors.surfaceElevated : colors.card,
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
