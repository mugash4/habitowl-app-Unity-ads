import React, { useEffect, useMemo, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Provider as PaperProvider,
  Portal,
  MD3LightTheme,
} from "react-native-paper";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import HomeScreen from "../screens/HomeScreen";
import CreateHabitScreen from "../screens/CreateHabitScreen";
import EditHabitScreen from "../screens/EditHabitScreen";
import StatisticsScreen from "../screens/StatisticsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PremiumScreen from "../screens/PremiumScreen";
import AdminScreen from "../screens/AdminScreen";
import AboutScreen from "../screens/AboutScreen";
import SuspendUserScreen from "../screens/SuspendUserScreen";
import UserAnalyticsScreen from "../screens/UserAnalyticsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import AchievementsScreen from "../screens/AchievementsScreen";

import FirebaseService from "../services/FirebaseService";
import AdMobService from "../services/AdMobService";
import NotificationService from "../services/NotificationService";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ONBOARDING_STORAGE_KEY = "habitowl_onboarding_completed";
const FLOATING_TAB_BAR_HEIGHT = 72;
const FLOATING_TAB_BAR_MARGIN = 16;

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#4f46e5",
    accent: "#7c3aed",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#1f2937",
    disabled: "#9ca3af",
    placeholder: "#6b7280",
    backdrop: "rgba(0, 0, 0, 0.5)",
  },
};

const LoadingScreen = ({ label = "Loading..." }) => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f8fafc",
    }}
  >
    <Icon name="loading" size={40} color="#4f46e5" />
    <Text style={{ marginTop: 16, fontSize: 16, color: "#6b7280" }}>
      {label}
    </Text>
  </View>
);

const FloatingTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  const tabs = useMemo(
    () => [
      {
        routeName: "Home",
        label: "Habits",
        icon: "home-outline",
        activeIcon: "home",
      },
      {
        routeName: "Statistics",
        label: "Stats",
        icon: "chart-line",
        activeIcon: "chart-line",
      },
      {
        routeName: "Settings",
        label: "Settings",
        icon: "cog-outline",
        activeIcon: "cog",
      },
    ],
    [],
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: FLOATING_TAB_BAR_MARGIN,
        right: FLOATING_TAB_BAR_MARGIN,
        bottom: Math.max(insets.bottom, 8) + 10,
      }}
    >
      <View
        style={{
          height: FLOATING_TAB_BAR_HEIGHT,
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderRadius: 26,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          shadowColor: "#111827",
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.12,
          shadowRadius: 22,
          elevation: 12,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const configuredTab = tabs.find(
            (tab) => tab.routeName === route.name,
          );
          const label =
            options.tabBarLabel ||
            configuredTab?.label ||
            options.title ||
            route.name;
          const isFocused = state.index === index;
          const iconName = isFocused
            ? configuredTab?.activeIcon
            : configuredTab?.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  height: 56,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isFocused ? "#eef2ff" : "transparent",
                }}
              >
                <Icon
                  name={iconName || "circle-outline"}
                  size={24}
                  color={isFocused ? "#4f46e5" : "#6b7280"}
                />
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: "600",
                    color: isFocused ? "#4f46e5" : "#6b7280",
                  }}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabNavigator = () => {
  const [userType, setUserType] = useState("loading");

  useEffect(() => {
    let isMounted = true;

    const determineUserType = async () => {
      try {
        const currentUser = FirebaseService.currentUser;

        if (!currentUser) {
          if (isMounted) {
            setUserType("free");
          }
          await AdMobService.setPremiumStatus(false, false);
          return;
        }

        let isAdmin = false;
        if (currentUser.email) {
          const AdminService = require("../services/AdminService").default;
          isAdmin = await AdminService.checkAdminStatus(currentUser.email);
        }

        if (isAdmin) {
          if (isMounted) {
            setUserType("admin");
          }
          await AdMobService.setPremiumStatus(false, true);
          return;
        }

        const userStats = await FirebaseService.getUserStats();
        const isPremium = userStats?.isPremium || false;

        if (isMounted) {
          setUserType(isPremium ? "premium" : "free");
        }

        await AdMobService.setPremiumStatus(isPremium, false);
      } catch (error) {
        console.error("[MainTab] Error determining user type:", error);
        if (isMounted) {
          setUserType("free");
        }
        await AdMobService.setPremiumStatus(false, false);
      }
    };

    determineUserType();

    const premiumStatusUnsubscribe = AdMobService.onPremiumStatusChange(() => {
      if (isMounted) {
        determineUserType();
      }
    });

    const authUnsubscribe = FirebaseService.onAuthStateChanged(() => {
      if (isMounted) {
        determineUserType();
      }
    });

    return () => {
      isMounted = false;
      premiumStatusUnsubscribe();
      authUnsubscribe();
    };
  }, []);

  if (userType === "loading") {
    return <LoadingScreen label="Loading your dashboard..." />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Home"
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: "Habits" }}
        />
        <Tab.Screen
          name="Statistics"
          component={StatisticsScreen}
          options={{ tabBarLabel: "Stats" }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: "Settings" }}
        />
      </Tab.Navigator>
    </View>
  );
};

const AppNavigator = () => {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;

    NotificationService.initialize().catch((error) => {
      console.log("[AppNav] Notification init warning:", error.message);
    });

    const unsubscribe = FirebaseService.onAuthStateChanged((user) => {
      console.log(
        "[AppNav] Auth state changed:",
        user ? "SIGNED_IN" : "SIGNED_OUT",
      );
      if (user) {
        FirebaseService.syncPendingHabitsInBackground();
      }
    });

    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);

        if (!isMounted) return;

        setHasCompletedOnboarding(completed === "true");
        setOnboardingChecked(true);
      } catch (error) {
        console.error("[AppNav] Failed to read onboarding state:", error);
        if (isMounted) {
          setHasCompletedOnboarding(false);
          setOnboardingChecked(true);
        }
      }
    };

    checkOnboarding();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!onboardingChecked || !hasCompletedOnboarding) {
      return;
    }

    FirebaseService.ensureAnonymousUser()
      .then(() => FirebaseService.syncPendingHabitsInBackground())
      .catch((error) => {
        console.log(
          "[AppNav] Running in local offline mode until auth is available:",
          error.message,
        );
      });
  }, [onboardingChecked, hasCompletedOnboarding]);

  const handleOnboardingDone = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      setHasCompletedOnboarding(true);

      FirebaseService.ensureAnonymousUser()
        .then(() => FirebaseService.syncPendingHabitsInBackground())
        .catch((error) => {
          console.log(
            "[AppNav] Continuing without network auth for now:",
            error.message,
          );
        });
    } catch (error) {
      console.error("[AppNav] Failed to finish onboarding:", error);
    }
  };

  if (!onboardingChecked) {
    return (
      <PaperProvider theme={theme}>
        <Portal.Host>
          <LoadingScreen label="Preparing HabitOwl..." />
        </Portal.Host>
      </PaperProvider>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <PaperProvider theme={theme}>
        <Portal.Host>
          <OnboardingScreen onDone={handleOnboardingDone} />
        </Portal.Host>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <Portal.Host>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Main"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: "#f8fafc" },
            }}
          >
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateHabit"
              component={CreateHabitScreen}
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="EditHabit"
              component={EditHabitScreen}
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="Premium"
              component={PremiumScreen}
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="About"
              component={AboutScreen}
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="SuspendUser"
              component={SuspendUserScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="UserAnalytics"
              component={UserAnalyticsScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Portal.Host>
    </PaperProvider>
  );
};

export default AppNavigator;
