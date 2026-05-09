import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
  fullWidth = true,
}: PrimaryButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const bgColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.secondary
        : variant === "danger"
          ? colors.destructive
          : "transparent";

  const textColor =
    variant === "ghost" ? colors.primary : colors.primaryForeground;
  const borderColor =
    variant === "ghost" ? colors.primary : "transparent";

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          borderRadius: colors.radius,
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: textColor, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
