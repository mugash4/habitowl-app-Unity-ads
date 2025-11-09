/**
 * AdMob Banner Ad Component
 * ✅ FIXED: Proper status subscription with real-time updates
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMountedRef.current = true;
    
    // ✅ FIX: Subscribe to all status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (!isMountedRef.current) return;
      
      console.log('[Banner] 📢 Status update received:', status);
      checkAndUpdate(status);
    });

    // Initial check
    checkAndUpdate({
      isInitialized: adMobService.isInitialized,
      isPremium: adMobService.isPremium,
      isAdmin: adMobService.isAdmin,
      premiumStatusLoaded: adMobService.premiumStatusLoaded,
      shouldShowAds: adMobService.shouldShowAds()
    });

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMountedRef.current = false;
      unsubscribe();
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
      const msg = `Ads disabled - Init: ${status.isInitialized}, Premium: ${status.isPremium}, Admin: ${status.isAdmin}`;
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
