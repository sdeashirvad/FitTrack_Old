import { useColorScheme } from "react-native";

import colors, { type ThemeTokens } from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like radius, spacing, shadow, and typography.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts.
 */
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
    shadow: colors.shadow,
    typography: colors.typography,
  };
}
