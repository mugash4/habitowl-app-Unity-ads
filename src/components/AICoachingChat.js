import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  Dialog,
  Portal,
  Button,
  TextInput,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import FirebaseService from '../services/FirebaseService';
import SecureAIService from '../services/SecureAIService';

/**
 * ✅ NEW: AI Coaching Chat for Habits
 * Provides personalized habit coaching using AI
 */
const AICoachingChat = ({ visible, onDismiss, habit }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (visible) {
      checkPremiumStatus();
      setShowResponse(false);
      setAiResponse(null);
      setMessage('');
    }
  }, [visible]);

  const checkPremiumStatus = async () => {
    try {
      const userStats = await FirebaseService.getUserStats();
      setIsPremium(userStats?.isPremium || false);
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    }
  };

  const handleSendMessage = async () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'AI Coaching is available for Premium subscribers only. Upgrade now to get personalized habit coaching!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Premium', onPress: onDismiss }
        ]
      );
      return;
    }

    if (!message.trim() && !showResponse) {
      Alert.alert('Required', 'Please ask a question or request coaching');
      return;
    }

    try {
      setIsLoading(true);
      setShowResponse(false);

      console.log('📤 Requesting AI coaching...');

      // Build coaching prompt
      const prompt = buildCoachingPrompt(habit, message.trim());

      // Call AI service
      const response = await SecureAIService.callSecureAI(prompt);

      console.log('✅ AI coaching received');

      setAiResponse(response);
      setShowResponse(true);
      setMessage('');

      // Track event
      await FirebaseService.trackEvent('ai_coaching_used', {
        habit_name: habit.name,
        habit_category: habit.category
      }).catch(() => {});

    } catch (error) {
      console.error('❌ Error getting AI coaching:', error);

      if (error.message && error.message.includes('API key')) {
        Alert.alert(
          'AI Coaching Unavailable',
          'AI coaching is being set up. Please try again later or contact support.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to get AI coaching. Please try again later.',
          [{ text: 'OK' }]
        );
      }

      // Show fallback response
      setAiResponse(getFallbackCoaching(habit));
      setShowResponse(true);

    } finally {
      setIsLoading(false);
    }
  };

  const buildCoachingPrompt = (habit, userMessage) => {
    const basePrompt = `You are HabitOwl AI Coach. Provide person