/**
 * Unity Banner Ad Component
 * Displays banner ads at the bottom of screens
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import unityAdsService from '../services/UnityAdsService';

const UnityBannerAd = ({ style = {} }) => {
  const [BannerComponent, setBannerComponent] = useState(null);
  const [shouldShow, setShouldShow] = useState(false);

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
      return;
    }

    // Get banner configuration
    const bannerConfig = unityAdsService.getBannerConfig();
    if (!bannerConfig || !bannerConfig.Component) {
      console.log('Banner ad not available');
      return;
    }

    try {
      // Create banner instance
      const banner = new bannerConfig.Component({
        placementId: bannerConfig.placementId,
        size: bannerConfig.size,
      });

      // Set up listeners
      banner.setListener({
        onAdLoaded: () => {
          console.log('Banner ad loaded successfully');
          setShouldShow(true);
        },
        onAdLoadFailed: (error) => {
          console.log('Banner ad failed to load:', error);
          setShouldShow(false);
        },
        onAdClicked: () => {
          console.log('Banner ad clicked');
          unityAdsService.trackAdImpression('banner', 'click');
        },
        onAdDisplayed: () => {
          console.log('Banner ad displayed');
          unityAdsService.trackAdImpression('banner', 'impression');
        },
        onAdDisplayFailed: (error) => {
          console.log('Banner ad display failed:', error);
          setShouldShow(false);
        }
      });

      setBannerComponent(() => banner);
      
      // Load the ad
      banner.loadAd();

      // Cleanup on unmount
      return () => {
        try {
          if (banner && banner.destroy) {
            banner.destroy();
          }
        } catch (error) {
          console.log('Error destroying banner ad:', error);
        }
      };
    } catch (error) {
      console.log('Error initializing banner ad:', error);
    }
  };

  // Don't render if we shouldn't show ads or banner not ready
  if (!shouldShow || !BannerComponent || Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {BannerComponent}
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

export default UnityBannerAd;
