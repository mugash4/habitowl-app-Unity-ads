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
 * ✅ COMPLETE: AI Coaching Chat for Habits
 * Provides personalized habit coaching using AI
 */
const AICoachingChat = ({ visible, onDismiss, habit }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    if (visible) {
      checkPremiumStatus();
      setShowResponse(false);
      setAiResponse(null);
      setMessage('');
      setConversationHistory([]);
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

      // Add to conversation history
      const newHistory = [
        ...conversationHistory,
        { type: 'user', text: message.trim() },
        { type: 'ai', text: response }
      ];
      setConversationHistory(newHistory);

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
      const fallback = getFallbackCoaching(habit);
      setAiResponse(fallback);
      setShowResponse(true);

    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Build coaching prompt with habit context
   */
  const buildCoachingPrompt = (habit, userMessage) => {
    const basePrompt = `You are HabitOwl AI Coach. Provide personalized, actionable habit coaching.

HABIT DETAILS:
- Name: ${habit.name}
- Category: ${habit.category || 'General'}
- Current Streak: ${habit.streak || 0} days
- Completion Rate: ${calculateCompletionRate(habit)}%
- Total Completions: ${habit.completedDates?.length || 0}

USER QUESTION:
${userMessage || 'Provide general coaching for this habit'}

INSTRUCTIONS:
1. Be encouraging and supportive
2. Provide specific, actionable advice
3. Reference their progress (streak, completion rate)
4. Suggest concrete next steps
5. Keep response under 150 words
6. Be motivational but realistic
7. Focus on building consistency

YOUR COACHING:`;

    return basePrompt;
  };

  /**
   * Calculate habit completion rate
   */
  const calculateCompletionRate = (habit) => {
    if (!habit.completedDates || habit.completedDates.length === 0) {
      return 0;
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const recentCompletions = habit.completedDates.filter(dateStr => {
      const date = new Date(dateStr);
      return date >= thirtyDaysAgo && date <= today;
    });

    return Math.round((recentCompletions.length / 30) * 100);
  };

  /**
   * Get fallback coaching when AI is unavailable
   */
  const getFallbackCoaching = (habit) => {
    const streak = habit.streak || 0;
    const completionRate = calculateCompletionRate(habit);

    if (streak === 0) {
      return `Great job starting "${habit.name}"! 🎯\n\nHere's how to build consistency:\n\n1. Start small - just 5 minutes today\n2. Pick a specific time (e.g., "after breakfast")\n3. Stack it with an existing habit\n4. Track your progress daily\n\nRemember: The first 3 days are the hardest. You've got this! 💪`;
    } else if (streak < 7) {
      return `Awesome ${streak}-day streak on "${habit.name}"! 🔥\n\nYou're building momentum:\n\n1. Keep the same time/place for consistency\n2. Celebrate each completion\n3. Plan ahead for tomorrow\n4. Don't break the chain!\n\nYou're ${7 - streak} days from your first week. Keep going! 🚀`;
    } else if (completionRate >= 80) {
      return `Incredible work on "${habit.name}"! 🌟\n\nYour ${completionRate}% completion rate is outstanding!\n\nNext level strategies:\n\n1. Increase difficulty slightly\n2. Help someone else build this habit\n3. Reflect on your progress weekly\n4. Set a new personal best\n\nYou're crushing it! Keep pushing! 💪`;
    } else {
      return `You're making progress on "${habit.name}"! 📈\n\nCurrent completion rate: ${completionRate}%\n\nBoost your consistency:\n\n1. Remove friction - make it easier to start\n2. Set a specific daily trigger\n3. Prepare the night before\n4. Focus on just showing up\n\nSmall improvements lead to big results! 🎯`;
    }
  };

  /**
   * Handle quick coaching suggestions
   */
  const handleQuickSuggestion = (suggestion) => {
    setMessage(suggestion);
  };

  /**
   * Quick suggestion chips
   */
  const quickSuggestions = [
    'How can I stay consistent?',
    'Tips to improve my streak',
    'Why am I struggling?',
    'How to make this easier?'
  ];

  /**
   * Close dialog and reset
   */
  const handleClose = () => {
    setMessage('');
    setShowResponse(false);
    setAiResponse(null);
    setConversationHistory([]);
    onDismiss();
  };

  /**
   * Start new conversation
   */
  const handleNewConversation = () => {
    setMessage('');
    setShowResponse(false);
    setAiResponse(null);
    setConversationHistory([]);
  };

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={handleClose} 
        style={styles.dialog}
        dismissable={!isLoading}
      >
        {/* Header */}
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Icon name="brain" size={32} color="#ffffff" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Habit Coach</Text>
              <Text style={styles.headerSubtitle}>
                Personalized coaching for "{habit?.name}"
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <Dialog.ScrollArea>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Habit Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Icon name="fire" size={20} color="#ef4444" />
                  <Text style={styles.statValue}>{habit?.streak || 0}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="chart-line" size={20} color="#10b981" />
                  <Text style={styles.statValue}>{calculateCompletionRate(habit)}%</Text>
                  <Text style={styles.statLabel}>Rate</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="check-circle" size={20} color="#3b82f6" />
                  <Text style={styles.statValue}>{habit?.completedDates?.length || 0}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>

              {!showResponse ? (
                // Input Form
                <>
                  <Text style={styles.sectionTitle}>Ask your AI coach:</Text>

                  {/* Quick Suggestions */}
                  <View style={styles.chipsContainer}>
                    {quickSuggestions.map((suggestion, index) => (
                      <Chip
                        key={index}
                        mode="outlined"
                        onPress={() => handleQuickSuggestion(suggestion)}
                        style={styles.chip}
                        textStyle={styles.chipText}
                      >
                        {suggestion}
                      </Chip>
                    ))}
                  </View>

                  {/* Message Input */}
                  <TextInput
                    label="Your question or request"
                    value={message}
                    onChangeText={setMessage}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                    placeholder="e.g., How can I build consistency with this habit?"
                    disabled={isLoading}
                  />

                  <View style={styles.tipContainer}>
                    <Icon name="lightbulb-outline" size={16} color="#f59e0b" />
                    <Text style={styles.tipText}>
                      Get personalized advice based on your habit progress and patterns
                    </Text>
                  </View>
                </>
              ) : (
                // AI Response Display
                <>
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Icon name="robot" size={24} color="#4f46e5" />
                      <Text style={styles.responseTitle}>Your Coach Says:</Text>
                    </View>

                    <View style={styles.responseCard}>
                      <Text style={styles.responseText}>{aiResponse}</Text>
                    </View>

                    {/* Conversation History */}
                    {conversationHistory.length > 2 && (
                      <View style={styles.historyContainer}>
                        <Text style={styles.historyTitle}>Conversation History:</Text>
                        {conversationHistory.slice(0, -2).map((item, index) => (
                          <View key={index} style={styles.historyItem}>
                            <Icon 
                              name={item.type === 'user' ? 'account' : 'robot'} 
                              size={16} 
                              color={item.type === 'user' ? '#3b82f6' : '#8b5cf6'} 
                            />
                            <Text style={styles.historyText}>{item.text}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <Button
                        mode="outlined"
                        onPress={handleNewConversation}
                        icon="message-plus"
                        style={styles.actionButton}
                      >
                        Ask Another Question
                      </Button>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Dialog.ScrollArea>

        {/* Actions */}
        <Dialog.Actions style={styles.actions}>
          {!showResponse ? (
            <>
              <Button onPress={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onPress={handleSendMessage}
                loading={isLoading}
                disabled={isLoading || !message.trim()}
                mode="contained"
                buttonColor="#4f46e5"
              >
                {isLoading ? 'Getting Advice...' : 'Get Coaching'}
              </Button>
            </>
          ) : (
            <>
              <Button onPress={handleNewConversation}>
                New Question
              </Button>
              <Button onPress={handleClose} mode="contained" buttonColor="#4f46e5">
                Done
              </Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '95%',
    borderRadius: 16,
  },
  header: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
  },
  textArea: {
    marginBottom: 16,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  responseContainer: {
    paddingBottom: 16,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  responseCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
    marginBottom: 16,
  },
  responseText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  historyContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

export default AICoachingChat;