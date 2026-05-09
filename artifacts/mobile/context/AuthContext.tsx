import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "member" | "trainer" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  gymName?: string;
  weight?: number;
  height?: number;
  goal?: string;
  memberSince: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<UserRole, User> = {
  member: {
    id: "1",
    name: "Arjun Sharma",
    email: "arjun@example.com",
    phone: "+91 98765 43210",
    role: "member",
    gymName: "FitZone Gym, Bengaluru",
    weight: 78,
    height: 175,
    goal: "Build muscle & lose fat",
    memberSince: "Jan 2024",
  },
  trainer: {
    id: "2",
    name: "Priya Patel",
    email: "priya@example.com",
    phone: "+91 87654 32109",
    role: "trainer",
    gymName: "FitZone Gym, Bengaluru",
    memberSince: "Mar 2022",
  },
  owner: {
    id: "3",
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    phone: "+91 76543 21098",
    role: "owner",
    gymName: "FitZone Gym, Bengaluru",
    memberSince: "Jun 2020",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem("@fittrack_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, _password: string) => {
    const role: UserRole = email.includes("trainer")
      ? "trainer"
      : email.includes("owner")
        ? "owner"
        : "member";
    const u = DEMO_USERS[role];
    await AsyncStorage.setItem("@fittrack_user", JSON.stringify(u));
    setUser(u);
  };

  const loginWithPhone = async (_phone: string, _otp: string) => {
    const u = DEMO_USERS["member"];
    await AsyncStorage.setItem("@fittrack_user", JSON.stringify(u));
    setUser(u);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("@fittrack_user");
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem("@fittrack_user", JSON.stringify(updated));
    setUser(updated);
  };

  const switchRole = async (role: UserRole) => {
    const u = { ...DEMO_USERS[role] };
    await AsyncStorage.setItem("@fittrack_user", JSON.stringify(u));
    setUser(u);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithPhone,
        logout,
        updateUser,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
