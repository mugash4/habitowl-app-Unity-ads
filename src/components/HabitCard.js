import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert
} from 'react-native';
import { Card, Button, Chip, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import FirebaseService from '../services/FirebaseService';

const HabitCard = ({ 
  habit, 
  onComplete, 
  onEdit, 
  onDelete, 
  isCompleted,
  showActions = true 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  
  const handleComplete = async () => {
    if (isLoading) return;
    
    // ✅ FIXED: Validate habit object before proceeding
    if (!habit || !habit.id) {
      console.error('Invalid habit object:', habit);
      Alert.alert('Error', 'Invalid habit data. Please refresh and try again.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      if (isCompleted) {
        await FirebaseService.uncompleteHabit(habit.id);
      } else {
        await FirebaseService.completeHabit(habit.id);
      }
      
      // ✅ FIXED: Safely pass habit object to callback
      if (onComplete && typeof onComplete === 'function') {
        onComplete(habit, !isCompleted);
      }
    } catch (error) {
      console.error('Error completing habit:', error);
      Alert.alert('Error', error.message || 'Failed to update habit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete && onDelete(habit.id)
        }
      ]
    );
  };

  const getStreakColor = (streak) => {
    if (streak >= 30) return '#f59e0b'; // Gold
    if (streak >= 14) return '#8b5cf6'; // Purple
    if (streak >= 7) return '#06b6d4';  // Cyan
    if (streak >= 3) return '#10b981';  // Green
    return '#6b7280'; // Gray
  };

  const getCategoryIcon = (category) => {
    const icons = {
      health: 'heart',
      fitness: 'dumbbell',
      productivity: 'briefcase',
      learning: 'book',
      wellness: 'leaf',
      creativity: 'palette',
      social: 'account-group',
      finance: 'currency-usd',
      default: 'target'
    };
    return icons[category] || icons.default;
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      1: '#10b981', // Easy - Green
      2: '#06b6d4', // Medium - Cyan
      3: '#f59e0b', // Hard - Orange
      4: '#ef4444', // Very Hard - Red
      5: '#8b5cf6'  // Extreme - Purple
    };
    return colors[difficulty] || colors[1];
  };

  const getProgressPercentage = () => {
    if (!habit.completions) return 0;
    const last7Days = 7;
    const completionsLast7Days = habit.completions.filter(date => {
      const completionDate = new Date(date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return completionDate >= sevenDaysAgo;
    }).length;
    return (completionsLast7Days / last7Days) * 100;
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Card style={[styles.card, isCompleted && styles.completedCard]}>
        <LinearGradient
          colors={isCompleted ? ['#10b981', '#059669'] : ['#ffffff', '#f9fafb']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <Icon 
                  name={getCategoryIcon(habit.category)} 
                  size={24} 
                  color={isCompleted ? '#ffffff' : '#4f46e5'} 
                />
                <Text style={[styles.title, isCompleted && styles.completedText]}>
                  {habit.name}
                </Text>
              </View>
              
              {habit.description && (
                <Text style={[styles.description, isCompleted && styles.completedText]}>
                  {habit.description}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.completeButton, isCompleted && styles.completedButton]}
              onPress={handleComplete}
              disabled={isLoading}
            >
              <Icon 
                name={isCompleted ? 'check-circle' : 'circle-outline'} 
                size={32} 
                color={isCompleted ? '#ffffff' : '#4f46e5'} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Icon name="fire" size={16} color={getStreakColor(habit?.currentStreak || 0)} />
              <Text style={[styles.statText, isCompleted && styles.completedText]}>
                {habit?.currentStreak || 0} day streak
              </Text>
            </View>

            <View style={styles.stat}>
              <Icon name="trophy" size={16} color={getStreakColor(habit?.longestStreak || 0)} />
              <Text style={[styles.statText, isCompleted && styles.completedText]}>
                Best: {habit?.longestStreak || 0}
              </Text>
            </View>

            <View style={styles.stat}>
              <Icon name="check-all" size={16} color="#6b7280" />
              <Text style={[styles.statText, isCompleted && styles.completedText]}>
                {habit?.totalCompletions || 0} total
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={[styles.progressLabel, isCompleted && styles.completedText]}>
              Weekly Progress
            </Text>
            <ProgressBar 
              progress={getProgressPercentage() / 100} 
              color={isCompleted ? '#ffffff' : '#4f46e5'}
              style={styles.progressBar}
            />
            <Text style={[styles.progressText, isCompleted && styles.completedText]}>
              {Math.round(getProgressPercentage())}%
            </Text>
          </View>

          <View style={styles.tagsRow}>
            <Chip 
              mode="outlined" 
              compact
              textStyle={[styles.chipText, isCompleted && styles.completedText]}
              style={[styles.chip, isCompleted && styles.completedChip]}
            >
              {habit.category}
            </Chip>
            
            <Chip 
              mode="outlined" 
              compact
              textStyle={[styles.chipText, isCompleted && styles.completedText]}
              style={[styles.chip, isCompleted && styles.completedChip]}
            >
              {habit.estimatedTime || '5 min'}
            </Chip>
            
            <View style={styles.difficultyContainer}>
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  name="star"
                  size={12}
                  color={i < habit.difficulty ? getDifficultyColor(habit.difficulty) : '#e5e7eb'}
                />
              ))}
            </View>
          </View>

          {showActions && (
            <View style={styles.actionsRow}>
              <Button
                mode="outlined"
                compact
                onPress={() => onEdit && onEdit(habit)}
                style={styles.actionButton}
                labelStyle={[styles.actionButtonText, isCompleted && styles.completedText]}
              >
                Edit
              </Button>
              
              <Button
                mode="outlined"
                compact
                onPress={handleDelete}
                style={styles.actionButton}
                labelStyle={[styles.actionButtonText, { color: '#ef4444' }]}
              >
                Delete
              </Button>

              {habit.reminderEnabled && (
                <View style={styles.reminderIndicator}>
                  <Icon name="bell" size={16} color={isCompleted ? '#ffffff' : '#f59e0b'} />
                  <Text style={[styles.reminderText, isCompleted && styles.completedText]}>
                    {habit.reminderTime}
                  </Text>
                </View>
              )}
            </View>
          )}
        </LinearGradient>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    elevation: 3,
    borderRadius: 16,
    overflow: 'hidden',
  },
  completedCard: {
    elevation: 6,
  },
  gradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  completedText: {
    color: '#ffffff',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  completeButton: {
    padding: 8,
    borderRadius: 24,
  },
  completedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
    height: 28,
  },
  completedChip: {
    borderColor: '#ffffff',
  },
  chipText: {
    fontSize: 12,
    color: '#6b7280',
  },
  difficultyContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButton: {
    marginRight: 8,
    minWidth: 60,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  reminderIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  reminderText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 4,
  },
});

export default HabitCard;