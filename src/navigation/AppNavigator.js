/**
 * HabitOwl App Navigator
 * ✅ UPDATED: Added Consent Screen Flow
 */

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
import ConsentScreen from '../components/ConsentScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateHabitScreen from '../screens/CreateHabitScreen';
import EditHabitScreen from '../screens/EditHabitScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import AdminScreen from '../screens/AdminScreen';
import AboutScreen from '../screens/AboutScreen';
import SuspendUserScreen from '../screens/SuspendUserScreen';
import UserAnalyticsScreen from '../screens/UserAnalyticsScreen';


// Components
import AdMobBanner from '../components/AdMobBanner';

// Services
import FirebaseService from '../services/FirebaseService';
import AdMobService from '../services/AdMobService';
import NotificationService from '../services/NotificationService';
import PrivacyComplianceService from '../services/PrivacyComplianceService';

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

const TAB_ICONS_HEIGHT = 60;
const BANNER_AD_HEIGHT = 50;

/**
 * FREE USER TAB BAR - WITH BANNER AD
 */
const FreeUserTabBar = ({ state, descriptors, navigation, insets }) => {
  const systemNavHeight = insets.bottom || 0;
  const totalHeight = TAB_ICONS_HEIGHT + BANNER_AD_HEIGHT + systemNavHeight;

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
      {/* Tab Icons */}
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

      {/* Banner Ad Container */}
      <View style={{
        height: BANNER_AD_HEIGHT,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
      }}>
        <AdMobBanner />
      </View>

      {/* System Navigation Spacer */}
      {systemNavHeight > 0 && (
        <View style={{ height: systemNavHeight, backgroundColor: '#ffffff' }} />
      )}
    </View>
  );
};

/**
 * PREMIUM USER TAB BAR - NO BANNER AD
 */
const PremiumUserTabBar = ({ state, descriptors, navigation, insets }) => {
  const systemNavHeight = insets.bottom || 0;
  const totalHeight = TAB_ICONS_HEIGHT + systemNavHeight;

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

      {systemNavHeight > 0 && (
        <View style={{ height: systemNavHeight, backgroundColor: '#ffffff' }} />
      )}
    </View>
  );
};

/**
 * Main Tab Navigator
 */
const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const [userType, setUserType] = useState('loading');

  useEffect(() => {
    let isMounted = true;

    const determineUserType = async () => {
      try {
        const currentUser = FirebaseService.currentUser;
        if (!currentUser) {
          if (isMounted) setUserType('free');
          return;
        }

        if (currentUser.email) {
          const AdminService = require('../services/AdminService').default;
          const isAdmin = await AdminService.checkAdminStatus(currentUser.email);
          
          if (isAdmin && isMounted) {
            console.log('[MainTab] 👑 User is ADMIN');
            setUserType('admin');
            await AdMobService.setPremiumStatus(false, true);
            return;
          }
        }

        const userStats = await FirebaseService.getUserStats();
        if (userStats && userStats.isPremium && isMounted) {
          console.log('[MainTab] 👑 User is PREMIUM');
          setUserType('premium');
          await AdMobService.setPremiumStatus(true, false);
          return;
        }

        if (isMounted) {
          console.log('[MainTab] 💰 User is FREE');
          setUserType('free');
          await AdMobService.setPremiumStatus(false, false);
        }
      } catch (error) {
        console.error('[MainTab] Error:', error);
        if (isMounted) {
          setUserType('free');
          await AdMobService.setPremiumStatus(false, false);
        }
      }
    };

    determineUserType();

    const unsubscribe = AdMobService.onPremiumStatusChange(() => {
      if (isMounted) {
        determineUserType();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (userType === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Icon name="loading" size={40} color="#4f46e5" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>Loading...</Text>
      </View>
    );
  }

  const getTabBar = (props) => {
    if (userType === 'admin' || userType === 'premium') {
      return <PremiumUserTabBar {...props} insets={insets} />;
    } else {
      return <FreeUserTabBar {...props} insets={insets} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={getTabBar}
        screenOptions={{ headerShown: false }}
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
 * Main App Navigator
 * ✅ UPDATED: Added Consent Screen Flow
 */
const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[AppNav] 🚀 Initializing app...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[AppNav] ✅ AdMob ready');
      
      NotificationService.initialize().catch(error => {
        console.log('[AppNav] Notification init warning:', error.message);
      });
      
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        console.log('[AppNav] 🔐 Auth state:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
          console.log('[AppNav] 👤 User logged in:', user.email);
          
          // ✅ NEW: Check if user has given consent
          const hasConsent = await PrivacyComplianceService.hasUserGivenConsent(user.uid);
          console.log('[AppNav] Consent status:', hasConsent);
          
          setNeedsConsent(!hasConsent);
        } else {
          console.log('[AppNav] 👤 User logged out');
          await AdMobService.setPremiumStatus(false, false);
          setNeedsConsent(false);
        }
        
        setIsAuthenticated(!!user);
        if (!isInitialized) {
          setIsInitialized(true);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('[AppNav] ❌ Init error:', error);
      setIsInitialized(true);
    }
  };

  const handleConsentGiven = () => {
    console.log('[AppNav] ✅ Consent given');
    setNeedsConsent(false);
  };

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
            {!isAuthenticated ? (
              <Stack.Screen name="Auth" component={AuthScreen} />
            ) : needsConsent ? (
              <Stack.Screen name="Consent">
                {(props) => (
                  <ConsentScreen 
                    {...props} 
                    onConsentGiven={handleConsentGiven}
                    userEmail={FirebaseService.currentUser?.email}
                  />
                )}
              </Stack.Screen>
            ) : (
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
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </Portal.Host>
    </PaperProvider>
  );
};

export default AppNavigator;
