import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
  getDocsFromServer
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup
} from 'firebase/auth';
import { db, auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class FirebaseService {
  constructor() {
    this.currentUser = null;
    this.authStateChangedListeners = [];
    
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateChangedListeners.forEach(listener => listener(user));
    });
  }

  // Authentication Methods
  async signUp(email, password, displayName) {
    try {
      console.log('Starting sign up process...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('User created, updating profile...');
      await updateProfile(user, { displayName });
      
      console.log('Creating user document...');
      await this.createUserDocument(user);
      
      console.log('Sign up complete!');
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async signIn(email, password) {
    try {
      console.log('Starting sign in process...');
      console.log('Email:', email);
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful!');
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithGoogleWeb() {
    try {
      console.log('Starting Google sign in for web/APK...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      
      if (result && result.user) {
        await this.createUserDocument(result.user);
        console.log('Google sign in successful!');
        return result.user;
      }
      
      return null;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithGoogleCredential(idToken) {
    try {
      console.log('Starting Google sign in with credential...');
      
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      
      if (result && result.user) {
        await this.createUserDocument(result.user);
        console.log('Google credential sign in successful!');
        return result.user;
      }
      
      return null;
    } catch (error) {
      console.error('Google credential sign in error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async signOut() {
    try {
      console.log('Signing out...');
      await signOut(auth);
      await AsyncStorage.clear();
      console.log('Sign out successful!');
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  onAuthStateChanged(callback) {
    this.authStateChangedListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.authStateChangedListeners = this.authStateChangedListeners.filter(
        listener => listener !== callback
      );
    };
  }

  async createUserDocument(user) {
    try {
      console.log('Creating/updating user document for:', user.uid);
      
      const q = query(
        collection(db, 'users'),
        where('uid', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('Creating new user document...');
        const userDoc = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || null,
          createdAt: new Date().toISOString(),
          isPremium: false,
          totalHabits: 0,
          longestStreak: 0,
          referralCode: this.generateReferralCode(),
          referredBy: null,
          referralCount: 0,
          authProvider: user.providerData[0]?.providerId || 'password'
        };

        await addDoc(collection(db, 'users'), userDoc);
        console.log('User document created!');
        return userDoc;
      } else {
        console.log('User document already exists, updating...');
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data();
        
        const updates = {};
        if (user.displayName && !existingData.displayName) {
          updates.displayName = user.displayName;
        }
        if (user.photoURL && !existingData.photoURL) {
          updates.photoURL = user.photoURL;
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(existingDoc.ref, {
            ...updates,
            updatedAt: new Date().toISOString()
          });
          console.log('User document updated!');
        }
        
        return existingData;
      }
    } catch (error) {
      console.error('Error creating/updating user document:', error);
    }
  }

  // ✅ FIXED: Habit creation with proper verification
  async createHabit(habitData) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const now = new Date().toISOString();
      
      const habit = {
        ...habitData,
        userId: this.currentUser.uid,
        createdAt: now,
        updatedAt: now,
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        isActive: true,
        completions: []
      };

      console.log('✅ Creating habit:', habit.name);
      
      const docRef = await addDoc(collection(db, 'habits'), habit);
      console.log('✅ Habit created with ID:', docRef.id);
      
      // Verify the habit was saved
      const savedHabit = await getDoc(docRef);
      if (!savedHabit.exists()) {
        throw new Error('Failed to verify habit creation');
      }
      console.log('✅ Habit verified in Firestore');
      
      // Update user stats
      try {
        await this.updateUserStats({ totalHabits: increment(1) });
      } catch (statsError) {
        console.error('⚠️ Failed to update user stats:', statsError);
      }
      
      return { id: docRef.id, ...habit };
    } catch (error) {
      console.error('❌ Error creating habit:', error);
      throw new Error(error.message || 'Failed to create habit');
    }
  }

  // ✅ FIXED: Always fetch from server, no caching
  async getUserHabits(forceRefresh = false) {
    if (!this.currentUser) {
      console.log('⚠️ No current user');
      return [];
    }

    try {
      console.log('📱 Fetching habits from Firestore server...');
      
      const q = query(
        collection(db, 'habits'),
        where('userId', '==', this.currentUser.uid),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      // ALWAYS fetch from server to ensure fresh data
      const querySnapshot = await getDocsFromServer(q);
      
      const habits = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        habits.push({
          id: doc.id,
          ...data
        });
      });
      
      console.log('✅ Fetched', habits.length, 'habits');
      
      if (habits.length > 0) {
        console.log('📝 Habits:', habits.map(h => h.name).join(', '));
      }
      
      return habits;
    } catch (error) {
      console.error('❌ Error fetching habits:', error);
      return [];
    }
  }

  async updateHabit(habitId, updates) {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    // Small delay for Firestore propagation
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async deleteHabit(habitId) {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      isActive: false,
      deletedAt: new Date().toISOString()
    });
    
    await this.updateUserStats({ totalHabits: increment(-1) });
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async completeHabit(habitId) {
    if (!this.currentUser) throw new Error('User not authenticated');

    const habitRef = doc(db, 'habits', habitId);
    const habitDoc = await getDoc(habitRef);
    
    if (!habitDoc.exists()) throw new Error('Habit not found');
    
    const habit = habitDoc.data();
    const today = new Date().toDateString();
    const completions = habit.completions || [];
    
    if (completions.includes(today)) {
      throw new Error('Habit already completed today');
    }

    const newCompletions = [...completions, today];
    const newStreak = this.calculateStreak(newCompletions);
    const newLongestStreak = Math.max(habit.longestStreak || 0, newStreak);

    await updateDoc(habitRef, {
      completions: newCompletions,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      totalCompletions: increment(1),
      lastCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const userStats = await this.getUserStats();
    if (newLongestStreak > (userStats.longestStreak || 0)) {
      await this.updateUserStats({ longestStreak: newLongestStreak });
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    return { newStreak, newLongestStreak };
  }

  async uncompleteHabit(habitId) {
    if (!this.currentUser) throw new Error('User not authenticated');

    const habitRef = doc(db, 'habits', habitId);
    const habitDoc = await getDoc(habitRef);
    
    if (!habitDoc.exists()) throw new Error('Habit not found');
    
    const habit = habitDoc.data();
    const today = new Date().toDateString();
    const completions = habit.completions || [];
    
    const newCompletions = completions.filter(date => date !== today);
    const newStreak = this.calculateStreak(newCompletions);

    await updateDoc(habitRef, {
      completions: newCompletions,
      currentStreak: newStreak,
      totalCompletions: increment(-1),
      updatedAt: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    return { newStreak };
  }

  async getUserStats() {
    if (!this.currentUser) return null;

    const q = query(
      collection(db, 'users'),
      where('uid', '==', this.currentUser.uid)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    return querySnapshot.docs[0].data();
  }

  async updateUserStats(updates) {
    if (!this.currentUser) return;

    const q = query(
      collection(db, 'users'),
      where('uid', '==', this.currentUser.uid)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(userDoc.ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }
  }

  async processReferral(referralCode) {
    if (!this.currentUser) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'users'),
      where('referralCode', '==', referralCode)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error('Invalid referral code');
    }

    const referrerDoc = querySnapshot.docs[0];
    const referrerId = referrerDoc.data().uid;

    if (referrerId === this.currentUser.uid) {
      throw new Error('Cannot refer yourself');
    }

    await this.updateUserStats({ referredBy: referrerId });

    await updateDoc(referrerDoc.ref, {
      referralCount: increment(1),
      updatedAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'referrals'), {
      referrerId: referrerId,
      referredUserId: this.currentUser.uid,
      createdAt: new Date().toISOString(),
      status: 'completed'
    });

    return true;
  }

  async getUserReferrals() {
    if (!this.currentUser) return [];

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', this.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async trackEvent(eventName, parameters = {}) {
    try {
      await addDoc(collection(db, 'analytics'), {
        userId: this.currentUser?.uid || 'anonymous',
        eventName,
        parameters,
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  calculateStreak(completions) {
    if (!completions || completions.length === 0) return 0;

    const sortedDates = completions
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      currentDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (currentDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'OWL';
    for (let i = 0; i < 3; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  handleFirebaseError(error) {
    console.error('Firebase error:', error);
    
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password is too weak (minimum 6 characters)',
      'auth/user-disabled': 'User account has been disabled',
      'auth/user-not-found': 'No user found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Invalid email or password',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/popup-closed-by-user': 'Sign-in popup was closed before completion',
      'auth/popup-blocked': 'Sign-in popup was blocked by the browser',
      'auth/cancelled-popup-request': 'Multiple popup requests detected',
      'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials',
      'auth/network-request-failed': 'Network error. Please check your internet connection and try again',
      'auth/invalid-api-key': 'Invalid API key. Please check your Firebase configuration',
      'auth/app-not-authorized': 'App not authorized. Please check your Firebase configuration'
    };

    const message = errorMessages[error.code] || error.message || 'An unexpected error occurred';
    return new Error(message);
  }

  async updateUserPremiumStatus(isPremium) {
    try {
      if (!this.currentUser) {
        throw new Error('No user logged in');
      }

      const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', this.currentUser.uid)
      );
    
      const querySnapshot = await getDocs(userQuery);
    
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          isPremium: isPremium,
          premiumUpdatedAt: new Date().toISOString()
        });
      
        console.log(`Premium status updated to: ${isPremium}`);
        return true;
      }
    
      return false;
    } catch (error) {
      console.error('Error updating premium status:', error);
      throw error;
    }
  }
}

export default new FirebaseService();