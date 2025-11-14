/**
 * Privacy Compliance Service
 * Handles GDPR, COPPA, and privacy-related functionality
 */

import { 
  collection, 
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

class PrivacyComplianceService {
  
  // ===== CONSENT MANAGEMENT =====
  
  async recordUserConsent(userId, consentData) {
    try {
      console.log('Recording user consent for:', userId);
      
      const consentDoc = {
        userId: userId,
        agreedToTerms: consentData.agreedToTerms || false,
        agreedToPrivacy: consentData.agreedToPrivacy || false,
        agreedToDataProcessing: consentData.agreedToDataProcessing || false,
        marketingConsent: consentData.marketingConsent || false,
        age: consentData.age || null,
        isOver13: consentData.isOver13 !== false, // Default to true for existing users
        consentDate: new Date().toISOString(),
        ipAddress: null, // You can add IP detection if needed
        platform: consentData.platform || 'mobile',
        appVersion: consentData.appVersion || '2.9.0'
      };

      await addDoc(collection(db, 'user_consents'), consentDoc);
      await AsyncStorage.setItem('consent_recorded', 'true');
      
      console.log('✅ User consent recorded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error recording consent:', error);
      throw error;
    }
  }

  async hasUserGivenConsent(userId) {
    try {
      const localConsent = await AsyncStorage.getItem('consent_recorded');
      if (localConsent === 'true') return true;

      const q = query(
        collection(db, 'user_consents'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  // ===== AGE VERIFICATION (COPPA COMPLIANCE) =====
  
  async verifyAge(dateOfBirth) {
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      // Adjust age if birthday hasn't occurred this year yet
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) 
        ? age - 1 
        : age;

      const isOver13 = actualAge >= 13;
      
      console.log(`Age verification: ${actualAge} years old, isOver13: ${isOver13}`);
      
      return {
        age: actualAge,
        isOver13: isOver13,
        verified: true
      };
    } catch (error) {
      console.error('Error verifying age:', error);
      return {
        age: null,
        isOver13: false,
        verified: false,
        error: error.message
      };
    }
  }

  async checkCOPPACompliance(userId) {
    try {
      const q = query(
        collection(db, 'user_consents'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { compliant: false, reason: 'No consent record found' };
      }

      const consentData = snapshot.docs[0].data();
      
      if (consentData.isOver13 === false) {
        return { 
          compliant: false, 
          reason: 'User is under 13 years old - COPPA restricted',
          requiresParentalConsent: true
        };
      }

      return { compliant: true };
    } catch (error) {
      console.error('Error checking COPPA compliance:', error);
      return { compliant: false, reason: 'Error checking compliance' };
    }
  }

  // ===== CRASH REPORTING =====
  
  async reportCrash(crashData) {
    try {
      console.log('📊 Reporting crash:', crashData.errorMessage);
      
      const crashReport = {
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        errorMessage: crashData.errorMessage || 'Unknown error',
        errorStack: crashData.errorStack || '',
        errorName: crashData.errorName || 'Error',
        screen: crashData.screen || 'Unknown',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: crashData.platform || 'unknown',
          osVersion: crashData.osVersion || 'unknown',
          appVersion: crashData.appVersion || '2.9.0'
        },
        userActions: crashData.userActions || [],
        resolved: false
      };

      await addDoc(collection(db, 'crash_reports'), crashReport);
      console.log('✅ Crash report submitted');
      
      return true;
    } catch (error) {
      console.error('❌ Error reporting crash:', error);
      // Don't throw - we don't want crash reporting to cause more crashes
      return false;
    }
  }

  // ===== DATA EXPORT (GDPR RIGHT TO DATA PORTABILITY) =====
  
  async exportUserData(userId) {
    try {
      console.log('📦 Exporting data for user:', userId);

      // Fetch all user data
      const [userData, habits, analytics, referrals] = await Promise.all([
        this._getUserProfile(userId),
        this._getUserHabits(userId),
        this._getUserAnalytics(userId),
        this._getUserReferrals(userId)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
        user: userData,
        habits: habits,
        analytics: analytics,
        referrals: referrals,
        metadata: {
          totalHabits: habits.length,
          totalAnalyticsEvents: analytics.length,
          totalReferrals: referrals.length
        }
      };

      // Log export event
      await this._logDataExport(userId);

      return exportData;
    } catch (error) {
      console.error('❌ Error exporting user data:', error);
      throw error;
    }
  }

  async exportUserDataToFile(userId) {
    try {
      const data = await this.exportUserData(userId);
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create file in app's cache directory
      const fileName = `HabitOwl_UserData_${userId}_${Date.now()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8
      });

      console.log('✅ Data exported to file:', fileUri);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Your HabitOwl Data'
        });
      }

      return fileUri;
    } catch (error) {
      console.error('❌ Error exporting to file:', error);
      throw error;
    }
  }

  async exportHabitsToCSV(userId) {
    try {
      console.log('📊 Exporting habits to CSV for user:', userId);
      
      const habits = await this._getUserHabits(userId);
      
      // CSV Header
      let csv = 'Habit Name,Description,Goal,Frequency,Category,Current Streak,Longest Streak,Total Completions,Created Date,Last Completed\n';
      
      // CSV Rows
      habits.forEach(habit => {
        const row = [
          this._escapeCSV(habit.name || ''),
          this._escapeCSV(habit.description || ''),
          habit.goal || '',
          habit.frequency || '',
          habit.category || '',
          habit.currentStreak || 0,
          habit.longestStreak || 0,
          habit.totalCompletions || 0,
          habit.createdAt || '',
          habit.lastCompletedAt || 'Never'
        ].join(',');
        
        csv += row + '\n';
      });

      // Create file
      const fileName = `HabitOwl_Habits_${userId}_${Date.now()}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8
      });

      console.log('✅ Habits exported to CSV:', fileUri);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Your Habits'
        });
      }

      return fileUri;
    } catch (error) {
      console.error('❌ Error exporting habits to CSV:', error);
      throw error;
    }
  }

  // ===== ACCOUNT DELETION REQUEST =====
  
  async requestAccountDeletion(userId, reason) {
    try {
      console.log('🗑️ Account deletion requested for:', userId);

      const deletionRequest = {
        userId: userId,
        userEmail: auth.currentUser?.email || 'unknown',
        reason: reason || 'User requested deletion',
        requestDate: new Date().toISOString(),
        scheduledDeletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days grace period
        status: 'pending',
        dataExported: false
      };

      await addDoc(collection(db, 'deletion_requests'), deletionRequest);
      
      console.log('✅ Deletion request created (7-day grace period)');
      
      return {
        success: true,
        gracePeriodDays: 7,
        message: 'Your account will be deleted in 7 days. You can cancel this request anytime before then.'
      };
    } catch (error) {
      console.error('❌ Error requesting account deletion:', error);
      throw error;
    }
  }

  async cancelAccountDeletion(userId) {
    try {
      const q = query(
        collection(db, 'deletion_requests'),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        });
        
        console.log('✅ Account deletion cancelled');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error cancelling deletion:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====
  
  async _getUserProfile(userId) {
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  async _getUserHabits(userId) {
    const q = query(
      collection(db, 'habits'), 
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async _getUserAnalytics(userId) {
    const q = query(
      collection(db, 'analytics'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async _getUserReferrals(userId) {
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async _logDataExport(userId) {
    try {
      await addDoc(collection(db, 'data_exports'), {
        userId: userId,
        exportDate: new Date().toISOString(),
        exportType: 'user_request',
        success: true
      });
    } catch (error) {
      console.error('Error logging data export:', error);
    }
  }

  _escapeCSV(str) {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

export default new PrivacyComplianceService();
