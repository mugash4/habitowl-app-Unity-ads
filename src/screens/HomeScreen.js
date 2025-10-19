import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  StatusBar
} from 'react-native';
import { FAB, Appbar, Button, Card, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HabitCard from '../components/HabitCard';
import UnityBannerAd from '../components/UnityBannerAd';
import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';
import unityAdsService from '../services/UnityAdsService';
import AIService from '../services/AIService';

const HomeScreen = ({ navigation }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCompletions, setTodayCompletions] = useState(new Set());
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      loadHabits();
      loadMotivationalMessage();
    }, [])
  );

  useEffect(() => {
    // Animate in the screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadHabits = async () => {
    try {
      const userHabits = await FirebaseService.getUserHabits();
      setHabits(userHabits);
      
      // Check which habits are completed today
      const today = new Date().toDateString();
      const completedToday = new Set();
      
      userHabits.forEach(habit => {
        if (habit.completions && habit.completions.includes(today)) {
          completedToday.add(habit.id);
        }
      });
      
      setTodayCompletions(completedToday);
    } catch (error) {
      Alert.alert('Error', 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const loadMotivationalMessage = async () => {
    try {
      const timeOfDay = getTimeOfDay();
      const totalHabits = habits.length;
      const completedHabits = todayCompletions.size;
      
      if (totalHabits > 0) {
        const message = await AIService.generateMotivationalMessage(
          { name: 'daily routine', totalHabits, completedHabits },
          Math.max(...habits.map(h => h.currentStreak || 0)),
          timeOfDay
        );
        setMotivationalMessage(message);
      }
    } catch (error) {
      console.error('Error loading motivational message:', error);
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHabits();
    await loadMotivationalMessage();
    setRefreshing(false);
  };

  const handleHabitComplete = async (habit, isNowCompleted) => {
    try {
      // Update local state immediately for smooth UX
      const newCompletions = new Set(todayCompletions);
      if (isNowCompleted) {
        newCompletions.add(habit.id);
        
        // Show celebration for streak milestones
        const newStreak = (habit.currentStreak || 0) + 1;
        if ([3, 7, 14, 30, 60, 100].includes(newStreak)) {
          await NotificationService.scheduleStreakCelebration(habit, newStreak);
        }
        
        // Show interstitial ad occasionally after habit completion
        setTimeout(async () => {
          try {
            await unityAdsService.showInterstitialAd('habit_completion');
          } catch (error) {
            console.log('Ad not shown:', error);
          }
        }, 1000);
      } else {
        newCompletions.delete(habit.id);
      }
      
      setTodayCompletions(newCompletions);
      
      // Reload habits to get updated streaks
      await loadHabits();
      
    } catch (error) {
      Alert.alert('Error', error.message);
      // Reload habits to ensure consistency
      await loadHabits();
    }
  };

  const handleCreateHabit = async () => {
    navigation.navigate('CreateHabit');
  };

  const handleEditHabit = (habit) => {
    navigation.navigate('EditHabit', { habit });
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await FirebaseService.deleteHabit(habitId);
      await loadHabits();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete habit');
    }
  };

  const getCompletionRate = () => {
    if (habits.length === 0) return 0;
    return Math.round((todayCompletions.size / habits.length) * 100);
  };

  const getStreakStats = () => {
    if (habits.length === 0) return { current: 0, best: 0 };
    
    const currentStreaks = habits.map(h => h.currentStreak || 0);
    const longestStreaks = habits.map(h => h.longestStreak || 0);
    
    return {
      current: Math.max(...currentStreaks),
      best: Math.max(...longestStreaks)
    };
  };

  const renderHeader = () => {
    const completionRate = getCompletionRate();
    const streakStats = getStreakStats();
    const user = FirebaseService.currentUser;
    const displayName = user?.displayName || 'there';
    
    return (
      <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.header}>
        <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
        
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>
              Good {getTimeOfDay()}, {displayName}! 
            </Text>
          </View>
          
          {motivationalMessage && (
            <View style={styles.messageContainer}>
              <Text style={styles.motivationalMessage}>
                {motivationalMessage}
              </Text>
            </View>
          )}
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completionRate}%</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streakStats.current}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streakStats.best}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{habits.length}</Text>
              <Text style={styles.statLabel}>Total Habits</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="target" size={80} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No habits yet!</Text>
      <Text style={styles.emptySubtitle}>
        Create your first habit and start building a better you
      </Text>
      {/* Removed duplicate button - only FAB button remains */}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="loading" size={40} color="#4f46e5" />
        <Text style={styles.loadingText}>Loading your habits...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Progress */}
        {habits.length > 0 && (
          <Card style={styles.progressCard}>
            <Card.Content>
              <Text style={styles.progressTitle}>Today's Progress</Text>
              <Text style={styles.progressSubtitle}>
                {todayCompletions.size} of {habits.length} habits completed
              </Text>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${getCompletionRate()}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressPercentage}>
                  {getCompletionRate()}%
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Habits List */}
        {habits.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.sectionTitle}>Your Habits</Text>
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={todayCompletions.has(habit.id)}
                onComplete={handleHabitComplete}
                onEdit={handleEditHabit}
                onDelete={handleDeleteHabit}
              />
            ))}
          </>
        )}

        {/* Unity Banner Ad */}
        <UnityBannerAd style={styles.adBanner} />
        
        {/* Bottom padding for FAB */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Only ONE FAB button */}
      <FAB
        style={styles.fab}
        icon="plus"
        color="#ffffff"
        onPress={handleCreateHabit}
        label={habits.length === 0 ? "Add Habit" : undefined}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 24,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  greetingContainer: {
    marginBottom: 8,
    minHeight: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  messageContainer: {
    marginBottom: 20,
    minHeight: 24,
  },
  motivationalMessage: {
    fontSize: 16,
    color: '#e0e7ff',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#c7d2fe',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  progressCard: {
    margin: 16,
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressPercentage: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  adBanner: {
    marginTop: 20,
    marginBottom: 10,
  },
  bottomPadding: {
    height: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4f46e5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});

export default HomeScreen;
