/**
 * HabitOwl App - Main Entry Point
 * Unity Ads Integrated Version + Automatic Promo System
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import unityAdsService from './src/services/UnityAdsService';
import PromoService from './src/services/PromoService';

export default function App() {
  useEffect(() => {
    // Initialize services when app starts
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      console.log('App: Initializing services...');
      
      // Initialize Unity Ads
      console.log('App: Initializing Unity Ads...');
      await unityAdsService.initialize();
      console.log('App: Unity Ads initialization complete');
      
      // Initialize Promo System (automatic offers)
      // Wait 2 seconds to not slow down app startup
      setTimeout(async () => {
        try {
          console.log('App: Initializing Promo System...');
          await PromoService.initializePromoSystem();
          console.log('App: Promo System initialization complete');
        } catch (error) {
          console.log('App: Promo System init failed (non-critical):', error.message);
        }
      }, 2000);
      
    } catch (error) {
      console.error('App: Failed to initialize services:', error);
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
