/**
 * HabitOwl App - Main Entry Point
 * FIXED: Proper service initialization with premium status pre-loading
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [servicesReady, setServicesReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🚀 App starting...');
    
    // 🔧 CRITICAL FIX: Pre-load premium status BEFORE initializing ads
    try {
      const unityAdsService = require('./src/services/UnityAdsService').default;
      
      // Step 1: Load premium status first
      console.log('📊 Step 1: Loading premium status...');
      await unityAdsService.preloadPremiumStatus();
      console.log('✅ Premium status loaded:', unityAdsService.isPremium ? 'PREMIUM' : 'FREE');
      
      // Step 2: Initialize Unity Ads (will respect premium status)
      console.log('📺 Step 2: Initializing Unity Ads...');
      setTimeout(async () => {
        try {
          await unityAdsService.initialize();
          console.log('✅ Unity Ads initialization complete');
        } catch (error) {
          console.log('⚠️ Unity Ads init failed (non-critical):', error.message);
        }
      }, 1000); // Wait 1 second after premium status loads
      
      // Step 3: Initialize Promo System
      setTimeout(() => {
        try {
          const PromoService = require('./src/services/PromoService').default;
          PromoService.initializePromoSystemBackground().catch(error => {
            console.log('⚠️ Promo System init failed (non-critical):', error.message);
          });
        } catch (error) {
          console.log('⚠️ Promo Service not available:', error.message);
        }
      }, 2000);
      
      setServicesReady(true);
      console.log('✅ App services initialized');
      
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setServicesReady(true); // Continue anyway
    }
  };

  // Show loading screen briefly while services initialize
  if (!servicesReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading HabitOwl...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 18,
    color: '#4f46e5',
    fontWeight: '600',
  },
});
