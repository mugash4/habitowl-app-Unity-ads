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

// ✅ FIXED: Layout constants
const TAB_BAR_HEIGHT = 60; // Height for tab icons + labels
const BANNER_AD_HEIGHT = 50; // Standard AdMob banner height

/**
 * ✅ FIXED: Main Tab Navigator with Banner Ad BELOW Tab Bar
 * - Banner ad displays BELOW tab bar (not overlapping)
 * - Tab bar dynamically resizes for admin/premium users
 * - Admin/Premium users see NO ads anywhere
 */
const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const [shouldShowAds, setShouldShowAds] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // ✅ Monitor ad display status
  useEffect(() => {
    console.log('[TabNav] 🎬 Mounting tab navigator');
    
    // Subscribe to AdMob status changes
    const unsubscribe = AdMobService.onStatusChange((status) => {
      console.log('[TabNav] 📢 Status update:', {
        shouldShowAds: status.shouldShowAds,
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        isInitialized: status.isInitialized,
        premiumStatusLoaded: status.premiumStatusLoaded
      });
      
      // Show ads only if ALL conditions are met
      const canShowAds = status.shouldShowAds && 
                        status.isInitialized && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        status.premiumStatusLoaded;
      
      setShouldShowAds(canShowAds);
      setRenderKey(prev => prev + 1); // Force re-render
    });
    
    // Delayed checks for late initialization
    const delays = [500, 1500, 3000];
    const timeouts = delays.map(delay =>
      setTimeout(() => {
        const status = AdMobService.getStatus();
        const canShowAds = status.shouldShowAds && 
                          status.isInitialized && 
                          !status.isPremium && 
                          !status.isAdmin &&
                          status.premiumStatusLoaded;
        
        console.log('[TabNav] ⏰ Delayed check (' + delay + 'ms):', canShowAds);
        setShouldShowAds(canShowAds);
        setRenderKey(prev => prev + 1);
      }, delay)
    );
    
    return () => {
      console.log('[TabNav] 🚪 Unmounting');
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // ✅ Calculate dynamic heights
  const systemNavHeight = insets.bottom || 0;
  const bannerHeight = (shouldShowAds && Platform.OS !== 'web') ? BANNER_AD_HEIGHT : 0;
  const tabBarOnlyHeight = TAB_BAR_HEIGHT + systemNavHeight;
  
  console.log('[TabNav] 📐 Layout calculation:', {
    shouldShowAds,
    tabBarHeight: TAB_BAR_HEIGHT,
    bannerHeight,
    systemNavHeight,
    tabBarOnlyHeight,
  });
  
  return (
    <View style={{ flex: 1 }} key={renderKey}>
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
            bottom: bannerHeight, // ✅ Positioned ABOVE banner ad (or at 0 if no ad)
            left: 0,
            right: 0,
            height: tabBarOnlyHeight, // ✅ Fixed height (doesn't include banner)
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingTop: 8,
            paddingBottom: systemNavHeight, // Space for system navigation
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarItemStyle: {
            height: TAB_BAR_HEIGHT - 8, // Account for paddingTop
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

      {/* ✅ FIXED: Banner ad positioned BELOW tab bar */}
      {/* Shows above system navigation, auto-hides for admin/premium */}
      {shouldShowAds && Platform.OS !== 'web' && (
        <View style={{
          position: 'absolute',
          bottom: systemNavHeight, // ✅ Position above system navigation only
          left: 0,
          right: 0,
          height: BANNER_AD_HEIGHT,
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          zIndex: 999,
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
      console.log('[AppNav] 🚀 Initializing app...');
      
      // Initialize services in background
      AdMobService.initialize().catch(error => {
        console.log('[AppNav] AdMob init error (non-critical):', error.message);
      });
      
      NotificationService.initialize().catch(error => {
        console.log('[AppNav] Notification init error (non-critical):', error.message);
      });
      
      // Listen for auth changes
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        console.log('[AppNav] 🔐 Auth state:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
          console.log('[AppNav] 👤 User logged in, loading premium status...');
          await AdMobService.preloadPremiumStatus();
        }
        
        setIsAuthenticated(!!user);
        setIsInitialized(true);
      });

      return unsubscribe;
    } catch (error) {
      console.error('[AppNav] ❌ Initialization error:', error);
      setIsInitialized(true);
    }
  };

  if (!isInitialized) {
    return null; // Show nothing while initializing
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
                  options={{ headerShown: false, presentation: 'modal' }} 
                />
                <Stack.Screen 
                  name="EditHabit" 
                  component={EditHabitScreen} 
                  options={{ headerShown: false, presentation: 'modal' }} 
                />
                <Stack.Screen 
                  name="Premium" 
                  component={PremiumScreen} 
                  options={{ headerShown: false, presentation: 'modal' }} 
                />
                <Stack.Screen 
                  name="Admin" 
                  component={AdminScreen} 
                  options={{ headerShown: false, presentation: 'modal' }} 
                />
                <Stack.Screen 
                  name="About" 
                  component={AboutScreen} 
                  options={{ headerShown: false, presentation: 'modal' }} 
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
