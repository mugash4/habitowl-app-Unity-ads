/**
 * HabitOwl App - Main Entry Point
 * FIXED: Non-blocking service initialization with AdMob
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Initialize services in background WITHOUT blocking UI
    initializeServicesInBackground();
  }, []);

  const initializeServicesInBackground = () => {
    // ✅ All service initialization happens in background
    // App renders immediately, services initialize later
    
    setTimeout(() => {
      // AdMob - non-critical, load in background
      try {
        const adMobService = require('./src/services/AdMobService').default;
        adMobService.initialize().catch(error => {
          console.log('AdMob init failed (non-critical):', error.message);
        });
      } catch (error) {
        console.log('AdMob service not available:', error.message);
      }
    }, 500); // Wait 500ms after app renders

    setTimeout(() => {
      // Promo System - non-critical, load in background
      try {
        const PromoService = require('./src/services/PromoService').default;
        PromoService.initializePromoSystemBackground().catch(error => {
          console.log('Promo System init failed (non-critical):', error.message);
        });
      } catch (error) {
        console.log('Promo Service not available:', error.message);
      }
    }, 2000); // Wait 2s after app renders
  };

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
