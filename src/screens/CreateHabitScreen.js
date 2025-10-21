import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView
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
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';
import AIService from '../services/AIService';

const CreateHabitScreen = ({ navigation, route }) => {
  const [habitName, setHabitName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('wellness');
  const [difficulty, setDifficulty] = useState(2);
  const [estimatedTime, setEstimatedTime] = useState('5 min');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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

  useEffect(() => {
    loadAISuggestions();
  }, []);

  const loadAISuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const userHabits = await FirebaseService.getUserHabits();
      const userStats = await FirebaseService.getUserStats();
      
      const suggestions = await AIService.generateHabitSuggestions(
        userStats || {},
        userHabits || []
      );
      
      setAiSuggestions(suggestions.slice(0, 3));
    } catch (error) {
      console.error('Error loading AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setHabitName(suggestion.name);
    setDescription(suggestion.description);
    setCategory(suggestion.category);
    setDifficulty(suggestion.difficulty);
    setEstimatedTime(suggestion.estimatedTime);
  };

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

  const handleCreateHabit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const habitData = {
        name: habitName.trim(),
        description: description.trim(),
        category,
        difficulty,
        estimatedTime,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime.toTimeString().slice(0, 5) : null,
        reminderMessage: customMessage.trim() || null,
        createdAt: new Date().toISOString(),
        userId: FirebaseService.currentUser.uid,
      };

      console.log('Creating habit with data:', habitData);
      const newHabit = await FirebaseService.createHabit(habitData);
      console.log('Habit created successfully:', newHabit);

      if (reminderEnabled) {
        await NotificationService.scheduleHabitReminder(newHabit);
      }

      await FirebaseService.trackEvent('habit_created', {
        category,
        difficulty,
        has_reminder: reminderEnabled
      });

      // Show success message
      Alert.alert(
        'Success! 🎉',
        `"${habitName}" has been added to your habits!`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log('Navigating back to Home screen...');
              navigation.goBack();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Create habit error:', error);
      Alert.alert('Error', error.message || 'Failed to create habit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#ffffff" />
        <Appbar.Content title="Create New Habit" titleStyle={styles.headerTitle} />
        <Appbar.Action 
          icon="check" 
          onPress={handleCreateHabit}
          disabled={isLoading}
          color="#ffffff"
        />
      </Appbar.Header>

      {/* FIXED: Better KeyboardAvoidingView and ScrollView configuration */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          bounces={true}
          scrollEnabled={true}
          overScrollMode="always"
        >
          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Icon name="lightbulb" size={20} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>AI Suggestions</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Based on your profile and current habits
                </Text>
                
                {aiSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    mode="outlined"
                    onPress={() => handleSuggestionSelect(suggestion)}
                    style={styles.suggestionButton}
                    contentStyle={styles.suggestionContent}
                    labelStyle={styles.suggestionButtonLabel}
                  >
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName}>{suggestion.name}</Text>
                      <Text style={styles.suggestionDescription}>
                        {suggestion.description}
                      </Text>
                    </View>
                  </Button>
                ))}
              </Card.Content>
            </Card>
          )}

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
              />
            </Card.Content>
          </Card>

          {/* Category */}
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

          {/* Daily Reminder */}
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
                    onPress={() => setShowTimePicker(true)}
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
                  />
                  
                  <HelperText type="info">
                    Leave blank to use the default reminder message
                  </HelperText>
                </>
              )}
            </Card.Content>
          </Card>

          {/* Create Button */}
          <Button
            mode="contained"
            onPress={handleCreateHabit}
            loading={isLoading}
            disabled={isLoading}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
            labelStyle={styles.buttonLabelWhite}
            icon="plus"
          >
            Create Habit
          </Button>

          {/* FIXED: Extra large bottom padding for scrolling */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          is24Hour={false}
          onChange={handleTimeChange}
        />
      )}
    </View>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 400, // FIXED: Increased from 300 to 400
    flexGrow: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
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
  input: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  suggestionButton: {
    marginBottom: 8,
    alignItems: 'flex-start',
    borderColor: '#e5e7eb',
  },
  suggestionContent: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  suggestionButtonLabel: {
    color: '#4f46e5',
  },
  suggestionText: {
    alignItems: 'flex-start',
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
  createButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#4f46e5',
    elevation: 3,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 400, // FIXED: Increased from 300 to 400
  },
});

export default CreateHabitScreen;
