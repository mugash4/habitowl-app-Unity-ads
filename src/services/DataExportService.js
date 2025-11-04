import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

class DataExportService {
  async exportUserData(userId) {
    try {
      console.log('📦 Starting data export for user:', userId);

      // Fetch all user data
      const [userData, habits, referrals, analytics] = await Promise.all([
        this.getUserData(userId),
        this.getUserHabits(userId),
        this.getUserReferrals(userId),
        this.getUserAnalytics(userId)
      ]);

      // Create comprehensive export package
      const exportData = {
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
        appVersion: '2.9.0',
        userData: userData,
        habits: habits,
        referrals: referrals,
        analytics: analytics,
        summary: {
          totalHabits: habits.length,
          totalReferrals: referrals.length,
          dataPoints: analytics.length
        },
        notice: 'This is your complete HabitOwl data export. Keep this file safe.'
      };

      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Save to file
      const fileName = `HabitOwl_Data_Export_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonData);
      
      console.log('✅ Data export file created:', fileUri);

      // Share the file
      if (Platform.OS !== 'web') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Your HabitOwl Data'
          });
        }
      }

      return {
        success: true,
        fileName,
        fileUri,
        recordCount: {
          habits: habits.length,
          referrals: referrals.length,
          analytics: analytics.length
        }
      };
    } catch (error) {
      console.error('❌ Data export failed:', error);
      throw new Error('Failed to export data: ' + error.message);
    }
  }

  async getUserData(userId) {
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      // Remove sensitive fields
      delete data.password;
      return data;
    }
    return null;
  }

  async getUserHabits(userId) {
    const q = query(
      collection(db, 'habits'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getUserReferrals(userId) {
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getUserAnalytics(userId) {
    const q = query(
      collection(db, 'analytics'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  // Export habits in CSV format
  async exportHabitsCSV(userId) {
    try {
      const habits = await this.getUserHabits(userId);
      
      if (habits.length === 0) {
        Alert.alert('No Data', 'You have no habits to export');
        return null;
      }

      // Create CSV content
      const headers = 'Name,Description,Category,Frequency,Created Date,Current Streak,Longest Streak,Total Completions,Is Active\n';
      const rows = habits.map(habit => {
        return [
          `"${(habit.name || '').replace(/"/g, '""')}"`,
          `"${(habit.description || '').replace(/"/g, '""')}"`,
          habit.category || '',
          habit.frequency || '',
          habit.createdAt || '',
          habit.currentStreak || 0,
          habit.longestStreak || 0,
          habit.totalCompletions || 0,
          habit.isActive ? 'Yes' : 'No'
        ].join(',');
      }).join('\n');

      const csvData = headers + rows;
      
      // Save to file
      const fileName = `HabitOwl_Habits_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvData);
      
      // Share the file
      if (Platform.OS !== 'web') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Your Habits'
          });
        }
      }

      return { success: true, fileName, fileUri };
    } catch (error) {
      console.error('❌ CSV export failed:', error);
      throw new Error('Failed to export habits: ' + error.message);
    }
  }
}

export default new DataExportService();
