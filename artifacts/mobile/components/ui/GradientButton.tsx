import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  colors?: [string, string];
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { height: 40, paddingHorizontal: 16, fontSize: 13, iconSize: 16 },
  md: { height: 52, paddingHorizontal: 24, fontSize: 15, iconSize: 20 },
  lg: { height: 56, paddingHorizontal: 32, fontSize: 16, iconSize: 22 },
};

export function GradientButton({
  label,
  onPress,
  colors: gradientColors,
  icon,
  loading,
  disabled,
  fullWidth = true,
  size = "md",
}: GradientButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const sizeConfig = sizeMap[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const gradColors = gradientColors ?? [colors.primary, colors.primaryDark];

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            height: sizeConfig.height,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            borderRadius: colors.radiusFull,
            opacity: disabled ? 0.5 : 1,
            alignSelf: (fullWidth ? "stretch" : "flex-start") as "stretch" | "flex-start",
          },
        ]}
      >
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: colors.radiusFull }]}
        />
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={sizeConfig.iconSize}
                color={colors.primaryForeground}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={[
                { fontSize: sizeConfig.fontSize, color: colors.primaryForeground },
                colors.typography.bodyMedium,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
