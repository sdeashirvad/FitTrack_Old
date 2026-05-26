import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StepData {
  firstName: string;
  lastName: string;
  gender: string;
  region: string;
  heightCm: string;
  weightKg: string;
  bodyFatPercent: string;
  fitnessGoal: string;
  activityLevel: string;
  dietaryPreference: string;
  workoutExperience: string;
  gymName: string;
  gymLocation: string;
  specialization: string;
  certifications: string;
}

const EMPTY: StepData = {
  firstName: "", lastName: "", gender: "", region: "",
  heightCm: "", weightKg: "", bodyFatPercent: "",
  fitnessGoal: "", activityLevel: "", dietaryPreference: "",
  workoutExperience: "", gymName: "", gymLocation: "",
  specialization: "", certifications: "",
};

// ─── Option lists ─────────────────────────────────────────────────────────────
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const GOALS = ["Fat Loss", "Muscle Gain", "Maintenance", "Strength", "General Fitness"];
const ACTIVITY = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Athlete"];
const DIET = ["No Preference", "Vegetarian", "Vegan", "Keto", "High Protein", "Jain"];
const EXPERIENCE = ["Beginner (< 1 yr)", "Intermediate (1-3 yrs)", "Advanced (3+ yrs)"];
const SPECIALIZATIONS = ["Strength & Conditioning", "Weight Loss", "Yoga & Flexibility", "Functional Training", "Sports Performance", "Rehabilitation"];

// ─── Chip component ───────────────────────────────────────────────────────────
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[
        styles.chip,
        { borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radius },
        selected && { borderColor: colors.primary, backgroundColor: colors.primary + "15" },
      ]}>
      <Text style={[
        colors.typography.caption,
        { color: colors.mutedForeground },
        selected && { color: colors.primary, fontFamily: "Inter_600SemiBold" },
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Input component ──────────────────────────────────────────────────────────
function Field({ icon, placeholder, value, onChangeText, keyboard = "default" }: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboard?: any;
}) {
  const colors = useColors();
  return (
    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radiusSmall }]}>
      <Ionicons name={icon} size={18} color={colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboard}
        style={[styles.input, colors.typography.body, { color: colors.foreground }]}
      />
    </View>
  );
}

