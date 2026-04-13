import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import FirebaseService from "./FirebaseService";

class PrivacyComplianceService {
  async recordUserConsent(userId, consentData) {
    try {
      const consentDoc = {
        userId,
        agreedToTerms: consentData.agreedToTerms || false,
        agreedToPrivacy: consentData.agreedToPrivacy || false,
        agreedToDataProcessing: consentData.agreedToDataProcessing || false,
        marketingConsent: consentData.marketingConsent || false,
        dateOfBirth: consentData.dateOfBirth || null,
        isOver13: consentData.isOver13 !== false,
        consentDate: new Date().toISOString(),
        ipAddress: null,
        platform: consentData.platform || "mobile",
        appVersion: consentData.appVersion || "1.12.0",
      };

      await addDoc(collection(db, "user_consents"), consentDoc);
      await AsyncStorage.setItem("consent_recorded", "true");
      return true;
    } catch (error) {
      console.error("❌ Error recording consent:", error);
      throw error;
    }
  }

  async hasUserGivenConsent(userId) {
    try {
      const localConsent = await AsyncStorage.getItem("consent_recorded");
      if (localConsent === "true") return true;

      const consentQuery = query(
        collection(db, "user_consents"),
        where("userId", "==", userId),
      );

      const snapshot = await getDocs(consentQuery);
      const hasConsent = !snapshot.empty;

      if (hasConsent) {
        await AsyncStorage.setItem("consent_recorded", "true");
      }

      return hasConsent;
    } catch (error) {
      console.error("Error checking consent:", error);
      return false;
    }
  }

