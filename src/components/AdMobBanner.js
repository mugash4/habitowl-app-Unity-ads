/**
 * AdMob Banner Ad Component
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

  useEffect(() => {
    // Subscribe to premium status changes
    const unsubscribe = adMobService.onPremiumStatusChange((isPremium) => {
      console.log('[Banner] Premium status:', isPremium);
      checkAndInitialize();
    });

    // Initial check
    if (adMobService.premiumStatusLoaded) {
      checkAndInitialize();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const checkAndInitialize = () => {
    // Platform check
    if (Platform.OS === 'web') {
      setShouldShow(false);
      return;
    }

    // Wait for premium status
    if (!adMobService.premiumStatusLoaded) {
      setShouldShow(false);
      return;
    }

    // Check if should show ads
    if (!adMobService.shouldShowAds()) {
      console.log('[Banner] Ads disabled');
      setShouldShow(false);
      return;
    }

    // Get banner config
    const config = adMobService.getBannerConfig();
    if (!config || !BannerAd) {
      console.log('[Banner] Config not available');
      setShouldShow(false);
      return;
    }

    console.log('[Banner] ✅ Ready to show');
    setBannerConfig(config);
    setShouldShow(true);
  };

  // Don't render if shouldn't show
  if (!shouldShow || !bannerConfig || !BannerAd || Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={bannerConfig.adUnitId}
        size={bannerConfig.size}
        requestOptions={adMobService.getRequestOptions ? adMobService.getRequestOptions() : {}}
        onAdLoaded={() => {
          console.log('[Banner] ✅ Ad loaded');
          adMobService.trackAdImpression('banner', 'loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Load failed:', error);
        }}
        onAdOpened={() => {
          console.log('[Banner] 👁️ Opened');
          adMobService.trackAdImpression('banner', 'click');
        }}
        onAdClosed={() => {
          console.log('[Banner] 🚪 Closed');
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
