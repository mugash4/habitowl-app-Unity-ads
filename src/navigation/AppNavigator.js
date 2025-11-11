import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, Portal, MD3LightTheme } from 'react-native-paper';
import { View, Platform } from 'react-native';
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

const TAB_BAR_HEIGHT = 60;
const BANNER_HEIGHT = 60;

// ✅ FIXED: Proper banner ad integration with dynamic tab bar
const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const [showBanner, setShowBanner] = useState(false);

  // ✅ FIX: Subscribe to ALL status changes, not just premium
  useEffect(() => {
    console.log('[TabNavigator] 🎬 Setting up status subscription');
    
    // Subscribe to comprehensive status updates
    const unsubscribe = AdMobService.onStatusChange((status) => {
      console.log('[TabNavigator] 📢 Status update:', status);
      
      // Show banner only if all conditions are met
      const shouldShow = status.shouldShowAds && 
                        status.isInitialized && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        status.premiumStatusLoaded;
      
      console.log(`[TabNavigator] Setting showBanner = ${shouldShow}`);
      setShowBanner(shouldShow);
    });
    
    // Also do initial check after delay to catch late initialization
    const timeoutIds = [500, 1500, 3000].map((delay) =>
      setTimeout(() => {
        const shouldShow = AdMobService.shouldShowAds();
        console.log(`[TabNavigator] Delayed check (${delay}ms): ${shouldShow}`);
        setShowBanner(shouldShow);
      }, delay)
    );
    
    return () => {
      console.log('[TabNavigator] 🚪 Cleaning up subscriptions');
      unsubscribe();
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  // ✅ Calculate layout dimensions
  const systemNavHeight = insets.bottom || 0;
  const bannerSpace = showBanner ? BANNER_HEIGHT : 0;
  const totalTabBarHeight = TAB_BAR_HEIGHT + bannerSpace + systemNavHeight;
  
  console.log(`[TabNavigator] 📐 Layout - TabBar: ${TAB_BAR_HEIGHT}px, Banner: ${bannerSpace}px, SystemNav: ${systemNavHeight}px, Total: ${totalTabBarHeight}px`);
  
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
            // ✅ FIX: Container grows/shrinks based on banner visibility
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: totalTabBarHeight, // Dynamic total height
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: systemNavHeight + bannerSpace, // Space for system nav + banner
            paddingTop: 8,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarItemStyle: {
            // ✅ FIX: Tabs stay in their normal position
            height: TAB_BAR_HEIGHT,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 4,
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

      {/* ✅ FIX: Banner positioned at bottom of tab bar container */}
      {showBanner && Platform.OS !== 'web' && (
        <View style={{
          position: 'absolute',
          bottom: systemNavHeight, // Above system navigation bar
          left: 0,
          right: 0,
          height: BANNER_HEIGHT,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          elevation: 10,
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
      
      // Initialize AdMob first (it pre-loads premium status)
      await AdMobService.initialize();
      await NotificationService.initialize();
      
      console.log('[AppNavigator] ✅ Services initialized');

      // Listen for auth state changes
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        console.log('[AppNavigator] 🔐 Auth state changed:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
          // User logged in - reload premium status
          console.log('[AppNavigator] 👤 User logged in, checking premium status...');
          await AdMobService.preloadPremiumStatus();
        }
        
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
