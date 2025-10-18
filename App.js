/**
 * HabitOwl App - Main Entry Point
 * Unity Ads Integrated Version
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import unityAdsService from './src/services/UnityAdsService';

export default function App() {
  useEffect(() => {
    // Initialize Unity Ads when app starts
    initializeAds();
  }, []);

  const initializeAds = async () => {
    try {
      console.log('Initializing Unity Ads...');
      await unityAdsService.initialize();
      console.log('Unity Ads initialization complete');
    } catch (error) {
      console.error('Failed to initialize Unity Ads:', error);
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
