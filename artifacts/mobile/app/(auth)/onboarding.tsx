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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const slides = [
    {
      id: "1",
      icon: "fitness" as const,
      title: "Track Every Rep",
      subtitle: "Log workouts, sets, and reps with ease. Built for serious Indian gym-goers.",
      color: colors.primary,
      gradient: [colors.primary + "15", colors.background] as [string, string],
    },
    {
      id: "2",
      icon: "restaurant" as const,
      title: "Indian Diet Tracking",
      subtitle: "500+ Indian foods pre-loaded. Dal, roti, sabzi — we've got all macros covered.",
      color: colors.primaryDark,
      gradient: [colors.primaryDark + "15", colors.background] as [string, string],
    },
    {
      id: "3",
      icon: "people" as const,
      title: "Your Gym, Digitized",
      subtitle: "QR attendance, membership, trainer booking — all from one app.",
      color: colors.green,
      gradient: [colors.green + "15", colors.background] as [string, string],
    },
  ];

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              <Text style={[styles.title, { color: colors.foreground }]}>
                {item.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.secondary }]}>
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
                    i === activeIndex ? slides[activeIndex].color : colors.border,
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
            { backgroundColor: slides[activeIndex].color, borderRadius: colors.radiusLarge },
          ]}
        >
          <Text style={[colors.typography.h3, { color: colors.primaryForeground }]}>
            {activeIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.skip}>
          <Text style={[colors.typography.body, { color: colors.secondary }]}>
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
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
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
    width: "100%",
  },
  skip: {
    padding: 8,
  },
});
