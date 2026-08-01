// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDca2O9HlRLWSm09kHDtn8CaR2lWdpCXZk",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "habitowl-3405d.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "habitowl-3405d",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "habitowl-3405d.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "387609126713",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:387609126713:web:514bf97800c4d2112ceae8",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-2FFS8JMX4K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ ONLINE-ONLY: removed `initializeAuth` + AsyncStorage persistence.
// Uses stock `getAuth` so no offline token cache; sign-in is required
// to be live every session.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (web only)
let analytics;
if (Platform.OS === "web" && typeof window !== "undefined") {
  // Lazy require to keep native bundle small
  try {
    const { getAnalytics } = require("firebase/analytics");
    analytics = getAnalytics(app);
  } catch (e) {
    // analytics unavailable, ignore
  }
}

export { analytics };
export default app;
