/**
 * AdMob Banner Component - FIXED VERSION
 * ✅ Displays real banner ad content (no placeholder)
 * ✅ Auto-hides for admin/premium users
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
  const [debugMsg, setDebugMsg] = useState('Initializing...');
  const isMounted = useRef(true);
  const checkCounter = useRef(0);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;
    
    // ✅ Subscribe to AdMob status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (!isMounted.current) return;
      
      checkCounter.current++;
      console.log('[Banner] 📢 Status update #' + checkCounter.current + ':', {
        shouldShowAds: status.shouldShowAds,
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        isInitialized: status.isInitialized
      });
      
      evaluateDisplayConditions(status);
    });

    // ✅ Delayed checks for late initialization
    const checkDelays = [500, 1500, 3000];
    const timeoutIds = checkDelays.map((delay) =>
      setTimeout(() => {
        if (isMounted.current) {
          checkCounter.current++;
          const currentStatus = adMobService.getStatus();
          console.log('[Banner] ⏰ Delayed check #' + checkCounter.current + ' (' + delay + 'ms)');
          evaluateDisplayConditions(currentStatus);
        }
      }, delay)
    );

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
      unsubscribe();
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  const evaluateDisplayConditions = (status) => {
    if (!isMounted.current) return;

    console.log('[Banner] 🔍 Evaluating display conditions...');
    
    // ✅ Check #1: Platform
    if (Platform.OS === 'web') {
      setDebugMsg('Web platform - ads not supported');
      setShouldDisplay(false);
      return;
    }

    // ✅ Check #2: SDK availability
    if (!BannerAd || !BannerAdSize) {
      setDebugMsg('AdMob SDK not loaded (requires EAS build)');
      setShouldDisplay(false);
      return;
    }

    // ✅ Check #3: Should show ads (main logic)
    if (!status.shouldShowAds) {
      const reasons = [];
      if (!status.isInitialized) reasons.push('not initialized');
      if (status.isPremium) reasons.push('premium user');
      if (status.isAdmin) reasons.push('admin user');
      if (!status.premiumStatusLoaded) reasons.push('loading status');
      
      const message = 'Hidden: ' + reasons.join(', ');
      console.log('[Banner] 🚫', message);
      setDebugMsg(message);
      setShouldDisplay(false);
      return;
    }

    // ✅ Check #4: Get ad configuration
    const config = adMobService.getBannerConfig();
    if (!config || !config.adUnitId) {
      setDebugMsg('Ad configuration unavailable');
      setShouldDisplay(false);
      return;
    }

    // ✅ ALL CHECKS PASSED - Show banner ad
    console.log('[Banner] ✅ DISPLAYING BANNER AD');
    console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
    setDebugMsg('Active: ' + config.adUnitId);
    setAdConfig(config);
    setShouldDisplay(true);
  };

  // ✅ Don't render if conditions not met
  if (!shouldDisplay || !adConfig || !BannerAd || Platform.OS === 'web') {
    // Show debug info in development mode only
    if (__DEV__ && Platform.OS !== 'web') {
      return (
        <View style={[styles.debugContainer, style]}>
          <Text style={styles.debugText}>Banner Status: {debugMsg}</Text>
        </View>
      );
    }
    return null;
  }

  console.log('[Banner] 🎨 Rendering banner ad component');

  // ✅ Render real AdMob banner ad (not placeholder)
  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adConfig.adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[Banner] ✅ Ad loaded successfully!');
          adMobService.trackAdImpression('banner', 'loaded');
          if (isMounted.current) {
            setDebugMsg('Ad displayed');
          }
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Ad load failed:', error.message);
          if (isMounted.current) {
            setDebugMsg('Load failed: ' + (error.message || 'Unknown error'));
          }
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
    height: 50, // Standard banner height
    backgroundColor: 'transparent',
  },
  debugContainer: {
    height: 50,
    width: '100%',
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  debugText: {
    fontSize: 10,
    color: '#856404',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default AdMobBanner;
