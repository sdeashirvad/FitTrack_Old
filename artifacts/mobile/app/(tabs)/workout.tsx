import { useFitness } from "@/context/FitnessContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import AIWorkoutOnboarding from "../workout/ai-onboarding";

const { width } = Dimensions.get("window");
const ORANGE = "#FF6B35";
const ORANGE_SOFT = "#FF6B3512";
const BG = "#F7F8FA";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1E";
const MUTED = "#9098A3";
const DARK_CARD_FROM = "#1A1A2E";
const DARK_CARD_TO = "#0D0D0D";
const FEATURED_WORKOUT_IMAGE =
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80";
const WORKOUT_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80",
];
const DEFAULT_EXERCISE_YOUTUBE: Record<string, string> = {
  "dumbbell bicep curl": "https://www.youtube.com/watch?v=cBSD6mQIPQk",
  "dumbbell standing reverse curl": "https://www.youtube.com/watch?v=cBSD6mQIPQk",
};

// ─── Category data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "hiit",     label: "HIIT",     icon: "flame",          bg: "#22C55E18", color: "#22C55E" },
  { key: "strength", label: "Strength", icon: "barbell",        bg: "#FF6B3515", color: ORANGE },
  { key: "focus",    label: "Focus",    icon: "flash",          bg: "#8B5CF618", color: "#8B5CF6" },
  { key: "agility",  label: "Agility",  icon: "bicycle",        bg: "#3B82F618", color: "#3B82F6" },
  { key: "mobility", label: "Mobility", icon: "body",           bg: "#F59E0B18", color: "#F59E0B" },
];

// ─── Static fallback days ─────────────────────────────────────────────────────

