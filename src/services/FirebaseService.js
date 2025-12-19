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
  getDocsFromServer,
  getDocsFromCache
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

// ✅ FIXED: Single declaration (removed duplicate)
let adMobService = null;

// ✅ ADD THIS FUNCTION after imports
function getAdMobService() {
  if (!adMobService) {
    try {
      adMobService = require('./AdMobService').default;
    } catch (error) {
      console.log('AdMobService not available');
    }
  }
  return adMobService;
}


class FirebaseService {
  constructor() {
    this.currentUser = null;
    this.authStateChangedListeners = [];
    this.habitsCache = null; // ✅ NEW: In-memory cache
    this.lastCacheTime = null;
    this.CACHE_DURATION = 30000; // 30 seconds
    
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateChangedListeners.forEach(listener => listener(user));
      
      // ✅ NEW: Clear cache on logout
      if (!user) {
        this.clearHabitsCache();
      }
    });
  }

  // ✅ NEW: Cache management methods
  async cacheHabits(habits) {
    try {
      if (!this.currentUser) return;
      
      const cacheKey = `habits_cache_${this.currentUser.uid}`;
      const cacheData = {
        habits: habits,
        timestamp: Date.now(),
        userId: this.currentUser.uid
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      this.habitsCache = habits;
      this.lastCacheTime = Date.now();
      
      console.log(`✅ Cached ${habits.length} habits to AsyncStorage`);
    } catch (error) {
      console.error('❌ Error caching habits:', error);
    }
  }

  async getCachedHabits() {
    try {
      if (!this.currentUser) return null;
      
      // Check in-memory cache first (fastest)
      if (this.habitsCache && this.lastCacheTime && 
          (Date.now() - this.lastCacheTime < this.CACHE_DURATION)) {
        console.log('⚡ Using in-memory cache');
        return this.habitsCache;
      }
      
      // Check AsyncStorage cache
      const cacheKey = `habits_cache_${this.currentUser.uid}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const cacheData = JSON.parse(cached);
        
        // Verify cache is for current user
        if (cacheData.userId === this.currentUser.uid) {
          console.log(`⚡ Using AsyncStorage cache (${cacheData.habits.length} habits)`);
          this.habitsCache = cacheData.habits;
          this.lastCacheTime = cacheData.timestamp;
          return cacheData.habits;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting cached habits:', error);
      return null;
    }
  }

  async clearHabitsCache() {
    try {
      if (this.currentUser) {
        const cacheKey = `habits_cache_${this.currentUser.uid}`;
        await AsyncStorage.removeItem(cacheKey);
      }
      this.habitsCache = null;
      this.lastCacheTime = null;
      console.log('🗑️ Habits cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
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
      await this.clearHabitsCache(); // ✅ NEW: Clear cache on logout
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

  // ✅ FIXED: Habit creation with proper verification and cache update
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
      
      // ✅ NEW: Update cache immediately
      const newHabit = { id: docRef.id, ...habit };
      if (this.habitsCache) {
        this.habitsCache = [newHabit, ...this.habitsCache];
        await this.cacheHabits(this.habitsCache);
      }
      
      // Update user stats
      try {
        await this.updateUserStats({ totalHabits: increment(1) });
      } catch (statsError) {
        console.error('⚠️ Failed to update user stats:', statsError);
      }
      
      return newHabit;
    } catch (error) {
      console.error('❌ Error creating habit:', error);
      throw new Error(error.message || 'Failed to create habit');
    }
  }

  // ✅ FIXED: Robust habit loading with offline support and caching
  async getUserHabits(forceRefresh = false) {
    if (!this.currentUser) {
      console.log('⚠️ No current user');
      return [];
    }

    try {
      // ✅ Step 1: Try to get cached habits first (for instant display)
      if (!forceRefresh) {
        const cachedHabits = await this.getCachedHabits();
        if (cachedHabits && cachedHabits.length > 0) {
          console.log(`⚡ Loaded ${cachedHabits.length} habits from cache (instant!)`);
          
          // ✅ Background sync: Fetch fresh data in background
          this.syncHabitsInBackground();
          
          return cachedHabits;
        }
      }
      
      // ✅ Step 2: Try to fetch from Firestore
      console.log('📱 Fetching habits from Firestore...');
      
      const q = query(
        collection(db, 'habits'),
        where('userId', '==', this.currentUser.uid),
        where('isActive', '==', true)
      );

      let querySnapshot;
      let isFromCache = false;
      
      try {
        // Try to get from server first
        querySnapshot = await getDocsFromServer(q);
        console.log('✅ Fetched from server');
      } catch (networkError) {
        console.log('⚠️ Network error, trying cache...');
        
        try {
          // Try to get from Firestore cache
          querySnapshot = await getDocsFromCache(q);
          isFromCache = true;
          console.log('✅ Fetched from Firestore cache');
        } catch (cacheError) {
          console.log('⚠️ Firestore cache also failed, using AsyncStorage...');
          
          // ✅ Step 3: Fallback to AsyncStorage cache
          const cachedHabits = await this.getCachedHabits();
          if (cachedHabits) {
            console.log(`✅ Using AsyncStorage cache (offline mode)`);
            return cachedHabits;
          }
          
          // ✅ Step 4: No data available at all
          console.log('❌ No cached data available');
          return [];
        }
      }
      
      const habits = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        habits.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort by createdAt in JavaScript
      habits.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log(`✅ Fetched ${habits.length} habits ${isFromCache ? '(from Firestore cache)' : '(from server)'}`);
      
      // ✅ NEW: Cache the results
      if (habits.length > 0) {
        await this.cacheHabits(habits);
      }
      
      return habits;
    } catch (error) {
      console.error('❌ Error fetching habits:', error);
      
      // ✅ Final fallback: Return cached habits
      const cachedHabits = await this.getCachedHabits();
      if (cachedHabits) {
        console.log('✅ Returning cached habits as fallback');
        return cachedHabits;
      }
      
      return [];
    }
  }

  // ✅ NEW: Background sync method
  async syncHabitsInBackground() {
    try {
      console.log('🔄 Background sync started...');
      
      const q = query(
        collection(db, 'habits'),
        where('userId', '==', this.currentUser.uid),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocsFromServer(q);
      const habits = [];
      
      querySnapshot.forEach((doc) => {
        habits.push({ id: doc.id, ...doc.data() });
      });
      
      habits.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      await this.cacheHabits(habits);
      console.log('✅ Background sync complete');
    } catch (error) {
      console.log('⚠️ Background sync failed (offline?):', error.message);
    }
  }

  async updateHabit(habitId, updates) {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    // ✅ NEW: Update cache
    if (this.habitsCache) {
      const index = this.habitsCache.findIndex(h => h.id === habitId);
      if (index !== -1) {
        this.habitsCache[index] = {
          ...this.habitsCache[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        await this.cacheHabits(this.habitsCache);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async deleteHabit(habitId) {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      isActive: false,
      deletedAt: new Date().toISOString()
    });
    
    // ✅ NEW: Update cache
    if (this.habitsCache) {
      this.habitsCache = this.habitsCache.filter(h => h.id !== habitId);
      await this.cacheHabits(this.habitsCache);
    }
    
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

    const updateData = {
      completions: newCompletions,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      totalCompletions: increment(1),
      lastCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await updateDoc(habitRef, updateData);

    // ✅ NEW: Update cache
    if (this.habitsCache) {
      const index = this.habitsCache.findIndex(h => h.id === habitId);
      if (index !== -1) {
        this.habitsCache[index] = {
          ...this.habitsCache[index],
          ...updateData,
          totalCompletions: (this.habitsCache[index].totalCompletions || 0) + 1
        };
        await this.cacheHabits(this.habitsCache);
      }
    }

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

    const updateData = {
      completions: newCompletions,
      currentStreak: newStreak,
      totalCompletions: increment(-1),
      updatedAt: new Date().toISOString()
    };

    await updateDoc(habitRef, updateData);

    // ✅ NEW: Update cache
    if (this.habitsCache) {
      const index = this.habitsCache.findIndex(h => h.id === habitId);
      if (index !== -1) {
        this.habitsCache[index] = {
          ...this.habitsCache[index],
          ...updateData,
          totalCompletions: Math.max(0, (this.habitsCache[index].totalCompletions || 0) - 1)
        };
        await this.cacheHabits(this.habitsCache);
      }
    }

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

    const userData = querySnapshot.docs[0].data();
  
    // ✅ FIX: Check if user is admin and grant premium access
    if (userData && this.currentUser.email) {
      try {
        const AdminService = require('./AdminService').default;
        const isAdmin = await AdminService.checkAdminStatus(this.currentUser.email);
      
        if (isAdmin) {
          console.log('✅ Admin user detected - granting premium access');
          userData.isPremium = true;
        
          if (!querySnapshot.docs[0].data().isPremium) {
            await updateDoc(querySnapshot.docs[0].ref, {
              isPremium: true,
              premiumUpdatedAt: new Date().toISOString(),
              premiumReason: 'admin_access'
            });
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    }

    return userData;
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
    
        console.log(`✅ Firebase premium status updated to: ${isPremium}`);
      
        const adMob = getAdMobService();
        if (adMob) {
          const isAdmin = await this.checkIfUserIsAdmin(this.currentUser.email);
          console.log(`✅ Updating AdMobService: premium=${isPremium}, admin=${isAdmin}`);
          await adMob.setPremiumStatus(isPremium, isAdmin);
        }
      
        return true;
      }
  
      return false;
    } catch (error) {
      console.error('Error updating premium status:', error);
      throw error;
    }
  }

  async checkIfUserIsAdmin(email) {
    try {
      const AdminService = require('./AdminService').default;
      return await AdminService.checkAdminStatus(email);
    } catch (error) {
      return false;
    }
  }
}

export default new FirebaseService();
