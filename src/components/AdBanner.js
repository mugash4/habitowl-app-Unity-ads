import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import AdService from '../services/AdService';

const AdBanner = ({ 
  style = {},
  placement = 'general',
  testMode = false 
}) => {
  const [shouldShowAd, setShouldShowAd] = useState(false);
  const [adError, setAdError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    checkAdVisibility();
  }, []);

  const checkAdVisibility = async () => {
    const showAds = AdService.shouldShowAds();
    setShouldShowAd(showAds);
  };

  const handleAdLoaded = () => {
    setIsLoaded(true);
    setAdError(null);
    console.log(`Banner ad loaded successfully - ${placement}`);
  };

  const handleAdError = (error) => {
    setAdError(error);
    setIsLoaded(false);
    console.error(`Banner ad error in ${placement}:`, error);
  };

  if (!shouldShowAd) {
    return null;
  }

  const bannerProps = AdService.getBannerProps();
  if (!bannerProps) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={testMode ? TestIds.BANNER : bannerProps.unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={handleAdError}
        onAdLoaded={handleAdLoaded}
      />
      
      {adError && !isLoaded && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ad unavailable</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    minHeight: 50,
  },
  banner: {
    width: '100%',
  },
  errorContainer: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
    margin: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AdBanner;