const FALLBACK_DAYS = [
  {
    dayName: "Monday", focus: "Push", isRest: false, isCardio: false,
    estimatedCalories: 340, estimatedDuration: "50 min",
    exercises: [
      { id: "1", name: "Barbell Bench Press", bodyPart: "Chest", target: "Pectorals", equipment: "Barbell", gifUrl: "", sets: 4, repsRange: "8–10", restSeconds: 90, estimatedCaloriesPerSet: 14, difficulty: "Intermediate", instructions: ["Lie flat on bench, grip bar wider than shoulder-width.", "Lower to mid-chest with control.", "Press up explosively."] },
      { id: "2", name: "Overhead Press",      bodyPart: "Shoulders", target: "Delts", equipment: "Barbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 75, estimatedCaloriesPerSet: 10, difficulty: "Intermediate", instructions: ["Grip just outside shoulders.", "Press overhead to lockout.", "Lower with control."] },
      { id: "3", name: "Incline DB Press",    bodyPart: "Chest", target: "Pectorals", equipment: "Dumbbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 60, estimatedCaloriesPerSet: 12, difficulty: "Beginner", instructions: ["Set bench to 30–45°.", "Press dumbbells up and together.", "Control descent."] },
      { id: "4", name: "Tricep Pushdown",     bodyPart: "Upper Arms", target: "Triceps", equipment: "Cable", gifUrl: "", sets: 3, repsRange: "12–15", restSeconds: 45, estimatedCaloriesPerSet: 8, difficulty: "Beginner", instructions: ["Keep elbows pinned to sides.", "Extend arms fully.", "Squeeze triceps."] },
    ],
  },
  {
    dayName: "Tuesday", focus: "Pull", isRest: false, isCardio: false,
    estimatedCalories: 380, estimatedDuration: "55 min",
    exercises: [
      { id: "5", name: "Pull-ups",       bodyPart: "Back", target: "Lats", equipment: "Body Weight", gifUrl: "", sets: 4, repsRange: "6–10", restSeconds: 90, estimatedCaloriesPerSet: 16, difficulty: "Intermediate", instructions: ["Full dead-hang start.", "Pull until chin clears bar.", "Lower with control."] },
      { id: "6", name: "Barbell Row",    bodyPart: "Back", target: "Upper Back", equipment: "Barbell", gifUrl: "", sets: 4, repsRange: "8–10", restSeconds: 75, estimatedCaloriesPerSet: 15, difficulty: "Intermediate", instructions: ["Keep back neutral.", "Pull to lower chest.", "Pause at top."] },
      { id: "7", name: "Face Pulls",     bodyPart: "Shoulders", target: "Rear Delts", equipment: "Cable", gifUrl: "", sets: 3, repsRange: "15–20", restSeconds: 45, estimatedCaloriesPerSet: 8, difficulty: "Beginner", instructions: ["Set cable at face height.", "Pull to forehead.", "Externally rotate at end."] },
      { id: "8", name: "Hammer Curls",   bodyPart: "Upper Arms", target: "Biceps", equipment: "Dumbbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 45, estimatedCaloriesPerSet: 9, difficulty: "Beginner", instructions: ["Neutral grip (thumbs up).", "Curl to shoulder height.", "Control the descent."] },
    ],
  },
  {
    dayName: "Wednesday", focus: "Rest", isRest: true, isCardio: false,
    estimatedCalories: 0, estimatedDuration: "—", exercises: [],
  },
  {
    dayName: "Thursday", focus: "Legs", isRest: false, isCardio: false,
    estimatedCalories: 450, estimatedDuration: "60 min",
    exercises: [
      { id: "9",  name: "Barbell Squat",       bodyPart: "Upper Legs", target: "Quads", equipment: "Barbell", gifUrl: "", sets: 4, repsRange: "8–10", restSeconds: 120, estimatedCaloriesPerSet: 22, difficulty: "Advanced", instructions: ["Bar on upper traps.", "Break parallel.", "Drive through heels."] },
      { id: "10", name: "Romanian Deadlift",   bodyPart: "Upper Legs", target: "Hamstrings", equipment: "Barbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 75, estimatedCaloriesPerSet: 18, difficulty: "Intermediate", instructions: ["Hinge at hips.", "Keep bar close to legs.", "Feel hamstring stretch."] },
      { id: "11", name: "Leg Press",           bodyPart: "Upper Legs", target: "Quads", equipment: "Machine", gifUrl: "", sets: 3, repsRange: "12–15", restSeconds: 60, estimatedCaloriesPerSet: 15, difficulty: "Beginner", instructions: ["Feet shoulder-width.", "Lower to 90°.", "Press through heels."] },
      { id: "12", name: "Standing Calf Raise", bodyPart: "Lower Legs", target: "Calves", equipment: "Machine", gifUrl: "", sets: 4, repsRange: "15–20", restSeconds: 30, estimatedCaloriesPerSet: 6, difficulty: "Beginner", instructions: ["Rise as high as possible.", "Pause at top.", "Full range down."] },
    ],
  },
  {
    dayName: "Friday", focus: "Cardio", isRest: false, isCardio: true,
    estimatedCalories: 280, estimatedDuration: "30 min",
    exercises: [
      { id: "13", name: "Treadmill Intervals", bodyPart: "Cardio", target: "Cardiovascular System", equipment: "Treadmill", gifUrl: "", sets: 1, repsRange: "30 min", restSeconds: 0, estimatedCaloriesPerSet: 280, difficulty: "Beginner", instructions: ["2–5° incline.", "65–75% max heart rate.", "Alternate 1 min fast / 1 min walk."] },
    ],
  },
  { dayName: "Saturday", focus: "Rest", isRest: true, isCardio: false, estimatedCalories: 0, estimatedDuration: "—", exercises: [] },
  { dayName: "Sunday",   focus: "Rest", isRest: true, isCardio: false, estimatedCalories: 0, estimatedDuration: "—", exercises: [] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planDayToDay(day: any) { return day; }

function getWorkoutImage(index = 0) {
  return WORKOUT_IMAGES[index % WORKOUT_IMAGES.length];
}

function getExerciseVideoUrl(exercise: any) {
  const url =
    exercise?.videoUrl ??
    exercise?.tutorialVideoUrl ??
    exercise?.tutorialUrl ??
    exercise?.video_url ??
    exercise?.tutorial_video_url;

  return typeof url === "string" && /\.mp4($|\?)/i.test(url) ? url : null;
}

function getYoutubeEmbedUrl(exercise: any) {
  const raw =
    exercise?.youtubeUrl ??
    exercise?.tutorialYoutubeUrl ??
    exercise?.youtube_url ??
    exercise?.tutorial_youtube_url ??
    exercise?.youtubeId ??
    exercise?.youtube_id ??
    DEFAULT_EXERCISE_YOUTUBE[String(exercise?.name ?? "").trim().toLowerCase()];

  if (typeof raw !== "string" || !raw.trim()) return null;

  const value = raw.trim();
  const idMatch =
    value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ??
    value.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ??
    value.match(/embed\/([A-Za-z0-9_-]{6,})/) ??
    value.match(/^([A-Za-z0-9_-]{6,})$/);

  const videoId = idMatch?.[1];
  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${videoId}&start=0`;
}

const DIFF_COLOR: Record<string, string> = {
  Beginner: "#22C55E",
  Intermediate: "#F59E0B",
  Advanced: "#EF4444",
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const { addWorkout } = useFitness();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // onboarding
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [dynamicPlan, setDynamicPlan] = useState<any[] | null>(null);
  const [dynamicStrategy, setDynamicStrategy] = useState<any | null>(null);

  // UI state
  const [activeCategory, setActiveCategory] = useState("strength");
  const [searchText, setSearchText] = useState("");
  const [playlistDay, setPlaylistDay] = useState<any | null>(null);

  useEffect(() => {
    if (!token) { setOnboardingChecked(true); return; }
    checkOnboarding();
  }, [token]);

  const checkOnboarding = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/workout/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.completed && data.workoutPlan) {
        setActiveGoal(data.fitnessGoal ?? null);
        setDynamicPlan(data.workoutPlan);
      } else if (!data.completed) {
        setShowOnboarding(true);
      }
    } catch {}
    finally { setOnboardingChecked(true); }
  };

  const handleOnboardingComplete = (plan: any[], goal: string, strategy: any) => {
    setDynamicPlan(plan);
    setActiveGoal(goal);
    setDynamicStrategy(strategy);
    setShowOnboarding(false);
  };

  const handleChangeWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Change Workout Plan", "Re-run AI onboarding to get a new personalised plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: async () => {
          try { await fetch(`${getApiBaseUrl()}/workout/onboarding/reset`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch {}
          setDynamicPlan(null); setActiveGoal(null); setDynamicStrategy(null);
          setPlaylistDay(null); setShowOnboarding(true);
        },
      },
    ]);
  };

  if (!onboardingChecked) {
    return (
      <View style={[styles.loader, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }
  if (showOnboarding) {
    return <AIWorkoutOnboarding onComplete={handleOnboardingComplete} onSkip={() => setShowOnboarding(false)} />;
  }

  const days = dynamicPlan ?? FALLBACK_DAYS;
  const activeDays = days.filter((d: any) => !d.isRest);

  // Playlist view (screenshot 1)
  if (playlistDay) {
    return (
      <PlaylistView
        day={playlistDay}
        topPad={topPad}
        insets={insets}
        onBack={() => setPlaylistDay(null)}
        addWorkout={addWorkout}
      />
    );
  }

  // Home view (screenshot 2)
  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 8, paddingBottom: insets.bottom + 110 }]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{(user?.name ?? "U").charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerTitle}>Workouts</Text>
          <View style={styles.headerRight}>
            {token && (
              <TouchableOpacity onPress={handleChangeWorkout} style={styles.iconBtn}>
                <Ionicons name="options-outline" size={20} color={TEXT} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color={TEXT} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search for a workout..."
            placeholderTextColor={MUTED}
            style={styles.searchInput}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Workout Category ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Workout Category</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat.key); }}
                style={[styles.categoryPill, { backgroundColor: active ? cat.color : CARD }, active && { shadowColor: cat.color, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
              >
                <View style={[styles.catIconWrap, { backgroundColor: active ? "rgba(255,255,255,0.25)" : cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={18} color={active ? "#fff" : cat.color} />
                </View>
                <Text style={[styles.catLabel, { color: active ? "#fff" : TEXT }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Featured Workout ── */}
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Featured Workout</Text>
        <ImageBackground
          source={{ uri: FEATURED_WORKOUT_IMAGE }}
          imageStyle={styles.featuredImage}
          style={styles.featuredCard}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.86)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.featuredTop}>
            <View style={styles.beginnerBadge}>
              <Text style={styles.beginnerText}>Beginner</Text>
            </View>
            <TouchableOpacity style={styles.bookmarkBtn}>
              <Ionicons name="bookmark-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.featuredBody}>
            <Text style={styles.featuredTitle}>
              {activeDays[0]?.focus ? `${activeDays[0].focus} Workout` : "Full Body Training"}
            </Text>
            <View style={styles.coachRow}>
              <View style={styles.coachAvatarSmall}>
                <Ionicons name="person" size={12} color="#fff" />
              </View>
              <Text style={styles.coachName}>
                {activeGoal ? `Goal: ${activeGoal}` : "Coach Arnold White"}
              </Text>
            </View>
            <View style={styles.featuredStats}>
              <FeaturedStat icon="flame" value={`${activeDays[0]?.estimatedCalories ?? 340}`} label="kcal" color="#FF6B35" />
              <FeaturedStat icon="time-outline" value={activeDays[0]?.estimatedDuration ?? "50 min"} label="minutes" color="rgba(255,255,255,0.7)" />
              <FeaturedStat icon="star" value={`+${activeDays.length}`} label="days" color="#8B5CF6" />
            </View>
          </View>
        </ImageBackground>

        {/* ── My Plan ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>My Active Workout</Text>
          {token && (
            <TouchableOpacity onPress={handleChangeWorkout}>
              <Text style={[styles.seeAll, { color: ORANGE }]}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeDays.map((day: any, idx: number) => (
          <ActiveWorkoutItem
            key={day.dayName}
            day={day}
            index={idx}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlaylistDay(day); }}
          />
        ))}

        {activeDays.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={32} color={MUTED} />
            <Text style={styles.emptyText}>No workout days yet. Complete onboarding to get your plan.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Featured Stat ────────────────────────────────────────────────────────────

function FeaturedStat({ icon, value, label, color }: any) {
  return (
    <View style={styles.featStatItem}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.featStatVal}>{value}</Text>
      <Text style={styles.featStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Active Workout Item (My Active Workout list) ─────────────────────────────

function ActiveWorkoutItem({ day, index, onPress }: any) {
  const dayColor = day.isCardio ? "#22C55E" : ORANGE;
  const totalEx = day.exercises?.length ?? 0;
  const totalCal = day.estimatedCalories ?? 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.activeItem}>
      {/* Left accent stripe */}
      <View style={[styles.activeStripe, { backgroundColor: dayColor }]} />

      <Image source={{ uri: getWorkoutImage(index) }} style={styles.activeImage} />

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={styles.activeName}>{day.focus}</Text>
        <View style={styles.activeMetaRow}>
          {totalCal > 0 && (
            <View style={styles.activePill}>
              <Ionicons name="flame-outline" size={10} color={MUTED} />
              <Text style={styles.activePillText}>{totalCal} kcal</Text>
            </View>
          )}
          {totalEx > 0 && (
            <View style={styles.activePill}>
              <Ionicons name="layers-outline" size={10} color={MUTED} />
              <Text style={styles.activePillText}>{totalEx} exercises</Text>
            </View>
          )}
          <View style={[styles.activePill, { backgroundColor: day.isCardio ? "#22C55E12" : ORANGE_SOFT }]}>
            <Text style={[styles.activePillText, { color: dayColor, fontFamily: "Inter_600SemiBold" }]}>
              {day.dayName}
            </Text>
          </View>
        </View>
        <View style={styles.activeProgressBar}>
          <View style={[styles.activeProgressFill, { backgroundColor: dayColor, width: `${Math.min(100, (index + 1) * 15)}%` }]} />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={MUTED} />
    </TouchableOpacity>
  );
}

// ─── Playlist View (Screenshot 1) ────────────────────────────────────────────

function PlaylistView({ day, topPad, insets, onBack, addWorkout }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tutorialExercise, setTutorialExercise] = useState<any | null>(null);

  const handleLogAll = () => {
    addWorkout({
      name: day.focus,
      date: new Date().toISOString().split("T")[0],
      duration: 55,
      exercises: [],
      calories: day.estimatedCalories ?? 300,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✓ Logged!", `${day.focus} recorded in your history.`);
  };

  const handleLogExercise = (exercise: any) => {
    addWorkout({
      name: exercise.name,
      date: new Date().toISOString().split("T")[0],
      duration: Math.max(10, Math.round((exercise.sets ?? 3) * 6)),
      exercises: [exercise],
      calories: (exercise.estimatedCaloriesPerSet ?? 12) * (exercise.sets ?? 3),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Logged", `${exercise.name} recorded in your workout history.`);
  };

  return (
    <View style={[styles.root, { backgroundColor: CARD }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Playlist Header ── */}
        <View style={styles.playlistHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 4 }}>
            <Text style={styles.playlistTitle}>Workout Playlist</Text>
            <Text style={styles.playlistSub} numberOfLines={2}>
              Workout playlist for {day.focus} · {day.estimatedDuration ?? "45 min"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogAll}
            style={[styles.logAllBtn, { backgroundColor: ORANGE }]}
          >
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={styles.logAllText}>Log All</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats strip ── */}
        <View style={[styles.statsStrip, { borderColor: "#F0F0F0" }]}>
          <StripStat icon="time-outline" label={day.estimatedDuration ?? "45 min"} />
          <View style={styles.stripDivider} />
          <StripStat icon="flame-outline" label={`${day.estimatedCalories ?? 0} kcal`} color={ORANGE} />
          <View style={styles.stripDivider} />
          <StripStat icon="layers-outline" label={`${day.exercises?.length ?? 0} exercises`} />
        </View>

        {/* ── Exercise list ── */}
        <View style={styles.playlistList}>
          {(day.exercises ?? []).map((ex: any, idx: number) => (
            <PlaylistItem
              key={ex.id + idx}
              exercise={ex}
              partNumber={idx + 1}
              expanded={expandedId === ex.id}
              onToggle={() => {
                Haptics.selectionAsync();
                setTutorialExercise({ ...ex, partNumber: idx + 1 });
              }}
            />
          ))}

          {day.isCardio && day.exercises?.length === 0 && (
            <View style={styles.cardioCard}>
              <Ionicons name="bicycle" size={40} color={ORANGE} />
              <Text style={styles.cardioTitle}>Cardio Session</Text>
              <Text style={styles.cardioSub}>Choose your preferred activity — treadmill, bike, or jump rope. Aim for 65–75% max heart rate for {day.estimatedDuration ?? "30 min"}.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ExerciseTutorialModal
        exercise={tutorialExercise}
        visible={!!tutorialExercise}
        onClose={() => setTutorialExercise(null)}
        onLog={() => tutorialExercise && handleLogExercise(tutorialExercise)}
      />
    </View>
  );
}

function StripStat({ icon, label, color = MUTED }: any) {
  return (
    <View style={styles.stripStat}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.stripStatText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Playlist Item (Part N exercise card) ─────────────────────────────────────

function PlaylistItem({ exercise: ex, partNumber, expanded, onToggle }: any) {
  const diffColor = DIFF_COLOR[ex.difficulty] ?? MUTED;
  const totalCal = (ex.estimatedCaloriesPerSet ?? 12) * (ex.sets ?? 3);
  const fallbackImage = getWorkoutImage(partNumber - 1);

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85} style={styles.playlistItem}>
      {/* Left: exercise image */}
      <View style={styles.playlistImgWrap}>
        {ex.gifUrl ? (
          <Image source={{ uri: ex.gifUrl }} style={styles.playlistImg} resizeMode="cover" />
        ) : (
          <Image source={{ uri: fallbackImage }} style={styles.playlistImg} resizeMode="cover" />
        )}
      </View>

      {/* Center: part label + name + meta */}
      <View style={styles.playlistContent}>
        <Text style={styles.partLabel}>Part {partNumber}</Text>
        <Text style={styles.playlistName} numberOfLines={2}>{ex.name}</Text>
        <View style={styles.playlistMeta}>
          <Text style={styles.playlistMetaText}>
            {ex.sets ?? 3} sets · {ex.repsRange ?? "10–12"}
          </Text>
          <Text style={styles.playlistMetaDot}> · </Text>
          <Text style={styles.playlistMetaText}>{ex.target || ex.bodyPart}</Text>
        </View>
        <View style={styles.playlistTags}>
          <View style={[styles.playlistTag, { backgroundColor: diffColor + "18" }]}>
            <Text style={[styles.playlistTagText, { color: diffColor }]}>{ex.difficulty}</Text>
          </View>
          <View style={[styles.playlistTag, { backgroundColor: ORANGE_SOFT }]}>
            <Ionicons name="flame-outline" size={9} color={ORANGE} />
            <Text style={[styles.playlistTagText, { color: ORANGE }]}>~{totalCal} kcal</Text>
          </View>
          <View style={[styles.playlistTag, { backgroundColor: "#F0F0F5" }]}>
            <Text style={styles.playlistTagText}>{ex.equipment || "Body weight"}</Text>
          </View>
        </View>
      </View>

      {/* Right: chevron */}
      <View style={styles.playlistChevron}>
        <Ionicons name={expanded ? "chevron-up" : "chevron-forward"} size={18} color={MUTED} />
      </View>

      {/* Expanded: stats bar + instructions */}
      {expanded && (
        <View style={styles.playlistExpanded}>
          {/* Stats bar */}
          <View style={styles.playlistStatsRow}>
            <PlaylistStat label="Sets" value={String(ex.sets ?? 3)} color={ORANGE} />
            <View style={styles.statDivider} />
            <PlaylistStat label="Reps" value={ex.repsRange ?? "10–12"} color={ORANGE} />
            <View style={styles.statDivider} />
            <PlaylistStat label="Rest" value={ex.restSeconds ? `${ex.restSeconds}s` : "60s"} />
            <View style={styles.statDivider} />
            <PlaylistStat label="Kcal" value={`~${totalCal}`} color="#FF4D00" />
          </View>

          {/* Instructions */}
          {ex.instructions?.length > 0 && (
            <View style={styles.instructionWrap}>
              {ex.instructions.slice(0, 4).map((inst: string, i: number) => (
                <View key={i} style={styles.instructionRow}>
                  <View style={[styles.instrNum, { backgroundColor: ORANGE }]}>
                    <Text style={styles.instrNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.instrText}>{inst}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Secondary muscles */}
          {ex.secondaryMuscles?.length > 0 && (
            <View style={styles.secondaryWrap}>
              <Ionicons name="git-branch-outline" size={11} color={MUTED} />
              <Text style={styles.secondaryText}>
                Also works: {ex.secondaryMuscles.slice(0, 4).join(", ")}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function PlaylistStat({ label, value, color = MUTED }: any) {
  return (
    <View style={styles.pStat}>
      <Text style={[styles.pStatVal, { color }]}>{value}</Text>
      <Text style={styles.pStatLabel}>{label}</Text>
    </View>
  );
}

function ExerciseTutorialModal({ exercise, visible, onClose, onLog }: any) {
  if (!exercise) return null;

  const partNumber = exercise.partNumber ?? 1;
  const youtubeEmbedUrl = getYoutubeEmbedUrl(exercise);
  const videoUri = getExerciseVideoUrl(exercise);
  const mediaUri = exercise.gifUrl || getWorkoutImage(partNumber - 1);
  const totalCal = (exercise.estimatedCaloriesPerSet ?? 12) * (exercise.sets ?? 3);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.tutorialRoot}>
        <View style={styles.tutorialMedia}>
          {youtubeEmbedUrl ? (
            <TutorialYoutube embedUrl={youtubeEmbedUrl} />
          ) : videoUri ? (
            <TutorialVideo sourceUri={videoUri} />
          ) : (
            <Image source={{ uri: mediaUri }} style={styles.tutorialFallbackMedia} resizeMode="cover" />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.42)", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.84)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.tutorialTopBar}>
            <TouchableOpacity onPress={onClose} style={styles.tutorialCircleBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.tutorialLivePill}>
              <View style={styles.tutorialLiveDot} />
              <Text style={styles.tutorialLiveText}>{youtubeEmbedUrl || videoUri ? "Video Tutorial" : "Tutorial"}</Text>
            </View>
          </View>

          <View style={styles.tutorialSideActions}>
            <TouchableOpacity style={styles.tutorialSideBtn} onPress={onLog}>
              <Ionicons name="checkmark-circle" size={25} color="#fff" />
              <Text style={styles.tutorialSideText}>Log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tutorialSideBtn}>
              <Ionicons name="heart-outline" size={25} color="#fff" />
              <Text style={styles.tutorialSideText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tutorialSideBtn}>
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.tutorialBottomPanel}>
            <Text style={styles.tutorialPart}>Part {partNumber}</Text>
            <Text style={styles.tutorialTitle}>{exercise.name}</Text>
            <View style={styles.tutorialMetaRow}>
              <View style={styles.tutorialMetaPill}>
                <Ionicons name="repeat-outline" size={12} color="#fff" />
                <Text style={styles.tutorialMetaText}>{exercise.sets ?? 3} sets</Text>
              </View>
              <View style={styles.tutorialMetaPill}>
                <Ionicons name="timer-outline" size={12} color="#fff" />
                <Text style={styles.tutorialMetaText}>{exercise.repsRange ?? "10-12"}</Text>
              </View>
              <View style={styles.tutorialMetaPill}>
                <Ionicons name="flame" size={12} color={ORANGE} />
                <Text style={styles.tutorialMetaText}>~{totalCal} kcal</Text>
              </View>
            </View>
            <Text style={styles.tutorialHint} numberOfLines={3}>
              {(exercise.instructions ?? [])[0] ??
                `Focus on controlled reps for ${exercise.target || exercise.bodyPart || "the target muscle"}.`}
            </Text>

            <View style={styles.tutorialActions}>
              <TouchableOpacity onPress={onLog} style={styles.tutorialPrimaryBtn}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.tutorialPrimaryText}>Log Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.tutorialSecondaryBtn}>
                <Ionicons name="stop-circle-outline" size={18} color="#fff" />
                <Text style={styles.tutorialSecondaryText}>Stop Tutorial</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TutorialVideo({ sourceUri }: { sourceUri: string }) {
  const player = useVideoPlayer(sourceUri, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.tutorialVideo}
      nativeControls={false}
      contentFit="cover"
    />
  );
}

function TutorialYoutube({ embedUrl }: { embedUrl: string }) {
  return (
    <WebView
      source={{ uri: embedUrl }}
      style={styles.tutorialVideo}
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, gap: 13 },

  // Header
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  avatarWrap: {},
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: CARD, alignItems: "center", justifyContent: "center", shadowColor: "#111827", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  notifDot: { position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: BG },

  // Search
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: CARD, borderRadius: 15, paddingHorizontal: 14, height: 48, shadowColor: "#111827", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT },

  // Section row
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -4 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium", color: MUTED },

  // Categories
  categoryList: { gap: 10, paddingBottom: 4, paddingRight: 20 },
  categoryPill: { alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 15, minWidth: 80, shadowColor: "#111827", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  catIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Featured card
  featuredCard: { height: 220, borderRadius: 24, overflow: "hidden", justifyContent: "space-between", padding: 18, backgroundColor: DARK_CARD_TO },
  featuredImage: { borderRadius: 24 },
  blob: { position: "absolute", width: 100, height: 100, borderRadius: 50 },
  featuredTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  beginnerBadge: { backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  beginnerText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  bookmarkBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.28)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  featuredBody: { gap: 8 },
  featuredTitle: { color: "#fff", fontSize: 25, fontFamily: "Inter_700Bold", lineHeight: 31 },
  coachRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  coachAvatarSmall: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  coachName: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: "Inter_400Regular" },
  featuredStats: { flexDirection: "row", gap: 18 },
  featStatItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  featStatVal: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  featStatLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_400Regular" },

  // Active workout items
  activeItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, borderRadius: 17, padding: 12, shadowColor: "#111827", shadowOpacity: 0.045, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 1, overflow: "hidden" },
  activeStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  activeIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  activeImage: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#F3F4F6" },
  activeName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT },
  activeMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  activePill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F3F4F6", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  activePillText: { fontSize: 10, fontFamily: "Inter_400Regular", color: MUTED },
  activeProgressBar: { height: 3, borderRadius: 2, backgroundColor: "#ECEEF3", marginTop: 8, overflow: "hidden" },
  activeProgressFill: { height: 3, borderRadius: 2 },

  emptyCard: { backgroundColor: CARD, borderRadius: 16, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center" },

  // Playlist view
  playlistHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 20, paddingBottom: 18 },
  backBtn: { paddingTop: 2 },
  playlistTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: TEXT, lineHeight: 30 },
  playlistSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED, marginTop: 3, lineHeight: 20 },
  logAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 2 },
  logAllText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },

  statsStrip: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginHorizontal: 20, marginBottom: 12 },
  stripStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  stripStatText: { fontSize: 13, fontFamily: "Inter_500Medium", color: MUTED },
  stripDivider: { width: 1, height: 16, backgroundColor: "#E8E8EE" },

  playlistList: { paddingHorizontal: 20, gap: 12 },

  // Playlist item
  playlistItem: { padding: 12, borderRadius: 18, backgroundColor: CARD, flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center", shadowColor: "#111827", shadowOpacity: 0.045, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 1 },
  playlistImgWrap: {},
  playlistImg: { width: 72, height: 72, borderRadius: 16, backgroundColor: "#F3F4F6" },
  playlistImgPlaceholder: { alignItems: "center", justifyContent: "center" },
  playlistContent: { flex: 1, gap: 4 },
  partLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: ORANGE, letterSpacing: 0.3, textTransform: "uppercase" },
  playlistName: { fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, lineHeight: 21 },
  playlistMeta: { flexDirection: "row", alignItems: "center" },
  playlistMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED },
  playlistMetaDot: { fontSize: 12, color: MUTED },
  playlistTags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  playlistTag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  playlistTagText: { fontSize: 10, fontFamily: "Inter_500Medium", color: MUTED },
  playlistChevron: { alignSelf: "center" },

  // Expanded section within playlist item
  playlistExpanded: { width: "100%", gap: 12, paddingTop: 4 },
  playlistStatsRow: { flexDirection: "row", backgroundColor: BG, borderRadius: 12, paddingVertical: 10 },
  statDivider: { width: 1, backgroundColor: "#E0E0E8", marginVertical: 4 },
  pStat: { flex: 1, alignItems: "center", gap: 2 },
  pStatVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT },
  pStatLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: MUTED, textTransform: "uppercase", letterSpacing: 0.4 },

  instructionWrap: { gap: 8 },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  instrNum: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  instrNumText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  instrText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 20 },

  secondaryWrap: { flexDirection: "row", alignItems: "center", gap: 5, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#F0F0F5" },
  secondaryText: { fontSize: 11, fontFamily: "Inter_400Regular", color: MUTED, flex: 1 },

  cardioCard: { alignItems: "center", gap: 10, padding: 32 },
  cardioTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT },
  cardioSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center", lineHeight: 22 },

  // Tutorial overlay
  tutorialRoot: { flex: 1, backgroundColor: "#05070A" },
  tutorialMedia: { flex: 1, justifyContent: "space-between", overflow: "hidden" },
  tutorialVideo: { ...StyleSheet.absoluteFillObject },
  tutorialFallbackMedia: { ...StyleSheet.absoluteFillObject, opacity: 0.96 },
  tutorialImage: { opacity: 0.96 },
  tutorialTopBar: { paddingTop: 54, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tutorialCircleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.34)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  tutorialLivePill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(0,0,0,0.38)", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  tutorialLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  tutorialLiveText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  tutorialSideActions: { position: "absolute", right: 18, top: "38%", gap: 22, alignItems: "center" },
  tutorialSideBtn: { alignItems: "center", gap: 5 },
  tutorialSideText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tutorialBottomPanel: { paddingHorizontal: 20, paddingBottom: 34, gap: 10 },
  tutorialPart: { color: ORANGE, fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  tutorialTitle: { color: "#fff", fontSize: 28, lineHeight: 34, fontFamily: "Inter_700Bold" },
  tutorialMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tutorialMetaPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tutorialMetaText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tutorialHint: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", maxWidth: width - 86 },
  tutorialActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  tutorialPrimaryBtn: { flex: 1.2, height: 50, borderRadius: 15, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  tutorialPrimaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  tutorialSecondaryBtn: { flex: 1, height: 50, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  tutorialSecondaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});