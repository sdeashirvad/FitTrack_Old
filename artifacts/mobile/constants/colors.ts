const colors = {
  light: {
    // Premium fitness theme colors
    text: "#111827",
    tint: "#4A7BFF",
    background: "#F7F8FA",
    foreground: "#111827",
    card: "#FFFFFF",
    cardForeground: "#111827",
    // Primary blues - premium fitness accent
    primary: "#4A7BFF",
    primaryForeground: "#FFFFFF",
    primaryLight: "#4A7BFF20",
    primaryDark: "#2B59FF",
    // Secondary
    secondary: "#6B7280",
    secondaryForeground: "#FFFFFF",
    // Accent colors for UI elements
    accent: "#4A7BFF",
    accentForeground: "#FFFFFF",
    // States
    muted: "#F1F5F9",
    mutedForeground: "#9CA3AF",
    border: "#F3F4F6",
    input: "#F8FAFC",
    surface: "#F1F5F9",
    surfaceElevated: "#FFFFFF",
    // Brand colors for metrics
    cyan: "#06B6D4",
    orange: "#F97316",
    green: "#10B981",
    purple: "#8B5CF6",
    yellow: "#F59E0B",
    red: "#EF4444",
    // Special UI colors
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#4A7BFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
  },
  dark: {
    text: "#F9FAFB",
    tint: "#60A5FA",
    background: "#0F172A",
    foreground: "#F9FAFB",
    card: "#1E293B",
    cardForeground: "#F9FAFB",
    primary: "#60A5FA",
    primaryForeground: "#FFFFFF",
    primaryLight: "#60A5FA30",
    primaryDark: "#3B82F6",
    secondary: "#94A3B8",
    secondaryForeground: "#F9FAFB",
    accent: "#60A5FA",
    accentForeground: "#FFFFFF",
    muted: "#334155",
    mutedForeground: "#94A3B8",
    border: "#334155",
    input: "#1E293B",
    surface: "#0F172A",
    surfaceElevated: "#1E293B",
    cyan: "#06B6D4",
    orange: "#F97316",
    green: "#10B981",
    purple: "#8B5CF6",
    yellow: "#F59E0B",
    red: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#60A5FA",
    destructive: "#F87171",
    destructiveForeground: "#FFFFFF",
  },
  // Consistent corner radius for premium feel
  radius: 20,
  radiusSmall: 12,
  radiusLarge: 28,
  radiusFull: 9999,
  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  // Shadow presets for premium elevation
  shadow: {
    soft: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    strong: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
  },
  // Typography scale using Inter
  typography: {
    h1: { fontSize: 28, lineHeight: 36, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    h2: { fontSize: 22, lineHeight: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
    h3: { fontSize: 17, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
    body: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
    bodyMedium: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_500Medium" },
    caption: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
    label: { fontSize: 12, lineHeight: 16, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" as const },
    tiny: { fontSize: 11, lineHeight: 14, fontFamily: "Inter_400Regular" },
  },
};

export type ColorTokens = typeof colors.light;
export type ThemeTokens = ColorTokens & {
  radius: typeof colors.radius;
  radiusSmall: typeof colors.radiusSmall;
  radiusLarge: typeof colors.radiusLarge;
  radiusFull: typeof colors.radiusFull;
  spacing: typeof colors.spacing;
  shadow: typeof colors.shadow;
  typography: typeof colors.typography;
};

export default colors;
