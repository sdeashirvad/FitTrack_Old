import { GlassCard } from "@/components/ui/GlassCard";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    weeklyCalories,
    recentWorkouts,
    streak,
    bmi,
    todayLog,
    calorieGoal,
    inBodyReports,
    addInBodyReport,
    connectedDevices,
    connectDevice,
    activitySummary,
  } = useFitness();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const maxCal = Math.max(...weeklyCalories, calorieGoal);
  const connectedCount = connectedDevices.filter((d) => d.status === "connected").length;

  const addReportFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Enable camera access to capture reports.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      await addInBodyReport({
        uri: asset.uri,
        source: "camera",
        fileName: asset.fileName ?? `inbody-${Date.now()}.jpg`,
      });
    }
  };

  const addReportFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [3, 4],
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      await addInBodyReport({
        uri: asset.uri,
        source: "library",
        fileName: asset.fileName ?? `inbody-${Date.now()}.jpg`,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.purple + "18", colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Analytics
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <GlassCard style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Weekly Calories
          </Text>
          <Text style={[styles.chartSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            This week vs. {calorieGoal} kcal goal
          </Text>
          <View style={styles.barChart}>
            {weeklyCalories.map((cal, i) => {
              const heightPct = cal > 0 ? (cal / maxCal) * 120 : 4;
              const isGoalMet = cal >= calorieGoal * 0.9;
              const isToday = i === 5;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barVal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {cal > 0 ? `${Math.round(cal / 100) / 10}k` : ""}
                  </Text>
                  <AnimatedBar
                    height={heightPct}
                    color={isToday ? colors.primary : isGoalMet ? colors.green : colors.border}
                    delay={i * 80}
                  />
                  <Text
                    style={[
                      styles.barDay,
                      {
                        color: isToday ? colors.primary : colors.mutedForeground,
                        fontFamily: isToday ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={[styles.chartLegend, { borderTopColor: colors.border }]}>
            <LegendDot color={colors.green} label="Goal met" />
            <LegendDot color={colors.primary} label="Today" />
            <LegendDot color={colors.border} label="Below goal" />
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Key Metrics
        </Text>
        <View style={styles.metricsGrid}>
          {[
            { label: "Workout Streak", value: `${streak} days`, icon: "flame" as const, color: colors.secondary },
            { label: "BMI", value: `${bmi}`, icon: "body" as const, color: colors.primary },
            { label: "This Week", value: `${recentWorkouts.length} sessions`, icon: "barbell" as const, color: colors.green },
            { label: "Avg Calories", value: `${Math.round(weeklyCalories.filter(Boolean).reduce((s, c) => s + c, 0) / (weeklyCalories.filter(Boolean).length || 1))} kcal`, icon: "flame" as const, color: colors.yellow },
          ].map((m) => (
            <GlassCard key={m.label} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + "20" }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={[styles.metricVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {m.value}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {m.label}
              </Text>
            </GlassCard>
          ))}
        </View>

        <GlassCard style={styles.bodyCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.chartTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Body Composition
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={addReportFromCamera}
                style={[styles.iconButton, { backgroundColor: colors.primary + "18" }]}
              >
                <Ionicons name="camera" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addReportFromLibrary}
                style={[styles.iconButton, { backgroundColor: colors.green + "18" }]}
              >
                <Ionicons name="image" size={18} color={colors.green} />
              </TouchableOpacity>
            </View>
          </View>

          {[
            { label: "Weight", value: `${todayLog.weight ?? "--"} kg`, progress: 0.7, color: colors.primary },
            { label: "BMI", value: `${bmi}`, progress: bmi / 40, color: bmi < 18.5 ? colors.yellow : bmi < 25 ? colors.green : bmi < 30 ? colors.secondary : colors.destructive },
          ].map((b) => (
            <View key={b.label} style={styles.bodyRow}>
              <Text style={[styles.bodyLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {b.label}
              </Text>
              <View style={[styles.bodyTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.bodyFill, { width: `${Math.min(b.progress * 100, 100)}%` as any, backgroundColor: b.color }]} />
              </View>
              <Text style={[styles.bodyVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {b.value}
              </Text>
            </View>
          ))}
          <Text style={[styles.bmiNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obese"} - {bmi < 25 ? "Keep it up!" : "Consider adjusting your diet."}
          </Text>
          <View style={[styles.reportStrip, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.reportCount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {inBodyReports.length}
              </Text>
              <Text style={[styles.reportLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                InBody reports
              </Text>
            </View>
            <Text style={[styles.reportMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {inBodyReports[0]
                ? `Last ${new Date(inBodyReports[0].uploadedAt).toLocaleDateString()}`
                : "Camera or gallery"}
            </Text>
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Connected Tracking
        </Text>
        <GlassCard style={styles.trackingCard}>
          <View style={styles.activityGrid}>
            {[
              { label: "Steps", value: activitySummary.steps.toLocaleString(), icon: "walk" as const, color: colors.green },
              { label: "Run", value: `${activitySummary.runningMinutes}m`, icon: "speedometer" as const, color: colors.secondary },
              { label: "Sleep", value: `${activitySummary.sleepHours}h`, icon: "moon" as const, color: colors.purple },
              { label: "Distance", value: `${activitySummary.distanceKm} km`, icon: "navigate" as const, color: colors.primary },
            ].map((item) => (
              <View key={item.label} style={[styles.activityTile, { backgroundColor: colors.surface + "AA" }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
                <Text style={[styles.activityVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {item.value}
                </Text>
                <Text style={[styles.activityLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.deviceList, { borderTopColor: colors.border }]}>
            <View style={styles.deviceSummary}>
              <Text style={[styles.deviceTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Sources
              </Text>
              <Text style={[styles.reportMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {connectedCount} connected
              </Text>
            </View>
            {connectedDevices.map((device) => {
              const isConnected = device.status === "connected";
              return (
                <View key={device.id} style={styles.deviceRow}>
                  <View style={[styles.deviceIcon, { backgroundColor: (isConnected ? colors.green : colors.border) + "30" }]}>
                    <Ionicons
                      name={device.type === "phone" ? "phone-portrait" : device.type === "smartwatch" ? "watch" : "fitness"}
                      size={18}
                      color={isConnected ? colors.green : colors.mutedForeground}
                    />
                  </View>
                  <View style={styles.deviceCopy}>
                    <Text style={[styles.deviceName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {device.name}
                    </Text>
                    <Text style={[styles.deviceMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {isConnected && device.lastSync
                        ? `Synced ${new Date(device.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Available"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={isConnected}
                    onPress={() => connectDevice(device.id)}
                    style={[
                      styles.connectButton,
                      { backgroundColor: isConnected ? colors.green + "18" : colors.primary + "18" },
                    ]}
                  >
                    <Text style={[styles.connectText, { color: isConnected ? colors.green : colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                      {isConnected ? "On" : "Connect"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.aiCard}>
          <LinearGradient
            colors={[colors.purple + "25", colors.primary + "10"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={20} color={colors.purple} />
            <Text style={[styles.aiTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              AI Insights
            </Text>
          </View>
          {[
            "You're 12% above your protein target - great for muscle building!",
            "Your calorie intake peaked on Wednesday. Consider spacing meals more evenly.",
            "Your connected sources can enrich walking, running, and sleep trends.",
          ].map((insight, i) => (
            <View key={i} style={styles.aiInsight}>
              <View style={[styles.aiDot, { backgroundColor: colors.purple }]} />
              <Text style={[styles.aiTxt, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {insight}
              </Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function AnimatedBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const h = useSharedValue(0);
  React.useEffect(() => {
    h.value = withDelay(delay, withSpring(height, { damping: 12 }));
  }, [height]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View style={[styles.bar, style, { backgroundColor: color }]} />
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 24 },
  chartCard: { padding: 16, gap: 12 },
  chartTitle: { fontSize: 16 },
  chartSub: { fontSize: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconButton: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  barChart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 160 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  barVal: { fontSize: 9 },
  bar: { width: "100%", borderRadius: 6, minHeight: 4 },
  barDay: { fontSize: 11 },
  chartLegend: { flexDirection: "row", gap: 16, paddingTop: 12, borderTopWidth: 0.5 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 12 },
  sectionTitle: { fontSize: 17 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "47%", padding: 14, gap: 8 },
  metricIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  metricVal: { fontSize: 18 },
  metricLabel: { fontSize: 12 },
  bodyCard: { padding: 16, gap: 14 },
  bodyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bodyLabel: { fontSize: 13, width: 56 },
  bodyTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  bodyFill: { height: 8, borderRadius: 4 },
  bodyVal: { fontSize: 13, width: 60, textAlign: "right" },
  bmiNote: { fontSize: 12, marginTop: 4 },
  reportStrip: { borderTopWidth: 0.5, paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportCount: { fontSize: 24 },
  reportLabel: { fontSize: 12 },
  reportMeta: { fontSize: 12 },
  trackingCard: { padding: 16, gap: 14 },
  activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  activityTile: { width: "47%", borderRadius: 8, padding: 12, gap: 6 },
  activityVal: { fontSize: 17 },
  activityLabel: { fontSize: 12 },
  deviceList: { borderTopWidth: 0.5, paddingTop: 12, gap: 12 },
  deviceSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deviceTitle: { fontSize: 15 },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  deviceIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  deviceCopy: { flex: 1 },
  deviceName: { fontSize: 14 },
  deviceMeta: { fontSize: 11, marginTop: 2 },
  connectButton: { minWidth: 78, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  connectText: { fontSize: 12 },
  aiCard: { padding: 16, gap: 14, overflow: "hidden" },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiTitle: { fontSize: 16 },
  aiInsight: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  aiDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  aiTxt: { flex: 1, fontSize: 13, lineHeight: 20 },
});
