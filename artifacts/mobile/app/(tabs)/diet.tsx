import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
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

const INDIAN_FOODS = [
  { name: "Dal Tadka (1 bowl)", calories: 170, protein: 9, carbs: 24, fat: 5 },
  { name: "Chapati / Roti (1 pc)", calories: 70, protein: 3, carbs: 15, fat: 0.5 },
  { name: "Basmati Rice (1 cup)", calories: 200, protein: 4, carbs: 44, fat: 0 },
  { name: "Paneer Bhurji (100g)", calories: 265, protein: 18, carbs: 6, fat: 19 },
  { name: "Poha (1 plate)", calories: 270, protein: 6, carbs: 47, fat: 5 },
  { name: "Chole (1 bowl)", calories: 270, protein: 14, carbs: 38, fat: 5 },
  { name: "Idli (2 pcs)", calories: 140, protein: 4, carbs: 28, fat: 0.5 },
  { name: "Sambar (1 bowl)", calories: 100, protein: 5, carbs: 15, fat: 2 },
  { name: "Chicken Curry (100g)", calories: 165, protein: 18, carbs: 4, fat: 8 },
  { name: "Egg Bhurji (2 eggs)", calories: 220, protein: 14, carbs: 4, fat: 15 },
  { name: "Whey Protein (1 scoop)", calories: 120, protein: 25, carbs: 4, fat: 1 },
  { name: "Banana (1 medium)", calories: 90, protein: 1, carbs: 23, fat: 0 },
];

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: { key: MealType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "sunny", color: "#FBBF24" },
  { key: "lunch", label: "Lunch", icon: "restaurant", color: "#FF6B35" },
  { key: "dinner", label: "Dinner", icon: "moon", color: "#8B5CF6" },
  { key: "snack", label: "Snack", icon: "cafe", color: "#00C853" },
];

