import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDocsFromServer,
  getDocsFromCache,
  query,
  where,
  orderBy,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { db, auth } from "../config/firebase";
import testAccountService from "./TestAccountService";
import {
  normalizeHabitSchedule,
  calculateHabitStreak,
} from "../utils/habitHelpers";

let adMobService = null;

function getAdMobService() {
  if (!adMobService) {
    try {
      adMobService = require("./AdMobService").default;
    } catch (error) {
      console.log("AdMobService not available");
    }
  }
  return adMobService;
}

const ONBOARDING_STORAGE_KEY = "habitowl_onboarding_completed";
const LOCAL_DEVICE_ID_KEY = "habitowl_local_device_id";
const LOCAL_HABITS_KEY = "habitowl_local_habits";
const LOCAL_USER_CACHE_KEY = "habitowl_user_cache";
const CACHE_DURATION = 30000;
const SYNC_INTERVAL_MS = 15000;

class FirebaseService {
  constructor() {
    this.currentUser = auth.currentUser || null;
    this.authStateChangedListeners = [];
    this.habitsCache = null;
    this.lastCacheTime = null;
    this.deviceId = null;
    this.syncInFlight = false;
    this.authBootstrapInFlight = false;

    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      this.habitsCache = null;
      this.lastCacheTime = null;

      if (user) {
        try {
          await this.createUserDocument(user);
        } catch (error) {
          console.log("User document sync deferred:", error.message);
        }
      }

      this.authStateChangedListeners.forEach((listener) => listener(user));

      if (user) {
        this.syncPendingHabitsInBackground();
      }
    });

    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          this.ensureAnonymousUser().catch(() => {});
          this.syncPendingHabitsInBackground();
        }
      },
    );

    this.syncInterval = setInterval(() => {
      this.syncPendingHabitsInBackground();
    }, SYNC_INTERVAL_MS);
  }

  async getDeviceId() {
    if (this.deviceId) {
      return this.deviceId;
    }

    const storedId = await AsyncStorage.getItem(LOCAL_DEVICE_ID_KEY);
    if (storedId) {
      this.deviceId = storedId;
      return storedId;
    }

    const newId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(LOCAL_DEVICE_ID_KEY, newId);
    this.deviceId = newId;
    return newId;
  }

  async loadLocalHabits() {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_HABITS_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((habit) => this.normalizeLocalHabit(habit));
    } catch (error) {
      console.error("Error loading local habits:", error);
      return [];
    }
  }

  async persistLocalHabits(habits) {
    const normalizedHabits = habits
      .map((habit) => this.normalizeLocalHabit(habit))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    await AsyncStorage.setItem(
      LOCAL_HABITS_KEY,
      JSON.stringify(normalizedHabits),
    );
    this.habitsCache = this.getVisibleHabits(normalizedHabits);
    this.lastCacheTime = Date.now();
  }

  normalizeLocalHabit(habit) {
    const normalizedSchedule = normalizeHabitSchedule(habit || {});

    return {
      id: habit.id,
      name: habit.name || "",
      description: habit.description || "",
      category: habit.category || "wellness",
      difficulty: habit.difficulty || 2,
      estimatedTime: habit.estimatedTime || "5 min",
      reminderEnabled: !!habit.reminderEnabled,
      reminderTime: habit.reminderTime || null,
      reminderMessage: habit.reminderMessage || null,
      scheduleType: normalizedSchedule.scheduleType,
      selectedDays: normalizedSchedule.selectedDays,
      weeklyTarget: normalizedSchedule.weeklyTarget,
      cue: normalizedSchedule.cue,
      location: normalizedSchedule.location,
      reward: normalizedSchedule.reward,
      templateId: normalizedSchedule.templateId,
      isPremiumTemplate: !!normalizedSchedule.isPremiumTemplate,
      createdAt: habit.createdAt || new Date().toISOString(),
      updatedAt: habit.updatedAt || new Date().toISOString(),
      userId: habit.userId || null,
      currentStreak: habit.currentStreak || 0,
      longestStreak: habit.longestStreak || 0,
      totalCompletions: habit.totalCompletions || 0,
      completions: Array.isArray(habit.completions) ? habit.completions : [],
      isActive: habit.isActive !== false,
      lastCompletedAt: habit.lastCompletedAt || null,
      deletedAt: habit.deletedAt || null,
      syncStatus: habit.syncStatus || "synced",
      pendingDelete: !!habit.pendingDelete,
      isSyncedToRemote: !!habit.isSyncedToRemote,
      lastSyncedAt: habit.lastSyncedAt || null,
    };
  }

  getVisibleHabits(habits) {
    return habits
      .filter((habit) => habit.isActive !== false && !habit.pendingDelete)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((habit) => ({ ...habit }));
  }

  async cacheHabits(habits) {
    try {
      await this.persistLocalHabits(habits);
      console.log(`✅ Cached ${habits.length} habits locally`);
    } catch (error) {
      console.error("Error caching habits:", error);
    }
  }

  async getCachedHabits() {
    try {
      if (
        this.habitsCache &&
        this.lastCacheTime &&
        Date.now() - this.lastCacheTime < CACHE_DURATION
      ) {
        return this.habitsCache;
      }

      const habits = await this.loadLocalHabits();
      const visibleHabits = this.getVisibleHabits(habits);
      this.habitsCache = visibleHabits;
      this.lastCacheTime = Date.now();
      return visibleHabits;
    } catch (error) {
      console.error("Error getting cached habits:", error);
      return [];
    }
  }

  async clearHabitsCache() {
    try {
      this.habitsCache = null;
      this.lastCacheTime = null;
      console.log("🗑️ In-memory habits cache cleared");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  async getCachedUserProfile() {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_USER_CACHE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error reading cached user profile:", error);
      return {};
    }
  }

  async cacheUserProfile(profile) {
    try {
      const current = await this.getCachedUserProfile();
      const nextProfile = {
        ...current,
        ...profile,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        LOCAL_USER_CACHE_KEY,
        JSON.stringify(nextProfile),
      );
      return nextProfile;
    } catch (error) {
      console.error("Error caching user profile:", error);
      return profile;
    }
  }

  async buildLocalUserStats() {
    const localHabits = await this.loadLocalHabits();
    const visibleHabits = this.getVisibleHabits(localHabits);
    const cachedProfile = await this.getCachedUserProfile();

    const computedLongestStreak = visibleHabits.reduce(
      (best, habit) => Math.max(best, habit.longestStreak || 0),
      0,
    );

    return {
      displayName:
        this.currentUser?.displayName ||
        cachedProfile.displayName ||
        this.currentUser?.email?.split("@")[0] ||
        "HabitOwl User",
      email: this.currentUser?.email || cachedProfile.email || "",
      photoURL: this.currentUser?.photoURL || cachedProfile.photoURL || null,
      isPremium: !!cachedProfile.isPremium,
      referralCount: cachedProfile.referralCount || 0,
      referralCode: cachedProfile.referralCode || this.generateReferralCode(),
      aiCoachingUsage: cachedProfile.aiCoachingUsage || {
        dateKey: "",
        count: 0,
      },
      totalHabits: visibleHabits.length,
      longestStreak: Math.max(
        cachedProfile.longestStreak || 0,
        computedLongestStreak,
      ),
      authProvider:
        cachedProfile.authProvider ||
        (this.currentUser?.isAnonymous ? "anonymous" : "password"),
      uid: this.currentUser?.uid || cachedProfile.uid || null,
    };
  }

  async syncCachedStatsFromHabits(habits = []) {
    const visibleHabits = this.getVisibleHabits(habits);
    const longestStreak = visibleHabits.reduce(
      (best, habit) => Math.max(best, habit.longestStreak || 0),
      0,
    );

    await this.cacheUserProfile({
      totalHabits: visibleHabits.length,
      longestStreak,
    });
  }

  async hasPremiumAccess() {
    const stats = await this.getUserStats();
    let adminStatus = false;

    if (this.currentUser?.email) {
      try {
        const AdminService = require("./AdminService").default;
        adminStatus = await AdminService.checkAdminStatus(
          this.currentUser.email,
        );
      } catch (error) {
        console.log("Admin status check skipped:", error.message);
      }
    }

    return !!stats?.isPremium || adminStatus;
  }

  async canCreateHabit(limit = 5) {
    const habits = await this.getCachedHabits();
    const hasPremium = await this.hasPremiumAccess();

    return {
      allowed: hasPremium || habits.length < limit,
      count: habits.length,
      limit,
      hasPremium,
    };
  }

  async signUp(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName });
      await this.createUserDocument({ ...user, displayName });

      if (testAccountService.isTestAccount(email)) {
        await testAccountService.grantTestAccountPremium(email, user.uid);
      }

      this.syncPendingHabitsInBackground();
      return user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw this.handleFirebaseError(error);
    }
  }

  async signIn(email, password) {
    try {
      if (!email || !password) {
        throw new Error("Email and password required");
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (testAccountService.isTestAccount(email)) {
        await testAccountService.grantTestAccountPremium(email, user.uid);
      }

      this.syncPendingHabitsInBackground();
      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithGoogleWeb() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");

      const result = await signInWithPopup(auth, provider);

      if (result?.user) {
        await this.createUserDocument(result.user);

        if (
          result.user.email &&
          testAccountService.isTestAccount(result.user.email)
        ) {
          await testAccountService.grantTestAccountPremium(
            result.user.email,
            result.user.uid,
          );
        }

        this.syncPendingHabitsInBackground();
        return result.user;
      }

      return null;
    } catch (error) {
      console.error("Google sign in error:", error);
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithGoogleCredential(idToken) {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);

      if (result?.user) {
        await this.createUserDocument(result.user);

        if (
          result.user.email &&
          testAccountService.isTestAccount(result.user.email)
        ) {
          await testAccountService.grantTestAccountPremium(
            result.user.email,
            result.user.uid,
          );
        }

        this.syncPendingHabitsInBackground();
        return result.user;
      }

      return null;
    } catch (error) {
      console.error("Google credential error:", error);
      throw this.handleFirebaseError(error);
    }
  }

  async signOut() {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(
        ONBOARDING_STORAGE_KEY,
      );
      await signOut(auth);
      await AsyncStorage.clear();

      if (onboardingCompleted === "true") {
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      }

      this.deviceId = null;
      this.habitsCache = null;
      this.lastCacheTime = null;
      console.log("Sign out successful");
    } catch (error) {
      console.error("Sign out error:", error);
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

      if (this.authBootstrapInFlight) {
        return null;
      }

      this.authBootstrapInFlight = true;
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      this.currentUser = user;
      await this.createUserDocument(user);
      return user;
    } catch (error) {
      console.error("Anonymous sign in error:", error);
      throw this.handleFirebaseError(error);
    } finally {
      this.authBootstrapInFlight = false;
    }
  }

  onAuthStateChanged(callback) {
    this.authStateChangedListeners.push(callback);
    callback(this.currentUser);

    return () => {
      this.authStateChangedListeners = this.authStateChangedListeners.filter(
        (listener) => listener !== callback,
      );
    };
  }

  async createUserDocument(user) {
    try {
      const localStats = await this.buildLocalUserStats();
      const derivedDisplayName =
        user.displayName || user.email?.split("@")[0] || localStats.displayName;

      const baseUserDoc = {
        uid: user.uid,
        email: user.email || null,
        displayName: derivedDisplayName,
        photoURL: user.photoURL || null,
        createdAt: localStats.createdAt || new Date().toISOString(),
        isPremium: !!localStats.isPremium,
        totalHabits: localStats.totalHabits || 0,
        longestStreak: localStats.longestStreak || 0,
        referralCode: localStats.referralCode || this.generateReferralCode(),
        referredBy: localStats.referredBy || null,
        referralCount: localStats.referralCount || 0,
        aiCoachingUsage: localStats.aiCoachingUsage || {
          dateKey: "",
          count: 0,
        },
        authProvider: user.isAnonymous
          ? "anonymous"
          : user.providerData?.[0]?.providerId || "password",
      };

      const q = query(collection(db, "users"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(collection(db, "users"), baseUserDoc);
        await this.cacheUserProfile(baseUserDoc);
        return baseUserDoc;
      }

      const existingDoc = querySnapshot.docs[0];
      const existingData = existingDoc.data();
      const mergedUserDoc = {
        ...existingData,
        ...baseUserDoc,
        createdAt: existingData.createdAt || baseUserDoc.createdAt,
        isPremium: existingData.isPremium ?? baseUserDoc.isPremium,
        referralCode: existingData.referralCode || baseUserDoc.referralCode,
        referralCount: existingData.referralCount || 0,
        aiCoachingUsage:
          existingData.aiCoachingUsage || baseUserDoc.aiCoachingUsage,
      };

      await updateDoc(existingDoc.ref, {
        ...mergedUserDoc,
        updatedAt: new Date().toISOString(),
      });

      await this.cacheUserProfile(mergedUserDoc);
      return mergedUserDoc;
    } catch (error) {
      console.error("Error with user document:", error);

      const fallbackProfile = {
        uid: user.uid,
        email: user.email || null,
        displayName:
          user.displayName || user.email?.split("@")[0] || "HabitOwl User",
        photoURL: user.photoURL || null,
        authProvider: user.isAnonymous
          ? "anonymous"
          : user.providerData?.[0]?.providerId || "password",
      };

      await this.cacheUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  }

  async pullRemoteHabits() {
    if (!this.currentUser) {
      return this.getCachedHabits();
    }

    try {
      const q = query(
        collection(db, "habits"),
        where("userId", "==", this.currentUser.uid),
        where("isActive", "==", true),
      );

      let querySnapshot;
      try {
        querySnapshot = await getDocsFromServer(q);
      } catch (serverError) {
        querySnapshot = await getDocsFromCache(q);
      }

      const remoteHabits = [];
      querySnapshot.forEach((snapshot) => {
        remoteHabits.push(
          this.normalizeLocalHabit({
            id: snapshot.id,
            ...snapshot.data(),
            syncStatus: "synced",
            pendingDelete: false,
            isSyncedToRemote: true,
            lastSyncedAt: new Date().toISOString(),
          }),
        );
      });

      const localHabits = await this.loadLocalHabits();
      const mergedMap = new Map();

      localHabits.forEach((habit) => {
        mergedMap.set(habit.id, habit);
      });

      remoteHabits.forEach((remoteHabit) => {
        const localHabit = mergedMap.get(remoteHabit.id);

        if (!localHabit) {
          mergedMap.set(remoteHabit.id, remoteHabit);
          return;
        }

        if (localHabit.pendingDelete || localHabit.syncStatus === "pending") {
          return;
        }

        mergedMap.set(remoteHabit.id, remoteHabit);
      });

      const mergedHabits = Array.from(mergedMap.values());
      await this.persistLocalHabits(mergedHabits);
      return this.getVisibleHabits(mergedHabits);
    } catch (error) {
      console.log("Remote habits pull skipped:", error.message);
      return this.getCachedHabits();
    }
  }

  async syncPendingHabitsInBackground() {
    this.syncPendingHabits().catch((error) => {
      console.log("Background habit sync postponed:", error.message);
    });
  }

  serializeHabitForRemote(habit) {
    const normalized = this.normalizeLocalHabit(habit);

    return {
      name: normalized.name,
      description: normalized.description,
      category: normalized.category,
      difficulty: normalized.difficulty,
      estimatedTime: normalized.estimatedTime,
      reminderEnabled: normalized.reminderEnabled,
      reminderTime: normalized.reminderTime,
      reminderMessage: normalized.reminderMessage,
      scheduleType: normalized.scheduleType,
      selectedDays: normalized.selectedDays,
      weeklyTarget: normalized.weeklyTarget,
      cue: normalized.cue,
      location: normalized.location,
      reward: normalized.reward,
      templateId: normalized.templateId,
      isPremiumTemplate: !!normalized.isPremiumTemplate,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      userId: this.currentUser?.uid || normalized.userId,
      currentStreak: normalized.currentStreak || 0,
      longestStreak: normalized.longestStreak || 0,
      totalCompletions: normalized.totalCompletions || 0,
      completions: Array.isArray(normalized.completions)
        ? normalized.completions
        : [],
      isActive: normalized.isActive !== false,
      lastCompletedAt: normalized.lastCompletedAt || null,
      deletedAt: normalized.deletedAt || null,
    };
  }

  async syncPendingHabits() {
    if (this.syncInFlight) {
      return;
    }

    if (!this.currentUser) {
      try {
        await this.ensureAnonymousUser();
      } catch (error) {
        return;
      }
    }

    if (!this.currentUser) {
      return;
    }

    this.syncInFlight = true;

    try {
      let localHabits = await this.loadLocalHabits();
      let changed = false;

      for (const habit of [...localHabits]) {
        if (habit.pendingDelete) {
          if (habit.isSyncedToRemote) {
            await setDoc(
              doc(db, "habits", habit.id),
              {
                ...this.serializeHabitForRemote({
                  ...habit,
                  isActive: false,
                  deletedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              },
              { merge: true },
            );
          }

          localHabits = localHabits.filter((item) => item.id !== habit.id);
          changed = true;
          continue;
        }

        if (habit.syncStatus !== "pending") {
          continue;
        }

        await setDoc(
          doc(db, "habits", habit.id),
          this.serializeHabitForRemote(habit),
          { merge: true },
        );

        const index = localHabits.findIndex((item) => item.id === habit.id);
        if (index !== -1) {
          localHabits[index] = {
            ...localHabits[index],
            userId: this.currentUser.uid,
            syncStatus: "synced",
            isSyncedToRemote: true,
            lastSyncedAt: new Date().toISOString(),
          };
          changed = true;
        }
      }

      if (changed) {
        await this.persistLocalHabits(localHabits);
      }

      await this.syncUserStatsFromLocal(localHabits);
      await this.pullRemoteHabits();
    } finally {
      this.syncInFlight = false;
    }
  }

  async syncUserStatsFromLocal(habits) {
    if (!this.currentUser) {
      return;
    }

    try {
      const visibleHabits = this.getVisibleHabits(habits);
      const longestStreak = visibleHabits.reduce(
        (best, habit) => Math.max(best, habit.longestStreak || 0),
        0,
      );

      const q = query(
        collection(db, "users"),
        where("uid", "==", this.currentUser.uid),
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        await this.createUserDocument(this.currentUser);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      await updateDoc(userDoc.ref, {
        totalHabits: visibleHabits.length,
        longestStreak,
        updatedAt: new Date().toISOString(),
      });

      await this.cacheUserProfile({
        totalHabits: visibleHabits.length,
        longestStreak,
      });
    } catch (error) {
      console.log("User stats sync skipped:", error.message);
    }
  }

  generateHabitId() {
    return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async createHabit(habitData) {
    try {
      const creationCheck = await this.canCreateHabit(5);
      if (!creationCheck.allowed) {
        throw new Error(
          "Free plan limit reached. Upgrade to Premium to create unlimited habits.",
        );
      }

      const now = new Date().toISOString();
      const ownerId = this.currentUser?.uid || (await this.getDeviceId());
      const newHabit = this.normalizeLocalHabit({
        ...habitData,
        id: this.generateHabitId(),
        userId: ownerId,
        createdAt: habitData.createdAt || now,
        updatedAt: now,
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        isActive: true,
        completions: [],
        syncStatus: "pending",
        pendingDelete: false,
        isSyncedToRemote: false,
      });

      const habits = await this.loadLocalHabits();
      habits.unshift(newHabit);
      await this.persistLocalHabits(habits);
      await this.syncCachedStatsFromHabits(habits);
      this.syncPendingHabitsInBackground();
      return newHabit;
    } catch (error) {
      console.error("Error creating habit:", error);
      throw new Error(error.message || "Failed to create habit");
    }
  }

  async getUserHabits(forceRefresh = false) {
    try {
      if (forceRefresh) {
        await this.pullRemoteHabits();
      } else {
        const cachedHabits = await this.getCachedHabits();
        if (cachedHabits.length === 0 && this.currentUser) {
          await this.pullRemoteHabits();
        }
      }

      this.syncPendingHabitsInBackground();
      return await this.getCachedHabits();
    } catch (error) {
      console.error("Error fetching habits:", error);
      return this.getCachedHabits();
    }
  }

  async syncHabitsInBackground() {
    await this.pullRemoteHabits();
    this.syncPendingHabitsInBackground();
  }

  async updateHabit(habitId, updates) {
    const habits = await this.loadLocalHabits();
    const index = habits.findIndex((habit) => habit.id === habitId);

    if (index === -1) {
      throw new Error("Habit not found");
    }

    habits[index] = this.normalizeLocalHabit({
      ...habits[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
      pendingDelete: false,
    });

    await this.persistLocalHabits(habits);
    await this.syncCachedStatsFromHabits(habits);
    this.syncPendingHabitsInBackground();
    return habits[index];
  }

  async deleteHabit(habitId) {
    const habits = await this.loadLocalHabits();
    const index = habits.findIndex((habit) => habit.id === habitId);

    if (index === -1) {
      throw new Error("Habit not found");
    }

    const targetHabit = habits[index];

    if (!targetHabit.isSyncedToRemote) {
      const remainingHabits = habits.filter((habit) => habit.id !== habitId);
      await this.persistLocalHabits(remainingHabits);
      await this.syncCachedStatsFromHabits(remainingHabits);
      return true;
    }

    habits[index] = this.normalizeLocalHabit({
      ...targetHabit,
      isActive: false,
      pendingDelete: true,
      syncStatus: "pending",
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await this.persistLocalHabits(habits);
    await this.syncCachedStatsFromHabits(habits);
    this.syncPendingHabitsInBackground();
    return true;
  }

  async completeHabit(habitId) {
    const habits = await this.loadLocalHabits();
    const index = habits.findIndex((habit) => habit.id === habitId);

    if (index === -1) {
      throw new Error("Habit not found");
    }

    const habit = habits[index];
    const today = new Date().toDateString();
    const completions = Array.isArray(habit.completions)
      ? [...habit.completions]
      : [];

    if (completions.includes(today)) {
      throw new Error("Already completed today");
    }

    completions.push(today);
    const newStreak = calculateHabitStreak({ ...habit, completions });
    const newLongestStreak = Math.max(habit.longestStreak || 0, newStreak);

    habits[index] = this.normalizeLocalHabit({
      ...habit,
      completions,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      totalCompletions: (habit.totalCompletions || 0) + 1,
      lastCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    });

    await this.persistLocalHabits(habits);
    await this.syncCachedStatsFromHabits(habits);
    this.syncPendingHabitsInBackground();

    return { newStreak, newLongestStreak };
  }

  async uncompleteHabit(habitId) {
    const habits = await this.loadLocalHabits();
    const index = habits.findIndex((habit) => habit.id === habitId);

    if (index === -1) {
      throw new Error("Habit not found");
    }

    const habit = habits[index];
    const today = new Date().toDateString();
    const completions = (habit.completions || []).filter(
      (date) => date !== today,
    );
    const newStreak = calculateHabitStreak({ ...habit, completions });

    habits[index] = this.normalizeLocalHabit({
      ...habit,
      completions,
      currentStreak: newStreak,
      totalCompletions: Math.max(0, (habit.totalCompletions || 0) - 1),
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    });

    await this.persistLocalHabits(habits);
    await this.syncCachedStatsFromHabits(habits);
    this.syncPendingHabitsInBackground();

    return { newStreak };
  }

  async getUserStats() {
    const localStats = await this.buildLocalUserStats();

    if (!this.currentUser) {
      return localStats;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("uid", "==", this.currentUser.uid),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const createdProfile = await this.createUserDocument(this.currentUser);
        return {
          ...localStats,
          ...createdProfile,
          totalHabits: localStats.totalHabits,
          longestStreak: Math.max(
            localStats.longestStreak,
            createdProfile.longestStreak || 0,
          ),
        };
      }

      const userData = querySnapshot.docs[0].data();
      let mergedUserData = {
        ...userData,
        displayName: userData.displayName || localStats.displayName,
        email: userData.email || localStats.email,
        totalHabits: localStats.totalHabits,
        longestStreak: Math.max(
          userData.longestStreak || 0,
          localStats.longestStreak || 0,
        ),
      };

      if (this.currentUser.email) {
        try {
          const AdminService = require("./AdminService").default;
          const isAdmin = await AdminService.checkAdminStatus(
            this.currentUser.email,
          );
          if (isAdmin && !mergedUserData.isPremium) {
            mergedUserData = {
              ...mergedUserData,
              isPremium: true,
              premiumReason: "admin_access",
            };

            await updateDoc(querySnapshot.docs[0].ref, {
              isPremium: true,
              premiumUpdatedAt: new Date().toISOString(),
              premiumReason: "admin_access",
            });
          }
        } catch (error) {
          console.log("Admin status check skipped:", error.message);
        }
      }

      await this.cacheUserProfile(mergedUserData);
      return {
        ...localStats,
        ...mergedUserData,
        totalHabits: localStats.totalHabits,
        longestStreak: Math.max(
          localStats.longestStreak,
          mergedUserData.longestStreak || 0,
        ),
      };
    } catch (error) {
      console.log("Using cached local user stats:", error.message);
      return localStats;
    }
  }

  async updateUserStats(updates) {
    const cachedProfile = await this.getCachedUserProfile();
    const localStats = await this.buildLocalUserStats();
    const nextProfile = {
      ...cachedProfile,
      ...updates,
      totalHabits: localStats.totalHabits,
      longestStreak: localStats.longestStreak,
      updatedAt: new Date().toISOString(),
    };

    await this.cacheUserProfile(nextProfile);

    if (!this.currentUser) {
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("uid", "==", this.currentUser.uid),
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, nextProfile);
      }
    } catch (error) {
      console.log("User stats remote update deferred:", error.message);
    }
  }

  async getAICoachingUsageStatus(limit = 2) {
    const userStats = await this.getUserStats();
    const dateKey = new Date().toISOString().split("T")[0];
    const usage = userStats?.aiCoachingUsage || {};
    const count = usage.dateKey === dateKey ? usage.count || 0 : 0;

    return {
      dateKey,
      count,
      limit,
      remaining: Math.max(limit - count, 0),
    };
  }

  async consumeAICoachingUse(limit = 2) {
    const usageStatus = await this.getAICoachingUsageStatus(limit);

    if (usageStatus.count >= limit) {
      return {
        allowed: false,
        ...usageStatus,
      };
    }

    const nextCount = usageStatus.count + 1;
    const updatedUsage = {
      dateKey: usageStatus.dateKey,
      count: nextCount,
    };

    await this.updateUserStats({
      aiCoachingUsage: updatedUsage,
    });

    return {
      allowed: true,
      dateKey: usageStatus.dateKey,
      count: nextCount,
      limit,
      remaining: Math.max(limit - nextCount, 0),
    };
  }

  async processReferral(referralCode) {
    if (!this.currentUser) {
      throw new Error("You need internet connection to use referral codes");
    }

    const q = query(
      collection(db, "users"),
      where("referralCode", "==", referralCode),
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error("Invalid referral code");
    }

    const referrerDoc = querySnapshot.docs[0];
    const referrerId = referrerDoc.data().uid;

    if (referrerId === this.currentUser.uid) {
      throw new Error("Cannot refer yourself");
    }

    await this.updateUserStats({ referredBy: referrerId });

    await updateDoc(referrerDoc.ref, {
      referralCount: (referrerDoc.data().referralCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });

    await addDoc(collection(db, "referrals"), {
      referrerId,
      referredUserId: this.currentUser.uid,
      createdAt: new Date().toISOString(),
      status: "completed",
    });

    return true;
  }

  async getUserReferrals() {
    if (!this.currentUser) {
      return [];
    }

    const q = query(
      collection(db, "referrals"),
      where("referrerId", "==", this.currentUser.uid),
      orderBy("createdAt", "desc"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));
  }

  async trackEvent(eventName, parameters = {}) {
    try {
      if (!this.currentUser) {
        return;
      }

      await addDoc(collection(db, "analytics"), {
        userId: this.currentUser.uid,
        eventName,
        parameters,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      });
    } catch (error) {
      console.error("Analytics error:", error);
    }
  }

  calculateStreak(completions) {
    if (!completions || completions.length === 0) {
      return 0;
    }

    const sortedDates = completions
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i += 1) {
      const currentDate = new Date(sortedDates[i]);
      currentDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (currentDate.getTime() === expectedDate.getTime()) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  }

  generateReferralCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "OWL";
    for (let i = 0; i < 3; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  handleFirebaseError(error) {
    const errorMessages = {
      "auth/email-already-in-use": "Email already registered",
      "auth/invalid-email": "Invalid email address",
      "auth/operation-not-allowed": "Operation not allowed",
      "auth/weak-password": "Password too weak (min 6 chars)",
      "auth/user-disabled": "User account disabled",
      "auth/user-not-found": "No user found",
      "auth/wrong-password": "Incorrect password",
      "auth/invalid-credential": "Invalid credentials",
      "auth/too-many-requests": "Too many attempts. Try later",
      "auth/popup-closed-by-user": "Sign-in popup closed",
      "auth/popup-blocked": "Sign-in popup blocked",
      "auth/cancelled-popup-request": "Multiple popup requests",
      "auth/account-exists-with-different-credential":
        "Account exists with different credentials",
      "auth/network-request-failed": "Network error. Check internet",
      "auth/invalid-api-key": "Invalid API key",
      "auth/app-not-authorized": "App not authorized",
    };

    const message =
      errorMessages[error.code] || error.message || "Unexpected error";
    return new Error(message);
  }

  async updateUserPremiumStatus(isPremium) {
    try {
      await this.cacheUserProfile({
        isPremium,
        premiumUpdatedAt: new Date().toISOString(),
      });

      if (!this.currentUser) {
        return true;
      }

      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", this.currentUser.uid),
      );
      const querySnapshot = await getDocs(userQuery);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          isPremium,
          premiumUpdatedAt: new Date().toISOString(),
        });
      }

      const adMob = getAdMobService();
      if (adMob) {
        const isAdmin = await this.checkIfUserIsAdmin(this.currentUser.email);
        await adMob.setPremiumStatus(isPremium, isAdmin);
      }

      return true;
    } catch (error) {
      console.error("Error updating premium:", error);
      throw error;
    }
  }

  async checkIfUserIsAdmin(email) {
    try {
      const AdminService = require("./AdminService").default;
      return await AdminService.checkAdminStatus(email);
    } catch (error) {
      return false;
    }
  }
}

export default new FirebaseService();
