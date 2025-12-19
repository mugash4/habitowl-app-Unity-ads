import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
    this.isInitialized = false; // ✅ NEW: Track initialization status
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('✅ NotificationService already initialized');
        return this.expoPushToken;
      }
      
      console.log('🔔 Initializing NotificationService...');
      
      // ✅ NEW: Works offline - only network call is for push token
      this.expoPushToken = await this.registerForPushNotificationsAsync();

      this.notificationListener = Notifications.addNotificationReceivedListener(
        this.handleNotificationReceived.bind(this)
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        this.handleNotificationResponse.bind(this)
      );

      this.isInitialized = true;
      console.log('✅ NotificationService initialized successfully');
      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error initializing NotificationService:', error);
      // ✅ Don't throw - app should work even if notifications fail
      this.isInitialized = true;
      return null;
    }
  }

  async registerForPushNotificationsAsync() {
    let token;

    if (!Device.isDevice) {
      console.log('⚠️ Must use physical device for Push Notifications');
      return null;
    }

    try {
      // Step 1: Configure Android notification channels BEFORE requesting permissions
      if (Platform.OS === 'android') {
        console.log('📱 Configuring Android notification channels...');
        
        await Notifications.setNotificationChannelAsync('habit-reminders', {
          name: 'Habit Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('motivational', {
          name: 'Motivational Messages',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#10b981',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('streak-celebrations', {
          name: 'Streak Celebrations',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#f59e0b',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        console.log('✅ Android notification channels configured');
      }

      // Step 2: Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📋 Existing permission status:', existingStatus);
      
      let finalStatus = existingStatus;

      // Step 3: Request permissions if not already granted
      if (existingStatus !== 'granted') {
        console.log('🔐 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📋 Permission request result:', finalStatus);
      }

      // Step 4: Handle permission denial
      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied by user');
        console.log('ℹ️ App will function but notifications will not be shown');
        return null;
      }

      console.log('✅ Notification permission granted');

      // Step 5: Get Expo Push Token (requires network - but non-blocking)
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? 
          Constants?.easConfig?.projectId;
        
        if (!projectId) {
          console.warn('⚠️ Project ID not found - using local notifications only');
          return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        
        token = tokenData.data;
        console.log('✅ Expo Push Token obtained:', token);
        console.log('🔒 Using FCM V1 API via Expo Push Service');
        
        await AsyncStorage.setItem('expoPushToken', token);
        
      } catch (tokenError) {
        console.error('❌ Error getting Expo Push Token:', tokenError);
        console.log('ℹ️ Local notifications will still work offline');
        token = null;
      }

    } catch (error) {
      console.error('❌ Error in registerForPushNotificationsAsync:', error);
      // ✅ Don't throw - return null to allow app to continue
      return null;
    }

    return token;
  }

  async scheduleHabitReminder(habit) {
    try {
      console.log(`🔔 Scheduling reminder for habit: ${habit.name}`);
      
      // ✅ Works completely offline - no network required
      await this.cancelHabitNotifications(habit.id);

      if (!habit.reminderEnabled || !habit.reminderTime) {
        console.log('⚠️ Reminder not enabled or time not set for this habit');
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
          categoryIdentifier: 'habit-reminders',
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      console.log(`✅ Reminder scheduled with ID: ${notificationId}`);

      await this.storeNotificationId(habit.id, 'reminder', notificationId);

      const followUpHour = minutes + 30 >= 60 ? hours + 1 : hours;
      const followUpMinute = minutes + 30 >= 60 ? minutes + 30 - 60 : minutes + 30;

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
          categoryIdentifier: 'motivational',
        },
        trigger: {
          hour: followUpHour,
          minute: followUpMinute,
          repeats: true,
        },
      });

      console.log(`✅ Follow-up scheduled with ID: ${followUpId}`);
      await this.storeNotificationId(habit.id, 'followup', followUpId);

      return { reminderId: notificationId, followUpId };
    } catch (error) {
      console.error('❌ Error scheduling habit reminder:', error);
      // ✅ Don't throw - just log the error
      return null;
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

      console.log(`🎯 Scheduling streak celebration: ${streak} days`);

      // ✅ Works completely offline
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
          categoryIdentifier: 'streak-celebrations',
        },
        trigger: {
          seconds: 2,
        },
      });

      console.log('✅ Streak celebration scheduled (offline-capable)');
    } catch (error) {
      console.error('❌ Error scheduling streak celebration:', error);
      // ✅ Don't throw - just log
    }
  }

  async sendMotivationalMessage(message, delay = 0) {
    try {
      // ✅ Works completely offline
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `HabitOwl says... 🦉`,
          body: message,
          data: { 
            type: 'motivational',
          },
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          categoryIdentifier: 'motivational',
        },
        trigger: {
          seconds: delay,
        },
      });
      
      console.log('✅ Motivational message scheduled (offline-capable)');
    } catch (error) {
      console.error('❌ Error sending motivational message:', error);
    }
  }

  /**
   * ✅ UPDATED: Send push notification via Expo Push Service (FCM V1)
   * This requires network - but won't block other functionality if offline
   */
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      const pushToken = await AsyncStorage.getItem('expoPushToken');
      
      if (!pushToken) {
        console.log('⚠️ No push token found for user (offline or not configured)');
        return null;
      }

      const message = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high',
        channelId: data.type || 'habit-reminders',
      };

      // ✅ Network call - will fail gracefully if offline
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data && result.data[0].status === 'ok') {
        console.log('✅ Push notification sent successfully via FCM V1');
      } else {
        console.error('❌ Push notification failed:', result);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending push notification (probably offline):', error);
      // ✅ Return null instead of throwing
      return null;
    }
  }

  async cancelHabitNotifications(habitId) {
    try {
      // ✅ Works completely offline
      const storedIds = await this.getStoredNotificationIds(habitId);
      
      if (storedIds) {
        for (const [type, notificationId] of Object.entries(storedIds)) {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
          console.log(`✅ Cancelled ${type} notification: ${notificationId}`);
        }
        
        await AsyncStorage.removeItem(`notifications_${habitId}`);
      }
    } catch (error) {
      console.error('❌ Error cancelling habit notifications:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      // ✅ Works completely offline
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All scheduled notifications cancelled');
      
      const keys = await AsyncStorage.getAllKeys();
      const notificationKeys = keys.filter(key => key.startsWith('notifications_'));
      await AsyncStorage.multiRemove(notificationKeys);
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
    }
  }

  async storeNotificationId(habitId, type, notificationId) {
    try {
      // ✅ Works completely offline - uses AsyncStorage
      const key = `notifications_${habitId}`;
      const existing = await AsyncStorage.getItem(key);
      const notifications = existing ? JSON.parse(existing) : {};
      
      notifications[type] = notificationId;
      await AsyncStorage.setItem(key, JSON.stringify(notifications));
    } catch (error) {
      console.error('❌ Error storing notification ID:', error);
    }
  }

  async getStoredNotificationIds(habitId) {
    try {
      // ✅ Works completely offline - uses AsyncStorage
      const key = `notifications_${habitId}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Error getting stored notification IDs:', error);
      return null;
    }
  }

  handleNotificationReceived(notification) {
    console.log('📩 Notification received:', notification.request.content.title);
  }

  handleNotificationResponse(response) {
    console.log('👆 Notification tapped:', response.notification.request.content.title);
    
    const data = response.notification.request.content.data;
    
    switch (data.type) {
      case 'habit_reminder':
      case 'habit_followup':
        console.log('Navigate to habit:', data.habitId);
        break;
      
      case 'streak_celebration':
        console.log('Show streak celebration for:', data.habitId);
        break;
      
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  async getScheduledNotifications() {
    try {
      // ✅ Works completely offline
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Currently scheduled notifications: ${scheduled.length}`);
      return scheduled;
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      return [];
    }
  }

  async getPushToken() {
    return this.expoPushToken;
  }

  async checkPermissionStatus() {
    try {
      // ✅ Works completely offline
      const { status, ios, android } = await Notifications.getPermissionsAsync();
      console.log('📋 Current permission status:', { status, ios, android });
      return { status, ios, android };
    } catch (error) {
      console.error('❌ Error checking permission status:', error);
      return null;
    }
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
