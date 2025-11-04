import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { FAB, Appbar, Button, Card, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HabitCard from '../components/HabitCard';
import AdMobBanner from '../components/AdMobBanner';
import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';
import adMobService from '../services/AdMobService';
import AIService from '../services/AIService';

const HomeScreen = ({ navigation, route }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCompletions, setTodayCompletions] = useState(new Set());
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [screenKey, setScreenKey] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 HomeScreen FOCUSED - Reloading habits...');
      
      let isActive = true;
      
      const reloadData = async () => {
        try {
          await loadHabits(true, isActive);
          
          if (isActive) {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
          }
        } catch (error) {
          console.error('Error reloading habits:', error);
        }
      };
      
      reloadData();
      
      return () => {
        console.log('👋 HomeScreen BLURRED - Cleaning up');
        isActive = false;
        fadeAnim.setValue(0);
      };
    }, [screenKey])
  );

  const loadHabits = async (forceReload = false, isActive = true) => {
    try {
      if (forceReload) {
        setLoading(true);
      }
    
      console.log('📱 Fetching habits from Firebase...');
    
      await new Promise(resolve => setTimeout(resolve, 300));
      const userHabits = await FirebaseService.getUserHabits(true);
    
       const userStats = await FirebaseService.getUserStats();
      let premiumStatus = userStats?.isPremium || false;
      let adminStatus = false;
  
      if (!premiumStatus) {
        const user = FirebaseService.currentUser;
        if (user && user.email) {
          const AdminService = require('../services/AdminService').default;
          const isAdmin = await AdminService.checkAdminStatus(user.email);
          if (isAdmin) {
            console.log('✅ Admin detected, granting premium access');
            adminStatus = true;
            premiumStatus = true;
            await FirebaseService.updateUserPremiumStatus(true);
            // ✅ FIX: Update AdMob service with admin status
            await adMobService.setPremiumStatus(true, true);
          } else {
            // ✅ FIX: Update AdMob service for regular users
            await adMobService.setPremiumStatus(premiumStatus, false);
          }
        }
      } else {
        // ✅ FIX: Update AdMob service for premium users
        await adMobService.setPremiumStatus(premiumStatus, false);
      }

    
      if (!isActive) {
        console.log('⚠️ Component unmounted, skipping state update');
        return;
      }
    
      console.log(`✅ Loaded ${userHabits ? userHabits.length : 0} habits`);
      console.log(`Premium status: ${premiumStatus}`);
    
      if (userHabits && Array.isArray(userHabits)) {
        console.log('📝 Setting habits:', userHabits.map(h => h.name).join(', '));
      
        setHabits(userHabits);
        setIsPremium(premiumStatus);
      
        const today = new Date().toDateString();
        const completedToday = new Set();
      
        userHabits.forEach(habit => {
          if (habit.completions && habit.completions.includes(today)) {
            completedToday.add(habit.id);
          }
        });
      
        setTodayCompletions(completedToday);
      
        if (userHabits.length > 0) {
          loadMotivationalMessage(userHabits, completedToday);
        } else {
          setMotivationalMessage('');
        }
      } else {
        console.log('⚠️ No habits found, setting empty array');
        setHabits([]);
        setTodayCompletions(new Set());
        setMotivationalMessage('');
        setIsPremium(premiumStatus);
      }
    
    } catch (error) {
      console.error('❌ Error loading habits:', error);
    
      if (isActive) {
        setHabits([]);
        setTodayCompletions(new Set());
        setMotivationalMessage('');
      
        if (error.message && error.message.includes('network')) {
          Alert.alert(
            'Connection Issue',
            'Please check your internet connection and try again.',
            [
              { text: 'Retry', onPress: () => loadHabits(true) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      }
    } finally {
      if (isActive) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const loadMotivationalMessage = async (userHabits, completedToday) => {
    try {
      const timeOfDay = getTimeOfDay();
      const totalHabits = userHabits.length;
      const completedHabits = completedToday.size;
      
      const message = await AIService.generateMotivationalMessage(
        { name: 'daily routine', totalHabits, completedHabits },
        Math.max(...userHabits.map(h => h.currentStreak || 0)),
        timeOfDay
      );
      setMotivationalMessage(message || '');
    } catch (error) {
      console.error('Error loading motivational message:', error);
      setMotivationalMessage('');
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    setScreenKey(prev => prev + 1);
    await loadHabits(true);
  };

  const handleHabitComplete = async (habit, isNowCompleted) => {
    try {
      const newCompletions = new Set(todayCompletions);
      if (isNowCompleted) {
        newCompletions.add(habit.id);
        
        const newStreak = (habit.currentStreak || 0) + 1;
        if ([3, 7, 14, 30, 60, 100].includes(newStreak)) {
          await NotificationService.scheduleStreakCelebration(habit, newStreak);
        }
        
        setTimeout(async () => {
          try {
            await adMobService.showInterstitialAd('habit_completion');
          } catch (error) {
            console.log('Ad not shown:', error);
          }
        }, 1000);
      } else {
        newCompletions.delete(habit.id);
      }
      
      setTodayCompletions(newCompletions);
      
      setScreenKey(prev => prev + 1);
      await loadHabits(true);
      
    } catch (error) {
      Alert.alert('Error', error.message);
      setScreenKey(prev => prev + 1);
      await loadHabits(true);
    }
  };

  const handleCreateHabit = async () => {
    const FREE_HABIT_LIMIT = 5;
    
    if (!isPremium && habits.length >= FREE_HABIT_LIMIT) {
      Alert.alert(
        '🔒 Upgrade to Premium',
        `Free users can create up to ${FREE_HABIT_LIMIT} habits. You currently have ${habits.length} habits.\n\nUpgrade to Premium to create unlimited habits and unlock all features!`,
        [
          {
            text: 'Not Now',
            style: 'cancel'
          },
          {
            text: 'Upgrade to Premium',
            onPress: () => {
              navigation.navigate('Premium');
            }
          }
        ]
      );
      return;
    }
    
    console.log('📝 Navigating to CreateHabit screen');
    navigation.navigate('CreateHabit');
  };

  const handleEditHabit = (habit) => {
    navigation.navigate('EditHabit', { 
      habit,
      onGoBack: () => {
        console.log('🔄 Returned from EditHabit - forcing reload');
        setScreenKey(prev => prev + 1);
      }
    });
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await FirebaseService.deleteHabit(habitId);
      setScreenKey(prev => prev + 1);
      await loadHabits(true);
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
      current: Math.max(...currentStreaks, 0),
      best: Math.max(...longestStreaks, 0)
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
              Good {getTimeOfDay()}, {displayName}! 👋
            </Text>
          </View>
          
          {motivationalMessage ? (
            <View style={styles.messageContainer}>
              <Text style={styles.motivationalMessage}>
                {motivationalMessage}
              </Text>
            </View>
          ) : null}
          
          {!isPremium && (
            <TouchableOpacity 
              style={styles.limitBanner}
              onPress={() => navigation.navigate('Premium')}
              activeOpacity={0.8}
            >
              <Icon name="crown" size={16} color="#f59e0b" />
              <Text style={styles.limitText}>
                {habits.length}/5 habits • Upgrade for unlimited
              </Text>
              <Icon name="chevron-right" size={16} color="#ffffff" />
            </TouchableOpacity>
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
      {!isPremium && (
        <Text style={styles.emptyLimit}>
          Free users can create up to 5 habits
        </Text>
      )}
      <Button
        mode="contained"
        onPress={handleCreateHabit}
        style={styles.emptyButton}
        labelStyle={styles.emptyButtonLabel}
        icon="plus"
      >
        Create Your First Habit
      </Button>
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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} key={screenKey}>
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
            <Text style={styles.sectionTitle}>Your Habits ({habits.length})</Text>
            {habits.map((habit, index) => (
              <HabitCard
                key={`${habit.id}-${index}-${screenKey}`}
                habit={habit}
                isCompleted={todayCompletions.has(habit.id)}
                onComplete={handleHabitComplete}
                onEdit={handleEditHabit}
                onDelete={handleDeleteHabit}
              />
            ))}
          </>
        )}
        
        {/* ✅ FIX: Increased bottom padding to ensure banner is fully visible above tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB button */}
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
    marginBottom: 12,
    minHeight: 24,
  },
  motivationalMessage: {
    fontSize: 16,
    color: '#e0e7ff',
    fontStyle: 'italic',
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  limitText: {
    flex: 1,
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
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
    // ✅ FIX: Increased padding to ensure content is fully visible above tab bar
    paddingBottom: 100, // Increased from 80 to account for tab bar + banner ad
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
    marginBottom: 8,
  },
  emptyLimit: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  emptyButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
  },
  emptyButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  // ✅ FIX: Increased bottom padding
  bottomPadding: {
    height: 120, // Increased from 20 to provide more space
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    // ✅ FIX: Positioned above tab bar
    bottom: 150, // Raised from 0 to sit above tab bar
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
