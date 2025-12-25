/**
 * TestAccountService - Google Play Console Test Account Management
 * Allows test accounts to access premium features without payment
 * This is REQUIRED for Google Play review process
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

class TestAccountService {
  constructor() {
    // ✅ Test emails that get automatic premium access
    // These emails will bypass ALL payment requirements
    this.testEmails = [
      // Google Play Console test accounts
      'test@habitowl.com',
      'reviewer@habitowl.com',
      'googleplay.test@gmail.com',
      
      // Add more test emails as needed
      // 'another.test@example.com',
    ];
    
    console.log('✅ TestAccountService: Initialized with', this.testEmails.length, 'test emails');
  }

  /**
   * Check if email is a test account
   */
  isTestAccount(email) {
    if (!email) return false;
    
    const normalizedEmail = email.toLowerCase().trim();
    const isTest = this.testEmails.some(
      testEmail => testEmail.toLowerCase().trim() === normalizedEmail
    );
    
    console.log(`TestAccountService: Email ${email} is ${isTest ? 'TEST' : 'NORMAL'} account`);
    return isTest;
  }

  /**
   * Grant automatic premium access to test accounts
   * Returns true if premium was granted, false otherwise
   */
  async grantTestAccountPremium(userEmail, userId) {
    try {
      if (!this.isTestAccount(userEmail)) {
        console.log('TestAccountService: Not a test account, skipping premium grant');
        return false;
      }

      console.log('🎁 TestAccountService: Granting premium to test account:', userEmail);

      // Store in AsyncStorage (local)
      await AsyncStorage.setItem('premium_status', 'true');
      await AsyncStorage.setItem('is_test_account', 'true');
      await AsyncStorage.setItem('premium_type', 'test_account');

      // Store in Firestore (for persistence across devices)
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          await setDoc(userRef, {
            isPremium: true,
            premiumType: 'test_account',
            testAccountEmail: userEmail,
            premiumGrantedAt: new Date().toISOString(),
            uid: userId
          }, { merge: true });
          
          console.log('✅ TestAccountService: Premium stored in Firestore');
        } catch (firestoreError) {
          console.warn('TestAccountService: Firestore update failed (non-critical):', firestoreError.message);
          // Continue anyway - local storage is sufficient
        }
      }

      console.log('✅ TestAccountService: Test account premium granted successfully');
      return true;
    } catch (error) {
      console.error('❌ TestAccountService: Error granting premium:', error);
      return false;
    }
  }

  /**
   * Check if current session is a test account with premium
   */
  async isTestAccountWithPremium() {
    try {
      const isTest = await AsyncStorage.getItem('is_test_account');
      const isPremium = await AsyncStorage.getItem('premium_status');
      
      return isTest === 'true' && isPremium === 'true';
    } catch (error) {
      console.error('TestAccountService: Error checking test account status:', error);
      return false;
    }
  }

  /**
   * Get all test emails (for admin reference)
   */
  getTestEmails() {
    return [...this.testEmails];
  }

  /**
   * Add a new test email (admin only)
   */
  async addTestEmail(email, adminEmail) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      if (this.testEmails.includes(normalizedEmail)) {
        console.log('TestAccountService: Email already exists in test list');
        return false;
      }

      this.testEmails.push(normalizedEmail);
      
      // Store in Firestore for persistence
      const configRef = doc(db, 'admin_config', 'test_accounts');
      await setDoc(configRef, {
        testEmails: this.testEmails,
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail || 'admin'
      }, { merge: true });

      console.log('✅ TestAccountService: Test email added:', normalizedEmail);
      return true;
    } catch (error) {
      console.error('❌ TestAccountService: Error adding test email:', error);
      throw error;
    }
  }

  /**
   * Load test emails from Firestore (called on app start)
   */
  async loadTestEmailsFromFirestore() {
    try {
      const configRef = doc(db, 'admin_config', 'test_accounts');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists() && configDoc.data().testEmails) {
        this.testEmails = configDoc.data().testEmails;
        console.log('✅ TestAccountService: Loaded', this.testEmails.length, 'test emails from Firestore');
      } else {
        console.log('TestAccountService: No test emails in Firestore, using defaults');
      }
      
      return this.testEmails;
    } catch (error) {
      console.warn('TestAccountService: Could not load from Firestore (using defaults):', error.message);
      return this.testEmails;
    }
  }
}

// Export as singleton
const testAccountService = new TestAccountService();
export default testAccountService;