export default function DietScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { todayLog, calorieGoal, addMeal, removeMeal } = useFitness();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState<MealType>("lunch");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const totalProtein = todayLog.meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = todayLog.meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = todayLog.meals.reduce((s, m) => s + m.fat, 0);

  const filteredFoods = INDIAN_FOODS.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddFood = (food: (typeof INDIAN_FOODS)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addMeal({
      name: food.name,
      type: selectedType,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    });
    setShowAdd(false);
    setSearch("");
  };

  const handleAddCustom = () => {
    if (!customName || !customCal) {
      Alert.alert("Required", "Name and calories are required");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMeal({
      name: customName,
      type: selectedType,
      calories: parseInt(customCal),
      protein: 0,
      carbs: 0,
      fat: 0,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    });
    setShowAdd(false);
    setCustomName("");
    setCustomCal("");
  };

  const mealsByType = (type: MealType) => todayLog.meals.filter((m) => m.type === type);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.secondary + "15", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[colors.typography.h1, { color: colors.foreground }]}>
            Diet
          </Text>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={[styles.addBtn, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="add" size={20} color={colors.primaryForeground} />
            <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground }]}>Add Meal</Text>
          </TouchableOpacity>
        </View>

        {/* Calorie summary */}
        <GlassCard style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <ProgressRing
              size={100}
              strokeWidth={8}
              progress={todayLog.calories / calorieGoal}
              color={colors.secondary}
              trackColor={colors.border}
              label={`${todayLog.calories}`}
              sublabel="kcal"
            />
          </View>
          <View style={styles.summaryRight}>
            <CalStat label="Goal" value={`${calorieGoal}`} color={colors.mutedForeground} />
            <CalStat label="Consumed" value={`${todayLog.calories}`} color={colors.secondary} />
            <CalStat label="Remaining" value={`${Math.max(0, calorieGoal - todayLog.calories)}`} color={colors.green} />
          </View>
        </GlassCard>

        {/* Macros */}
        <GlassCard style={styles.macroCard}>
          {[
            { label: "Protein", value: totalProtein, color: colors.primary, max: 160 },
            { label: "Carbs", value: totalCarbs, color: colors.secondary, max: 220 },
            { label: "Fat", value: totalFat, color: colors.yellow, max: 70 },
          ].map((m) => (
            <View key={m.label} style={styles.macroRow}>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground, width: 54 }]}>
                {m.label}
              </Text>
              <View style={[styles.macroTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.macroFill,
                    { width: `${Math.min((m.value / m.max) * 100, 100)}%` as any, backgroundColor: m.color },
                  ]}
                />
              </View>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 13, width: 40, textAlign: "right" }]}>
                {m.value}g
              </Text>
            </View>
          ))}
        </GlassCard>

        {/* Meals by type */}
        {MEAL_TYPES.map((type) => {
          const meals = mealsByType(type.key);
          return (
            <View key={type.key}>
              <View style={styles.mealTypeHeader}>
                <View style={[styles.mealTypeIcon, { backgroundColor: type.color + "20" }]}>
                  <Ionicons name={type.icon} size={16} color={type.color} />
                </View>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground, flex: 1 }]}>
                  {type.label}
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {meals.reduce((s, m) => s + m.calories, 0)} kcal
                </Text>
              </View>
              {meals.length === 0 ? (
                <TouchableOpacity
                  onPress={() => { setSelectedType(type.key); setShowAdd(true); }}
                  style={[styles.emptyMealRow, { borderColor: colors.border }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                    Add {type.label.toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ) : (
                meals.map((meal) => (
                  <GlassCard key={meal.id} style={styles.mealCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                        {meal.name}
                      </Text>
                      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                        P: {meal.protein}g · C: {meal.carbs}g · F: {meal.fat}g
                      </Text>
                    </View>
                    <Text style={[colors.typography.h3, { color: type.color }]}>
                      {meal.calories}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeMeal(meal.id);
                    }}>
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </GlassCard>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add meal modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: colors.radiusLarge, borderTopRightRadius: colors.radiusLarge }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[colors.typography.h2, { color: colors.foreground }]}>
              Add Meal
            </Text>

            {/* Meal type selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={styles.typeRow}>
                {MEAL_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setSelectedType(t.key)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: selectedType === t.key ? t.color + "20" : colors.muted,
                        borderColor: selectedType === t.key ? t.color : colors.border,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        colors.typography.bodyMedium,
                        { color: selectedType === t.key ? t.color : colors.mutedForeground },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search Indian foods..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radiusSmall }, colors.typography.body]}
            />

            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {filteredFoods.map((food) => (
                <TouchableOpacity
                  key={food.name}
                  onPress={() => handleAddFood(food)}
                  style={[styles.foodRow, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                      {food.name}
                    </Text>
                    <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
                      P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                    </Text>
                  </View>
                  <Text style={[colors.typography.h3, { color: colors.secondary }]}>
                    {food.calories} kcal
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.customRow}>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="Custom food name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.customInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, flex: 1, borderRadius: colors.radiusSmall }, colors.typography.body]}
              />
              <TextInput
                value={customCal}
                onChangeText={setCustomCal}
                placeholder="kcal"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[styles.customInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, width: 70, borderRadius: colors.radiusSmall }, colors.typography.body]}
              />
              <TouchableOpacity onPress={handleAddCustom} style={[styles.customAddBtn, { backgroundColor: colors.secondary }]}>
                <Ionicons name="add" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { setShowAdd(false); setSearch(""); }} style={styles.cancelBtn}>
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CalStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[colors.typography.h3, { color }]}>{value} kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  summaryCard: { flexDirection: "row", padding: 16, gap: 20, alignItems: "center" },
  summaryLeft: {},
  summaryRight: { flex: 1, gap: 12 },
  macroCard: { padding: 16, gap: 12 },
  macroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  macroTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  macroFill: { height: 6, borderRadius: 3 },
  mealTypeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 8 },
  mealTypeIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyMealRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 12, marginBottom: 8 },
  mealCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: 8 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000060" },
  modalSheet: { padding: 20, borderWidth: 1, gap: 12, maxHeight: "85%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  searchInput: { height: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  foodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5 },
  customRow: { flexDirection: "row", gap: 8 },
  customInput: { height: 44, borderWidth: 1, paddingHorizontal: 10, fontSize: 13 },
  customAddBtn: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cancelBtn: { alignItems: "center", padding: 8 },
});
