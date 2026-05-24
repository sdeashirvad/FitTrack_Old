import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/hooks/useReports";
import type { WorkoutGoalId } from "@/lib/workoutGoals";
import { WORKOUT_GOALS, getGoalById, getGoalByTitle } from "@/lib/workoutGoals";
import { formatProfileSummary, profileFromUser } from "@/lib/workoutProfile";
import { recommendWorkoutGoal, type WorkoutRecommendation } from "@/lib/workoutRecommendation";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OnboardingStep = "goals" | "ai-loading" | "ai-result" | "ai-no-report";

interface WorkoutOnboardingFlowProps {
  onComplete: (goalId: WorkoutGoalId, source: "manual" | "ai", aiConfidence?: number) => Promise<void>;
}

export function WorkoutOnboardingFlow({ onComplete }: WorkoutOnboardingFlowProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { reports, refresh } = useReports(token);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState<OnboardingStep>("goals");
  const [selectedGoalId, setSelectedGoalId] = useState<WorkoutGoalId | null>(null);
  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null);
  const [saving, setSaving] = useState(false);

  const profile = profileFromUser(user);
  const profileLines = profile ? formatProfileSummary(profile) : [];
  const latestReport = reports.find((r) => r.status === "done" && r.extractedMetrics);
  const hasScan = Boolean(latestReport?.extractedMetrics);

  useEffect(() => {
    if (!selectedGoalId && user?.fitnessGoal) {
      const match = getGoalByTitle(user.fitnessGoal);
      if (match) setSelectedGoalId(match.id);
    }
  }, [user?.fitnessGoal, selectedGoalId]);

  const runAiRecommend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!profile && !hasScan) {
      setStep("ai-no-report");
      return;
    }
    setStep("ai-loading");
  }, [profile, hasScan]);

  useEffect(() => {
    if (step !== "ai-loading") return;
    const timer = setTimeout(() => {
      const rec = recommendWorkoutGoal({
        profile,
        report: latestReport ?? null,
      });
      setRecommendation(rec);
      setSelectedGoalId(rec.goalId);
      setStep("ai-result");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, hasScan ? 1400 : 900);
    return () => clearTimeout(timer);
  }, [step, latestReport, profile, hasScan]);

  const finish = async (goalId: WorkoutGoalId, source: "manual" | "ai", aiConfidence?: number) => {
    setSaving(true);
    try {
      await onComplete(goalId, source, aiConfidence);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const selectGoal = (id: WorkoutGoalId) => {
    Haptics.selectionAsync();
    setSelectedGoalId(id);
  };

  const confirmManual = () => {
    if (!selectedGoalId) return;
    finish(selectedGoalId, "manual");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {step === "goals" && (
          <>
            <View style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="sparkles" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Build Your AI Workout Plan</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Pick a training mode — or let AI suggest one using your profile and InBody data.
              </Text>
            </View>

            {profileLines.length > 0 && (
              <GlassCard style={styles.profileCard}>
                <View style={styles.profileCardHeader}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.profileCardTitle, { color: colors.foreground }]}>
                    From your profile
                  </Text>
                </View>
                {profileLines.map((line) => (
                  <Text key={line} style={[styles.profileLine, { color: colors.mutedForeground }]}>
                    {line}
                  </Text>
                ))}
                {hasScan && (
                  <Text style={[styles.profileLine, { color: colors.green, marginTop: 4 }]}>
                    + Latest InBody scan available for AI
                  </Text>
                )}
              </GlassCard>
            )}

            <View style={styles.goalList}>
              {WORKOUT_GOALS.map((goal) => {
                const selected = selectedGoalId === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    activeOpacity={0.88}
                    onPress={() => selectGoal(goal.id)}
                  >
                    <GlassCard
                      style={[
                        styles.goalCard,
                        selected && { borderWidth: 2, borderColor: goal.color },
                      ]}
                      shadowLevel={selected ? "medium" : "soft"}
                    >
                      {selected && (
                        <LinearGradient
                          colors={[goal.color + "22", goal.color + "06"]}
                          style={StyleSheet.absoluteFillObject}
                        />
                      )}
                      <View style={styles.goalRow}>
                        <View style={[styles.goalIconWrap, { backgroundColor: goal.color + "20" }]}>
                          <Ionicons name={goal.icon} size={24} color={goal.color} />
                        </View>
                        <View style={styles.goalText}>
                          <Text style={[styles.goalTitle, { color: colors.foreground }]}>{goal.title}</Text>
                          <Text style={[styles.goalShort, { color: colors.mutedForeground }]}>
                            {goal.shortDescription}
                          </Text>
                          <Text style={[styles.goalExplain, { color: colors.foreground }]}>
                            {goal.beginnerExplanation}
                          </Text>
                        </View>
                        <Ionicons
                          name={selected ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={selected ? goal.color : colors.border}
                        />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={confirmManual}
              disabled={!selectedGoalId || saving}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: selectedGoalId ? colors.primary : colors.muted,
                  opacity: selectedGoalId ? 1 : 0.6,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Continue with Selected Goal</Text>
              )}
            </TouchableOpacity>

            <View style={styles.aiSection}>
              <Text style={[styles.aiHint, { color: colors.mutedForeground }]}>
                Not sure what&apos;s best for you?
              </Text>
              <TouchableOpacity
                onPress={runAiRecommend}
                style={[styles.aiBtn, { borderColor: colors.primary + "50", backgroundColor: colors.primary + "10" }]}
              >
                <Ionicons name="bulb" size={20} color={colors.primary} />
                <Text style={[styles.aiBtnText, { color: colors.primary }]}>Let AI Recommend</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === "ai-loading" && (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground, marginTop: 20 }]}>
              {hasScan ? "Analyzing InBody + Profile" : "Analyzing Your Profile"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: "center" }]}>
              {hasScan
                ? "Combining body fat, BMI, visceral fat, muscle mass, and your signup goals…"
                : "Using fitness goal, activity level, experience, and diet from your account…"}
            </Text>
          </View>
        )}

        {step === "ai-result" && recommendation && (
          <>
            <View style={styles.hero}>
              <Text style={[styles.title, { color: colors.foreground }]}>AI Recommendation</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{recommendation.summaryLine}</Text>
            </View>

            <GlassCard style={styles.recCard} shadowLevel="medium">
              <View style={[styles.recBadge, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="ribbon" size={16} color={colors.primary} />
                <Text style={[styles.recBadgeText, { color: colors.primary }]}>Recommended Goal</Text>
              </View>
              <Text style={[styles.recGoalTitle, { color: colors.foreground }]}>
                {recommendation.goalTitle}
              </Text>
              <Text style={[styles.recBody, { color: colors.mutedForeground }]}>{recommendation.reasoning}</Text>

              {recommendation.dataSources.length > 0 && (
                <View style={styles.sourceRow}>
                  {recommendation.dataSources.map((src) => (
                    <View
                      key={src}
                      style={[styles.sourceChip, { backgroundColor: colors.muted }]}
                    >
                      <Text style={[styles.sourceChipText, { color: colors.mutedForeground }]}>{src}</Text>
                    </View>
                  ))}
                </View>
              )}

              {recommendation.profileGoalNote && (
                <View style={[styles.noteBox, { backgroundColor: colors.yellow + "14", borderColor: colors.yellow + "40" }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.yellow} />
                  <Text style={[styles.noteText, { color: colors.foreground }]}>
                    {recommendation.profileGoalNote}
                  </Text>
                </View>
              )}

              {!hasScan && (
                <TouchableOpacity
                  onPress={() => router.push("/inbody")}
                  style={[styles.uploadHint, { borderColor: colors.primary + "40" }]}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                  <Text style={[styles.uploadHintText, { color: colors.primary }]}>
                    Upload InBody for a more accurate recommendation
                  </Text>
                </TouchableOpacity>
              )}

              {recommendation.alternateGoals && recommendation.alternateGoals.length > 0 && (
                <View style={styles.altSection}>
                  <Text style={[styles.altTitle, { color: colors.mutedForeground }]}>Also consider</Text>
                  {recommendation.alternateGoals.map((alt) => (
                    <TouchableOpacity
                      key={alt.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedGoalId(alt.id);
                        finish(alt.id, "manual");
                      }}
                      style={[styles.altRow, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.altName, { color: colors.foreground }]}>{alt.title}</Text>
                      <Text style={[styles.altReason, { color: colors.mutedForeground }]}>{alt.reason}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.confidenceRow}>
                <Text style={[styles.confLabel, { color: colors.mutedForeground }]}>Confidence</Text>
                <View style={[styles.confTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.confFill,
                      {
                        width: `${recommendation.confidence}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.confPct, { color: colors.primary }]}>{recommendation.confidence}%</Text>
              </View>
            </GlassCard>

            <Section title="Why this goal" colors={colors}>
              <Text style={[styles.sectionBody, { color: colors.foreground }]}>
                {recommendation.transformationDirection}
              </Text>
            </Section>

            {recommendation.healthRisks.length > 0 && (
              <Section title="Health considerations" colors={colors}>
                {recommendation.healthRisks.map((risk) => (
                  <View key={risk} style={styles.bulletRow}>
                    <Ionicons name="warning-outline" size={14} color={colors.yellow} />
                    <Text style={[styles.sectionBody, { color: colors.foreground, flex: 1 }]}>{risk}</Text>
                  </View>
                ))}
              </Section>
            )}

            <Section title="Estimated timeline" colors={colors}>
              <Text style={[styles.sectionBody, { color: colors.foreground }]}>
                {recommendation.estimatedTimeline}
              </Text>
            </Section>

            <TouchableOpacity
              onPress={() => finish(recommendation.goalId, "ai", recommendation.confidence)}
              disabled={saving}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Use This Goal</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setStep("goals");
                setRecommendation(null);
              }}
              style={styles.linkBtn}
            >
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Choose a different goal</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "ai-no-report" && (
          <>
            <View style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: colors.cyan + "18" }]}>
                <Ionicons name="document-text-outline" size={28} color={colors.cyan} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>InBody Report Needed</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Add your fitness goal in profile settings, or upload an InBody report. AI uses both for the best
                mode (Fat Loss, Muscle Gain, and more).
              </Text>
            </View>

            <GlassCard style={styles.reqCard}>
              <ReqRow icon="cloud-upload-outline" label="Upload Report" sub="PDF or image from your scan" colors={colors} />
              <ReqRow icon="scan-outline" label="Scan Report" sub="Use your camera for a paper printout" colors={colors} />
            </GlassCard>

            <TouchableOpacity
              onPress={() => router.push("/inbody")}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Upload Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/inbody")}
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Ionicons name="scan-outline" size={18} color={colors.foreground} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Scan Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                await refresh();
                if (reports.some((r) => r.status === "done")) {
                  runAiRecommend();
                } else {
                  setStep("goals");
                }
              }}
              style={styles.linkBtn}
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>I uploaded — check again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("goals")}
              style={[styles.linkBtn, { marginTop: 4 }]}
            >
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Skip & Choose Manually</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

function ReqRow({
  icon,
  label,
  sub,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.reqRow}>
      <View style={[styles.reqIcon, { backgroundColor: colors.primary + "12" }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.reqLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.reqSub, { color: colors.mutedForeground }]}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  hero: { alignItems: "center", gap: 10, marginBottom: 4 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  goalList: { gap: 10 },
  goalCard: { padding: 14, overflow: "hidden" },
  goalRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  goalIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  goalText: { flex: 1, gap: 4 },
  goalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  goalShort: { fontSize: 12, fontFamily: "Inter_500Medium" },
  goalExplain: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 2 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  aiSection: { alignItems: "center", gap: 10, marginTop: 8 },
  aiHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
  },
  aiBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  centerBlock: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 24 },
  recCard: { padding: 16, gap: 10 },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  recBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  recGoalTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  recBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  confLabel: { fontSize: 11, fontFamily: "Inter_500Medium", width: 68 },
  confTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  confFill: { height: 6, borderRadius: 3 },
  confPct: { fontSize: 12, fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  linkBtn: { alignItems: "center", padding: 12 },
  linkText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reqCard: { padding: 16, gap: 14 },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  reqIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reqLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  reqSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  profileCard: { padding: 14, gap: 6 },
  profileCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  profileCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  profileLine: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sourceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sourceChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sourceChipText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  uploadHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  uploadHintText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  altSection: { gap: 8, marginTop: 4 },
  altTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  altRow: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 2 },
  altName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  altReason: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
