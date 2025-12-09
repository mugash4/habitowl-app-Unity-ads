// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  initializeAuth,
  getReactNativePersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
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

// ✅ FIX: Initialize Auth with AsyncStorage persistence for React Native
// This ensures users stay logged in even after closing the app
let auth;

if (Platform.OS === 'web') {
  // For web, use default auth (browser persistence)
  auth = getAuth(app);
} else {
  // For mobile (iOS/Android), use AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialize Firestore and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (only in web environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

console.log('✅ Firebase initialized with persistence enabled');

export { auth, analytics };
export default app;