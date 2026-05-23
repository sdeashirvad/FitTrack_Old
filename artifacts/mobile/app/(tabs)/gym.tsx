import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";

const MEMBERSHIP_PLANS = [
  { name: "Monthly", price: "₹999", duration: "1 Month", popular: false },
  { name: "Quarterly", price: "₹2,499", duration: "3 Months", popular: true },
  { name: "Annual", price: "₹7,999", duration: "12 Months", popular: false },
];

const TRAINERS = [
  { name: "Rohit Verma", specialty: "Strength & Conditioning", rating: 4.9, sessions: 320, avatar: "RV" },
  { name: "Sneha Kapoor", specialty: "Yoga & Flexibility", rating: 4.8, sessions: 250, avatar: "SK" },
  { name: "Karan Singh", specialty: "Weight Loss & HIIT", rating: 4.7, sessions: 180, avatar: "KS" },
];

const SLOTS = [
  { time: "6:00 AM", available: true },
  { time: "7:00 AM", available: false },
  { time: "8:00 AM", available: true },
  { time: "9:00 AM", available: true },
  { time: "5:00 PM", available: false },
  { time: "6:00 PM", available: true },
  { time: "7:00 PM", available: true },
  { time: "8:00 PM", available: false },
];

export default function GymScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const memberRole = user?.role === "member";
  const trainerRole = user?.role === "trainer";
  const ownerRole = user?.role === "owner";

  const handleCheckIn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCheckedIn(true);
    Alert.alert("Checked In!", "Welcome to FitZone Gym! Have a great workout.");
  };

  const handleBookSlot = () => {
    if (!selectedSlot) {
      Alert.alert("Select a slot", "Please choose a time slot first");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Slot Booked!", `Your slot at ${selectedSlot} is confirmed.`);
    setSelectedSlot(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.green + "15", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <Text style={[colors.typography.h1, { color: colors.foreground }]}>
          {ownerRole ? "Gym Dashboard" : trainerRole ? "Trainer Panel" : "My Gym"}
        </Text>

        {/* Membership card */}
        {memberRole && (
          <GlassCard style={styles.membershipCard}>
            <LinearGradient
              colors={[colors.primary, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.membershipInner}>
              <View>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                  {user?.gymName}
                </Text>
                <Text style={[colors.typography.caption, { color: colors.primaryForeground + "99" }]}>
                  {user?.name}
                </Text>
                <View style={styles.membershipBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={[colors.typography.bodyMedium, { color: colors.green, fontSize: 13 }]}>
                    Active Member
                  </Text>
                </View>
              </View>
              <View style={styles.membershipRight}>
                <Text style={[colors.typography.tiny, { color: colors.primaryForeground + "80" }]}>
                  Member since
                </Text>
                <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground }]}>
                  {user?.memberSince}
                </Text>
                <Text style={[colors.typography.tiny, { color: colors.primaryForeground + "60" }]}>
                  Expires: Jan 2025
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* QR Check-in */}
        {memberRole && (
          <GlassCard style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <View>
                <Text style={[colors.typography.h3, { color: colors.foreground }]}>
                  QR Check-in
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {checkedIn ? "You're checked in today!" : "Scan at gym entrance"}
                </Text>
              </View>
              {checkedIn && (
                <View style={[styles.checkedBadge, { backgroundColor: colors.green + "20" }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                  <Text style={[colors.typography.bodyMedium, { color: colors.green }]}>In</Text>
                </View>
              )}
            </View>

            {!checkedIn ? (
              <View style={styles.qrCodeWrap}>
                <QRCodePlaceholder color={colors.primary} />
                <TouchableOpacity
                  onPress={handleCheckIn}
                  style={[styles.scanBtn, { backgroundColor: colors.green }]}
                >
                  <Ionicons name="qr-code-outline" size={20} color={colors.primaryForeground} />
                  <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                    Mark Attendance
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.checkedInBanner, { backgroundColor: colors.green + "15" }]}>
                <Ionicons name="time" size={20} color={colors.green} />
                <Text style={[colors.typography.bodyMedium, { color: colors.green }]}>
                  Checked in at {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            )}
          </GlassCard>
        )}

        {/* Slot booking */}
        {memberRole && (
          <GlassCard style={styles.slotCard}>
            <SectionHeader title="Book a Slot" />
            <View style={styles.slotsGrid}>
              {SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot.time}
                  onPress={() => {
                    if (!slot.available) return;
                    Haptics.selectionAsync();
                    setSelectedSlot(selectedSlot === slot.time ? null : slot.time);
                  }}
                  disabled={!slot.available}
                  style={[
                    styles.slotBtn,
                    {
                      backgroundColor:
                        selectedSlot === slot.time
                          ? colors.primary + "20"
                          : !slot.available
                            ? colors.muted
                            : colors.card,
                      borderColor:
                        selectedSlot === slot.time
                          ? colors.primary
                          : colors.border,
                      opacity: slot.available ? 1 : 0.5,
                      borderRadius: colors.radiusSmall,
                    },
                  ]}
                >
                  <Text
                    style={[
                      colors.typography.caption,
                      {
                        color: selectedSlot === slot.time ? colors.primary : slot.available ? colors.foreground : colors.mutedForeground,
                      },
                    ]}
                  >
                    {slot.time}
                  </Text>
                  {!slot.available && (
                    <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>Full</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleBookSlot}
              style={[styles.bookBtn, { backgroundColor: colors.primary, opacity: selectedSlot ? 1 : 0.5, borderRadius: colors.radiusSmall }]}
            >
              <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
                {selectedSlot ? `Confirm ${selectedSlot} Slot` : "Select a Slot"}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Trainer booking */}
        {memberRole && (
          <View>
            <SectionHeader title="Book a Trainer" />
            {TRAINERS.map((t) => (
              <GlassCard key={t.name} style={styles.trainerCard}>
                <View style={[styles.trainerAvatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[colors.typography.h3, { color: colors.primary }]}>{t.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{t.name}</Text>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{t.specialty}</Text>
                  <View style={styles.trainerMeta}>
                    <Ionicons name="star" size={12} color={colors.yellow} />
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                      {t.rating} · {t.sessions} sessions
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert("Request Sent", `Trainer request sent to ${t.name}`);
                  }}
                  style={[styles.bookTrainerBtn, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
                >
                  <Text style={[colors.typography.bodyMedium, { color: colors.primary }]}>Book</Text>
                </TouchableOpacity>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Membership plans */}
        <View>
          <SectionHeader title="Membership Plans" />
          {MEMBERSHIP_PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.name}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert("Renew Membership", `Renew with ${plan.name} plan for ${plan.price}?`);
              }}
              activeOpacity={0.85}
            >
              <GlassCard style={[styles.planCard, plan.popular && { borderColor: colors.primary }]}>
                {plan.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground, fontSize: 10 }]}>Popular</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{plan.name}</Text>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{plan.duration}</Text>
                </View>
                <Text style={[colors.typography.h2, { color: plan.popular ? colors.primary : colors.foreground }]}>
                  {plan.price}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Owner analytics */}
        {ownerRole && (
          <GlassCard style={styles.ownerCard}>
            <SectionHeader title="Gym Overview" />
            {[
              { label: "Total Members", value: "248", icon: "people" as const, color: colors.primary },
              { label: "Active Today", value: "32", icon: "body" as const, color: colors.green },
              { label: "Monthly Revenue", value: "₹1.2L", icon: "card" as const, color: colors.secondary },
              { label: "Trainers", value: "6", icon: "barbell" as const, color: colors.purple },
            ].map((stat) => (
              <View key={stat.label} style={[styles.ownerStat, { borderBottomColor: colors.border }]}>
                <View style={[styles.ownerStatIcon, { backgroundColor: stat.color + "20" }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={[colors.typography.body, { color: colors.mutedForeground, flex: 1 }]}>{stat.label}</Text>
                <Text style={[colors.typography.h3, { color: colors.foreground }]}>{stat.value}</Text>
              </View>
            ))}
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

function QRCodePlaceholder({ color }: { color: string }) {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Rect x="0" y="0" width="40" height="40" rx="4" fill={color} opacity={0.2} />
      <Rect x="5" y="5" width="30" height="30" rx="2" fill={color} opacity={0.5} />
      <Rect x="80" y="0" width="40" height="40" rx="4" fill={color} opacity={0.2} />
      <Rect x="85" y="5" width="30" height="30" rx="2" fill={color} opacity={0.5} />
      <Rect x="0" y="80" width="40" height="40" rx="4" fill={color} opacity={0.2} />
      <Rect x="5" y="85" width="30" height="30" rx="2" fill={color} opacity={0.5} />
      <Rect x="50" y="0" width="20" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="50" y="10" width="20" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="50" y="20" width="20" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="0" y="50" width="6" height="20" rx="2" fill={color} opacity={0.4} />
      <Rect x="10" y="50" width="6" height="20" rx="2" fill={color} opacity={0.4} />
      <Rect x="20" y="50" width="6" height="20" rx="2" fill={color} opacity={0.4} />
      <Rect x="50" y="50" width="70" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="50" y="65" width="30" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="90" y="65" width="30" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="50" y="80" width="70" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="50" y="95" width="40" height="6" rx="2" fill={color} opacity={0.4} />
      <Rect x="100" y="95" width="20" height="6" rx="2" fill={color} opacity={0.4} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  membershipCard: { padding: 20, minHeight: 120, overflow: "hidden" },
  membershipInner: { flexDirection: "row", justifyContent: "space-between" },
  membershipBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  membershipRight: { alignItems: "flex-end" },
  qrCard: { padding: 16, gap: 14 },
  qrHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  checkedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  qrCodeWrap: { alignItems: "center", gap: 16 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  checkedInBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  slotCard: { padding: 16, gap: 14 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, alignItems: "center", minWidth: 80 },
  bookBtn: { height: 48, alignItems: "center", justifyContent: "center" },
  trainerCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 8 },
  trainerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  trainerMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  bookTrainerBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  planCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 8, position: "relative" },
  popularBadge: { position: "absolute", top: -1, right: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ownerCard: { padding: 16, gap: 0 },
  ownerStat: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  ownerStatIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
