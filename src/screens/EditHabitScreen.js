import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Chip,
  Switch,
  Appbar,
  HelperText
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';

const EditHabitScreen = ({ navigation, route }) => {
  const { habit } = route.params;
  const scrollViewRef = useRef(null);
  
  const [habitName, setHabitName] = useState(habit.name || '');
  const [description, setDescription] = useState(habit.description || '');
  const [category, setCategory] = useState(habit.category || 'wellness');
  const [difficulty, setDifficulty] = useState(habit.difficulty || 2);
  const [estimatedTime, setEstimatedTime] = useState(habit.estimatedTime || '5 min');
  const [reminderEnabled, setReminderEnabled] = useState(habit.reminderEnabled || false);
  const [reminderTime, setReminderTime] = useState(() => {
    if (habit.reminderTime) {
      const [hours, minutes] = habit.reminderTime.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    return new Date();
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customMessage, setCustomMessage] = useState(habit.reminderMessage || '');
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { value: 'wellness', label: 'Wellness', icon: 'leaf', color: '#10b981' },
    { value: 'fitness', label: 'Fitness', icon: 'dumbbell', color: '#f59e0b' },
    { value: 'productivity', label: 'Productivity', icon: 'briefcase', color: '#3b82f6' },
    { value: 'learning', label: 'Learning', icon: 'book', color: '#8b5cf6' },
    { value: 'health', label: 'Health', icon: 'heart', color: '#ef4444' },
    { value: 'creativity', label: 'Creativity', icon: 'palette', color: '#f97316' },
    { value: 'social', label: 'Social', icon: 'account-group', color: '#06b6d4' },
    { value: 'finance', label: 'Finance', icon: 'currency-usd', color: '#10b981' }
  ];

  const timeOptions = ['5 min', '10 min', '15 min', '30 min', '45 min', '1 hour', '2 hours'];

  const validateForm = () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return false;
    }
    
    if (habitName.length < 3) {
      Alert.alert('Error', 'Habit name must be at least 3 characters');
      return false;
    }

    if (habitName.length > 50) {
      Alert.alert('Error', 'Habit name must be less than 50 characters');
      return false;
    }

    return true;
  };

  const handleUpdateHabit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const updates = {
        name: habitName.trim(),
        description: description.trim(),
        category,
        difficulty,
        estimatedTime,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime.toTimeString().slice(0, 5) : null,
        reminderMessage: customMessage.trim() || null,
        updatedAt: new Date().toISOString(),
      };

      console.log('🔧 Updating habit:', habit.id);
      await FirebaseService.updateHabit(habit.id, updates);
      console.log('✅ Habit updated successfully');

      // Update notifications
      if (reminderEnabled) {
        const updatedHabit = { ...habit, ...updates };
        await NotificationService.scheduleHabitReminder(updatedHabit);
        console.log('🔔 Reminder updated');
      } else {
        await NotificationService.cancelHabitNotifications(habit.id);
        console.log('🔕 Reminder cancelled');
      }

      // Track event
      try {
        await FirebaseService.trackEvent('habit_updated', {
          category,
          difficulty,
          has_reminder: reminderEnabled
        });
      } catch (trackError) {
        console.error('Tracking error:', trackError);
      }

      // 🔧 FIX: Navigate back immediately, then show success message
      console.log('🔧 Navigating back to Home screen...');
      navigation.goBack();
      
      // Show success message after navigation starts
      setTimeout(() => {
        Alert.alert(
          'Success! ✅',
          `"${habitName}" has been updated!`,
          [{ text: 'OK' }]
        );
      }, 500);

    } catch (error) {
      console.error('❌ Update habit error:', error);
      Alert.alert('Error', error.message || 'Failed to update habit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHabit = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habitName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('🗑️ Deleting habit:', habit.id);
              
              await FirebaseService.deleteHabit(habit.id);
              await NotificationService.cancelHabitNotifications(habit.id);
              
              console.log('✅ Habit deleted successfully');
              
              // 🔧 FIX: Navigate back immediately, then show success message
              navigation.goBack();
              
              setTimeout(() => {
                Alert.alert('Deleted', 'Habit has been deleted successfully');
              }, 500);
              
            } catch (error) {
              console.error('❌ Delete habit error:', error);
              Alert.alert('Error', 'Failed to delete habit');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  const scrollToInput = (yOffset) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: 0,
        y: yOffset,
        animated: true,
      });
    }, 100);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#ffffff" />
        <Appbar.Content title="Edit Habit" titleStyle={styles.headerTitle} />
        <Appbar.Action 
          icon="delete" 
          onPress={handleDeleteHabit}
          disabled={isLoading}
          color="#ffffff"
        />
        <Appbar.Action 
          icon="check" 
          onPress={handleUpdateHabit}
          disabled={isLoading}
          color="#ffffff"
        />
      </Appbar.Header>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        bounces={true}
        scrollEnabled={true}
        removeClippedSubviews={false}
        overScrollMode="always"
        persistentScrollbar={Platform.OS === 'android'}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Habit Stats */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Habit Statistics</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon name="fire" size={20} color="#f59e0b" />
                <Text style={styles.statValue}>{habit.currentStreak || 0}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>
              
              <View style={styles.statItem}>
                <Icon name="trophy" size={20} color="#10b981" />
                <Text style={styles.statValue}>{habit.longestStreak || 0}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
              
              <View style={styles.statItem}>
                <Icon name="check-all" size={20} color="#4f46e5" />
                <Text style={styles.statValue}>{habit.totalCompletions || 0}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Basic Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <TextInput
              label="Habit Name *"
              value={habitName}
              onChangeText={setHabitName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Morning meditation"
              maxLength={50}
              theme={{ colors: { primary: '#4f46e5' } }}
              onFocus={() => scrollToInput(200)}
            />
            
            <HelperText type="info">
              Choose a specific, actionable name for your habit
            </HelperText>

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="What does this habit involve?"
              maxLength={200}
              theme={{ colors: { primary: '#4f46e5' } }}
              onFocus={() => scrollToInput(300)}
            />
          </Card.Content>
        </Card>

        {/* Category Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the category that best fits your habit
            </Text>
            
            <View style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <Chip
                  key={cat.value}
                  selected={category === cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.categoryChip,
                    category === cat.value && { backgroundColor: cat.color }
                  ]}
                  textStyle={[
                    styles.categoryChipText,
                    category === cat.value && { color: '#ffffff' }
                  ]}
                  icon={cat.icon}
                >
                  {cat.label}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Difficulty & Time */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Difficulty & Time</Text>
            
            <Text style={styles.subsectionTitle}>Difficulty Level</Text>
            <Text style={styles.sectionSubtitle}>
              How challenging is this habit for you?
            </Text>
            
            <View style={styles.difficultyContainer}>
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  mode={difficulty === level ? "contained" : "outlined"}
                  onPress={() => setDifficulty(level)}
                  style={styles.difficultyButton}
                  labelStyle={difficulty === level ? styles.buttonLabelWhite : styles.buttonLabel}
                  compact
                >
                  {level}
                </Button>
              ))}
            </View>
            
            <Text style={styles.difficultyLabel}>
              {difficulty === 1 && "Very Easy"}
              {difficulty === 2 && "Easy"}
              {difficulty === 3 && "Moderate"}
              {difficulty === 4 && "Hard"}
              {difficulty === 5 && "Very Hard"}
            </Text>

            <Text style={styles.subsectionTitle}>Estimated Time</Text>
            <View style={styles.timeContainer}>
              {timeOptions.map((time) => (
                <Chip
                  key={time}
                  selected={estimatedTime === time}
                  onPress={() => setEstimatedTime(time)}
                  style={styles.timeChip}
                  textStyle={estimatedTime === time && { color: '#ffffff' }}
                >
                  {time}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Reminders */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.reminderHeader}>
              <Text style={styles.sectionTitle}>Daily Reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                color="#4f46e5"
              />
            </View>

            {reminderEnabled && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowTimePicker(true);
                    scrollToInput(900);
                  }}
                  style={styles.timeButton}
                  icon="clock"
                  labelStyle={styles.buttonLabel}
                >
                  {reminderTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Button>

                <TextInput
                  label="Custom Reminder Message (Optional)"
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g., Time for your daily meditation!"
                  maxLength={100}
                  theme={{ colors: { primary: '#4f46e5' } }}
                  onFocus={() => scrollToInput(1000)}
                />
                
                <HelperText type="info">
                  Leave blank to use the default reminder message
                </HelperText>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Update Button */}
        <Button
          mode="contained"
          onPress={handleUpdateHabit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.updateButton}
          contentStyle={styles.updateButtonContent}
          labelStyle={styles.buttonLabelWhite}
          icon="check"
        >
          Update Habit
        </Button>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          is24Hour={false}
          onChange={handleTimeChange}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  appbar: {
    backgroundColor: '#4f46e5',
    elevation: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 300,
    flexGrow: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    marginBottom: 8,
  },
  categoryChipText: {
    fontSize: 14,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  difficultyButton: {
    flex: 1,
  },
  difficultyLabel: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    marginBottom: 8,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeButton: {
    marginBottom: 16,
    borderColor: '#e5e7eb',
  },
  buttonLabel: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  buttonLabelWhite: {
    color: '#ffffff',
    fontWeight: '600',
  },
  updateButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#4f46e5',
    elevation: 3,
  },
  updateButtonContent: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 100,
  },
});

export default EditHabitScreen;
