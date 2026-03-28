/**
 * HabitOwl App - Main Entry Point
 * ✅ UPDATED: Added Test Account Service initialization
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/utils/ErrorBoundary';
import testAccountService from './src/services/TestAccountService';

export default function App() {
  useEffect(() => {
    // ✅ Load test emails from Firestore on app start
    testAccountService.loadTestEmailsFromFirestore().catch(err => {
      console.log('Could not load test emails:', err.message);
    });
  }, []);

  return (
    <ErrorBoundary screen="App">
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
