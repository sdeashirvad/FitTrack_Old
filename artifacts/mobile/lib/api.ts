import Constants from "expo-constants";
import { Platform } from "react-native";

export function resolveApiHost() {
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

export function getApiBaseUrl() {
  const port = process.env.EXPO_PUBLIC_API_PORT ?? "5000";
  return `http://${resolveApiHost()}:${port}`;
}
