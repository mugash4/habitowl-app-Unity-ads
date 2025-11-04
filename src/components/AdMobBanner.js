/**
 * AdMob Banner Ad Component
 * ✅ FIXED: Proper initialization and re-render handling
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import adMobService from '../services/AdMobService';

// Import banner component
let BannerAd = null;
let BannerAdSize = null;
let TestIds = null;

try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
  TestIds = admobModule.TestIds;
} catch (error) {
  console.log('[Banner] AdMob not available');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [bannerConfig, setBannerConfig] = useState(null);
  // ✅ FIX: Force re-render when status changes
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    console.log('[Banner] Component mounted');
    
    // ✅ FIX: Subscribe to premium status changes with immediate update
    const unsubscribe = adMobService.onPremiumStatusChange((isPremiumOrAdmin) => {
      console.log('[Banner] Premium/Admin status changed:', isPremiumOrAdmin);
      // Force re-check
      forceUpdate(n => n + 1);
      setTimeout(() => checkAndInitialize(), 100);
    });

    // Initial check with delay to allow AdMob initialization
    setTimeout(() => checkAndInitialize(), 500);
    
    // Periodic recheck for first 10 seconds
    const recheckInterval = setInterval(() => {
      if (!shouldShow && adMobService.premiumStatusLoaded) {
        checkAndInitialize();
      }
    }, 2000);

    setTimeout(() => clearInterval(recheckInterval), 10000);

    return () => {
      console.log('[Banner] Component unmounted');
      unsubscribe();
      clearInterval(recheckInterval);
    };
  }, []);

  const checkAndInitialize = () => {
    console.log('[Banner] Checking initialization...');
    
    // Platform check
    if (Platform.OS === 'web') {
      console.log('[Banner] Web platform - no ads');
      setShouldShow(false);
      return;
    }

    // Check if SDK is available
    if (!BannerAd) {
      console.log('[Banner] SDK not available');
      setShouldShow(false);
      return;
    }

    // ✅ FIX: Wait for premium status to be loaded
    if (!adMobService.premiumStatusLoaded) {
      console.log('[Banner] Premium status not loaded yet, waiting...');
      setShouldShow(false);
      return;
    }

    // Check if should show ads
    const shouldShowAds = adMobService.shouldShowAds();
    console.log('[Banner] Should show ads:', shouldShowAds);
    
    if (!shouldShowAds) {
      console.log('[Banner] Ads disabled for this user');
      setShouldShow(false);
      return;
    }

    // Get banner config
    const config = adMobService.getBannerConfig();
    if (!config) {
      console.log('[Banner] Config not available');
      setShouldShow(false);
      return;
    }

    console.log('[Banner] ✅ Ready to show banner ad');
    console.log('[Banner] Ad Unit ID:', config.adUnitId);
    setBannerConfig(config);
    setShouldShow(true);
  };

  // Don't render if shouldn't show
  if (!shouldShow || !bannerConfig || !BannerAd || Platform.OS === 'web') {
    console.log('[Banner] Not rendering:', { shouldShow, bannerConfig: !!bannerConfig, BannerAd: !!BannerAd, platform: Platform.OS });
    return null;
  }

  console.log('[Banner] Rendering banner ad');

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={bannerConfig.adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[Banner] ✅ Ad loaded successfully');
          adMobService.trackAdImpression('banner', 'loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Load failed:', error);
        }}
        onAdOpened={() => {
          console.log('[Banner] 👁️ Ad opened');
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
    paddingVertical: 10,
  },
});

export default AdMobBanner;
