import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "email" | "phone";
type Role = "member" | "trainer" | "owner";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, loginWithPhone } = useAuth();

  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("member");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const loginEmail = selectedRole === "trainer" ? "trainer@example.com" : selectedRole === "owner" ? "owner@example.com" : email;
      await login(loginEmail, password);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert("Error", "Enter a valid phone number");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOtpSent(true);
  };

  const handlePhoneLogin = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert("Error", "Enter the OTP");
      return;
    }
    setLoading(true);
    try {
      await loginWithPhone(phone, otp);
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const ROLES: { key: Role; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "member", label: "Member", icon: "person" },
    { key: "trainer", label: "Trainer", icon: "barbell" },
    { key: "owner", label: "Owner", icon: "business" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: "#070B14" }]}>
      <LinearGradient
        colors={["#00D4FF10", "#070B14"]}
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
          <View style={styles.header}>
            <Text style={[styles.logo, { color: "#00D4FF", fontFamily: "Inter_700Bold" }]}>
              FitTrack
            </Text>
            <Text style={[styles.tagline, { color: "#8B92A5", fontFamily: "Inter_400Regular" }]}>
              Your gym. Your goals. Your app.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#0F1729", borderColor: "#1A2540" }]}>
            <Text style={[styles.sectionLabel, { color: "#8B92A5", fontFamily: "Inter_500Medium" }]}>
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
                    {
                      backgroundColor:
                        selectedRole === r.key ? "#00D4FF15" : "#141E33",
                      borderColor:
                        selectedRole === r.key ? "#00D4FF" : "#1A2540",
                    },
                  ]}
                >
                  <Ionicons
                    name={r.icon}
                    size={20}
                    color={selectedRole === r.key ? "#00D4FF" : "#8B92A5"}
                  />
                  <Text
                    style={[
                      styles.roleTxt,
                      {
                        color: selectedRole === r.key ? "#00D4FF" : "#8B92A5",
                        fontFamily: selectedRole === r.key ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modeSwitch}>
              {(["email", "phone"] as Mode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.modeBtn,
                    { backgroundColor: mode === m ? "#00D4FF" : "transparent" },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTxt,
                      {
                        color: mode === m ? "#070B14" : "#8B92A5",
                        fontFamily: mode === m ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {m === "email" ? "Email" : "Phone OTP"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === "email" ? (
              <View style={styles.form}>
                <View style={[styles.inputWrap, { borderColor: "#1A2540", backgroundColor: "#141E33" }]}>
                  <Ionicons name="mail-outline" size={18} color="#8B92A5" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor="#8B92A5"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.input, { color: "#FFFFFF", fontFamily: "Inter_400Regular" }]}
                  />
                </View>
                <View style={[styles.inputWrap, { borderColor: "#1A2540", backgroundColor: "#141E33" }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#8B92A5" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#8B92A5"
                    secureTextEntry={!showPassword}
                    style={[styles.input, { color: "#FFFFFF", fontFamily: "Inter_400Regular" }]}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#8B92A5"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleEmailLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[styles.loginBtn, { backgroundColor: "#00D4FF", opacity: loading ? 0.7 : 1 }]}
                >
                  <Text style={[styles.loginBtnTxt, { fontFamily: "Inter_700Bold", color: "#070B14" }]}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={[styles.inputWrap, { borderColor: "#1A2540", backgroundColor: "#141E33" }]}>
                  <Text style={[styles.countryCode, { color: "#8B92A5", fontFamily: "Inter_500Medium" }]}>+91</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone number"
                    placeholderTextColor="#8B92A5"
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={[styles.input, { color: "#FFFFFF", fontFamily: "Inter_400Regular" }]}
                  />
                </View>
                {!otpSent ? (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    activeOpacity={0.85}
                    style={[styles.loginBtn, { backgroundColor: "#00D4FF" }]}
                  >
                    <Text style={[styles.loginBtnTxt, { fontFamily: "Inter_700Bold", color: "#070B14" }]}>
                      Send OTP
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={[styles.inputWrap, { borderColor: "#00D4FF50", backgroundColor: "#141E33" }]}>
                      <Ionicons name="key-outline" size={18} color="#00D4FF" />
                      <TextInput
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="Enter OTP"
                        placeholderTextColor="#8B92A5"
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.input, { color: "#FFFFFF", fontFamily: "Inter_400Regular" }]}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handlePhoneLogin}
                      disabled={loading}
                      activeOpacity={0.85}
                      style={[styles.loginBtn, { backgroundColor: "#00D4FF", opacity: loading ? 0.7 : 1 }]}
                    >
                      <Text style={[styles.loginBtnTxt, { fontFamily: "Inter_700Bold", color: "#070B14" }]}>
                        {loading ? "Verifying..." : "Verify & Login"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.terms, { color: "#8B92A5", fontFamily: "Inter_400Regular" }]}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 40, letterSpacing: -1 },
  tagline: { fontSize: 15, marginTop: 6 },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 16,
    marginBottom: 20,
  },
  sectionLabel: { fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleTxt: { fontSize: 13 },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "#141E33",
    borderRadius: 12,
    padding: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  modeTxt: { fontSize: 14 },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: { flex: 1, fontSize: 15 },
  countryCode: { fontSize: 15 },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loginBtnTxt: { fontSize: 16 },
  terms: { textAlign: "center", fontSize: 12, lineHeight: 18 },
});
