/**
 * Unity Banner Ad Component - COMPLETE FIX
 * 
 * ✅ FIXED ISSUES:
 * - No more "Loading..." text
 * - Better error handling
 * - Proper premium status subscription
 * - Graceful fallback when ads fail
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import unityAdsService from '../services/UnityAdsService';

// Import banner component
let LevelPlayBannerAdView = null;
try {
  const ironSourceModule = require('ironsource-mediation');
  LevelPlayBannerAdView = ironSourceModule.LevelPlayBannerAdView;
} catch (error) {
  console.log('[Banner] IronSource not available');
}

const UnityBannerAd = ({ style = {} }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [placementId, setPlacementId] = useState(null);
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
      console.log('[Banner] Ads disabled');
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

    console.log('[Banner] ✅ Ready with placement:', bannerConfig.placementId);
    setPlacementId(bannerConfig.placementId);
    setIsReady(true);
    setShouldShow(true);
  };

  const handleAdLoaded = (adInfo) => {
    console.log('[Banner] ✅ Ad loaded');
    unityAdsService.trackAdImpression('banner', 'loaded');
  };

  const handleAdLoadFailed = (error) => {
    console.log('[Banner] ❌ Load failed:', error);
    // Keep showing container - SDK will retry
  };

  const handleAdClicked = (adInfo) => {
    console.log('[Banner] 👆 Clicked');
    unityAdsService.trackAdImpression('banner', 'click');
  };

  const handleAdDisplayed = (adInfo) => {
    console.log('[Banner] 👁️ Displayed');
  };

  const handleAdDisplayFailed = (error) => {
    console.log('[Banner] ❌ Display failed:', error);
  };

  const handleAdLeftApplication = (adInfo) => {
    console.log('[Banner] 🚪 Left app');
  };

  // Don't render if shouldn't show
  if (!shouldShow || !isReady || !LevelPlayBannerAdView || Platform.OS === 'web' || !placementId) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <LevelPlayBannerAdView
        placementName={placementId}
        adSize="BANNER"
        onAdLoaded={handleAdLoaded}
        onAdLoadFailed={handleAdLoadFailed}
        onAdClicked={handleAdClicked}
        onAdDisplayed={handleAdDisplayed}
        onAdDisplayFailed={handleAdDisplayFailed}
        onAdLeftApplication={handleAdLeftApplication}
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
    width: '100%',
    height: 50,
  },
});

export default UnityBannerAd;