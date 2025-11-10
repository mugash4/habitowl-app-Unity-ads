/**
 * ✅ FIXED: AdMob Banner Ad Component
 * Properly subscribes to status changes and displays banner dynamically
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
  console.log('[Banner] ✅ AdMob SDK loaded');
} catch (error) {
  console.log('[Banner] ℹ️ AdMob SDK not available (normal for Expo Go)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [bannerConfig, setBannerConfig] = useState(null);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMountedRef.current = true;
    
    // ✅ FIX: Subscribe to comprehensive status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (!isMountedRef.current) return;
      
      console.log('[Banner] 📢 Status update:', status);
      checkAndUpdate(status);
    });

    // Initial check
    const initialStatus = {
      isInitialized: adMobService.isInitialized,
      isPremium: adMobService.isPremium,
      isAdmin: adMobService.isAdmin,
      premiumStatusLoaded: adMobService.premiumStatusLoaded,
      shouldShowAds: adMobService.shouldShowAds()
    };
    
    console.log('[Banner] 🔍 Initial status:', initialStatus);
    checkAndUpdate(initialStatus);

    // Delayed re-checks to catch late initialization
    const timeout1 = setTimeout(() => {
      if (isMountedRef.current) {
        const status = adMobService.getStatus();
        console.log('[Banner] 🔄 Delayed check (1s):', status.shouldShowAds);
        checkAndUpdate(status);
      }
    }, 1000);

    const timeout2 = setTimeout(() => {
      if (isMountedRef.current) {
        const status = adMobService.getStatus();
        console.log('[Banner] 🔄 Delayed check (2s):', status.shouldShowAds);
        checkAndUpdate(status);
      }
    }, 2000);

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMountedRef.current = false;
      unsubscribe();
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  const checkAndUpdate = (status) => {
    if (!isMountedRef.current) {
      console.log('[Banner] ⚠️ Component unmounted, skipping update');
      return;
    }

    console.log('[Banner] 🔍 Checking display conditions...');
    
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

    // Check if should show ads
    if (!status.shouldShowAds) {
      const reasons = [];
      if (!status.isInitialized) reasons.push('not initialized');
      if (status.isPremium) reasons.push('premium user');
      if (status.isAdmin) reasons.push('admin user');
      if (!status.premiumStatusLoaded) reasons.push('status loading');
      
      const msg = `Ads disabled: ${reasons.join(', ')}`;
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
        <View style={[styles.container, style, styles.debugContainer]}>
          <Text style={styles.debugText}>
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
  },
  debugContainer: {
    height: 50,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});

export default AdMobBanner;
