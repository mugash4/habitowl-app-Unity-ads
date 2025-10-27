/**
 * HabitOwl App - Main Entry Point
 * FIXED - No initialization screen, direct app load
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Initialize services in background (non-blocking)
    initializeBackgroundServices();
  }, []);

  const initializeBackgroundServices = async () => {
    try {
      console.log('🚀 Starting background initialization...');
      
      // Run initialization in background without blocking UI
      setTimeout(async () => {
        try {
          const unityAdsService = require('./src/services/UnityAdsService').default;
          
          // Load premium status first
          await unityAdsService.preloadPremiumStatus();
          console.log(`✅ Premium status: ${unityAdsService.isPremium ? 'PREMIUM' : 'FREE'}`);
          
          // Try to initialize Unity Ads (non-blocking, can fail silently)
          try {
            await unityAdsService.initialize();
            console.log('✅ Unity Ads initialized');
          } catch (error) {
            console.log('ℹ️ Unity Ads not available:', error.message);
            // This is fine - ads just won't show
          }
          
        } catch (error) {
          console.log('ℹ️ Background services init skipped:', error.message);
        }
      }, 100); // Small delay to let app render first
      
    } catch (error) {
      console.log('ℹ️ Background init error (non-critical):', error.message);
    }
  };

  // Load app immediately - no loading screen!
  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