// ─── API Host Resolution ──────────────────────────────────────────────────────
function resolveApiHost() {
  const hostUri =
    typeof Constants.manifest?.debuggerHost === "string"
      ? Constants.manifest.debuggerHost
      : typeof Constants.expoConfig?.hostUri === "string"
      ? Constants.expoConfig.hostUri
      : null;

  if (hostUri) {
    const host = hostUri.includes("//")
      ? hostUri.split("//")[1].split(":")[0]
      : hostUri.split(":")[0];

    if (Platform.OS === "android") {
      return host === "localhost" ? "10.0.2.2" : host;
    }
    return host;
  }

  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, token, updateUser, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const role = user?.role ?? "member";
  const totalSteps = role === "member" ? 4 : 5;

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to cancel setup and log out?");
      if (confirmed) {
        logout().then(() => router.replace("/(auth)/login"));
      }
    } else {
      Alert.alert(
        "Cancel Setup",
        "Are you sure you want to cancel and log out?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Log Out",
            style: "destructive",
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await logout();
              router.replace("/(auth)/login");
            },
          },
        ]
      );
    }
  };

  const animateProgress = (to: number) => {
    Animated.spring(progressAnim, { toValue: to / (totalSteps - 1), useNativeDriver: false }).start();
  };

  const set = (key: keyof StepData) => (val: string) => setData(d => ({ ...d, [key]: val }));
  const toggle = (key: keyof StepData, val: string) =>
    setData(d => ({ ...d, [key]: d[key] === val ? "" : val }));

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextStep = step + 1;
    setStep(nextStep);
    animateProgress(nextStep);
  };

  const back = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevStep = step - 1;
    setStep(prevStep);
    animateProgress(prevStep);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const bmi = data.heightCm && data.weightKg
        ? (parseFloat(data.weightKg) / Math.pow(parseFloat(data.heightCm) / 100, 2)).toFixed(1)
        : "";

      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        region: data.region,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        bmi,
        bodyFatPercent: data.bodyFatPercent,
        fitnessGoal: data.fitnessGoal,
        activityLevel: data.activityLevel,
        dietaryPreference: data.dietaryPreference,
        workoutExperience: data.workoutExperience,
        extras: role === "owner"
          ? { gymName: data.gymName, gymLocation: data.gymLocation }
          : role === "trainer"
          ? { specialization: data.specialization, certifications: data.certifications }
          : undefined,
      };

      const host = resolveApiHost();
      const res = await fetch(`http://${host}:5000/api/auth/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      const json = await res.json();
      await updateUser({ ...json.user, onboardingCompleted: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: any) {
      showAlert("Error", e.message || "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const stepColors = [colors.cyan, colors.orange, colors.green, colors.purple, colors.yellow];
  const currentColor = stepColors[step % stepColors.length];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[currentColor + "15", colors.background]} style={StyleSheet.absoluteFillObject} />

      {/* Progress bar */}
      <View style={[styles.progressTrack, { marginTop: insets.top + 12, backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: currentColor }]} />
      </View>

      <View style={styles.stepIndicator}>
        <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Step {step + 1} of {totalSteps}</Text>
        {step > 0 ? (
          <TouchableOpacity onPress={back} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
            <Ionicons name="log-out-outline" size={16} color={colors.mutedForeground} />
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Log Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Step 0: Basic Info ── */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Ionicons name="person-circle" size={56} color={currentColor} style={styles.stepIcon} />
              <Text style={[colors.typography.h1, { color: colors.foreground, textAlign: "center" }]}>Let's get to know you</Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", marginBottom: 8 }]}>Basic details to personalise your experience</Text>

              <Field icon="person-outline" placeholder="First name" value={data.firstName} onChangeText={set("firstName")} />
              <Field icon="person-outline" placeholder="Last name" value={data.lastName} onChangeText={set("lastName")} />
              <Field icon="location-outline" placeholder="City / Region" value={data.region} onChangeText={set("region")} />

              <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Gender</Text>
              <View style={styles.chipGroup}>
                {GENDERS.map(g => (
                  <Chip key={g} label={g} selected={data.gender === g} onPress={() => toggle("gender", g)} />
                ))}
              </View>

              <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: currentColor, borderRadius: colors.radius }]}>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 1: Fitness Metrics ── */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Ionicons name="body" size={56} color={currentColor} style={styles.stepIcon} />
              <Text style={[colors.typography.h1, { color: colors.foreground, textAlign: "center" }]}>Your Body Metrics</Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", marginBottom: 8 }]}>Used to calculate BMI and personalise your plan</Text>

              <View style={styles.row}>
                <View style={[styles.inputWrap, { flex: 1, borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radiusSmall }]}>
                  <Ionicons name="resize-outline" size={18} color={colors.mutedForeground} />
                  <TextInput value={data.heightCm} onChangeText={set("heightCm")} placeholder="Height (cm)" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" style={[styles.input, colors.typography.body, { color: colors.foreground }]} />
                </View>
                <View style={[styles.inputWrap, { flex: 1, borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radiusSmall }]}>
                  <Ionicons name="scale-outline" size={18} color={colors.mutedForeground} />
                  <TextInput value={data.weightKg} onChangeText={set("weightKg")} placeholder="Weight (kg)" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" style={[styles.input, colors.typography.body, { color: colors.foreground }]} />
                </View>
              </View>

              {data.heightCm && data.weightKg ? (
                <View style={[styles.bmiCard, { borderColor: currentColor + "40", backgroundColor: colors.card, borderRadius: colors.radiusSmall }]}>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Estimated BMI</Text>
                  <Text style={[colors.typography.h1, { color: currentColor }]}>
                    {(parseFloat(data.weightKg) / Math.pow(parseFloat(data.heightCm) / 100, 2)).toFixed(1)}
                  </Text>
                </View>
              ) : null}

              <Field icon="fitness-outline" placeholder="Body fat % (optional)" value={data.bodyFatPercent} onChangeText={set("bodyFatPercent")} keyboard="numeric" />

              <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Fitness Goal</Text>
              <View style={styles.chipGroup}>
                {GOALS.map(g => (
                  <Chip key={g} label={g} selected={data.fitnessGoal === g} onPress={() => toggle("fitnessGoal", g)} />
                ))}
              </View>

              <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: currentColor, borderRadius: colors.radius }]}>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: Lifestyle ── */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Ionicons name="sunny" size={56} color={currentColor} style={styles.stepIcon} />
              <Text style={[colors.typography.h1, { color: colors.foreground, textAlign: "center" }]}>Your Lifestyle</Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", marginBottom: 8 }]}>Helps us tailor workouts and nutrition</Text>

              <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Daily Activity Level</Text>
              <View style={styles.chipGroup}>
                {ACTIVITY.map(a => (
                  <Chip key={a} label={a} selected={data.activityLevel === a} onPress={() => toggle("activityLevel", a)} />
                ))}
              </View>

              <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Dietary Preference</Text>
              <View style={styles.chipGroup}>
                {DIET.map(d => (
                  <Chip key={d} label={d} selected={data.dietaryPreference === d} onPress={() => toggle("dietaryPreference", d)} />
                ))}
              </View>

              <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Workout Experience</Text>
              <View style={styles.chipGroup}>
                {EXPERIENCE.map(e => (
                  <Chip key={e} label={e} selected={data.workoutExperience === e} onPress={() => toggle("workoutExperience", e)} />
                ))}
              </View>

              <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: currentColor, borderRadius: colors.radius }]}>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3 (member): Confirmation ── */}
          {step === 3 && role === "member" && (
            <View style={styles.stepContent}>
              <Ionicons name="checkmark-circle" size={64} color={currentColor} style={styles.stepIcon} />
              <Text style={[colors.typography.h1, { color: colors.foreground, textAlign: "center" }]}>You're all set!</Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", marginBottom: 8 }]}>Here's a summary of your profile</Text>

              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                {[
                  ["Name", `${data.firstName} ${data.lastName}`.trim() || "—"],
                  ["Region", data.region || "—"],
                  ["Height", data.heightCm ? `${data.heightCm} cm` : "—"],
                  ["Weight", data.weightKg ? `${data.weightKg} kg` : "—"],
                  ["Goal", data.fitnessGoal || "—"],
                  ["Activity", data.activityLevel || "—"],
                  ["Diet", data.dietaryPreference || "—"],
                ].map(([k, v]) => (
                  <View key={k} style={styles.summaryRow}>
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{k}</Text>
                    <Text style={[colors.typography.caption, { color: colors.foreground, fontFamily: "Inter_600SemiBold", maxWidth: "60%", textAlign: "right" }]}>{v}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity onPress={finish} disabled={saving} style={[styles.nextBtn, { backgroundColor: currentColor, borderRadius: colors.radius, opacity: saving ? 0.7 : 1 }]}>
                {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Go to Dashboard</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3 (owner/trainer): Role-specific extras ── */}
          {step === 3 && role === "owner" && (
            <View style={styles.stepContent}>
              <Ionicons name="business" size={56} color={currentColor} style={styles.stepIcon} />
              <Text style={[colors.typography.h1, { color: colors.foreground, textAlign: "center" }]}>Your Gym Details</Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", marginBottom: 8 }]}>Tell us about the gym you manage</Text>

              <Field icon="business-outline" placeholder="Gym name" value={data.gymName} onChangeText={set("gymName")} />
              <Field icon="location-outline" placeholder="Gym location / city" value={data.gymLocation} onChangeText={set("gymLocation")} />

              <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: currentColor, borderRadius: colors.radius }]}>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && role === "trainer" && (
            <View style={styles.stepContent}>
              <Ionicons name="barbell" size={56} color={currentColor} style={styles.stepIcon} />
              <Text style={[colors.typography.h1, { color: colors.foreground, textAlign: "center" }]}>Your Trainer Profile</Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", marginBottom: 8 }]}>Help members find the right trainer</Text>

              <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Specialization</Text>
              <View style={styles.chipGroup}>
                {SPECIALIZATIONS.map(s => (
                  <Chip key={s} label={s} selected={data.specialization === s} onPress={() => toggle("specialization", s)} />
                ))}
              </View>

              <Field icon="ribbon-outline" placeholder="Certifications (e.g. ACE, NASM)" value={data.certifications} onChangeText={set("certifications")} />

              <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: currentColor, borderRadius: colors.radius }]}>
                <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 4 (owner/trainer): Confirmation ── */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <Ionicons name="checkmark-circle" size={64} color={currentColor} style={styles.stepIcon} />
              <Text style={[colors.typography.h1, { color: colors.foreground, textAlign: "center" }]}>Profile Complete!</Text>
              <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center", marginBottom: 8 }]}>You're ready to use FitTrack as a {role}</Text>

              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                {[
                  ["Name", `${data.firstName} ${data.lastName}`.trim() || "—"],
                  ["Role", role.charAt(0).toUpperCase() + role.slice(1)],
                  ["Goal", data.fitnessGoal || "—"],
                  ...(role === "owner" ? [["Gym", data.gymName || "—"], ["Location", data.gymLocation || "—"]] : []),
                  ...(role === "trainer" ? [["Specialization", data.specialization || "—"]] : []),
                ].map(([k, v]) => (
                  <View key={k} style={styles.summaryRow}>
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{k}</Text>
                    <Text style={[colors.typography.caption, { color: colors.foreground, fontFamily: "Inter_600SemiBold", maxWidth: "60%", textAlign: "right" }]}>{v}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity onPress={finish} disabled={saving} style={[styles.nextBtn, { backgroundColor: currentColor, borderRadius: colors.radius, opacity: saving ? 0.7 : 1 }]}>
                {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>Go to Dashboard</Text>}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  progressTrack: { height: 4, marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  stepIndicator: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  stepContent: { gap: 14 },
  stepIcon: { alignSelf: "center", marginBottom: 4 },
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  input: { flex: 1, fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  bmiCard: { borderWidth: 1, padding: 14, alignItems: "center" },
  nextBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  summaryCard: { borderWidth: 1, padding: 16, gap: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
});
