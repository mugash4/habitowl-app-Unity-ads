/**
 * ✅ FIXED: AdMob Banner Component
 * Now properly displays for free users
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import adMobService from '../services/AdMobService';

// Import AdMob components
let BannerAd = null;
let BannerAdSize = null;

try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
  console.log('[Banner] ✅ AdMob SDK loaded');
} catch (error) {
  console.log('[Banner] ℹ️ AdMob SDK not available (requires EAS build)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldDisplay, setShouldDisplay] = useState(false);
  const [adConfig, setAdConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const checkCount = useRef(0);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;
    
    const evaluateDisplayConditions = (status) => {
      if (!isMounted.current) return;

      checkCount.current++;
      console.log('[Banner] 📊 Check #' + checkCount.current, 'Evaluating:', status);

      // Check #1: Premium/Admin users - NO ADS
      if (status.isPremium || status.isAdmin) {
        console.log('[Banner] 👑 Premium/Admin - RETURNING NULL');
        setShouldDisplay(false);
        setIsLoading(false);
        return;
      }

      // Check #2: Platform
      if (Platform.OS === 'web') {
        console.log('[Banner] 🌐 Web platform - ads not supported');
        setShouldDisplay(false);
        setIsLoading(false);
        return;
      }

      // Check #3: SDK availability
      if (!BannerAd || !BannerAdSize) {
        console.log('[Banner] ⚠️ AdMob SDK not available');
        setShouldDisplay(false);
        setIsLoading(false);
        return;
      }

      // Check #4: Get ad configuration
      const config = adMobService.getBannerConfig();
      if (!config || !config.adUnitId) {
        console.log('[Banner] ⚠️ Ad configuration unavailable');
        setShouldDisplay(false);
        setIsLoading(false);
        return;
      }

      // Check #5: Premium status must be loaded
      if (!status.premiumStatusLoaded) {
        console.log('[Banner] ⏳ Waiting for premium status to load...');
        setIsLoading(true);
        return;
      }

      // ✅ FREE USER - SHOW BANNER
      console.log('[Banner] ✅✅✅ FREE USER - DISPLAYING BANNER AD ✅✅✅');
      setAdConfig(config);
      setShouldDisplay(true);
      setIsLoading(false);
    };
    
    // Immediate check
    const immediateStatus = adMobService.getStatus();
    console.log('[Banner] 🚀 Initial status:', immediateStatus);
    evaluateDisplayConditions(immediateStatus);
    
    // Subscribe to status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (isMounted.current) {
        console.log('[Banner] 📢 Status update received');
        evaluateDisplayConditions(status);
      }
    });

    // Multiple delayed checks to catch late initialization
    const timeouts = [100, 300, 500, 1000, 2000, 3000, 5000].map((delay) =>
      setTimeout(() => {
        if (isMounted.current) {
          const currentStatus = adMobService.getStatus();
          console.log(`[Banner] ⏰ Delayed check at ${delay}ms`);
          evaluateDisplayConditions(currentStatus);
        }
      }, delay)
    );

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Return null for web platform
  if (Platform.OS === 'web') {
    console.log('[Banner] 🌐 Web - returning null');
    return null;
  }

  // Return null if SDK not available
  if (!BannerAd || !BannerAdSize) {
    console.log('[Banner] ⚠️ SDK not available - returning null');
    return null;
  }

  // Show loading placeholder while determining status
  if (isLoading) {
    console.log('[Banner] ⏳ Loading status...');
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading ad...</Text>
      </View>
    );
  }

  // Return null if shouldn't display
  if (!shouldDisplay) {
    console.log('[Banner] 🚫 Should not display - returning null');
    return null;
  }

  // Render banner for FREE users
  console.log('[Banner] ✅ Rendering banner with Ad Unit ID:', adConfig?.adUnitId);
  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adConfig.adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[Banner] ✅✅✅ AD LOADED AND DISPLAYED SUCCESSFULLY ✅✅✅');
          adMobService.trackAdImpression('banner', 'loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Ad load failed:', error.message);
          console.log('[Banner] Error details:', JSON.stringify(error));
        }}
        onAdOpened={() => {
          console.log('[Banner] 👁️ Ad clicked by user');
          adMobService.trackAdImpression('banner', 'click');
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
    height: 50,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  loadingText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default AdMobBanner;
