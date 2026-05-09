import { useColors } from "@/hooks/useColors";
import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonCardProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function SkeletonCard({
  width = "100%",
  height = 80,
  style,
  borderRadius,
}: SkeletonCardProps) {
  const colors = useColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          backgroundColor: colors.muted,
          borderRadius: borderRadius ?? colors.radius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
