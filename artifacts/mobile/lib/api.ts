import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolves the base URL for the API.
 * This function centralizes the logic for determining whether to use
 * the production, local, or Replit environment.
 */
export function getApiBaseUrl(): string {
  // Force production API if the flag is set for local testing against prod
  if (process.env.EXPO_PUBLIC_USE_PROD_API === 'true') {
    return "https://fittrack.ashirvad.work/api";
  }

  // Use production API for production builds (e.g., via EAS)
  if (process.env.NODE_ENV !== 'development') {
    return "https://fittrack.ashirvad.work/api";
  }

  // Handle Replit environment
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  if (d) return `https://${d}/api`;

  // Handle local development environment
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
      return `http://${host === "localhost" ? "10.0.2.2" : host}:5000/api`;
    }
    return `http://${host}:5000/api`;
  }

  // Fallback for local development if host is not found
  return `http://${Platform.OS === "android" ? "10.0.2.2" : "localhost"}:5000/api`;
}