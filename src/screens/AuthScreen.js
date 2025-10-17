import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated
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

import FirebaseService from '../services/FirebaseService';

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
      Alert.alert('Error', 'Please enter your email');
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    if (!isLogin) {
      if (!displayName.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return false;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (isLogin) {
        await FirebaseService.signIn(email.trim(), password);
      } else {
        await FirebaseService.signUp(email.trim(), password, displayName.trim());
      }

      // Navigation is handled by the auth state listener
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      await FirebaseService.signInWithGoogle();
      // Navigation is handled by the auth state listener
    } catch (error) {
      Alert.alert('Google Sign In Error', error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const toggleAuthMode = () => {
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
              <Icon name="owl" size={80} color="#ffffff" />
            </View>
            <Headline style={styles.appName}>HabitOwl</Headline>
            <Paragraph style={styles.tagline}>
              Smart Habit & Routine Builder App
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
                  ? 'Sign in to continue your habit journey'
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
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
                secureTextEntry
                autoComplete={isLogin ? "password" : "new-password"}
              />

              {!isLogin && (
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-check" />}
                  secureTextEntry
                  autoComplete="new-password"
                />
              )}

              <Button
                mode="contained"
                onPress={handleAuth}
                loading={loading}
                disabled={loading || googleLoading}
                style={styles.authButton}
                contentStyle={styles.authButtonContent}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
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
                icon={() => <Icon name="google" size={20} color="#4285f4" />}
              >
                Continue with Google
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
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Features Preview */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <Icon name="target" size={24} color="#e0e7ff" />
              <Text style={styles.featureText}>Track Daily Habits</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="chart-line" size={24} color="#e0e7ff" />
              <Text style={styles.featureText}>View Progress</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="robot" size={24} color="#e0e7ff" />
              <Text style={styles.featureText}>AI Coaching</Text>
            </View>
          </View>
        </Animated.View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 20,
  },
  authCard: {
    borderRadius: 20,
    elevation: 8,
    marginBottom: 30,
  },
  cardContent: {
    padding: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  authButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#4f46e5',
  },
  authButtonContent: {
    paddingVertical: 8,
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
    color: '#6b7280',
    fontSize: 14,
  },
  googleButton: {
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  googleButtonContent: {
    paddingVertical: 8,
  },
  switchAuth: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 20,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    color: '#e0e7ff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AuthScreen;