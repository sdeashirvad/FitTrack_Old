import { GlassCard } from "@/components/ui/GlassCard";
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

  // ── Fetch fresh profile from DB on mount ────────────────────────────────────
  useEffect(() => {
    refreshProfile().catch(() => {
      // Silently fall back to cached data if offline
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch {
      // offline – use cached data
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  // ── Logout ──────────────────────────────────────────────────────────────────
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

  // ── Role switch (demo) ──────────────────────────────────────────────────────
  const handleSwitchRole = (role: UserRole) => {
    Haptics.selectionAsync();
    switchRole(role);
    Alert.alert("Role Switched", `Now viewing as ${role}`);
  };

  // ── Initials fallback for avatar ────────────────────────────────────────────
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const MENU_ITEMS = [
    {
      icon: "person-outline" as const,
      label: "Edit Profile",
      onPress: () => Alert.alert("Coming Soon", "Profile editing will be available shortly."),
    },
    {
      icon: "notifications-outline" as const,
      label: "Notifications",
      onPress: () => Alert.alert("Coming Soon"),
    },
    {
      icon: "shield-outline" as const,
      label: "Privacy & Security",
      onPress: () => Alert.alert("Coming Soon"),
    },
    {
      icon: "help-circle-outline" as const,
      label: "Help & Support",
      onPress: () => Alert.alert("Coming Soon"),
    },
    {
      icon: "information-circle-outline" as const,
      label: "About",
      onPress: () => Alert.alert("FitTrack", "Version 1.0.0"),
    },
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Avatar + info card ─────────────────────────────────────────────── */}
        <GlassCard style={styles.profileCard}>
          <LinearGradient
            colors={[colors.purple + "30", colors.primary + "10"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.avatarRow}>
            {/* Avatar — image if available, else initials */}
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={[styles.avatarImg, { borderColor: colors.primary }]}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.primary + "30", borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.avatarTxt,
                    { color: colors.primary, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {initials}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.userName,
                  { color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
              >
                {user?.name ?? "FitTrack User"}
              </Text>
              <Text
                style={[
                  styles.userEmail,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {user?.email || user?.phone || "—"}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.roleTxt,
                    { color: colors.primary, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {user?.role?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Extra profile details */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailsGrid}>
            <DetailChip
              icon="calendar-outline"
              label="Member Since"
              value={user?.memberSince ?? "—"}
              colors={colors}
            />
            <DetailChip
              icon="location-outline"
              label="Region"
              value={user?.region ?? "—"}
              colors={colors}
            />
            <DetailChip
              icon="fitness-outline"
              label="Goal"
              value={user?.fitnessGoal ?? "—"}
              colors={colors}
            />
            <DetailChip
              icon="body-outline"
              label="BMI"
              value={user?.bmi ?? "—"}
              colors={colors}
            />
          </View>
        </GlassCard>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: "Workouts", value: `${recentWorkouts.length}`, color: colors.primary },
            { label: "Streak", value: `${streak}d`, color: colors.secondary },
            { label: "BMI", value: `${bmi}`, color: colors.green },
            {
              label: "Weight",
              value: `${user?.weightKg ?? todayLog.weight ?? "--"}kg`,
              color: colors.purple,
            },
          ].map((s) => (
            <View
              key={s.label}
              style={[
                styles.statBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.statVal,
                  { color: s.color, fontFamily: "Inter_700Bold" },
                ]}
              >
                {s.value}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Achievements ─────────────────────────────────────────────────── */}
        <View>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Achievements
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achieveList}
          >
            {ACHIEVEMENTS.map((a) => (
              <View
                key={a.label}
                style={[
                  styles.achieveCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.achieveIcon,
                    { backgroundColor: a.color + "20" },
                  ]}
                >
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text
                  style={[
                    styles.achieveLabel,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {a.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Switch role (demo) ────────────────────────────────────────────── */}
        <GlassCard style={styles.roleCard}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Switch Role (Demo)
          </Text>
          <View style={styles.roleRow}>
            {(["member", "trainer", "owner"] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => handleSwitchRole(r)}
                style={[
                  styles.roleBtn,
                  {
                    backgroundColor:
                      user?.role === r ? colors.primary + "20" : colors.muted,
                    borderColor: user?.role === r ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleBtnTxt,
                    {
                      color:
                        user?.role === r ? colors.primary : colors.mutedForeground,
                      fontFamily:
                        user?.role === r ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* ── Settings menu ────────────────────────────────────────────────── */}
        <GlassCard style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                Haptics.selectionAsync();
                item.onPress();
              }}
              style={[
                styles.menuItem,
                idx < MENU_ITEMS.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.foreground} />
              </View>
              <Text
                style={[
                  styles.menuLabel,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
              >
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* ── Logout button ────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.destructive + "15",
              borderColor: colors.destructive + "30",
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text
            style={[
              styles.logoutTxt,
              { color: colors.destructive, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Detail chip sub-component ─────────────────────────────────────────────────
function DetailChip({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.muted + "60" }]}>
      <Ionicons name={icon} size={13} color={colors.mutedForeground} />
      <View>
        <Text
          style={{
            fontSize: 10,
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.foreground,
            fontFamily: "Inter_500Medium",
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  scroll: { paddingHorizontal: 16, gap: 14 },

  // Profile card
  profileCard: { padding: 20 },
  avatarRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36, borderWidth: 2 },
  avatarTxt: { fontSize: 24 },
  userName: { fontSize: 20 },
  userEmail: { fontSize: 13, marginTop: 2 },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  roleTxt: { fontSize: 11, letterSpacing: 0.5 },
  divider: { height: 0.5, marginVertical: 14 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statVal: { fontSize: 17 },
  statLabel: { fontSize: 11 },

  // Achievements
  sectionTitle: { fontSize: 17, marginBottom: 10 },
  achieveList: { gap: 10, paddingRight: 16 },
  achieveCard: {
    width: 100,
    alignItems: "center",
    padding: 14,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  achieveIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  achieveLabel: { fontSize: 12, textAlign: "center" },

  // Role switcher
  roleCard: { padding: 16, gap: 14 },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  roleBtnTxt: { fontSize: 13 },

  // Settings menu
  menuCard: { padding: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15 },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutTxt: { fontSize: 15 },
});
