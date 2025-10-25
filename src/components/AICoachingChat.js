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
 * ✅ FIXED: AI Coaching Chat for Habits
 * Now works for both Premium users AND Admins
 */
const AICoachingChat = ({ visible, onDismiss, habit }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    if (visible) {
      checkAccessStatus();
      setShowResponse(false);
      setAiResponse(null);
      setMessage('');
      setConversationHistory([]);
    }
  }, [visible]);

  const checkAccessStatus = async () => {
    try {
      console.log('🔍 AICoachingChat: Checking user access status...');
      
      // Check premium status
      const userStats = await FirebaseService.getUserStats();
      const premiumStatus = userStats?.isPremium || false;
      setIsPremium(premiumStatus);
      console.log('Premium status:', premiumStatus);
      
      // Check admin status
      const user = FirebaseService.currentUser;
      if (user && user.email) {
        const AdminService = require('../services/AdminService').default;
        const adminStatus = await AdminService.checkAdminStatus(user.email);
        setIsAdmin(adminStatus);
        console.log('Admin status:', adminStatus);
        
        // Grant premium access to admins
        if (adminStatus && !premiumStatus) {
          console.log('✅ Admin detected, granting AI access');
          setIsPremium(true);
        }
      }
    } catch (error) {
      console.error('Error checking access status:', error);
      setIsPremium(false);
      setIsAdmin(false);
    }
  };

  const handleSendMessage = async () => {
    // Check access (premium OR admin)
    const hasAccess = isPremium || isAdmin;
    
    if (!hasAccess) {
      Alert.alert(
        '🔒 Premium Feature',
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
      console.log('User is admin:', isAdmin);
      console.log('User is premium:', isPremium);

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
        habit_category: habit.category,
        is_admin: isAdmin
      }).catch(() => {});

    } catch (error) {
      console.error('❌ Error getting AI coaching:', error);

      // Enhanced error handling with better messages
      if (error.message && error.message.includes('API key')) {
        Alert.alert(
          '⚙️ Setup Required',
          'AI Coaching needs to be configured.\n\nPlease:\n1. Go to Admin Settings\n2. Add your DeepSeek API key\n3. Save and try again\n\nGet your free API key at: https://platform.deepseek.com',
          [{ text: 'Got It' }]
        );
      } else if (error.message && error.message.includes('not configured')) {
        Alert.alert(
          '⚙️ Setup Required',
          error.message,
          [{ text: 'Got It' }]
        );
      } else {
        Alert.alert(
          'Connection Error',
          'Failed to get AI coaching. Please check your internet connection and try again.',
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
    const completionRate = calculateCompletionRate(habit);
    
    const basePrompt = `You are HabitOwl AI Coach. Provide personalized, actionable habit coaching.

HABIT DETAILS:
- Name: ${habit.name}
- Category: ${habit.category || 'General'}
- Current Streak: ${habit.currentStreak || 0} days
- Longest Streak: ${habit.longestStreak || 0} days
- Completion Rate: ${completionRate}%
- Total Completions: ${habit.totalCompletions || 0}

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
   * Calculate habit completion rate (last 30 days)
   */
  const calculateCompletionRate = (habit) => {
    if (!habit.completions || habit.completions.length === 0) {
      return 0;
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const recentCompletions = habit.completions.filter(dateStr => {
      const date = new Date(dateStr);
      return date >= thirtyDaysAgo && date <= today;
    });

    return Math.round((recentCompletions.length / 30) * 100);
  };

  /**
   * Get fallback coaching when AI is unavailable
   */
  const getFallbackCoaching = (habit) => {
    const streak = habit.currentStreak || 0;
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
    // Keep conversation history for context
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
              {isAdmin && (
                <Text style={styles.adminBadge}>👑 Admin Access</Text>
              )}
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
                  <Text style={styles.statValue}>{habit?.currentStreak || 0}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="chart-line" size={20} color="#10b981" />
                  <Text style={styles.statValue}>{calculateCompletionRate(habit)}%</Text>
                  <Text style={styles.statLabel}>Rate</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="check-circle" size={20} color="#3b82f6" />
                  <Text style={styles.statValue}>{habit?.totalCompletions || 0}</Text>
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
  adminBadge: {
    fontSize: 12,
    color: '#fbbf24',
    marginTop: 4,
    fontWeight: '600',
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
