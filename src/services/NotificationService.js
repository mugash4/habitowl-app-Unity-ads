import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async initialize() {
    // Request permissions and get push token
    this.expoPushToken = await this.registerForPushNotificationsAsync();

    // Listen for incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    return this.expoPushToken;
  }

  async registerForPushNotificationsAsync() {
    let token;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    // Configure notification channel for Android
    if (Device.osName === 'Android') {
      await Notifications.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });

      await Notifications.setNotificationChannelAsync('motivational', {
        name: 'Motivational Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#10b981',
      });
    }

    return token;
  }

  async scheduleHabitReminder(habit) {
    try {
      // Cancel existing notifications for this habit
      await this.cancelHabitNotifications(habit.id);

      if (!habit.reminderEnabled || !habit.reminderTime) {
        return;
      }

      const [hours, minutes] = habit.reminderTime.split(':').map(Number);
      
      // Schedule daily reminder
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${habit.name}! 🦉`,
          body: habit.reminderMessage || `Don't forget to complete your ${habit.name} habit today!`,
          data: { 
            habitId: habit.id, 
            type: 'habit_reminder',
            habitName: habit.name
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      // Store notification ID for later cancellation
      await this.storeNotificationId(habit.id, 'reminder', notificationId);

      // Schedule motivational follow-up (30 minutes later)
      const followUpId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Still time for ${habit.name}! 💪`,
          body: `You've got this! Complete your ${habit.name} to keep your streak going.`,
          data: { 
            habitId: habit.id, 
            type: 'habit_followup',
            habitName: habit.name
          },
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: {
          hour: hours,
          minute: minutes + 30 >= 60 ? minutes + 30 - 60 : minutes + 30,
          repeats: true,
        },
      });

      await this.storeNotificationId(habit.id, 'followup', followUpId);

      return { reminderId: notificationId, followUpId };
    } catch (error) {
      console.error('Error scheduling habit reminder:', error);
      throw error;
    }
  }

  async scheduleStreakCelebration(habit, streak) {
    try {
      const milestones = [3, 7, 14, 30, 60, 100, 365];
      
      if (!milestones.includes(streak)) return;

      const messages = {
        3: `3 days strong with ${habit.name}! 🎉`,
        7: `One week of ${habit.name}! You're on fire! 🔥`,
        14: `Two weeks of consistency! ${habit.name} is becoming a habit! ⭐`,
        30: `30 days! ${habit.name} is now part of your routine! 🏆`,
        60: `2 months of ${habit.name}! You're unstoppable! 💎`,
        100: `100 days of ${habit.name}! You're a habit master! 👑`,
        365: `One full year of ${habit.name}! Incredible achievement! 🎊`
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Streak Milestone Achieved! 🎯`,
          body: messages[streak],
          data: { 
            habitId: habit.id, 
            type: 'streak_celebration',
            streak: streak
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: 2, // Show immediately
        },
      });
    } catch (error) {
      console.error('Error scheduling streak celebration:', error);
    }
  }

  async sendMotivationalMessage(message, delay = 0) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `HabitOwl says... 🦉`,
          body: message,
          data: { 
            type: 'motivational',
          },
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: {
          seconds: delay,
        },
      });
    } catch (error) {
      console.error('Error sending motivational message:', error);
    }
  }

  async cancelHabitNotifications(habitId) {
    try {
      const storedIds = await this.getStoredNotificationIds(habitId);
      
      if (storedIds) {
        for (const [type, notificationId] of Object.entries(storedIds)) {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
        
        // Remove from storage
        await AsyncStorage.removeItem(`notifications_${habitId}`);
      }
    } catch (error) {
      console.error('Error cancelling habit notifications:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Clear all stored notification IDs
      const keys = await AsyncStorage.getAllKeys();
      const notificationKeys = keys.filter(key => key.startsWith('notifications_'));
      await AsyncStorage.multiRemove(notificationKeys);
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async storeNotificationId(habitId, type, notificationId) {
    try {
      const key = `notifications_${habitId}`;
      const existing = await AsyncStorage.getItem(key);
      const notifications = existing ? JSON.parse(existing) : {};
      
      notifications[type] = notificationId;
      await AsyncStorage.setItem(key, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error storing notification ID:', error);
    }
  }

  async getStoredNotificationIds(habitId) {
    try {
      const key = `notifications_${habitId}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting stored notification IDs:', error);
      return null;
    }
  }

  handleNotificationReceived(notification) {
    console.log('Notification received:', notification);
    // You can add custom logic here when a notification is received
  }

  handleNotificationResponse(response) {
    console.log('Notification response:', response);
    
    const data = response.notification.request.content.data;
    
    // Handle different notification types
    switch (data.type) {
      case 'habit_reminder':
      case 'habit_followup':
        // Navigate to habit completion screen
        // This would be handled by the navigation system
        console.log('Navigate to habit:', data.habitId);
        break;
      
      case 'streak_celebration':
        // Navigate to progress/stats screen
        console.log('Show streak celebration for:', data.habitId);
        break;
      
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async getPushToken() {
    return this.expoPushToken;
  }

  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new NotificationService();