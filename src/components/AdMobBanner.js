/**
 * AdMob Banner Ad Component
 * ✅ FIXED: Proper initialization and re-render handling with race condition protection
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import adMobService from '../services/AdMobService';

// Import banner component
let BannerAd = null;
let BannerAdSize = null;

try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
} catch (error) {
  console.log('[Banner] AdMob SDK not available');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [bannerConfig, setBannerConfig] = useState(null);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const checkCountRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMountedRef.current = true;
    
    // ✅ FIX: Subscribe to premium status changes with immediate response
    const unsubscribe = adMobService.onPremiumStatusChange((isPremiumOrAdmin) => {
      if (!isMountedRef.current) return;
      
      console.log('[Banner] 📢 Premium/Admin status update:', isPremiumOrAdmin);
      checkAndInitialize();
    });

    // ✅ FIX: Multiple check attempts to handle race conditions
    const checkAttempts = [100, 500, 1000, 2000, 3000];
    const timeouts = checkAttempts.map((delay) => 
      setTimeout(() => {
        if (isMountedRef.current) {
          checkAndInitialize();
        }
      }, delay)
    );

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMountedRef.current = false;
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const checkAndInitialize = () => {
    if (!isMountedRef.current) {
      console.log('[Banner] ⚠️ Component unmounted, skipping check');
      return;
    }

    checkCountRef.current += 1;
    console.log(`[Banner] 🔍 Check #${checkCountRef.current}: Evaluating ad display conditions...`);
    
    // Platform check
    if (Platform.OS === 'web') {
      const msg = 'Web platform - ads not supported';
      console.log(`[Banner] ℹ️ ${msg}`);
      setDebugInfo(msg);
      setShouldShow(false);
      return;
    }

    // SDK availability check
    if (!BannerAd || !BannerAdSize) {
      const msg = 'AdMob SDK not loaded (need EAS build)';
      console.log(`[Banner] ⚠️ ${msg}`);
      setDebugInfo(msg);
      setShouldShow(false);
      return;
    }

    // Premium status loaded check
    if (!adMobService.premiumStatusLoaded) {
      const msg = 'Waiting for premium status...';
      console.log(`[Banner] ⏳ ${msg}`);
      setDebugInfo(msg);
      setShouldShow(false);
      return;
    }

    // AdMob initialization check
    if (!adMobService.isInitialized) {
      const msg = 'AdMob not initialized yet...';
      console.log(`[Banner] ⏳ ${msg}`);
      setDebugInfo(msg);
      setShouldShow(false);
      return;
    }

    // Check if should show ads
    const shouldShowAds = adMobService.shouldShowAds();
    console.log(`[Banner] 🎯 shouldShowAds() = ${shouldShowAds}`);
    
    if (!shouldShowAds) {
      const status = adMobService.getStatus();
      const msg = `Ads disabled - Premium: ${status.isPremium}, Admin: ${status.isAdmin}`;
      console.log(`[Banner] 🚫 ${msg}`);
      setDebugInfo(msg);
      setShouldShow(false);
      return;
    }

    // Get banner config
    const config = adMobService.getBannerConfig();
    if (!config || !config.adUnitId) {
      const msg = 'Banner config unavailable';
      console.log(`[Banner] ❌ ${msg}`);
      setDebugInfo(msg);
      setShouldShow(false);
      return;
    }

    // ✅ All checks passed - show banner
    console.log('[Banner] ✅ All checks passed! Showing banner ad');
    console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
    setDebugInfo(`Showing ad: ${config.adUnitId}`);
    setBannerConfig(config);
    setShouldShow(true);
  };

  // Don't render if shouldn't show
  if (!shouldShow || !bannerConfig || !BannerAd || Platform.OS === 'web') {
    // Show debug info in development
    if (__DEV__ && Platform.OS !== 'web') {
      return (
        <View style={[styles.container, style, { height: 50, backgroundColor: '#f0f0f0' }]}>
          <Text style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>
            Banner Ad: {debugInfo}
          </Text>
        </View>
      );
    }
    return null;
  }

  console.log('[Banner] 🎨 Rendering banner ad component');

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={bannerConfig.adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[Banner] ✅ Ad loaded successfully!');
          adMobService.trackAdImpression('banner', 'loaded');
          if (isMountedRef.current) {
            setDebugInfo('Ad loaded successfully');
          }
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Ad load failed:', error);
          if (isMountedRef.current) {
            setDebugInfo(`Load failed: ${error.message || 'Unknown error'}`);
          }
        }}
        onAdOpened={() => {
          console.log('[Banner] 👁️ Ad opened/clicked');
          adMobService.trackAdImpression('banner', 'click');
        }}
        onAdClosed={() => {
          console.log('[Banner] 🚪 Ad closed');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 5,
  },
});

export default AdMobBanner;
