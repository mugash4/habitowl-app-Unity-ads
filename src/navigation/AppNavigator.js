import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, Portal, MD3LightTheme } from 'react-native-paper';
import { View, Platform, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import AuthScreen from '../screens/AuthScreen';
import ConsentScreen from '../screens/ConsentScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateHabitScreen from '../screens/CreateHabitScreen';
import EditHabitScreen from '../screens/EditHabitScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import AdminScreen from '../screens/AdminScreen';
import AboutScreen from '../screens/AboutScreen';
import DeletionRequestsScreen from '../screens/DeletionRequestsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';

// Components
import ScreenWithAd from '../components/ScreenWithAd';

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
  const { height } = Dimensions.get('window');
  const baseHeight = 60;
  const hasNotch = height > 800;
  const notchPadding = hasNotch ? 20 : 0;
  return baseHeight + notchPadding;
};

// Wrap each tab screen with ad banner
const HomeScreenWithAd = (props) => (
  <ScreenWithAd>
    <HomeScreen {...props} />
  </ScreenWithAd>
);

const StatisticsScreenWithAd = (props) => (
  <ScreenWithAd>
    <StatisticsScreen {...props} />
  </ScreenWithAd>
);

const SettingsScreenWithAd = (props) => (
  <ScreenWithAd>
    <SettingsScreen {...props} />
  </ScreenWithAd>
);

// Main Tab Navigator with proper spacing
const MainTabNavigator = () => {
  const [tabBarHeight] = useState(getTabBarHeight());
  
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
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 8,
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
        component={HomeScreenWithAd}
        options={{
          tabBarLabel: 'Habits',
        }}
      />
      <Tab.Screen 
        name="Statistics" 
        component={StatisticsScreenWithAd}
        options={{
          tabBarLabel: 'Stats',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreenWithAd}
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
                  name="DeletionRequests" 
                  component={DeletionRequestsScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardOverlayEnabled: true,
                  }}
                />
                <Stack.Screen 
                  name="UserManagement" 
                  component={UserManagementScreen}
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
              <>
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="Consent" component={ConsentScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </Portal.Host>
    </PaperProvider>
  );
};

export default AppNavigator;
