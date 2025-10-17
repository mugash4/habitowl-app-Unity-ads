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
  increment
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { db, auth } from '../../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Create user document
      await this.createUserDocument(user);
      
      return user;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      let result;
      if (this.isWeb()) {
        // For web, use popup
        result = await signInWithPopup(auth, provider);
      } else {
        // For mobile, use redirect
        await signInWithRedirect(auth, provider);
        result = await getRedirectResult(auth);
      }
      
      if (result && result.user) {
        // Create or update user document
        await this.createUserDocument(result.user);
        return result.user;
      }
      
      return null;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  isWeb() {
    return typeof window !== 'undefined' && window.document;
  }

  async signOut() {
    try {
      await signOut(auth);
      await AsyncStorage.clear(); // Clear local storage
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  onAuthStateChanged(callback) {
    this.authStateChangedListeners.push(callback);
    return () => {
      this.authStateChangedListeners = this.authStateChangedListeners.filter(
        listener => listener !== callback
      );
    };
  }

  async createUserDocument(user) {
    // Check if user document already exists
    const q = query(
      collection(db, 'users'),
      where('uid', '==', user.uid)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Create new user document
      const userDoc = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        isPremium: false,
        totalHabits: 0,
        longestStreak: 0,
        referralCode: this.generateReferralCode(),
        referredBy: null,
        referralCount: 0,
        authProvider: user.providerData[0]?.providerId || 'password'
      };

      await addDoc(collection(db, 'users'), userDoc);
      return userDoc;
    } else {
      // Update existing user document if needed
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
          updatedAt: serverTimestamp()
        });
      }
      
      return existingData;
    }
  }

  // Habit Management
  async createHabit(habitData) {
    if (!this.currentUser) throw new Error('User not authenticated');

    const habit = {
      ...habitData,
      userId: this.currentUser.uid,
      createdAt: serverTimestamp(),
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      isActive: true,
      completions: []
    };

    const docRef = await addDoc(collection(db, 'habits'), habit);
    
    // Update user's total habits count
    await this.updateUserStats({ totalHabits: increment(1) });
    
    return { id: docRef.id, ...habit };
  }

  async getUserHabits() {
    if (!this.currentUser) return [];

    const q = query(
      collection(db, 'habits'),
      where('userId', '==', this.currentUser.uid),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateHabit(habitId, updates) {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async deleteHabit(habitId) {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      isActive: false,
      deletedAt: serverTimestamp()
    });
    
    // Update user's total habits count
    await this.updateUserStats({ totalHabits: increment(-1) });
  }

  async completeHabit(habitId) {
    if (!this.currentUser) throw new Error('User not authenticated');

    const habitRef = doc(db, 'habits', habitId);
    const habitDoc = await getDoc(habitRef);
    
    if (!habitDoc.exists()) throw new Error('Habit not found');
    
    const habit = habitDoc.data();
    const today = new Date().toDateString();
    const completions = habit.completions || [];
    
    // Check if already completed today
    if (completions.includes(today)) {
      throw new Error('Habit already completed today');
    }

    // Add today's completion
    const newCompletions = [...completions, today];
    const newStreak = this.calculateStreak(newCompletions);
    const newLongestStreak = Math.max(habit.longestStreak || 0, newStreak);

    await updateDoc(habitRef, {
      completions: newCompletions,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      totalCompletions: increment(1),
      lastCompletedAt: serverTimestamp()
    });

    // Update user's longest streak if this is a new record
    const userStats = await this.getUserStats();
    if (newLongestStreak > (userStats.longestStreak || 0)) {
      await this.updateUserStats({ longestStreak: newLongestStreak });
    }

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
    
    // Remove today's completion if it exists
    const newCompletions = completions.filter(date => date !== today);
    const newStreak = this.calculateStreak(newCompletions);

    await updateDoc(habitRef, {
      completions: newCompletions,
      currentStreak: newStreak,
      totalCompletions: increment(-1)
    });

    return { newStreak };
  }

  // User Statistics
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
        updatedAt: serverTimestamp()
      });
    }
  }

  // Referral System
  async processReferral(referralCode) {
    if (!this.currentUser) throw new Error('User not authenticated');

    // Find the referrer
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

    // Update current user as referred
    await this.updateUserStats({ referredBy: referrerId });

    // Update referrer's count
    await updateDoc(referrerDoc.ref, {
      referralCount: increment(1),
      updatedAt: serverTimestamp()
    });

    // Create referral record
    await addDoc(collection(db, 'referrals'), {
      referrerId: referrerId,
      referredUserId: this.currentUser.uid,
      createdAt: serverTimestamp(),
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

  // Analytics
  async trackEvent(eventName, parameters = {}) {
    try {
      await addDoc(collection(db, 'analytics'), {
        userId: this.currentUser?.uid || 'anonymous',
        eventName,
        parameters,
        timestamp: serverTimestamp(),
        platform: 'mobile'
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Utility Methods
  calculateStreak(completions) {
    if (!completions || completions.length === 0) return 0;

    const sortedDates = completions
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b - a); // Most recent first

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
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password is too weak',
      'auth/user-disabled': 'User account has been disabled',
      'auth/user-not-found': 'No user found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many attempts. Try again later',
      'auth/popup-closed-by-user': 'Sign-in popup was closed before completion',
      'auth/popup-blocked': 'Sign-in popup was blocked by the browser',
      'auth/cancelled-popup-request': 'Multiple popup requests detected',
      'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials'
    };

    return new Error(errorMessages[error.code] || error.message);
  }
}

export default new FirebaseService();