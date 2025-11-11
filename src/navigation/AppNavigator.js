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

// ✅ FIXED: Constants for layout
const TAB_BAR_HEIGHT = 60;
const BANNER_HEIGHT = 60;

/**
 * ✅ FIXED: Main Tab Navigator with Banner Ad Integration
 */
const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const [showBanner, setShowBanner] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // ✅ FIX: Subscribe to status changes
  useEffect(() => {
    console.log('[TabNav] 🎬 Setting up status subscription');
    
    const unsubscribe = AdMobService.onStatusChange((status) => {
      console.log('[TabNav] 📢 Status update:', status);
      
      // ✅ Show banner if all conditions met
      const shouldShow = status.shouldShowAds && 
                        status.isInitialized && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        status.premiumStatusLoaded;
      
      console.log('[TabNav] Setting showBanner =', shouldShow);
      setShowBanner(shouldShow);
      
      // ✅ Force re-render when status changes
      setRenderKey(prev => prev + 1);
    });
    
    // ✅ Delayed checks for late initialization
    const timeouts = [500, 1500, 3000].map((delay) =>
      setTimeout(() => {
        const shouldShow = AdMobService.shouldShowAds();
        console.log('[TabNav] Delayed check (' + delay + 'ms):', shouldShow);
        setShowBanner(shouldShow);
        setRenderKey(prev => prev + 1);
      }, delay)
    );
    
    return () => {
      console.log('[TabNav] 🚪 Cleaning up');
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // ✅ Calculate layout dimensions
  const systemNavHeight = insets.bottom || 0;
  const bannerSpace = showBanner ? BANNER_HEIGHT : 0;
  const totalTabBarHeight = TAB_BAR_HEIGHT + bannerSpace + systemNavHeight;
  
  console.log('[TabNav] 📐 Layout - TabBar:', TAB_BAR_HEIGHT, 'Banner:', bannerSpace, 'SystemNav:', systemNavHeight, 'Total:', totalTabBarHeight);
  
  return (
    <View style={{ flex: 1 }} key={renderKey}>
      {/* Main Tabs */}
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
            bottom: 0,
            left: 0,
            right: 0,
            height: totalTabBarHeight, // ✅ Dynamic height
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: systemNavHeight + bannerSpace, // ✅ Space for banner
            paddingTop: 8,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarItemStyle: {
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
          options={{ tabBarLabel: 'Habits' }}
        />
        <Tab.Screen 
          name="Statistics" 
          component={StatisticsScreen}
          options={{ tabBarLabel: 'Stats' }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ tabBarLabel: 'Settings' }}
        />
      </Tab.Navigator>

      {/* ✅ FIX: Banner positioned at bottom of tab bar */}
      {showBanner && Platform.OS !== 'web' && (
        <View style={{
          position: 'absolute',
          bottom: systemNavHeight, // Above system nav
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

/**
 * Main App Navigator
 */
const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[AppNav] 🚀 Initializing...');
      
      // Initialize services
      await AdMobService.initialize();
      await NotificationService.initialize();
      
      console.log('[AppNav] ✅ Services initialized');

      // Listen for auth changes
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        console.log('[AppNav] 🔐 Auth:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
          console.log('[AppNav] 👤 User logged in, checking premium...');
          await AdMobService.preloadPremiumStatus();
        }
        
        setIsAuthenticated(!!user);
        setIsInitialized(true);
      });

      return unsubscribe;
    } catch (error) {
      console.error('[AppNav] ❌ Init error:', error);
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
                <Stack.Screen name="CreateHabit" component={CreateHabitScreen} options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="EditHabit" component={EditHabitScreen} options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="Premium" component={PremiumScreen} options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false, presentation: 'modal' }} />
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
