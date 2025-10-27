/**
 * Unity Banner Ad Component - COMPLETE FIX FOR FREE PLAN
 * 
 * ✅ CRITICAL FIXES APPLIED:
 * 1. Removed manual loadAd() call - let the component auto-load
 * 2. Simplified props - only use adUnitId (not both adUnitId and placementName)
 * 3. Better error handling and state management
 * 4. Proper initialization checks
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import unityAdsService from '../services/UnityAdsService';

// Import banner component
let LevelPlayBannerAdView = null;
let LevelPlayAdSize = null;
try {
  const ironSourceModule = require('ironsource-mediation');
  LevelPlayBannerAdView = ironSourceModule.LevelPlayBannerAdView;
  LevelPlayAdSize = ironSourceModule.LevelPlayAdSize;
} catch (error) {
  console.log('[Banner] IronSource not available');
}

const UnityBannerAd = ({ style = {} }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Subscribe to premium status changes
    const unsubscribe = unityAdsService.onPremiumStatusChange((isPremium) => {
      console.log('[Banner] Premium status:', isPremium);
      checkAndInitialize();
    });

    // Initial check
    if (unityAdsService.premiumStatusLoaded) {
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
    if (!unityAdsService.premiumStatusLoaded) {
      setShouldShow(false);
      return;
    }

    // Check if should show ads
    if (!unityAdsService.shouldShowAds()) {
      console.log('[Banner] Ads disabled (premium or not initialized)');
      setShouldShow(false);
      return;
    }

    // Get banner config
    const bannerConfig = unityAdsService.getBannerConfig();
    if (!bannerConfig || !bannerConfig.Component) {
      console.log('[Banner] Config not available');
      setShouldShow(false);
      return;
    }

    console.log('[Banner] ✅ Ready with ad unit:', bannerConfig.placementId);
    setAdUnitId(bannerConfig.placementId);
    setIsReady(true);
    setShouldShow(true);
  };

  const handleAdLoaded = useCallback((adInfo) => {
    console.log('[Banner] ✅ Ad loaded:', adInfo);
    unityAdsService.trackAdImpression('banner', 'loaded');
  }, []);

  const handleAdLoadFailed = useCallback((error) => {
    console.log('[Banner] ❌ Load failed:', error);
    // Keep showing container - SDK will retry automatically
  }, []);

  const handleAdClicked = useCallback((adInfo) => {
    console.log('[Banner] 👆 Clicked');
    unityAdsService.trackAdImpression('banner', 'click');
  }, []);

  const handleAdDisplayed = useCallback((adInfo) => {
    console.log('[Banner] 👁️ Displayed');
    unityAdsService.trackAdImpression('banner', 'displayed');
  }, []);

  const handleAdDisplayFailed = useCallback((adInfo, error) => {
    console.log('[Banner] ❌ Display failed:', error);
  }, []);

  const handleAdLeftApplication = useCallback((adInfo) => {
    console.log('[Banner] 🚪 Left app');
  }, []);

  const handleAdExpanded = useCallback((adInfo) => {
    console.log('[Banner] 📐 Expanded');
  }, []);

  const handleAdCollapsed = useCallback((adInfo) => {
    console.log('[Banner] 📐 Collapsed');
  }, []);

  // Don't render if shouldn't show
  if (!shouldShow || !isReady || !LevelPlayBannerAdView || Platform.OS === 'web' || !adUnitId) {
    return null;
  }

  const adSize = LevelPlayAdSize ? LevelPlayAdSize.BANNER : 'BANNER';

  return (
    <View style={[styles.container, style]}>
      <LevelPlayBannerAdView
        adUnitId={adUnitId}
        adSize={adSize}
        listener={{
          onAdLoaded: handleAdLoaded,
          onAdLoadFailed: handleAdLoadFailed,
          onAdClicked: handleAdClicked,
          onAdDisplayed: handleAdDisplayed,
          onAdDisplayFailed: handleAdDisplayFailed,
          onAdLeftApplication: handleAdLeftApplication,
          onAdExpanded: handleAdExpanded,
          onAdCollapsed: handleAdCollapsed,
        }}
        style={styles.banner}
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
  banner: {
    width: 320,
    height: 50,
    alignSelf: 'center',
  },
});

export default UnityBannerAd;