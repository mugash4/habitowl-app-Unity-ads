/**
 * HabitOwl App - Main Entry Point
 * Unity Ads Integrated Version
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import unityAdsService from './src/services/UnityAdsService';

import React, { useEffect } from 'react';
import { initializeUnityAds } from './src/services/unityAdsService';

export default function App() {
  useEffect(() => {
    // Initialize Unity Ads when app starts
    const setupAds = async () => {
      try {
        await initializeUnityAds('user_123'); // Replace with actual user ID
        console.log('Unity Ads ready!');
      } catch (error) {
        console.error('Failed to initialize Unity Ads:', error);
      }
    };

    setupAds();
  }, []);

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
