import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Headline,
  Paragraph,
  HelperText
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import FirebaseService from '../services/FirebaseService';

const { height } = Dimensions.get('window');

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '387609126713-1vpqhjkaha1ku86srq7lla63vqbpj98j.apps.googleusercontent.com', // From Firebase
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Check if user is already signed in
    const unsubscribe = FirebaseService.onAuthStateChanged((user) => {
      if (user) {
        console.log('User already signed in, navigating to Main...');
        navigation.replace('Main');
      }
    });

    return unsubscribe;
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!password) {
      Alert.alert('Validation Error', 'Please enter your password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    if (!isLogin) {
      if (!displayName.trim()) {
        Alert.alert('Validation Error', 'Please enter your name');
        return false;
      }

      if (password !== confirmPassword) {
        Alert.alert('Validation Error', 'Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleAuth = async () => {
    console.log('=== Auth Button Pressed ===');
    console.log('Is Login:', isLogin);
    console.log('Email:', email);
    console.log('Password length:', password.length);

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading state set to true');

      if (isLogin) {
        console.log('Attempting sign in...');
        const user = await FirebaseService.signIn(email.trim(), password);
        console.log('Sign in successful:', user.uid);
        Alert.alert('Success', 'Welcome back!');
      } else {
        console.log('Attempting sign up...');
        const user = await FirebaseService.signUp(email.trim(), password, displayName.trim());
        console.log('Sign up successful:', user.uid);
        Alert.alert('Success', 'Account created successfully!');
      }

      // Navigation is handled by the auth state listener
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert(
        isLogin ? 'Sign In Error' : 'Sign Up Error', 
        error.message || 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
      console.log('Loading state set to false');
    }
  };

  const handleGoogleAuth = async () => {
    console.log('=== Google Auth Button Pressed ===');
    
    try {
      setGoogleLoading(true);
      console.log('Google loading state set to true');
      
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In successful:', userInfo);
      
      // Get the ID token
      const idToken = userInfo.idToken;
      
      if (!idToken) {
        throw new Error('Failed to get ID token from Google');
      }
      
      // Sign in to Firebase with the Google credential
      await FirebaseService.signInWithGoogleCredential(idToken);
      console.log('Firebase authentication successful!');
      
      Alert.alert('Success', 'Signed in with Google successfully!');
      
    } catch (error) {
      console.error('Google auth error:', error);
      
      // Handle specific error cases
      if (error.code === 'SIGN_IN_CANCELLED') {
        Alert.alert('Cancelled', 'Google sign-in was cancelled');
      } else if (error.code === 'IN_PROGRESS') {
        Alert.alert('In Progress', 'Sign-in is already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services not available or outdated');
      } else {
        Alert.alert(
          'Google Sign In Error', 
          error.message || 'Failed to sign in with Google. Please try again.'
        );
      }
    } finally {
      setGoogleLoading(false);
      console.log('Google loading state set to false');
    }
  };

  const toggleAuthMode = () => {
    console.log('Toggling auth mode');
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  return (
    <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* App Branding */}
            <View style={styles.branding}>
              <View style={styles.logoContainer}>
                <Icon name="owl" size={70} color="#ffffff" />
              </View>
              <Headline style={styles.appName}>HabitOwl</Headline>
              <Paragraph style={styles.tagline}>
                Smart Habit & Routine Builder
              </Paragraph>
            </View>

            {/* Auth Form */}
            <Card style={styles.authCard}>
              <Card.Content style={styles.cardContent}>
                <Text style={styles.authTitle}>
                  {isLogin ? 'Welcome Back!' : 'Create Account'}
                </Text>
                <Text style={styles.authSubtitle}>
                  {isLogin 
                    ? 'Sign in to continue your journey'
                    : 'Start building better habits today'
                  }
                </Text>

                {!isLogin && (
                  <TextInput
                    label="Full Name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Icon icon="account" />}
                    autoCapitalize="words"
                    autoComplete="name"
                    disabled={loading || googleLoading}
                  />
                )}

                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="email" />}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  disabled={loading || googleLoading}
                  error={email.length > 0 && !validateEmail(email)}
                />
                {email.length > 0 && !validateEmail(email) && (
                  <HelperText type="error" visible={true}>
                    Please enter a valid email address
                  </HelperText>
                )}

                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  secureTextEntry
                  autoComplete={isLogin ? "password" : "new-password"}
                  disabled={loading || googleLoading}
                  error={password.length > 0 && password.length < 6}
                />
                {password.length > 0 && password.length < 6 && (
                  <HelperText type="error" visible={true}>
                    Password must be at least 6 characters
                  </HelperText>
                )}

                {!isLogin && (
                  <>
                    <TextInput
                      label="Confirm Password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      mode="outlined"
                      style={styles.input}
                      left={<TextInput.Icon icon="lock-check" />}
                      secureTextEntry
                      autoComplete="new-password"
                      disabled={loading || googleLoading}
                      error={confirmPassword.length > 0 && password !== confirmPassword}
                    />
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <HelperText type="error" visible={true}>
                        Passwords do not match
                      </HelperText>
                    )}
                  </>
                )}

                <Button
                  mode="contained"
                  onPress={handleAuth}
                  loading={loading}
                  disabled={loading || googleLoading}
                  style={styles.authButton}
                  contentStyle={styles.authButtonContent}
                  labelStyle={styles.authButtonLabel}
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Button>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Sign In Button */}
                <Button
                  mode="outlined"
                  onPress={handleGoogleAuth}
                  loading={googleLoading}
                  disabled={loading || googleLoading}
                  style={styles.googleButton}
                  contentStyle={styles.googleButtonContent}
                  labelStyle={styles.googleButtonLabel}
                  icon={() => <Icon name="google" size={20} color="#4285f4" />}
                >
                  {googleLoading ? 'Connecting...' : 'Continue with Google'}
                </Button>

                <View style={styles.switchAuth}>
                  <Text style={styles.switchAuthText}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                  </Text>
                  <Button
                    mode="text"
                    onPress={toggleAuthMode}
                    disabled={loading || googleLoading}
                    labelStyle={styles.switchAuthButton}
                    compact
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Button>
                </View>
              </Card.Content>
            </Card>

            {/* Features Preview */}
            <View style={styles.features}>
              <View style={styles.feature}>
                <Icon name="target" size={24} color="#ffffff" />
                <Text style={styles.featureText}>Track Habits</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="chart-line" size={24} color="#ffffff" />
                <Text style={styles.featureText}>View Progress</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="robot" size={24} color="#ffffff" />
                <Text style={styles.featureText}>AI Coaching</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authCard: {
    borderRadius: 20,
    elevation: 8,
    marginBottom: 30,
    backgroundColor: '#ffffff',
  },
  cardContent: {
    padding: 24,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  authButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  authButtonContent: {
    paddingVertical: 8,
  },
  authButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    borderColor: '#dadce0',
    borderWidth: 1.5,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  googleButtonContent: {
    paddingVertical: 8,
  },
  googleButtonLabel: {
    color: '#3c4043',
    fontSize: 15,
    fontWeight: '600',
  },
  switchAuth: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  switchAuthText: {
    color: '#6b7280',
    fontSize: 14,
  },
  switchAuthButton: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    color: '#ffffff',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AuthScreen;
