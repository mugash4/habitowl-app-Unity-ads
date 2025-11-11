import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, Portal, MD3LightTheme } from 'react-native-paper';
import { View, Platform, Text } from 'react-native';
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

// ✅ Layout constants
const TAB_ICONS_HEIGHT = 60;
const BANNER_AD_HEIGHT = 50;

/**
 * ✅ COMPLETELY FIXED: Custom Tab Bar with proper banner display and auto-hide
 */
const CustomTabBar = ({ state, descriptors, navigation, insets, shouldShowAds }) => {
  const systemNavHeight = insets.bottom || 0;
  
  // ✅ FIX: Banner height is ALWAYS allocated when shouldShowAds is true
  // This ensures the space is reserved immediately
  const bannerHeight = (shouldShowAds && Platform.OS !== 'web') ? BANNER_AD_HEIGHT : 0;
  const totalHeight = TAB_ICONS_HEIGHT + bannerHeight + systemNavHeight;

  console.log('[CustomTabBar] Rendering - shouldShowAds:', shouldShowAds, 'bannerHeight:', bannerHeight, 'totalHeight:', totalHeight);

  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: totalHeight,
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      flexDirection: 'column',
    }}>
      {/* Tab Icons Row */}
      <View style={{
        height: TAB_ICONS_HEIGHT,
        flexDirection: 'row',
        paddingTop: 8,
        paddingBottom: 4,
        backgroundColor: '#ffffff',
      }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          let iconName;
          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'Statistics') {
            iconName = isFocused ? 'chart-line' : 'chart-line';
          } else if (route.name === 'Settings') {
            iconName = isFocused ? 'cog' : 'cog-outline';
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View
              key={route.key}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onTouchEnd={onPress}
            >
              <Icon
                name={iconName}
                size={24}
                color={isFocused ? '#4f46e5' : '#6b7280'}
              />
              <View style={{ height: 4 }} />
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: isFocused ? '#4f46e5' : '#6b7280',
              }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ✅ FIXED: Banner Ad Container - Space is ALWAYS allocated when shouldShowAds is true */}
      {shouldShowAds && Platform.OS !== 'web' && (
        <View style={{
          height: BANNER_AD_HEIGHT,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        }}>
          {/* ✅ The AdMobBanner component will render the actual ad when ready */}
          <AdMobBanner />
        </View>
      )}

      {/* System Navigation Spacer */}
      {systemNavHeight > 0 && (
        <View style={{ height: systemNavHeight, backgroundColor: '#ffffff' }} />
      )}
    </View>
  );
};

/**
 * ✅ FIXED: Main Tab Navigator with immediate rendering
 */
const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const [shouldShowAds, setShouldShowAds] = useState(false);
  const [isReady, setIsReady] = useState(true); // ✅ FIXED: Start ready immediately

  useEffect(() => {
    console.log('[MainTab] Initializing...');
    
    // ✅ IMMEDIATE: Check initial status
    const initialCheck = () => {
      const status = AdMobService.getStatus();
      const canShowAds = status.shouldShowAds && 
                        status.isInitialized && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        status.premiumStatusLoaded;
      
      console.log('[MainTab] Initial check - canShowAds:', canShowAds);
      setShouldShowAds(canShowAds);
    };
    
    initialCheck();
    
    // ✅ Subscribe to AdMob status changes
    const unsubscribe = AdMobService.onStatusChange((status) => {
      const canShowAds = status.shouldShowAds && 
                        status.isInitialized && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        status.premiumStatusLoaded;
      
      console.log('[MainTab] Status update - canShowAds:', canShowAds);
      setShouldShowAds(canShowAds);
    });
    
    // ✅ Delayed checks (non-blocking)
    const delays = [300, 800, 1500, 2500];
    const timeouts = delays.map(delay => 
      setTimeout(() => {
        const status = AdMobService.getStatus();
        const canShowAds = status.shouldShowAds && 
                          status.isInitialized && 
                          !status.isPremium && 
                          !status.isAdmin &&
                          status.premiumStatusLoaded;
        console.log(`[MainTab] Delayed check (${delay}ms) - canShowAds:`, canShowAds);
        setShouldShowAds(canShowAds);
      }, delay)
    );
    
    return () => {
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // ✅ Render immediately - no loading screen
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => (
          <CustomTabBar {...props} insets={insets} shouldShowAds={shouldShowAds} />
        )}
        screenOptions={{
          headerShown: false,
        }}
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
    </View>
  );
};

/**
 * ✅ FIXED: Main App Navigator - Non-blocking initialization
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
      
      // ✅ FIX: Initialize services in background (non-blocking)
      AdMobService.initialize().catch(error => {
        console.log('[AppNav] AdMob init error (non-critical):', error.message);
      });
      
      NotificationService.initialize().catch(error => {
        console.log('[AppNav] Notification init error (non-critical):', error.message);
      });
      
      // ✅ Set initialized immediately after setting up auth listener
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        console.log('[AppNav] 🔐 Auth state:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
          console.log('[AppNav] 👤 User logged in, loading premium status...');
          // Load premium status in background (non-blocking)
          AdMobService.preloadPremiumStatus().catch(error => {
            console.log('[AppNav] Premium status load error (non-critical):', error);
          });
        }
        
        setIsAuthenticated(!!user);
        // ✅ Set initialized immediately
        if (!isInitialized) {
          setIsInitialized(true);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('[AppNav] ❌ Initialization error:', error);
      // ✅ Set initialized even on error
      setIsInitialized(true);
    }
  };

  // ✅ Show loading only briefly
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Icon name="loading" size={40} color="#4f46e5" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>Initializing...</Text>
      </View>
    );
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
