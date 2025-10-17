/**
 * BannerAd Component
 * Simplified banner ad component that works with EAS Build
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import AdService from '../services/AdService';

const BannerAd = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [BannerAdComponent, setBannerAdComponent] = useState(null);
  const [BannerAdSize, setBannerAdSize] = useState(null);

  useEffect(() => {
    checkAdAvailability();
  }, []);

  const checkAdAvailability = async () => {
    // Don't show ads on web
    if (Platform.OS === 'web') {
      return;
    }

    // Check if user should see ads
    const show = AdService.shouldShowAds();
    setShouldShow(show);

    if (show) {
      // Try to load the native module
      try {
        const adModule = require('react-native-google-mobile-ads');
        setBannerAdComponent(() => adModule.BannerAd);
        setBannerAdSize(adModule.BannerAdSize);
      } catch (error) {
        console.log('Banner ad module not available');
      }
    }
  };

  // Don't render anything if:
  // - User shouldn't see ads (premium or web)
  // - Native module not available
  // - BannerAd component not loaded
  if (!shouldShow || !BannerAdComponent || !BannerAdSize) {
    return null;
  }

  const adUnitId = AdService.getBannerAdUnitId();
  
  if (!adUnitId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAdComponent
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.log('Banner ad failed to load:', error);
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
});

export default BannerAd;