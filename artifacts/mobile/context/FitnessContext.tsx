import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface WorkoutSet {
  reps: number;
  weight: number;
  done: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  category: string;
}

export interface Workout {
  id: string;
  name: string;
  date: string;
  duration: number;
  exercises: Exercise[];
  calories: number;
}

export interface Meal {
  id: string;
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

export interface DailyLog {
  date: string;
  calories: number;
  water: number;
  weight?: number;
  workouts: Workout[];
  meals: Meal[];
  steps: number;
}

export interface InBodyReport {
  id: string;
  uri: string;
  source: "camera" | "library";
  fileName: string;
  uploadedAt: string;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  type: "phone" | "fit_band" | "smartwatch";
  provider: "phone_sensors" | "google_fit" | "apple_health" | "fitbit" | "garmin";
  status: "connected" | "available";
  lastSync?: string;
}

export interface ActivitySummary {
  steps: number;
  walkingMinutes: number;
  runningMinutes: number;
  sleepHours: number;
  caloriesBurned: number;
  distanceKm: number;
}

interface FitnessContextType {
  todayLog: DailyLog;
  recentWorkouts: Workout[];
  inBodyReports: InBodyReport[];
  connectedDevices: ConnectedDevice[];
  activitySummary: ActivitySummary;
  calorieGoal: number;
  waterGoal: number;
  streak: number;
  addWater: (cups: number) => Promise<void>;
  logWeight: (weight: number) => Promise<void>;
  addMeal: (meal: Omit<Meal, "id">) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  addWorkout: (workout: Omit<Workout, "id">) => Promise<void>;
  addInBodyReport: (report: Omit<InBodyReport, "id" | "uploadedAt">) => Promise<void>;
  connectDevice: (deviceId: string) => Promise<void>;
  bmi: number;
  weeklyCalories: number[];
}

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

const today = new Date().toISOString().split("T")[0];

const defaultLog: DailyLog = {
  date: today,
  calories: 1240,
  water: 5,
  weight: 78,
  workouts: [],
  meals: [
    {
      id: "m1",
      name: "Poha with peanuts",
      type: "breakfast",
      calories: 280,
      protein: 8,
      carbs: 45,
      fat: 6,
      time: "8:30 AM",
    },
    {
      id: "m2",
      name: "Dal Rice + Sabzi",
      type: "lunch",
      calories: 520,
      protein: 18,
      carbs: 72,
      fat: 12,
      time: "1:00 PM",
    },
    {
      id: "m3",
      name: "Whey Protein Shake",
      type: "snack",
      calories: 150,
      protein: 25,
      carbs: 8,
      fat: 2,
      time: "4:00 PM",
    },
    {
      id: "m4",
      name: "Chicken Tikka + Roti",
      type: "dinner",
      calories: 380,
      protein: 32,
      carbs: 35,
      fat: 8,
      time: "8:00 PM",
    },
  ],
  steps: 7840,
};

const sampleWorkouts: Workout[] = [
  {
    id: "w1",
    name: "Push Day — Chest & Triceps",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    duration: 52,
    calories: 380,
    exercises: [
      {
        id: "e1",
        name: "Bench Press",
        category: "Chest",
        sets: [
          { reps: 10, weight: 60, done: true },
          { reps: 8, weight: 70, done: true },
          { reps: 6, weight: 75, done: true },
        ],
      },
      {
        id: "e2",
        name: "Incline Dumbbell Press",
        category: "Chest",
        sets: [
          { reps: 12, weight: 22, done: true },
          { reps: 10, weight: 24, done: true },
        ],
      },
    ],
  },
  {
    id: "w2",
    name: "Pull Day — Back & Biceps",
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    duration: 60,
    calories: 420,
    exercises: [
      {
        id: "e3",
        name: "Pull-ups",
        category: "Back",
        sets: [
          { reps: 10, weight: 0, done: true },
          { reps: 8, weight: 0, done: true },
          { reps: 7, weight: 0, done: true },
        ],
      },
    ],
  },
  {
    id: "w3",
    name: "Leg Day — Quads & Glutes",
    date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
    duration: 65,
    calories: 510,
    exercises: [],
  },
];

const defaultDevices: ConnectedDevice[] = [
  {
    id: "phone",
    name: "Phone sensors",
    type: "phone",
    provider: "phone_sensors",
    status: "available",
  },
  {
    id: "google-fit",
    name: "Google Fit",
    type: "fit_band",
    provider: "google_fit",
    status: "available",
  },
  {
    id: "apple-health",
    name: "Apple Health",
    type: "smartwatch",
    provider: "apple_health",
    status: "available",
  },
  {
    id: "fitbit",
    name: "Fitbit",
    type: "fit_band",
    provider: "fitbit",
    status: "available",
  },
];

const defaultActivitySummary: ActivitySummary = {
  steps: defaultLog.steps,
  walkingMinutes: 46,
  runningMinutes: 18,
  sleepHours: 7.2,
  caloriesBurned: 540,
  distanceKm: 5.8,
};

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const [todayLog, setTodayLog] = useState<DailyLog>(defaultLog);
  const [recentWorkouts, setRecentWorkouts] =
    useState<Workout[]>(sampleWorkouts);
  const [inBodyReports, setInBodyReports] = useState<InBodyReport[]>([]);
  const [connectedDevices, setConnectedDevices] =
    useState<ConnectedDevice[]>(defaultDevices);
  const [activitySummary, setActivitySummary] =
    useState<ActivitySummary>(defaultActivitySummary);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem("@fittrack_today");
      let hasCurrentLog = false;
      if (stored) {
        const parsed = JSON.parse(stored) as DailyLog;
        if (parsed.date === today) {
          setTodayLog(parsed);
          hasCurrentLog = true;
        }
      }
      const storedReports = await AsyncStorage.getItem("@fittrack_inbody_reports");
      if (storedReports) {
        setInBodyReports(JSON.parse(storedReports) as InBodyReport[]);
      }

