/**
 * HabitOwl App - Main Entry Point
 * ✅ UPDATED: Added Error Boundary and Consent Check
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/utils/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary screen="App">
      <StatusBar style="auto" />
      <AppNavigator />
    </ErrorBoundary>
  );
}
