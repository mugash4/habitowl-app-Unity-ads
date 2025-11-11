/**
 * AdMob Banner Component - FIXED VERSION
 * ✅ Properly displays and hides based on user status
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
  console.log('[Banner] ✅ SDK loaded');
} catch (error) {
  console.log('[Banner] ℹ️ SDK not available');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [bannerConfig, setBannerConfig] = useState(null);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const isMounted = useRef(true);
  const checkCount = useRef(0);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;
    
    // ✅ FIX: Subscribe to status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (!isMounted.current) return;
      
      checkCount.current++;
      console.log('[Banner] 📢 Status update #' + checkCount.current + ':', status);
      checkAndUpdate(status);
    });

    // ✅ FIX: Delayed checks for late initialization
    const delays = [500, 1500, 3000];
    const timeouts = delays.map((delay) =>
      setTimeout(() => {
        if (isMounted.current) {
          checkCount.current++;
          const status = adMobService.getStatus();
          console.log('[Banner] 🔄 Delayed check #' + checkCount.current + ' (' + delay + 'ms):', status.shouldShowAds);
          checkAndUpdate(status);
        }
      }, delay)
    );

    return () => {
      console.log('[Banner] 🚪 Unmounting');
      isMounted.current = false;
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const checkAndUpdate = (status) => {
    if (!isMounted.current) return;

    console.log('[Banner] 🔍 Checking display conditions...');
    
    // Platform check
    if (Platform.OS === 'web') {
      setDebugInfo('Web - not supported');
      setShouldShow(false);
      return;
    }

    // SDK check
    if (!BannerAd || !BannerAdSize) {
      setDebugInfo('SDK not loaded (need EAS build)');
      setShouldShow(false);
      return;
    }

    // ✅ FIX: Check shouldShowAds status
    if (!status.shouldShowAds) {
      const reasons = [];
      if (!status.isInitialized) reasons.push('not initialized');
      if (status.isPremium) reasons.push('premium user');
      if (status.isAdmin) reasons.push('admin user');
      if (!status.premiumStatusLoaded) reasons.push('status loading');
      
      const msg = 'Disabled: ' + reasons.join(', ');
      console.log('[Banner] 🚫', msg);
      setDebugInfo(msg);
      setShouldShow(false);
      return;
    }

    // Get config
    const config = adMobService.getBannerConfig();
    if (!config || !config.adUnitId) {
      setDebugInfo('Config unavailable');
      setShouldShow(false);
      return;
    }

    // ✅ All checks passed
    console.log('[Banner] ✅ SHOWING BANNER');
    console.log('[Banner] 📱 Ad Unit:', config.adUnitId);
    setDebugInfo('Showing: ' + config.adUnitId);
    setBannerConfig(config);
    setShouldShow(true);
  };

  // Don't render if shouldn't show
  if (!shouldShow || !bannerConfig || !BannerAd || Platform.OS === 'web') {
    // Debug view in development
    if (__DEV__ && Platform.OS !== 'web') {
      return (
        <View style={[styles.container, style, styles.debugContainer]}>
          <Text style={styles.debugText}>Banner: {debugInfo}</Text>
        </View>
      );
    }
    return null;
  }

  console.log('[Banner] 🎨 Rendering banner');

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={bannerConfig.adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[Banner] ✅ Ad loaded!');
          adMobService.trackAdImpression('banner', 'loaded');
          if (isMounted.current) {
            setDebugInfo('Ad loaded');
          }
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Load failed:', error);
          if (isMounted.current) {
            setDebugInfo('Failed: ' + (error.message || 'Unknown'));
          }
        }}
        onAdOpened={() => {
          console.log('[Banner] 👁️ Ad clicked');
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
    backgroundColor: 'transparent',
  },
  debugContainer: {
    height: 50,
    backgroundColor: '#ffebee',
    paddingHorizontal: 10,
  },
  debugText: {
    fontSize: 10,
    color: '#c62828',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default AdMobBanner;
