import { useAuth, UserRole } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  { icon: "flame" as const, label: "12-Day\nStreak", color: "#FF6B35" },
  { icon: "barbell" as const, label: "50\nWorkouts", color: "#3B82F6" },
  { icon: "trophy" as const, label: "10 kg\nLost", color: "#F59E0B" },
  { icon: "star" as const, label: "Top\nMember", color: "#8B5CF6" },
];

const MENU_ITEMS = [
  { icon: "person-outline" as const, label: "Edit Profile", sub: "Update your info" },
  { icon: "notifications-outline" as const, label: "Notifications", sub: "Push & email alerts" },
  { icon: "shield-checkmark-outline" as const, label: "Privacy & Security", sub: "Data & permissions" },
  { icon: "help-circle-outline" as const, label: "Help & Support", sub: "FAQs and contact" },
  { icon: "information-circle-outline" as const, label: "About FitTrack", sub: "Version 1.0.0" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, switchRole, refreshProfile } = useAuth();
  const { recentWorkouts, bmi, streak, todayLog } = useFitness();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  useEffect(() => { refreshProfile().catch(() => {}); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshProfile(); } catch {} finally { setRefreshing(false); }
  }, [refreshProfile]);

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        logout().then(() => router.replace("/(auth)/login"));
      }
    } else {
      Alert.alert("Logout", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/(auth)/login");
        }},
      ]);
    }
  };

  const handleSwitchRole = (role: UserRole) => {
    Haptics.selectionAsync();
    switchRole(role);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Profile hero */}
        <View style={[styles.profileHero, { ...colors.shadow.medium }]}>
          <LinearGradient
            colors={["#1A1A2E", "#16213E", "#0D0D1A"]}
            style={styles.profileBg}
          >
            {/* Settings */}
            <TouchableOpacity style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "30", borderColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
            </View>

            <Text style={styles.heroName}>{user?.name ?? "FitTrack User"}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.heroMeta}>{user?.region ?? "Tokyo, Japan"}</Text>
              <Text style={styles.heroDot}>·</Text>
              <Text style={styles.heroMeta}>{user?.role === "trainer" ? "Trainer" : "Basic Member"}</Text>
            </View>

            {/* Stats row */}
            <View style={styles.heroStats}>
              <HeroStat value={`${recentWorkouts.length}`} label="Workouts" />
              <View style={styles.heroStatDivider} />
              <HeroStat value={`${streak}d`} label="Streak" />
              <View style={styles.heroStatDivider} />
              <HeroStat value={`${bmi}`} label="BMI" />
              <View style={styles.heroStatDivider} />
              <HeroStat value={`${user?.weightKg ?? todayLog.weight ?? "--"} kg`} label="Weight" />
            </View>
          </LinearGradient>
        </View>

        {/* Score card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <View style={styles.scoreHeader}>
            <View style={[styles.scoreIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="analytics" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Fitness Score</Text>
              <Text style={[styles.scoreSub, { color: colors.mutedForeground }]}>Based on your activity</Text>
            </View>
            <TouchableOpacity style={[styles.weeklyBtn, { backgroundColor: colors.muted }]}>
              <Text style={[styles.weeklyText, { color: colors.mutedForeground }]}>Weekly</Text>
              <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.scoreBarRow}>
            <View style={[styles.scoreBarTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.scoreBarFill, { backgroundColor: colors.primary, width: "73%" }]} />
            </View>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>73</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Good — Keep pushing to reach 80!</Text>
        </View>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achieveList}>
          {ACHIEVEMENTS.map((a) => (
            <View key={a.label} style={[styles.achieveCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
              <View style={[styles.achieveIcon, { backgroundColor: a.color + "18" }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={[styles.achieveLabel, { color: colors.foreground }]}>{a.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Body stats */}
        <View style={[styles.bodyCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <Text style={[styles.bodyCardTitle, { color: colors.foreground }]}>Body Stats</Text>
          <View style={styles.bodyGrid}>
            <BodyStat icon="body" label="BMI" value={`${bmi}`} color={colors.primary} />
            <BodyStat icon="fitness" label="Goal" value={user?.fitnessGoal ?? "Fat Loss"} color={colors.green} />
            <BodyStat icon="calendar" label="Member Since" value={user?.memberSince ?? "2024"} color={colors.cyan} />
            <BodyStat icon="location" label="Region" value={user?.region ?? "Tokyo"} color={colors.purple} />
          </View>
        </View>

        {/* Role switcher */}
        <View style={[styles.roleCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <Text style={[styles.roleTitle, { color: colors.foreground }]}>Switch Role (Demo)</Text>
          <View style={styles.roleRow}>
            {(["member", "trainer", "owner"] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => handleSwitchRole(r)}
                style={[
                  styles.roleBtn,
                  { backgroundColor: user?.role === r ? colors.primary : colors.muted },
                ]}
              >
                <Text style={[styles.roleBtnText, { color: user?.role === r ? "#fff" : colors.mutedForeground }]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => { Haptics.selectionAsync(); Alert.alert("Coming Soon"); }}
              style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name={item.icon} size={18} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={[styles.logoutText, { color: colors.red }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStatItem}>
      <Text style={styles.heroStatVal}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function BodyStat({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.bodyStat, { backgroundColor: colors.background }]}>
      <View style={[styles.bodyStatIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.bodyStatVal, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.bodyStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },

  profileHero: { borderRadius: 20, overflow: "hidden" },
  profileBg: { padding: 20, paddingBottom: 24 },
  settingsBtn: { alignSelf: "flex-end" },
  avatarWrap: { alignItems: "center", marginVertical: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  heroName: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "center", marginTop: 4, marginBottom: 18 },
  heroMeta: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular" },
  heroDot: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  heroStats: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 },
  heroStatItem: { flex: 1, alignItems: "center", gap: 2 },
  heroStatVal: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  heroStatLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular" },
  heroStatDivider: { width: 0.5, height: 32, backgroundColor: "rgba(255,255,255,0.15)" },

  scoreCard: { borderRadius: 16, padding: 16, gap: 10 },
  scoreHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  scoreTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scoreSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  weeklyBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  weeklyText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scoreBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreNum: { fontSize: 20, fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
  scoreLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: -4 },
  achieveList: { gap: 10, paddingRight: 16 },
  achieveCard: { width: 100, borderRadius: 16, padding: 14, alignItems: "center", gap: 8 },
  achieveIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  achieveLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },

  bodyCard: { borderRadius: 16, padding: 16, gap: 12 },
  bodyCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bodyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bodyStat: { width: "47%", flexGrow: 1, borderRadius: 12, padding: 12, gap: 4 },
  bodyStatIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bodyStatVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bodyStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  roleCard: { borderRadius: 16, padding: 16, gap: 12 },
  roleTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  roleBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  menuCard: { borderRadius: 16, padding: 4 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  menuSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
