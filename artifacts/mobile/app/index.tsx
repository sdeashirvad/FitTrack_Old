import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/**
 * Root entry point.
 *
 * Routing logic:
 * 1. Loading → show spinner
 * 2. Not authenticated → onboarding intro (which leads to login)
 * 3. Authenticated + onboarding NOT done → setup wizard
 * 4. Authenticated + onboarding done → role-specific dashboard (all under /(tabs))
 */
export default function RootIndex() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // New user who has not completed the setup wizard
  if (!user?.onboardingCompleted) {
    return <Redirect href="/(auth)/setup" />;
  }

  // All roles share the same tab navigator; role-specific content is shown
  // conditionally inside each screen using useAuth().user.role.
  return <Redirect href="/(tabs)" />;
}
