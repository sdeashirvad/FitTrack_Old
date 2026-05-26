import { Platform, useColorScheme } from "react-native";
import colors, { type ThemeTokens } from "@/constants/colors";

function makeShadows() {
  if (Platform.OS === "web") {
    return {
      soft: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } as any,
      medium: { boxShadow: "0 4px 16px rgba(0,0,0,0.10)" } as any,
      strong: { boxShadow: "0 8px 24px rgba(0,0,0,0.14)" } as any,
    };
  }
  return colors.shadow;
}

export function useColors(): ThemeTokens {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;
  return {
    ...palette,
    radius: colors.radius,
    radiusSmall: colors.radiusSmall,
    radiusLarge: colors.radiusLarge,
    radiusFull: colors.radiusFull,
    spacing: colors.spacing,
    shadow: makeShadows(),
    typography: colors.typography,
  };
}
