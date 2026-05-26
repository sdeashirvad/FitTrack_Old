import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
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
  const colors = useColors();
  const { login, register, loginWithPhone, loginWithGoogle } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [inputMode, setInputMode] = useState<InputMode>("email");
  const [username, setUsername] = useState("");
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

  const navigateAfterAuth = () => router.replace("/");

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigateAfterAuth();
    } catch (e: any) {
      if (e.message !== "Google sign-in was cancelled") {
        showAlert("Google Sign-In Failed", e.message || "Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (authMode === "register" && (!username.trim() || !email.trim() || !password)) {
      showAlert("Missing Fields", "Please enter a username, email, and password.");
      return;
    }
    if (authMode === "login" && (!email.trim() || !password)) {
      showAlert("Missing Fields", "Please enter your email and password.");
      return;
    }
    if (authMode === "register" && password.length < 8) {
      showAlert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      if (authMode === "register") {
        await register(email.trim(), username.trim(), password, selectedRole);
      } else {
        await login(email.trim(), password);
      }
      navigateAfterAuth();
    } catch (e: any) {
      showAlert(
        authMode === "register" ? "Registration Failed" : "Login Failed",
        e.message || "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (!phone || phone.length < 10) {
      showAlert("Invalid Number", "Enter a valid 10-digit phone number.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOtpSent(true);
  };

  const handlePhoneLogin = async () => {
    if (!otp || otp.length < 4) {
      showAlert("Invalid OTP", "Enter the OTP sent to your phone.");
      return;
    }
    setLoading(true);
    try {
      await loginWithPhone(phone, otp);
      navigateAfterAuth();
    } catch (e: any) {
      showAlert("Verification Failed", e.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "15", colors.background]}
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
            <Text style={[colors.typography.h1, { color: colors.primary, fontSize: 38, letterSpacing: -1 }]}>FitTrack</Text>
            <Text style={[colors.typography.body, { color: colors.mutedForeground, marginTop: 6 }]}>
              Your gym. Your goals. Your app.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLarge }]}>
            {/* Login / Register toggle */}
            <View style={[styles.tabRow, { backgroundColor: colors.input, borderRadius: colors.radiusSmall }]}>
              {(["login", "register"] as AuthMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setAuthMode(m);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.tab,
                    { borderRadius: 10 },
                    authMode === m && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      colors.typography.body,
                      { color: authMode === m ? colors.primaryForeground : colors.mutedForeground },
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
              style={[styles.googleBtn, { borderColor: colors.border, borderRadius: colors.radius }, googleLoading && { opacity: 0.7 }]}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: "https://developers.google.com/identity/images/g-logo.png",
                    }}
                    style={styles.googleIcon}
                  />
                  <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Role selector (only for register) */}
            {authMode === "register" && (
              <>
                <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>
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
                        { backgroundColor: colors.input, borderColor: colors.border, borderRadius: 10 },
                        selectedRole === r.key && { backgroundColor: colors.primary + "15", borderColor: colors.primary },
                      ]}
                    >
                      <Ionicons
                        name={r.icon}
                        size={18}
                        color={selectedRole === r.key ? colors.cyan : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          colors.typography.caption,
                          { color: selectedRole === r.key ? colors.primary : colors.mutedForeground },
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
            <View style={[styles.modeSwitch, { backgroundColor: colors.input, borderRadius: colors.radiusSmall }]}>
              {(["email", "phone"] as InputMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setInputMode(m);
                    setOtpSent(false);
                  }}
                  style={[
                    styles.modeBtn,
                    { borderRadius: 10 },
                    inputMode === m && { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[
                      colors.typography.body,
                      { color: inputMode === m ? colors.foreground : colors.mutedForeground },
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
                {authMode === "register" && (
                  <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.input, borderRadius: colors.radiusSmall }]}>
                    <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Username"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[styles.input, colors.typography.body, { color: colors.foreground }]}
                    />
                  </View>
                )}

                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.input, borderRadius: colors.radiusSmall }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, colors.typography.body, { color: colors.foreground }]}
                  />
                </View>

                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.input, borderRadius: colors.radiusSmall }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={authMode === "register" ? "Create password (min. 8 chars)" : "Password"}
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    style={[styles.input, colors.typography.body, { color: colors.foreground }]}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleEmailAuth}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radiusSmall }, loading && { opacity: 0.7 }]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground, fontSize: 16 }]}>
                      {authMode === "register" ? "Create Account" : "Sign In"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Phone OTP form */
              <View style={styles.form}>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.input, borderRadius: colors.radiusSmall }]}>
                  <Text style={[colors.typography.bodyMedium, { color: colors.mutedForeground }]}>+91</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="10-digit phone number"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={[styles.input, colors.typography.body, { color: colors.foreground }]}
                  />
                </View>

                {!otpSent ? (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    activeOpacity={0.85}
                    style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radiusSmall }]}
                  >
                    <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground, fontSize: 16 }]}>
                      Send OTP
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={[styles.inputWrap, { borderColor: colors.cyan + "50", backgroundColor: colors.input, borderRadius: colors.radiusSmall }]}>
                      <Ionicons name="key-outline" size={18} color={colors.cyan} />
                      <TextInput
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="Enter OTP"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.input, colors.typography.body, { color: colors.foreground }]}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handlePhoneLogin}
                      disabled={loading}
                      activeOpacity={0.85}
                      style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radiusSmall }, loading && { opacity: 0.7 }]}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.primaryForeground} />
                      ) : (
                        <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground, fontSize: 16 }]}>
                          Verify & Sign In
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

          <Text style={[colors.typography.caption, { color: colors.mutedForeground, textAlign: "center" }]}>
            By continuing, you agree to our Terms of Service & Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  header: { alignItems: "center", marginBottom: 28 },
  card: { padding: 20, borderWidth: 1, gap: 14, marginBottom: 20 },
  tabRow: { flexDirection: "row", padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  googleBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, gap: 12, marginTop: 16 },
  googleIcon: { width: 22, height: 22 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderWidth: 1 },
  modeSwitch: { flexDirection: "row", padding: 4 },
  modeBtn: { flex: 1, paddingVertical: 9, alignItems: "center" },
  form: { gap: 12 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  input: { flex: 1, fontSize: 15 },
  primaryBtn: { height: 52, alignItems: "center", justifyContent: "center" },
});
