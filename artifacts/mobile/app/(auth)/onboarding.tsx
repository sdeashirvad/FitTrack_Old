import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    icon: "fitness" as const,
    title: "Track Every Rep",
    subtitle: "Log workouts, sets, and reps with ease. Built for serious Indian gym-goers.",
    color: "#00D4FF",
    gradient: ["#00D4FF15", "#070B14"] as [string, string],
  },
  {
    id: "2",
    icon: "restaurant" as const,
    title: "Indian Diet Tracking",
    subtitle: "500+ Indian foods pre-loaded. Dal, roti, sabzi — we've got all macros covered.",
    color: "#FF6B35",
    gradient: ["#FF6B3515", "#070B14"] as [string, string],
  },
  {
    id: "3",
    icon: "people" as const,
    title: "Your Gym, Digitized",
    subtitle: "QR attendance, membership, trainer booking — all from one app.",
    color: "#00FF88",
    gradient: ["#00FF8815", "#070B14"] as [string, string],
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      router.replace("/(auth)/login");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: "#070B14" }]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <LinearGradient
              colors={item.gradient}
              style={styles.gradientBg}
            />
            <View style={[styles.slide, { paddingTop: topPad + 60 }]}>
              <View style={[styles.iconCircle, { backgroundColor: item.color + "20", borderColor: item.color + "40" }]}>
                <Ionicons name={item.icon} size={56} color={item.color} />
              </View>
              <Text style={[styles.title, { color: "#FFFFFF", fontFamily: "Inter_700Bold" }]}>
                {item.title}
              </Text>
              <Text style={[styles.subtitle, { color: "#8B92A5", fontFamily: "Inter_400Regular" }]}>
                {item.subtitle}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.bottom, { paddingBottom: bottomPad + 24 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? slides[activeIndex].color : "#1A2540",
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[
            styles.nextBtn,
            { backgroundColor: slides[activeIndex].color },
          ]}
        >
          <Text style={[styles.nextText, { fontFamily: "Inter_700Bold", color: "#070B14" }]}>
            {activeIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#070B14" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.skip}>
          <Text style={[styles.skipText, { color: "#8B92A5", fontFamily: "Inter_400Regular" }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
  },
  bottom: {
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
    width: "100%",
  },
  nextText: {
    fontSize: 17,
  },
  skip: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
  },
});
