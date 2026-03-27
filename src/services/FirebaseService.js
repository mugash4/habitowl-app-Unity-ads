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
  getDocsFromCache,
  setDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
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
import testAccountService from './TestAccountService';

let adMobService = null;

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
    this.habitsCache = null;
    this.lastCacheTime = null;
    this.CACHE_DURATION = 30000;
    
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateChangedListeners.forEach(listener => listener(user));
      
      if (!user) {
        this.clearHabitsCache();
      }
    });
  }

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
      
      console.log(`✅ Cached ${habits.length} habits`);
    } catch (error) {
      console.error('Error caching habits:', error);
    }
  }

  async getCachedHabits() {
    try {
      if (!this.currentUser) return null;
      
      if (this.habitsCache && this.lastCacheTime && 
          (Date.now() - this.lastCacheTime < this.CACHE_DURATION)) {
        console.log('⚡ Using in-memory cache');
        return this.habitsCache;
      }
      
      const cacheKey = `habits_cache_${this.currentUser.uid}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const cacheData = JSON.parse(cached);
        
        if (cacheData.userId === this.currentUser.uid) {
          console.log(`⚡ Using cache (${cacheData.habits.length} habits)`);
          this.habitsCache = cacheData.habits;
          this.lastCacheTime = cacheData.timestamp;
          return cacheData.habits;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cache:', error);
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
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async signUp(email, password, displayName) {
    try {
      console.log('Starting sign up...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('User created, updating profile...');
      await updateProfile(user, { displayName });
      
      console.log('Creating user document...');
      await this.createUserDocument(user);
      
      // ✅ CHECK FOR TEST ACCOUNT
      if (testAccountService.isTestAccount(email)) {
        console.log('🎁 Test account detected, granting premium');
        await testAccountService.grantTestAccountPremium(email, user.uid);
      }
      
      console.log('Sign up complete!');
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async signIn(email, password) {
    try {
      console.log('Starting sign in...');
      
      if (!email || !password) {
        throw new Error('Email and password required');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // ✅ CHECK FOR TEST ACCOUNT
      if (testAccountService.isTestAccount(email)) {
        console.log('🎁 Test account detected, granting premium');
        await testAccountService.grantTestAccountPremium(email, user.uid);
      }
      
      console.log('Sign in successful!');
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithGoogleWeb() {
    try {
      console.log('Starting Google sign in...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      
      if (result && result.user) {
        await this.createUserDocument(result.user);
        
        // ✅ CHECK FOR TEST ACCOUNT
        if (result.user.email && testAccountService.isTestAccount(result.user.email)) {
          console.log('🎁 Test account detected, granting premium');
          await testAccountService.grantTestAccountPremium(result.user.email, result.user.uid);
        }
        
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
      console.log('Starting Google credential sign in...');
      
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      
      if (result && result.user) {
        await this.createUserDocument(result.user);
        
        // ✅ CHECK FOR TEST ACCOUNT
        if (result.user.email && testAccountService.isTestAccount(result.user.email)) {
          console.log('🎁 Test account detected, granting premium');
          await testAccountService.grantTestAccountPremium(result.user.email, result.user.uid);
        }
        
        console.log('Google credential sign in successful!');
        return result.user;
      }
      
      return null;
    } catch (error) {
      console.error('Google credential error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async signOut() {
    try {
      console.log('Signing out...');
      const onboardingCompleted = await AsyncStorage.getItem('habitowl_onboarding_completed');
      await this.clearHabitsCache();
      await signOut(auth);
      await AsyncStorage.clear();
      if (onboardingCompleted === 'true') {
        await AsyncStorage.setItem('habitowl_onboarding_completed', 'true');
      }
      console.log('Sign out successful!');
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async ensureAnonymousUser() {
    try {
      if (auth.currentUser) {
        this.currentUser = auth.currentUser;
        await this.createUserDocument(auth.currentUser);
        return auth.currentUser;
      }

      console.log('Starting anonymous sign in...');
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      await this.createUserDocument(user);
      console.log('Anonymous sign in successful!');
      return user;
    } catch (error) {
      console.error('Anonymous sign in error:', error);
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
        const derivedDisplayName = user.displayName || user.email?.split('@')[0] || 'HabitOwl User';

        const userDoc = {
          uid: user.uid,
          email: user.email || null,
          displayName: derivedDisplayName,
          photoURL: user.photoURL || null,
          createdAt: new Date().toISOString(),
          isPremium: false,
          totalHabits: 0,
          longestStreak: 0,
          referralCode: this.generateReferralCode(),
          referredBy: null,
          referralCount: 0,
          aiCoachingUsage: {
            dateKey: '',
            count: 0
          },
          authProvider: user.isAnonymous ? 'anonymous' : (user.providerData[0]?.providerId || 'password')
        };

        await addDoc(collection(db, 'users'), userDoc);
        console.log('User document created!');
        return userDoc;
      } else {
        console.log('User document exists, updating...');
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data();
        
        const updates = {};
        if (user.displayName && !existingData.displayName) {
          updates.displayName = user.displayName;
        }
        if (user.photoURL && !existingData.photoURL) {
          updates.photoURL = user.photoURL;
        }
        if (!existingData.displayName) {
          updates.displayName = user.displayName || user.email?.split('@')[0] || 'HabitOwl User';
        }
        if (!existingData.authProvider) {
          updates.authProvider = user.isAnonymous ? 'anonymous' : (user.providerData[0]?.providerId || 'password');
        }
        if (!existingData.aiCoachingUsage) {
          updates.aiCoachingUsage = {
            dateKey: '',
            count: 0
          };
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(existingDoc.ref, {
            ...updates,
            updatedAt: new Date().toISOString()
          });
          console.log('User document updated!');
        }
        
        return {
          ...existingData,
          ...updates
        };
      }
    } catch (error) {
      console.error('Error with user document:', error);
    }
  }

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
      console.log('✅ Habit created:', docRef.id);
      
      const savedHabit = await getDoc(docRef);
      if (!savedHabit.exists()) {
        throw new Error('Failed to verify habit');
      }
      console.log('✅ Habit verified');
      
      const newHabit = { id: docRef.id, ...habit };
      if (this.habitsCache) {
        this.habitsCache = [newHabit, ...this.habitsCache];
        await this.cacheHabits(this.habitsCache);
      }
      
      try {
        await this.updateUserStats({ totalHabits: increment(1) });
      } catch (statsError) {
        console.error('⚠️ Stats update failed:', statsError);
      }
      
      return newHabit;
    } catch (error) {
      console.error('❌ Error creating habit:', error);
      throw new Error(error.message || 'Failed to create habit');
    }
  }

  async getUserHabits(forceRefresh = false) {
    if (!this.currentUser) {
      console.log('⚠️ No current user');
      return [];
    }

    try {
      if (!forceRefresh) {
        const cachedHabits = await this.getCachedHabits();
        if (cachedHabits && cachedHabits.length > 0) {
          console.log(`⚡ Loaded ${cachedHabits.length} habits from cache`);
          this.syncHabitsInBackground();
          return cachedHabits;
        }
      }
      
      console.log('📱 Fetching from Firestore...');
      
      const q = query(
        collection(db, 'habits'),
        where('userId', '==', this.currentUser.uid),
        where('isActive', '==', true)
      );

      let querySnapshot;
      let isFromCache = false;
      
      try {
        querySnapshot = await getDocsFromServer(q);
        console.log('✅ Fetched from server');
      } catch (networkError) {
        console.log('⚠️ Network error, trying cache...');
        
        try {
          querySnapshot = await getDocsFromCache(q);
          isFromCache = true;
          console.log('✅ Using Firestore cache');
        } catch (cacheError) {
          console.log('⚠️ Firestore cache failed...');
          
          const cachedHabits = await this.getCachedHabits();
          if (cachedHabits) {
            console.log(`✅ Using AsyncStorage cache`);
            return cachedHabits;
          }
          
          console.log('❌ No cache available');
          return [];
        }
      }
      
      const habits = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        habits.push({ id: doc.id, ...data });
      });
      
      habits.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log(`✅ Fetched ${habits.length} habits ${isFromCache ? '(cache)' : '(server)'}`);
      
      if (habits.length > 0) {
        await this.cacheHabits(habits);
      }
      
      return habits;
    } catch (error) {
      console.error('❌ Error fetching habits:', error);
      
      const cachedHabits = await this.getCachedHabits();
      if (cachedHabits) {
        console.log('✅ Returning cached habits');
        return cachedHabits;
      }
      
      return [];
    }
  }

  async syncHabitsInBackground() {
    try {
      console.log('🔄 Background sync...');
      
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
      console.log('⚠️ Background sync failed:', error.message);
    }
  }

  async updateHabit(habitId, updates) {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
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
      throw new Error('Already completed today');
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
  
    if (userData && this.currentUser.email) {
      try {
        const AdminService = require('./AdminService').default;
        const isAdmin = await AdminService.checkAdminStatus(this.currentUser.email);
      
        if (isAdmin) {
          console.log('✅ Admin user - granting premium');
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
        console.error('Error checking admin:', error);
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

  async getAICoachingUsageStatus(limit = 2) {
    if (!this.currentUser) {
      return {
        dateKey: new Date().toISOString().split('T')[0],
        count: 0,
        limit,
        remaining: limit
      };
    }

    const userStats = await this.getUserStats();
    const dateKey = new Date().toISOString().split('T')[0];
    const usage = userStats?.aiCoachingUsage || {};
    const count = usage.dateKey === dateKey ? (usage.count || 0) : 0;

    return {
      dateKey,
      count,
      limit,
      remaining: Math.max(limit - count, 0)
    };
  }

  async consumeAICoachingUse(limit = 2) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const dateKey = new Date().toISOString().split('T')[0];
    const userQuery = query(
      collection(db, 'users'),
      where('uid', '==', this.currentUser.uid)
    );

    const querySnapshot = await getDocs(userQuery);
    if (querySnapshot.empty) {
      throw new Error('User profile not found');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const usage = userData?.aiCoachingUsage || {};
    const currentCount = usage.dateKey === dateKey ? (usage.count || 0) : 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        dateKey,
        count: currentCount,
        limit,
        remaining: 0
      };
    }

    const nextCount = currentCount + 1;

    await updateDoc(userDoc.ref, {
      aiCoachingUsage: {
        dateKey,
        count: nextCount
      },
      updatedAt: new Date().toISOString()
    });

    return {
      allowed: true,
      dateKey,
      count: nextCount,
      limit,
      remaining: Math.max(limit - nextCount, 0)
    };
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
      console.error('Analytics error:', error);
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
      'auth/email-already-in-use': 'Email already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password too weak (min 6 chars)',
      'auth/user-disabled': 'User account disabled',
      'auth/user-not-found': 'No user found',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Invalid credentials',
      'auth/too-many-requests': 'Too many attempts. Try later',
      'auth/popup-closed-by-user': 'Sign-in popup closed',
      'auth/popup-blocked': 'Sign-in popup blocked',
      'auth/cancelled-popup-request': 'Multiple popup requests',
      'auth/account-exists-with-different-credential': 'Account exists with different credentials',
      'auth/network-request-failed': 'Network error. Check internet',
      'auth/invalid-api-key': 'Invalid API key',
      'auth/app-not-authorized': 'App not authorized'
    };

    const message = errorMessages[error.code] || error.message || 'Unexpected error';
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
    
        console.log(`✅ Premium status: ${isPremium}`);
      
        const adMob = getAdMobService();
        if (adMob) {
          const isAdmin = await this.checkIfUserIsAdmin(this.currentUser.email);
          await adMob.setPremiumStatus(isPremium, isAdmin);
        }
      
        return true;
      }
  
      return false;
    } catch (error) {
      console.error('Error updating premium:', error);
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
