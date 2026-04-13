import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

const WEEKLY_REVIEW_STORAGE_KEY = 'habitowl_weekly_review_notification';
const TIMEZONE_STORAGE_KEY = 'habitowl_notification_timezone';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.appStateSubscription = null;
    this.isInitialized = false;
  }

  getDeviceTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (error) {
      console.log('⚠️ Unable to read device timezone, falling back to UTC');
      return 'UTC';
    }
  }

  getUtcOffsetMinutes() {
    return -new Date().getTimezoneOffset();
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('✅ NotificationService already initialized');
        return this.expoPushToken;
      }

      console.log('🔔 Initializing NotificationService...');

      this.expoPushToken = await this.registerForPushNotificationsAsync();

      this.notificationListener = Notifications.addNotificationReceivedListener(
        this.handleNotificationReceived.bind(this)
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        this.handleNotificationResponse.bind(this)
      );

      this.appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          this.syncTimezoneAndReschedule().catch((error) => {
            console.log('⚠️ Timezone sync skipped:', error?.message || error);
          });
        }
      });

      await this.syncTimezoneAndReschedule();

      this.isInitialized = true;
      console.log('✅ NotificationService initialized successfully');
      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error initializing NotificationService:', error);
      this.isInitialized = true;
      return null;
    }
  }

  async configureAndroidChannels() {
    if (Platform.OS !== 'android') {
      return;
    }

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

  async registerForPushNotificationsAsync() {
    let token;

    if (!Device.isDevice) {
      console.log('⚠️ Must use physical device for Push Notifications');
      return null;
    }

    try {
      await this.configureAndroidChannels();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📋 Existing permission status:', existingStatus);

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('🔐 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📋 Permission request result:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied by user');
        console.log('ℹ️ App will function but notifications will not be shown');
        return null;
      }

      console.log('✅ Notification permission granted');

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
      return null;
    }

    return token;
  }

  async syncTimezoneAndReschedule(force = false) {
    try {
      const currentTimeZone = this.getDeviceTimeZone();
      const previousTimeZone = await AsyncStorage.getItem(TIMEZONE_STORAGE_KEY);

      if (!previousTimeZone) {
        await AsyncStorage.setItem(TIMEZONE_STORAGE_KEY, currentTimeZone);
        await this.scheduleWeeklyReviewPrompt();
        console.log(`🌍 Notification timezone saved: ${currentTimeZone}`);
        return { changed: false, timeZone: currentTimeZone };
      }

      if (!force && previousTimeZone === currentTimeZone) {
        return { changed: false, timeZone: currentTimeZone };
      }

      console.log(`🌍 Timezone changed from ${previousTimeZone} to ${currentTimeZone}. Rescheduling reminders...`);
      await AsyncStorage.setItem(TIMEZONE_STORAGE_KEY, currentTimeZone);
      await this.rescheduleAllHabitRemindersForCurrentTimezone();
      await this.scheduleWeeklyReviewPrompt();
      return { changed: true, timeZone: currentTimeZone };
    } catch (error) {
      console.error('❌ Error syncing notification timezone:', error);
      return { changed: false, timeZone: this.getDeviceTimeZone() };
    }
  }

  async rescheduleAllHabitRemindersForCurrentTimezone() {
    try {
      const FirebaseService = require('./FirebaseService').default;
      const habits = await FirebaseService.getCachedHabits();
      const reminderHabits = habits.filter(
        (habit) => habit?.reminderEnabled && habit?.reminderTime
      );

      for (const habit of reminderHabits) {
        await this.scheduleHabitReminder(habit);
      }

      console.log(`✅ Rescheduled ${reminderHabits.length} habit reminder(s) for timezone ${this.getDeviceTimeZone()}`);
      return reminderHabits.length;
    } catch (error) {
      console.error('❌ Error rescheduling reminders after timezone change:', error);
      return 0;
    }
  }

  async scheduleHabitReminder(habit) {
    try {
      console.log(`🔔 Scheduling reminder for habit: ${habit.name}`);

      await this.cancelHabitNotifications(habit.id);

      if (!habit.reminderEnabled || !habit.reminderTime) {
        console.log('⚠️ Reminder not enabled or time not set for this habit');
        return;
      }

      const [hours, minutes] = habit.reminderTime.split(':').map(Number);
      const timeZone = this.getDeviceTimeZone();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${habit.name}! 🦉`,
          body:
            habit.reminderMessage ||
            `Don't forget to complete your ${habit.name} habit today!`,
          data: {
            habitId: habit.id,
            type: 'habit_reminder',
            habitName: habit.name,
            timeZone,
            utcOffsetMinutes: this.getUtcOffsetMinutes(),
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'habit-reminders',
        },
        trigger: {
          channelId: 'habit-reminders',
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      console.log(`✅ Reminder scheduled with ID: ${notificationId}`);
      await this.storeNotificationId(habit.id, 'reminder', notificationId);

      const followUpTotalMinutes = hours * 60 + minutes + 30;
      const followUpHour = Math.floor((followUpTotalMinutes % (24 * 60)) / 60);
      const followUpMinute = followUpTotalMinutes % 60;

      const followUpId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Still time for ${habit.name}! 💪`,
          body: `You've got this! Complete your ${habit.name} to keep your streak going.`,
          data: {
            habitId: habit.id,
            type: 'habit_followup',
            habitName: habit.name,
            timeZone,
            utcOffsetMinutes: this.getUtcOffsetMinutes(),
          },
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          categoryIdentifier: 'motivational',
        },
        trigger: {
          channelId: 'motivational',
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
        365: `One full year of ${habit.name}! Incredible achievement! 🎊`,
      };

      console.log(`🎯 Scheduling streak celebration: ${streak} days`);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Streak Milestone Achieved! 🎯',
          body: messages[streak],
          data: {
            habitId: habit.id,
            type: 'streak_celebration',
            streak,
            timeZone: this.getDeviceTimeZone(),
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'streak-celebrations',
        },
        trigger: {
          channelId: 'streak-celebrations',
          seconds: 2,
        },
      });

      console.log('✅ Streak celebration scheduled (offline-capable)');
    } catch (error) {
      console.error('❌ Error scheduling streak celebration:', error);
    }
  }

  async sendMotivationalMessage(message, delay = 0) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'HabitOwl says... 🦉',
          body: message,
          data: {
            type: 'motivational',
            timeZone: this.getDeviceTimeZone(),
          },
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          categoryIdentifier: 'motivational',
        },
        trigger: {
          channelId: 'motivational',
          seconds: delay,
        },
      });

      console.log('✅ Motivational message scheduled (offline-capable)');
    } catch (error) {
      console.error('❌ Error sending motivational message:', error);
    }
  }

  async scheduleWeeklyReviewPrompt() {
    try {
      const existingId = await AsyncStorage.getItem(WEEKLY_REVIEW_STORAGE_KEY);

      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Weekly Habit Check-in 🦉',
          body: 'Take a minute to review your progress and plan your next small win.',
          data: {
            type: 'weekly_review',
            timeZone: this.getDeviceTimeZone(),
          },
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          categoryIdentifier: 'motivational',
        },
        trigger: {
          channelId: 'motivational',
          weekday: 1,
          hour: 19,
          minute: 0,
          repeats: true,
        },
      });

      await AsyncStorage.setItem(WEEKLY_REVIEW_STORAGE_KEY, notificationId);
      console.log(`✅ Weekly review prompt scheduled for timezone ${this.getDeviceTimeZone()}`);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling weekly review prompt:', error);
      return null;
    }
  }

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
        title,
        body,
        data,
        priority: 'high',
        channelId: data.type || 'habit-reminders',
      };

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
      return null;
    }
  }

  async cancelHabitNotifications(habitId) {
    try {
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
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All scheduled notifications cancelled');

      const keys = await AsyncStorage.getAllKeys();
      const notificationKeys = keys.filter(
        (key) => key.startsWith('notifications_') || key === WEEKLY_REVIEW_STORAGE_KEY
      );
      await AsyncStorage.multiRemove(notificationKeys);
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
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
      console.error('❌ Error storing notification ID:', error);
    }
  }

  async getStoredNotificationIds(habitId) {
    try {
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
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export default new NotificationService();
