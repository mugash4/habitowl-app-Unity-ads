import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, Portal, MD3LightTheme } from 'react-native-paper';
import { View, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateHabitScreen from '../screens/CreateHabitScreen';
import EditHabitScreen from '../screens/EditHabitScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import AdminScreen from '../screens/AdminScreen';
import AboutScreen from '../screens/AboutScreen';

// Components
import AdMobBanner from '../components/AdMobBanner';

// Services
import FirebaseService from '../services/FirebaseService';
import AdMobService from '../services/AdMobService';
import NotificationService from '../services/NotificationService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4f46e5',
    accent: '#7c3aed',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1f2937',
    disabled: '#9ca3af',
    placeholder: '#6b7280',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
};

// Calculate proper tab bar height
const getTabBarHeight = () => {
  const baseHeight = 60;
  return baseHeight;
};

// ✅ FIXED: Main Tab Navigator with banner ad positioned above system navigation
const MainTabNavigator = () => {
  const insets = useSafeAreaInsets(); // Get safe area insets for system bars
  const [tabBarHeight] = useState(getTabBarHeight());
  const [showBanner, setShowBanner] = useState(false);

  // Banner visibility management
  useEffect(() => {
    console.log('[TabNavigator] 🎬 Initializing banner visibility management');
    
    // Initial check with multiple attempts
    const checkAttempts = [500, 1500, 3000];
    const timeouts = checkAttempts.map((delay) =>
      setTimeout(() => {
        const shouldShow = AdMobService.shouldShowAds();
        console.log(`[TabNavigator] Initial check (${delay}ms): shouldShow = ${shouldShow}`);
        setShowBanner(shouldShow);
      }, delay)
    );
    
    // Subscribe to premium status changes
    const unsubscribe = AdMobService.onPremiumStatusChange((isPremiumOrAdmin) => {
      console.log('[TabNavigator] 📢 Premium status changed:', isPremiumOrAdmin);
      const shouldShow = !isPremiumOrAdmin && AdMobService.isInitialized;
      console.log(`[TabNavigator] Setting showBanner = ${shouldShow}`);
      setShowBanner(shouldShow);
    });
    
    return () => {
      console.log('[TabNavigator] 🚪 Cleaning up');
      timeouts.forEach(clearTimeout);
      unsubscribe();
    };
  }, []);

  // ✅ FIX: Calculate heights with system navigation consideration
  const bannerHeight = showBanner ? 60 : 0; // Banner ad height
  const systemNavHeight = insets.bottom || 0; // System navigation bar height
  const totalBottomSpace = bannerHeight + systemNavHeight; // Total space at bottom
  
  console.log(`[TabNavigator] 🎨 Layout - Banner: ${bannerHeight}px, SystemNav: ${systemNavHeight}px, Total: ${totalBottomSpace}px`);
  
  return (
    <View style={{ flex: 1 }}>
      {/* Main Tab Navigator */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Statistics') {
              iconName = focused ? 'chart-line' : 'chart-line';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'cog' : 'cog-outline';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4f46e5',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            position: 'absolute',
            bottom: totalBottomSpace, // ✅ Position above banner + system nav
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            height: tabBarHeight,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'Habits',
          }}
        />
        <Tab.Screen 
          name="Statistics" 
          component={StatisticsScreen}
          options={{
            tabBarLabel: 'Stats',
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
          }}
        />
      </Tab.Navigator>

      {/* ✅ FIXED: Banner Ad - Positioned above system navigation */}
      {showBanner && Platform.OS !== 'web' && (
        <View style={{
          position: 'absolute',
          bottom: systemNavHeight, // ✅ Push above system navigation
          left: 0,
          right: 0,
          height: bannerHeight,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          elevation: 20,
        }}>
          <AdMobBanner />
        </View>
      )}
    </View>
  );
};

const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[AppNavigator] 🚀 Initializing app services...');
      
      await AdMobService.initialize();
      await NotificationService.initialize();
      
      console.log('[AppNavigator] ✅ Services initialized');

      // Listen for auth state changes
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        console.log('[AppNavigator] Auth state changed:', user ? 'Logged in' : 'Logged out');
        setIsAuthenticated(!!user);
        setIsInitialized(true);
      });

      return unsubscribe;
    } catch (error) {
      console.error('[AppNavigator] ❌ Error initializing app:', error);
      setIsInitialized(true);
    }
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <Portal.Host>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#f8fafc' },
            }}
          >
            {isAuthenticated ? (
              <>
                <Stack.Screen 
                  name="Main" 
                  component={MainTabNavigator}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="CreateHabit" 
                  component={CreateHabitScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardOverlayEnabled: true,
                  }}
                />
                <Stack.Screen 
                  name="EditHabit" 
                  component={EditHabitScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardOverlayEnabled: true,
                  }}
                />
                <Stack.Screen 
                  name="Premium" 
                  component={PremiumScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardOverlayEnabled: true,
                  }}
                />
                <Stack.Screen 
                  name="Admin" 
                  component={AdminScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardOverlayEnabled: true,
                  }}
                />
                <Stack.Screen 
                  name="About" 
                  component={AboutScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardOverlayEnabled: true,
                  }}
                />
              </>
            ) : (
              <Stack.Screen name="Auth" component={AuthScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </Portal.Host>
    </PaperProvider>
  );
};

export default AppNavigator;
