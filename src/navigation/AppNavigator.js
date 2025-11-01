import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, Portal, MD3LightTheme } from 'react-native-paper';
import { View, Platform, Dimensions } from 'react-native';
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

// ✅ FIX: Calculate proper tab bar height based on banner ad presence
const getTabBarHeight = () => {
  const baseHeight = 60;
  const bannerHeight = Platform.OS === 'android' ? 50 : 50; // Standard banner ad height
  const hasNotch = Dimensions.get('window').height > 800; // Simple notch detection
  const notchPadding = hasNotch ? 20 : 0;
  
  // Add extra padding if ads might show
  return baseHeight + notchPadding;
};

const MainTabNavigator = () => {
  const [tabBarHeight, setTabBarHeight] = useState(getTabBarHeight());
  
  return (
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
          position: 'absolute', // ✅ FIX: Make tab bar float above content
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8, // ✅ FIX: Better iOS safe area handling
          paddingTop: 8,
          elevation: 8, // ✅ FIX: Add shadow to ensure visibility
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
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
      // Initialize services
      await Promise.allSettled([
        AdMobService.initialize(),
        NotificationService.initialize()
      ]);

      // Listen for auth state changes
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        setIsAuthenticated(!!user);
        setIsInitialized(true);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error initializing app:', error);
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
