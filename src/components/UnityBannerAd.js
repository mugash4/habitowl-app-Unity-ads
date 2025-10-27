/**
 * Unity Banner Ad Component - FIXED VERSION
 * Displays banner ads at the bottom of screens using IronSource SDK
 * 
 * FIXES:
 * - Waits for premium status to load before rendering
 * - Properly subscribes to premium status changes
 * - Better error handling
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import unityAdsService from '../services/UnityAdsService';

// Import banner component
let LevelPlayBannerAdView = null;
try {
  const ironSourceModule = require('ironsource-mediation');
  LevelPlayBannerAdView = ironSourceModule.LevelPlayBannerAdView;
} catch (error) {
  console.log('IronSource banner not available');
}

const UnityBannerAd = ({ style = {} }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [placementId, setPlacementId] = useState(null);
  const [premiumStatusLoaded, setPremiumStatusLoaded] = useState(false); // 🔧 NEW

  useEffect(() => {
    // 🔧 FIXED: Subscribe to premium status changes
    const unsubscribe = unityAdsService.onPremiumStatusChange((isPremium) => {
      console.log('[UnityBannerAd] Premium status changed:', isPremium);
      setPremiumStatusLoaded(true);
      initializeBanner();
    });

    // Initial check (in case premium status already loaded)
    if (unityAdsService.premiumStatusLoaded) {
      setPremiumStatusLoaded(true);
      initializeBanner();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const initializeBanner = () => {
    // Don't show on web
    if (Platform.OS === 'web') {
      console.log('[UnityBannerAd] Web platform, skipping banner');
      return;
    }

    // 🔧 FIXED: Wait for premium status to be loaded
    if (!unityAdsService.premiumStatusLoaded) {
      console.log('[UnityBannerAd] Waiting for premium status to load...');
      return;
    }

    // Check if ads should be shown
    if (!unityAdsService.shouldShowAds()) {
      console.log('[UnityBannerAd] Ads disabled (premium or not initialized)');
      setShouldShow(false);
      return;
    }

    // Get banner configuration
    const bannerConfig = unityAdsService.getBannerConfig();
    if (!bannerConfig || !bannerConfig.Component) {
      console.log('[UnityBannerAd] Banner configuration not available');
      setShouldShow(false);
      return;
    }

    console.log('[UnityBannerAd] ✅ Banner ready to show with placement:', bannerConfig.placementId);
    setPlacementId(bannerConfig.placementId);
    setShouldShow(true);
  };

  const handleAdLoaded = (adInfo) => {
    console.log('[UnityBannerAd] ✅ Banner ad loaded:', adInfo);
    unityAdsService.trackAdImpression('banner', 'loaded');
  };

  const handleAdLoadFailed = (error) => {
    console.log('[UnityBannerAd] ❌ Banner ad failed to load:', error);
    // Don't hide banner container, just log the error
    // The SDK will auto-retry
  };

  const handleAdClicked = (adInfo) => {
    console.log('[UnityBannerAd] 👆 Banner ad clicked:', adInfo);
    unityAdsService.trackAdImpression('banner', 'click');
  };

  const handleAdDisplayed = (adInfo) => {
    console.log('[UnityBannerAd] 👁️ Banner ad displayed:', adInfo);
  };

  const handleAdDisplayFailed = (error) => {
    console.log('[UnityBannerAd] ❌ Banner ad display failed:', error);
  };

  const handleAdLeftApplication = (adInfo) => {
    console.log('[UnityBannerAd] 🚪 Banner ad left application:', adInfo);
  };

  // 🔧 FIXED: Show loading state while waiting for premium status
  if (!premiumStatusLoaded) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Don't render if we shouldn't show ads
  if (!shouldShow || !LevelPlayBannerAdView || Platform.OS === 'web' || !placementId) {
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
  loadingContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default UnityBannerAd;
