/**
 * HabitOwl App - Main Entry Point
 * FIXED: Non-blocking service initialization
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
    // ✅ FIXED: All service initialization happens in background
    // App renders immediately, services initialize later
    
    setTimeout(() => {
      // Unity Ads - non-critical, load in background
      try {
        const unityAdsService = require('./src/services/UnityAdsService').default;
        unityAdsService.initialize().catch(error => {
          console.log('Unity Ads init failed (non-critical):', error.message);
        });
      } catch (error) {
        console.log('Unity Ads service not available:', error.message);
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
