import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

type AuthMode = "login" | "register";
type InputMode = "email" | "phone";
type Role = "member" | "trainer" | "owner";

const ROLES: {
  key: Role;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "member", label: "Member", icon: "person" },
  { key: "trainer", label: "Trainer", icon: "barbell" },
  { key: "owner", label: "Owner", icon: "business" },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, loginWithPhone, loginWithGoogle } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [inputMode, setInputMode] = useState<InputMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("member");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // After any successful auth, the root index.tsx decides where to redirect
  const navigateAfterAuth = () => router.replace("/");

  // ─── Google sign-in ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigateAfterAuth();
    } catch (e: any) {
      if (e.message !== "Google sign-in was cancelled") {
        Alert.alert("Google Sign-In Failed", e.message || "Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Email auth ───────────────────────────────────────────────────────────────
  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      if (authMode === "register") {
        await register(email.trim(), password, selectedRole);
      } else {
        await login(email.trim(), password);
      }
      navigateAfterAuth();
    } catch (e: any) {
      Alert.alert(
        authMode === "register" ? "Registration Failed" : "Login Failed",
        e.message || "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = () => {
    if (!phone || phone.length < 10) {
      Alert.alert("Invalid Number", "Enter a valid 10-digit phone number.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOtpSent(true);
  };

  const handlePhoneLogin = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert("Invalid OTP", "Enter the OTP sent to your phone.");
      return;
    }
    setLoading(true);
    try {
      await loginWithPhone(phone, otp);
      navigateAfterAuth();
    } catch (e: any) {
      Alert.alert("Verification Failed", e.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#00D4FF12", "#070B14"]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 24, paddingBottom: bottomPad + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.logo, styles.fontBold]}>FitTrack</Text>
            <Text style={[styles.tagline, styles.fontRegular]}>
              Your gym. Your goals. Your app.
            </Text>
          </View>

          <View style={styles.card}>
            {/* Login / Register toggle */}
            <View style={styles.tabRow}>
              {(["login", "register"] as AuthMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setAuthMode(m);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.tab, authMode === m && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabTxt,
                      authMode === m ? styles.tabTxtActive : styles.fontRegular,
                    ]}
                  >
                    {m === "login" ? "Sign In" : "Create Account"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Google button */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.85}
              style={[styles.googleBtn, googleLoading && { opacity: 0.7 }]}
            >
              {googleLoading ? (
                <ActivityIndicator color="#1A1A2E" size="small" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: "https://developers.google.com/identity/images/g-logo.png",
                    }}
                    style={styles.googleIcon}
                  />

                  <Text style={[styles.googleBtnTxt, styles.fontSemiBold]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerTxt, styles.fontRegular]}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Role selector (only for register) */}
            {authMode === "register" && (
              <>
                <Text style={[styles.sectionLabel, styles.fontMedium]}>
                  I am a
                </Text>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => {
                        setSelectedRole(r.key);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.roleBtn,
                        selectedRole === r.key && styles.roleBtnActive,
                      ]}
                    >
                      <Ionicons
                        name={r.icon}
                        size={18}
                        color={selectedRole === r.key ? "#00D4FF" : "#8B92A5"}
                      />
                      <Text
                        style={[
                          styles.roleTxt,
                          selectedRole === r.key && styles.roleTxtActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Input mode: Email / Phone */}
            <View style={styles.modeSwitch}>
              {(["email", "phone"] as InputMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setInputMode(m);
                    setOtpSent(false);
                  }}
                  style={[
                    styles.modeBtn,
                    inputMode === m && styles.modeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTxt,
                      inputMode === m
                        ? styles.modeTxtActive
                        : styles.fontRegular,
                    ]}
                  >
                    {m === "email" ? "Email" : "Phone OTP"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Email form */}
            {inputMode === "email" ? (
              <View style={styles.form}>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#8B92A5" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor="#8B92A5"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, styles.fontRegular]}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#8B92A5"
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={
                      authMode === "register"
                        ? "Create password (min. 8 chars)"
                        : "Password"
                    }
                    placeholderTextColor="#8B92A5"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.fontRegular]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#8B92A5"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleEmailAuth}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#070B14" />
                  ) : (
                    <Text style={[styles.primaryBtnTxt, styles.fontBold]}>
                      {authMode === "register" ? "Create Account" : "Sign In"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Phone OTP form */
              <View style={styles.form}>
                <View style={styles.inputWrap}>
                  <Text style={[styles.countryCode, styles.fontMedium]}>
                    +91
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="10-digit phone number"
                    placeholderTextColor="#8B92A5"
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={[styles.input, styles.fontRegular]}
                  />
                </View>

                {!otpSent ? (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    activeOpacity={0.85}
                    style={styles.primaryBtn}
                  >
                    <Text style={[styles.primaryBtnTxt, styles.fontBold]}>
                      Send OTP
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View
                      style={[styles.inputWrap, { borderColor: "#00D4FF50" }]}
                    >
                      <Ionicons name="key-outline" size={18} color="#00D4FF" />
                      <TextInput
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="Enter OTP"
                        placeholderTextColor="#8B92A5"
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.input, styles.fontRegular]}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handlePhoneLogin}
                      disabled={loading}
                      activeOpacity={0.85}
                      style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#070B14" />
                      ) : (
                        <Text style={[styles.primaryBtnTxt, styles.fontBold]}>
                          Verify & Sign In
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.terms, styles.fontRegular]}>
            By continuing, you agree to our Terms of Service & Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#070B14",
  card: "#0F1729",
  border: "#1A2540",
  input: "#141E33",
  primary: "#00D4FF",
  muted: "#8B92A5",
  fg: "#FFFFFF",
  google: "#FFFFFF",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },

  // Typography
  fontBold: { fontFamily: "Inter_700Bold" },
  fontSemiBold: { fontFamily: "Inter_600SemiBold" },
  fontMedium: { fontFamily: "Inter_500Medium" },
  fontRegular: { fontFamily: "Inter_400Regular" },

  // Header
  header: { alignItems: "center", marginBottom: 28 },
  logo: { fontSize: 38, color: C.primary, letterSpacing: -1 },
  tagline: { fontSize: 15, color: C.muted, marginTop: 6 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
    marginBottom: 20,
  },

  // Auth mode tabs (Sign In / Create Account)
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#141E33",
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: C.primary },
  tabTxt: { fontSize: 14, color: C.muted },
  tabTxtActive: { fontFamily: "Inter_600SemiBold", color: C.bg, fontSize: 14 },

  // Google button
  googleBtn: {
  height: 56,
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  gap: 12,
  marginTop: 16,
},

googleIcon: {
  width: 22,
  height: 22,
},

googleBtnTxt: {
  fontSize: 16,
  color: "#1A1A2E",
},

  // Divider
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerTxt: { color: C.muted, fontSize: 13 },

  // Role selector
  sectionLabel: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#141E33",
    borderColor: C.border,
  },
  roleBtnActive: { backgroundColor: "#00D4FF15", borderColor: C.primary },
  roleTxt: { fontSize: 13, color: C.muted, fontFamily: "Inter_400Regular" },
  roleTxtActive: { color: C.primary, fontFamily: "Inter_600SemiBold" },

  // Input mode (Email / Phone)
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "#141E33",
    borderRadius: 12,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnActive: { backgroundColor: "#1A2540" },
  modeTxt: { fontSize: 14, color: C.muted },
  modeTxtActive: { fontFamily: "Inter_600SemiBold", color: C.fg, fontSize: 14 },

  // Form
  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderColor: C.border,
    backgroundColor: "#141E33",
  },
  input: { flex: 1, fontSize: 15, color: C.fg },
  countryCode: { fontSize: 15, color: C.muted },

  // Buttons
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
  },
  primaryBtnTxt: { fontSize: 16, color: C.bg },

  // Terms
  terms: { textAlign: "center", fontSize: 12, color: C.muted, lineHeight: 18 },
});
