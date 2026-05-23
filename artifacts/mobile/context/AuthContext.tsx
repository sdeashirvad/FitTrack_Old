import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { createURL } from "expo-linking";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

// Required for OAuth on iOS/Android
WebBrowser.maybeCompleteAuthSession();

export type UserRole = "member" | "trainer" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  phone: string;
  role: UserRole;
  avatar?: string | null;
  onboardingCompleted: boolean;
  fitnessGoal?: string | null;
  heightCm?: string | null;
  weightKg?: string | null;
  bmi?: string | null;
  region?: string | null;
  memberSince: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, role?: UserRole) => Promise<void>;
  loginWithPhone: (phone: string, otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  /** Fetch the latest profile from the server and update local state. */
  refreshProfile: () => Promise<void>;
  /** Local-only role swap for demo / dev purposes. */
  switchRole: (role: UserRole) => void;
}

const API_TOKEN_KEY = "@fittrack_token";
const API_USER_KEY = "@fittrack_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── API host resolution ──────────────────────────────────────────────────────
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

// Server runs on port 5000 by default (see artifacts/api-server/src/index.ts)
function getApiBaseUrl() {
  const host = resolveApiHost();
  return `http://${host}:5000`;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function requestJson<T>(path: string, init: RequestInit = {}, token?: string | null) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null
        ? (body as { error?: string; message?: string }).error ||
          (body as { error?: string; message?: string }).message
        : typeof body === "string"
        ? body
        : response.statusText;
    throw new Error(message || "Request failed");
  }

  return body as T;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet([API_TOKEN_KEY, API_USER_KEY]);
      const savedToken = storedToken?.[1];
      const userValue = storedUser?.[1];

      if (savedToken && userValue) {
        setToken(savedToken);
        setUser(JSON.parse(userValue));
      } else {
        await AsyncStorage.multiRemove([API_TOKEN_KEY, API_USER_KEY]);
        setUser(null);
        setToken(null);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const persistAuth = async (userData: User, authToken: string) => {
    await AsyncStorage.multiSet([
      [API_USER_KEY, JSON.stringify(userData)],
      [API_TOKEN_KEY, authToken],
    ]);
    setToken(authToken);
    setUser(userData);
  };

  // ─── Register ───────────────────────────────────────────────────────────────
  const register = async (email: string, username: string, password: string, role: UserRole = "member") => {
    const response = await requestJson<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password, role }),
    });
    await persistAuth(response.user, response.token);
  };

  // ─── Email Login ─────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const response = await requestJson<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await persistAuth(response.user, response.token);
  };

  // ─── Phone Login ─────────────────────────────────────────────────────────────
  const loginWithPhone = async (phone: string, otp: string) => {
    const response = await requestJson<{ token: string; user: User }>("/api/auth/login-phone", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
    await persistAuth(response.user, response.token);
  };

  // ─── Google OAuth ─────────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    // 1. Get the Supabase Google OAuth redirect URL from our backend
    const redirectUrl = createURL("auth/callback");
    const { url } = await requestJson<{ url: string }>("/api/auth/google/url", {
      method: "POST",
      body: JSON.stringify({ redirectTo: redirectUrl }),
    });

    // 2. Open browser for Google sign-in
    const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

    if (result.type !== "success") {
      throw new Error("Google sign-in was cancelled");
    }

    // 3. Extract Supabase tokens from the redirect URL fragment
    const fragment = result.url.split("#")[1] ?? "";
    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken) {
      throw new Error("No access token received from Google");
    }

    // 4. Exchange Supabase tokens for FitTrack JWT
    const response = await requestJson<{ token: string; user: User; isNewUser: boolean }>(
      "/api/auth/google/callback",
      {
        method: "POST",
        body: JSON.stringify({ accessToken, refreshToken }),
      }
    );

    await persistAuth(response.user, response.token);
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (token) {
        await requestJson("/api/auth/logout", { method: "POST" }, token);
      }
    } catch {
      // Best effort — always clear local state
    }
    await AsyncStorage.multiRemove([API_TOKEN_KEY, API_USER_KEY]);
    setUser(null);
    setToken(null);
  };

  // ─── Refresh profile from server ─────────────────────────────────────────────
  const refreshProfile = async () => {
    if (!token) return;
    const response = await requestJson<{ user: User }>("/api/auth/profile", {}, token);
    await AsyncStorage.setItem(API_USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  };

  // ─── Switch role locally (demo only) ─────────────────────────────────────────
  const switchRole = (role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    AsyncStorage.setItem(API_USER_KEY, JSON.stringify(updated)).catch(() => {});
    setUser(updated);
  };

  // ─── Update user locally ──────────────────────────────────────────────────────
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(API_USER_KEY, JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithPhone,
        loginWithGoogle,
        logout,
        updateUser,
        refreshProfile,
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
