/**
 * HabitOwl App - Main Entry Point
 * ✅ ONLINE-ONLY: App blocks until a live internet connection is detected.
 * No offline mode: if checkInternetConnection() fails, the user is shown
 * a "No Internet" screen and the rest of the tree never mounts.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  AppState,
  TouchableOpacity,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/utils/ErrorBoundary";
import testAccountService from "./src/services/TestAccountService";
import { checkInternetConnection } from "./src/utils/networkUtils";

const RECHECK_INTERVAL_MS = 8000;

const LoadingShell = ({ label = "Checking internet..." }) => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color="#4f46e5" />
    <Text style={styles.loadingText}>{label}</Text>
  </View>
);

const NoInternetShell = ({ onRetry }) => (
  <View style={styles.center}>
    <Icon name="wifi-off" size={64} color="#dc2626" />
    <Text style={styles.title}>Internet required</Text>
    <Text style={styles.subtitle}>
      HabitOwl works online only. Please turn on Wi-Fi or mobile data, then tap Retry.
    </Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Icon name="refresh" size={18} color="#ffffff" />
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

const InternetGate = ({ children }) => {
  const [hasInternet, setHasInternet] = useState(null); // null = checking

  const verify = useCallback(async () => {
    const online = await checkInternetConnection();
    setHasInternet(online);
    return online;
  }, []);

  useEffect(() => {
    verify();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") verify();
    });
    const interval = setInterval(verify, RECHECK_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [verify]);

  if (hasInternet === null) {
    return <LoadingShell />;
  }

  if (!hasInternet) {
    return <NoInternetShell onRetry={verify} />;
  }

  return children;
};

const ConnectedApp = () => {
  useEffect(() => {
    // ✅ Only attempt to load test accounts while we are confirmed online.
    testAccountService.loadTestEmailsFromFirestore().catch((err) => {
      console.log("Could not load test emails:", err.message);
    });
  }, []);

  return (
    <ErrorBoundary screen="App">
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <InternetGate>
      <ConnectedApp />
    </InternetGate>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  title: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
