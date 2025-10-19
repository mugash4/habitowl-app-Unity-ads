/**
 * Unity Banner Ad Component
 * Displays banner ads at the bottom of screens using IronSource SDK
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

  useEffect(() => {
    initializeBanner();
  }, []);

  const initializeBanner = async () => {
    // Don't show on web
    if (Platform.OS === 'web') {
      return;
    }

    // Check if ads should be shown
    if (!unityAdsService.shouldShowAds()) {
      console.log('Banner ads disabled (premium or not initialized)');
      return;
    }

    // Get banner configuration
    const bannerConfig = unityAdsService.getBannerConfig();
    if (!bannerConfig || !bannerConfig.Component) {
      console.log('Banner ad configuration not available');
      return;
    }

    setPlacementId(bannerConfig.placementId);
    setShouldShow(true);
  };

  const handleAdLoaded = (adInfo) => {
    console.log('Banner ad loaded:', adInfo);
    unityAdsService.trackAdImpression('banner', 'loaded');
  };

  const handleAdLoadFailed = (error) => {
    console.log('Banner ad failed to load:', error);
    setShouldShow(false);
  };

  const handleAdClicked = (adInfo) => {
    console.log('Banner ad clicked:', adInfo);
    unityAdsService.trackAdImpression('banner', 'click');
  };

  const handleAdDisplayed = (adInfo) => {
    console.log('Banner ad displayed:', adInfo);
  };

  const handleAdDisplayFailed = (error) => {
    console.log('Banner ad display failed:', error);
    setShouldShow(false);
  };

  const handleAdLeftApplication = (adInfo) => {
    console.log('Banner ad left application:', adInfo);
  };

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
});

export default UnityBannerAd;
