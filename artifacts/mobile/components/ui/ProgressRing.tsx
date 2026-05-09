import { useColors } from "@/hooks/useColors";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  centerContent?: React.ReactNode;
}

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  label,
  sublabel,
  centerContent,
}: ProgressRingProps) {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, { duration: 1200 });
  }, [clampedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        {centerContent ?? (
          <>
            {label && (
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {label}
              </Text>
            )}
            {sublabel && (
              <Text style={[styles.sublabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {sublabel}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 22,
    textAlign: "center",
  },
  sublabel: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
});