  async verifyAge(dateOfBirth) {
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      const actualAge =
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
          ? age - 1
          : age;

      return {
        age: actualAge,
        isOver13: actualAge >= 13,
        verified: true,
      };
    } catch (error) {
      console.error("Error verifying age:", error);
      return {
        age: null,
        isOver13: false,
        verified: false,
        error: error.message,
      };
    }
  }

  async checkCOPPACompliance(userId) {
    try {
      const consentQuery = query(
        collection(db, "user_consents"),
        where("userId", "==", userId),
      );

      const snapshot = await getDocs(consentQuery);
      if (snapshot.empty) {
        return { compliant: false, reason: "No consent record found" };
      }

      const consentData = snapshot.docs[0].data();

      if (consentData.isOver13 === false) {
        return {
          compliant: false,
          reason: "User is under 13 years old - COPPA restricted",
          requiresParentalConsent: true,
        };
      }

      return { compliant: true };
    } catch (error) {
      console.error("Error checking COPPA compliance:", error);
      return { compliant: false, reason: "Error checking compliance" };
    }
  }

  async reportCrash(crashData) {
    try {
      const crashReport = {
        userId: auth.currentUser?.uid || "anonymous",
        userEmail: auth.currentUser?.email || "anonymous",
        errorMessage: crashData.errorMessage || "Unknown error",
        errorStack: crashData.errorStack || "",
        errorName: crashData.errorName || "Error",
        screen: crashData.screen || "Unknown",
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: crashData.platform || "unknown",
          osVersion: crashData.osVersion || "unknown",
          appVersion: crashData.appVersion || "1.12.0",
        },
        userActions: crashData.userActions || [],
        resolved: false,
      };

      await addDoc(collection(db, "crash_reports"), crashReport);
      return true;
    } catch (error) {
      console.error("❌ Error reporting crash:", error);
      return false;
    }
  }

  async exportUserData(userId) {
    try {
      const results = await Promise.allSettled([
        this._getUserProfile(userId),
        this._getUserHabits(userId),
        this._getUserAnalytics(userId),
        this._getUserReferrals(userId),
        this._getUserConsents(userId),
      ]);

      const userData = this._resolveSettledValue(results[0], null);
      const habits = this._resolveSettledValue(results[1], []);
      const analytics = this._resolveSettledValue(results[2], []);
      const referrals = this._resolveSettledValue(results[3], []);
      const consents = this._resolveSettledValue(results[4], []);

      const exportData = {
        exportDate: new Date().toISOString(),
        exportVersion: "1.12.0",
        exportType: "GDPR_Data_Portability",
        user: userData,
        habits,
        analytics,
        referrals,
        consents,
        metadata: {
          totalHabits: habits.length,
          totalAnalyticsEvents: analytics.length,
          totalReferrals: referrals.length,
        },
        note: "This file contains your HabitOwl account data export.",
      };

      await this._logDataExport(userId);
      return exportData;
    } catch (error) {
      console.error("❌ Error exporting user data:", error);
      throw error;
    }
  }

  async exportUserDataToFile(userId) {
    try {
      const data = await this.exportUserData(userId);
      const jsonString = JSON.stringify(data, null, 2);

      const fileName = `HabitOwl_UserData_${userId}_${Date.now()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let shared = false;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export Your HabitOwl Data",
        });
        shared = true;
      }

      return {
        uri: fileUri,
        fileName,
        shared,
      };
    } catch (error) {
      console.error("❌ Error exporting to file:", error);
      throw error;
    }
  }

  async exportHabitsToCSV(userId) {
    try {
      const habits = await this._getUserHabits(userId);

      let csv =
        "Habit Name,Description,Goal,Frequency,Category,Current Streak,Longest Streak,Total Completions,Created Date,Last Completed\n";

      habits.forEach((habit) => {
        const row = [
          this._escapeCSV(habit.name || ""),
          this._escapeCSV(habit.description || ""),
          habit.goal || "",
          habit.frequency || habit.scheduleType || "",
          habit.category || "",
          habit.currentStreak || 0,
          habit.longestStreak || 0,
          habit.totalCompletions || 0,
          habit.createdAt || "",
          habit.lastCompletedAt || "Never",
        ].join(",");

        csv += `${row}\n`;
      });

      const fileName = `HabitOwl_Habits_${userId}_${Date.now()}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let shared = false;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Your Habits",
        });
        shared = true;
      }

      return {
        uri: fileUri,
        fileName,
        shared,
      };
    } catch (error) {
      console.error("❌ Error exporting habits to CSV:", error);
      throw error;
    }
  }

  async requestAccountDeletion(userId, reason) {
    try {
      const pendingDeletion = await this.checkPendingDeletion(userId);
      if (pendingDeletion.hasPendingDeletion) {
        return {
          success: true,
          alreadyPending: true,
          ...pendingDeletion,
          message:
            "A deletion request is already pending for this account. You can cancel it before the scheduled date.",
        };
      }

      const scheduledDeletionDate = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const deletionRequest = {
        userId,
        userEmail: auth.currentUser?.email || "unknown",
        reason: reason || "User requested deletion",
        requestDate: new Date().toISOString(),
        scheduledDeletionDate,
        status: "pending",
        dataExported: false,
        gracePeriodDays: 7,
      };

      await addDoc(collection(db, "deletion_requests"), deletionRequest);

      return {
        success: true,
        alreadyPending: false,
        gracePeriodDays: 7,
        scheduledDate: scheduledDeletionDate,
        message:
          "Your account deletion request has been saved. You have 7 days to cancel it from Settings before deletion is processed.",
      };
    } catch (error) {
      console.error("❌ Error requesting account deletion:", error);
      throw error;
    }
  }

  async cancelAccountDeletion(userId) {
    try {
      const deletionQuery = query(
        collection(db, "deletion_requests"),
        where("userId", "==", userId),
        where("status", "==", "pending"),
      );

      const snapshot = await getDocs(deletionQuery);

      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, {
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Error cancelling deletion:", error);
      throw error;
    }
  }

  async checkPendingDeletion(userId) {
    try {
      const deletionQuery = query(
        collection(db, "deletion_requests"),
        where("userId", "==", userId),
        where("status", "==", "pending"),
      );

      const snapshot = await getDocs(deletionQuery);

      if (!snapshot.empty) {
        const deletionData = snapshot.docs[0].data();
        const scheduledDate = new Date(deletionData.scheduledDeletionDate);
        const daysRemaining = Math.max(
          0,
          Math.ceil((scheduledDate - new Date()) / (1000 * 60 * 60 * 24)),
        );

        return {
          hasPendingDeletion: true,
          daysRemaining,
          scheduledDate: deletionData.scheduledDeletionDate,
          requestDate: deletionData.requestDate,
        };
      }

      return { hasPendingDeletion: false };
    } catch (error) {
      console.error("Error checking pending deletion:", error);
      return { hasPendingDeletion: false };
    }
  }

  async _getUserProfile(userId) {
    try {
      const userQuery = query(collection(db, "users"), where("uid", "==", userId));
      const snapshot = await getDocs(userQuery);

      if (!snapshot.empty) {
        return snapshot.docs[0].data();
      }
    } catch (error) {
      console.log("User profile export fallback:", error.message);
    }

    try {
      const localStats = await FirebaseService.getUserStats();
      return {
        uid: userId,
        email: auth.currentUser?.email || localStats?.email || null,
        displayName:
          auth.currentUser?.displayName || localStats?.displayName || "HabitOwl User",
        ...localStats,
      };
    } catch (error) {
      return {
        uid: userId,
        email: auth.currentUser?.email || null,
        displayName: auth.currentUser?.displayName || "HabitOwl User",
      };
    }
  }

  async _getUserHabits(userId) {
    try {
      const habitsQuery = query(
        collection(db, "habits"),
        where("userId", "==", userId),
      );
      const snapshot = await getDocs(habitsQuery);
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
      console.log("Habit export fallback:", error.message);
      const habits = await FirebaseService.getUserHabits();
      return Array.isArray(habits) ? habits : [];
    }
  }

  async _getUserAnalytics(userId) {
    try {
      const analyticsQuery = query(
        collection(db, "analytics"),
        where("userId", "==", userId),
      );
      const snapshot = await getDocs(analyticsQuery);
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
      console.log("Analytics export skipped:", error.message);
      return [];
    }
  }

  async _getUserReferrals(userId) {
    try {
      const referralsQuery = query(
        collection(db, "referrals"),
        where("referrerId", "==", userId),
      );
      const snapshot = await getDocs(referralsQuery);
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
      console.log("Referral export skipped:", error.message);
      return [];
    }
  }

  async _getUserConsents(userId) {
    try {
      const consentQuery = query(
        collection(db, "user_consents"),
        where("userId", "==", userId),
      );
      const snapshot = await getDocs(consentQuery);
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
      console.log("Consent export skipped:", error.message);
      return [];
    }
  }

  async _logDataExport(userId) {
    try {
      await addDoc(collection(db, "data_exports"), {
        userId,
        exportDate: new Date().toISOString(),
        exportType: "user_request",
        success: true,
      });
    } catch (error) {
      console.error("Error logging data export:", error);
    }
  }

  _resolveSettledValue(result, fallback) {
    if (result?.status === "fulfilled") {
      return result.value;
    }
    return fallback;
  }

  _escapeCSV(str) {
    if (typeof str !== "string") return str;
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

export default new PrivacyComplianceService();
