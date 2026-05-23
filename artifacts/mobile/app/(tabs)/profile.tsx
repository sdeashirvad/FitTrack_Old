import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuth, UserRole } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACHIEVEMENTS = [
  { icon: "flame" as const, label: "12-Day Streak", color: "#FF6B35" },
  { icon: "barbell" as const, label: "50 Workouts", color: "#00D4FF" },
  { icon: "trophy" as const, label: "10kg Lost", color: "#FBBF24" },
  { icon: "star" as const, label: "Top Member", color: "#8B5CF6" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, switchRole, refreshProfile } = useAuth();
  const { recentWorkouts, bmi, streak, todayLog } = useFitness();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch {} finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to log out?");
      if (confirmed) {
        logout().then(() => {
          router.replace("/(auth)/login");
        });
      }
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await logout();
              router.replace("/(auth)/login");
            },
          },
        ],
      );
    }
  };

  const handleSwitchRole = (role: UserRole) => {
    Haptics.selectionAsync();
    switchRole(role);
    Alert.alert("Role Switched", `Now viewing as ${role}`);
  };

  const initials =
    user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  const MENU_ITEMS = [
    { icon: "person-outline" as const, label: "Edit Profile", onPress: () => Alert.alert("Coming Soon", "Profile editing will be available shortly.") },
    { icon: "notifications-outline" as const, label: "Notifications", onPress: () => Alert.alert("Coming Soon") },
    { icon: "shield-outline" as const, label: "Privacy & Security", onPress: () => Alert.alert("Coming Soon") },
    { icon: "help-circle-outline" as const, label: "Help & Support", onPress: () => Alert.alert("Coming Soon") },
    { icon: "information-circle-outline" as const, label: "About", onPress: () => Alert.alert("FitTrack", "Version 1.0.0") },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.purple + "18", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile card */}
        <GlassCard style={styles.profileCard}>
          <LinearGradient
            colors={[colors.purple + "30", colors.primary + "10"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.avatarRow}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={[styles.avatarImg, { borderColor: colors.primary }]}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + "30", borderColor: colors.primary }]}>
                <Text style={[colors.typography.h1, { color: colors.primary }]}>{initials}</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={[colors.typography.h2, { color: colors.foreground }]}>
                {user?.name ?? "FitTrack User"}
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                {user?.email || user?.phone || "—"}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[colors.typography.label, { color: colors.primary }]}>
                  {user?.role?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailsGrid}>
            <DetailChip icon="calendar-outline" label="Member Since" value={user?.memberSince ?? "—"} />
            <DetailChip icon="location-outline" label="Region" value={user?.region ?? "—"} />
            <DetailChip icon="fitness-outline" label="Goal" value={user?.fitnessGoal ?? "—"} />
            <DetailChip icon="body-outline" label="BMI" value={user?.bmi ?? "—"} />
          </View>
        </GlassCard>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: "Workouts", value: `${recentWorkouts.length}`, color: colors.primary },
            { label: "Streak", value: `${streak}d`, color: colors.secondary },
            { label: "BMI", value: `${bmi}`, color: colors.green },
            { label: "Weight", value: `${user?.weightKg ?? todayLog.weight ?? "--"}kg`, color: colors.purple },
          ].map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusSmall }]}>
              <Text style={[colors.typography.h3, { color: s.color }]}>{s.value}</Text>
              <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View>
          <SectionHeader title="Achievements" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achieveList}>
            {ACHIEVEMENTS.map((a) => (
              <View key={a.label} style={[styles.achieveCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.achieveIcon, { backgroundColor: a.color + "20" }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 12, textAlign: "center" }]}>
                  {a.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Role switcher */}
        <GlassCard style={styles.roleCard}>
          <SectionHeader title="Switch Role (Demo)" />
          <View style={styles.roleRow}>
            {(["member", "trainer", "owner"] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => handleSwitchRole(r)}
                style={[
                  styles.roleBtn,
                  {
                    backgroundColor: user?.role === r ? colors.primary + "20" : colors.muted,
                    borderColor: user?.role === r ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[
                  colors.typography.bodyMedium,
                  { color: user?.role === r ? colors.primary : colors.mutedForeground, fontSize: 13 },
                ]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Settings menu */}
        <GlassCard style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                Haptics.selectionAsync();
                item.onPress();
              }}
              style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name={item.icon} size={18} color={colors.foreground} />
              </View>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground, flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* Logout button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30", borderRadius: colors.radiusSmall }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[colors.typography.bodyMedium, { color: colors.destructive }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function DetailChip({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: colors.muted + "60" }]}>
      <Ionicons name={icon} size={13} color={colors.mutedForeground} />
      <View>
        <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 13, marginTop: 1 }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  profileCard: { padding: 20 },
  avatarRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarImg: { width: 72, height: 72, borderRadius: 36, borderWidth: 2 },
  roleBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start" },
  divider: { height: 0.5, marginVertical: 14 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, alignItems: "center", padding: 12, borderWidth: 1, gap: 4 },
  achieveList: { gap: 10, paddingRight: 16 },
  achieveCard: { width: 100, alignItems: "center", padding: 14, gap: 8, borderWidth: 1 },
  achieveIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  roleCard: { padding: 16, gap: 14 },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  menuCard: { padding: 4 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderWidth: 1 },
});