      const storedDevices = await AsyncStorage.getItem("@fittrack_connected_devices");
      if (storedDevices) {
        const devices = JSON.parse(storedDevices) as ConnectedDevice[];
        setConnectedDevices(devices);
        syncActivityFromDevices(devices);
      }

      if (!hasCurrentLog) {
        await AsyncStorage.setItem("@fittrack_today", JSON.stringify(defaultLog));
      }
    } catch (e) {}
  };

  const save = async (log: DailyLog) => {
    setTodayLog(log);
    await AsyncStorage.setItem("@fittrack_today", JSON.stringify(log));
  };

  const addWater = async (cups: number) => {
    const updated = {
      ...todayLog,
      water: Math.min(todayLog.water + cups, 12),
    };
    await save(updated);
  };

  const addInBodyReport = async (
    report: Omit<InBodyReport, "id" | "uploadedAt">,
  ) => {
    const newReport: InBodyReport = {
      ...report,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      uploadedAt: new Date().toISOString(),
    };
    const updated = [newReport, ...inBodyReports];
    setInBodyReports(updated);
    await AsyncStorage.setItem(
      "@fittrack_inbody_reports",
      JSON.stringify(updated),
    );
  };

  const connectDevice = async (deviceId: string) => {
    const now = new Date().toISOString();
    const phoneSteps = deviceId === "phone" ? await getPhoneSensorSteps() : undefined;
    const updated = connectedDevices.map((device) =>
      device.id === deviceId
        ? { ...device, status: "connected" as const, lastSync: now }
        : device,
    );
    setConnectedDevices(updated);
    await AsyncStorage.setItem(
      "@fittrack_connected_devices",
      JSON.stringify(updated),
    );
    syncActivityFromDevices(updated, phoneSteps);
  };

  const syncActivityFromDevices = (devices: ConnectedDevice[], phoneSteps?: number) => {
    const connectedCount = devices.filter((d) => d.status === "connected").length;
    const steps = phoneSteps ?? defaultLog.steps + connectedCount * 420;
    setActivitySummary({
      ...defaultActivitySummary,
      steps,
      walkingMinutes: defaultActivitySummary.walkingMinutes + connectedCount * 4,
      runningMinutes: defaultActivitySummary.runningMinutes + connectedCount * 2,
      sleepHours: Math.min(8.4, defaultActivitySummary.sleepHours + connectedCount * 0.2),
      caloriesBurned: defaultActivitySummary.caloriesBurned + connectedCount * 55,
      distanceKm: Number((defaultActivitySummary.distanceKm + connectedCount * 0.35).toFixed(1)),
    });
  };

  const getPhoneSensorSteps = async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        return undefined;
      }

      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted) {
        return undefined;
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      const result = await Pedometer.getStepCountAsync(start, end);
      return result.steps;
    } catch {
      return undefined;
    }
  };

  const logWeight = async (weight: number) => {
    await save({ ...todayLog, weight });
  };

  const addMeal = async (meal: Omit<Meal, "id">) => {
    const newMeal: Meal = {
      ...meal,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    };
    const updated = {
      ...todayLog,
      calories: todayLog.calories + meal.calories,
      meals: [...todayLog.meals, newMeal],
    };
    await save(updated);
  };

  const removeMeal = async (id: string) => {
    const meal = todayLog.meals.find((m) => m.id === id);
    const updated = {
      ...todayLog,
      calories: todayLog.calories - (meal?.calories ?? 0),
      meals: todayLog.meals.filter((m) => m.id !== id),
    };
    await save(updated);
  };

  const addWorkout = async (workout: Omit<Workout, "id">) => {
    const newWorkout: Workout = {
      ...workout,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    };
    setRecentWorkouts((prev) => [newWorkout, ...prev]);
    const updated = {
      ...todayLog,
      calories: todayLog.calories + workout.calories,
      workouts: [...todayLog.workouts, newWorkout],
    };
    await save(updated);
  };

  const totalProtein = todayLog.meals.reduce((s, m) => s + m.protein, 0);
  const bmi =
    todayLog.weight && todayLog.weight > 0
      ? parseFloat((todayLog.weight / (1.75 * 1.75)).toFixed(1))
      : 25.5;

  const weeklyCalories = [1820, 2100, 1650, 1900, 2200, 1240, 0];

  return (
    <FitnessContext.Provider
      value={{
        todayLog,
        recentWorkouts,
        inBodyReports,
        connectedDevices,
        activitySummary,
        calorieGoal: 2200,
        waterGoal: 8,
        streak: 12,
        addWater,
        logWeight,
        addMeal,
        removeMeal,
        addWorkout,
        addInBodyReport,
        connectDevice,
        bmi,
        weeklyCalories,
      }}
    >
      {children}
    </FitnessContext.Provider>
  );
}

export function useFitness() {
  const ctx = useContext(FitnessContext);
  if (!ctx) throw new Error("useFitness must be used within FitnessProvider");
  return ctx;
}
