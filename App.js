/**
 * HabitOwl App - Main Entry Point
 * COMPLETE FIX - Better initialization sequence
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [servicesReady, setServicesReady] = useState(false);
  const [initStatus, setInitStatus] = useState('Starting...');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🚀 App starting...');
    
    try {
      const unityAdsService = require('./src/services/UnityAdsService').default;
      
      // Step 1: Pre-load premium status (CRITICAL - must happen first!)
      setInitStatus('Loading user status...');
      console.log('📊 Step 1: Pre-loading premium status...');
      await unityAdsService.preloadPremiumStatus();
      console.log(`✅ Premium status: ${unityAdsService.isPremium ? 'PREMIUM' : 'FREE'}`);
      
      // Step 2: Initialize Unity Ads (with proper delay)
      setInitStatus('Initializing ad system...');
      console.log('📺 Step 2: Initializing Unity Ads...');
      
      // Give a moment for everything to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const initResult = await unityAdsService.initialize();
        if (initResult) {
          console.log('✅ Unity Ads initialized successfully');
        } else {
          console.log('ℹ️ Unity Ads not initialized (may be normal for dev builds)');
        }
      } catch (error) {
        console.log('⚠️ Unity Ads init error (non-critical):', error.message);
      }
      
      // Step 3: Initialize Promo System (optional)
      setInitStatus('Setting up app services...');
      console.log('🎁 Step 3: Initializing promo system...');
      
      // Give another moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const PromoService = require('./src/services/PromoService').default;
        PromoService.initializePromoSystemBackground().catch(error => {
          console.log('⚠️ Promo init failed (non-critical):', error.message);
        });
      } catch (error) {
        console.log('ℹ️ Promo Service not available');
      }
      
      // All done!
      setInitStatus('Ready!');
      console.log('✅ App services initialized successfully');
      console.log('🎉 App ready to use!');
      
      // Small delay before showing main UI
      await new Promise(resolve => setTimeout(resolve, 300));
      setServicesReady(true);
      
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      console.error('Stack:', error.stack);
      
      // Show app anyway - most errors are non-critical
      setInitStatus('Ready (with warnings)');
      setServicesReady(true);
    }
  };

  // Show loading screen while services initialize
  if (!servicesReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>HabitOwl</Text>
        <Text style={styles.loadingText}>{initStatus}</Text>
        <View style={styles.loadingBar}>
          <View style={styles.loadingBarFill} />
        </View>
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
    paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 24,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 2,
  },
});