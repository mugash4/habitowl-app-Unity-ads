import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
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
import AdService from '../services/AdService';
import NotificationService from '../services/NotificationService';
import AdminService from '../services/AdminService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  colors: {
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

const MainTabNavigator = () => {
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
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize services
      await AdService.initialize();
      await NotificationService.initialize();

      // Listen for auth state changes
      const unsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
        setIsAuthenticated(!!user);
        
        // Check admin status
        if (user) {
          const adminStatus = await AdminService.checkAdminStatus(user.email);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
        
        setIsInitialized(true);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsInitialized(true);
    }
  };

  if (!isInitialized) {
    // You could show a splash screen here
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#f8fafc' },
          }}
        >
          {isAuthenticated ? (
            // User is signed in
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
                  headerShown: true,
                  presentation: 'modal',
                  gestureEnabled: true,
                  cardOverlayEnabled: true,
                }}
              />
              <Stack.Screen 
                name="EditHabit" 
                component={EditHabitScreen}
                options={{
                  headerShown: true,
                  presentation: 'modal',
                  gestureEnabled: true,
                  cardOverlayEnabled: true,
                }}
              />
              <Stack.Screen 
                name="Premium" 
                component={PremiumScreen}
                options={{
                  headerShown: true,
                  presentation: 'modal',
                  gestureEnabled: true,
                  cardOverlayEnabled: true,
                }}
              />
              {isAdmin && (
                <Stack.Screen 
                  name="Admin" 
                  component={AdminScreen}
                  options={{
                    headerShown: true,
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardOverlayEnabled: true,
                  }}
                />
              )}
              <Stack.Screen 
                name="About" 
                component={AboutScreen}
                options={{
                  headerShown: true,
                  presentation: 'modal',
                  gestureEnabled: true,
                  cardOverlayEnabled: true,
                }}
              />
            </>
          ) : (
            // User is signed out
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default AppNavigator;