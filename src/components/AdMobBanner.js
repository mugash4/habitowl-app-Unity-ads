/**
 * AdMob Banner Component - ADMIN FIX
 * ✅ Returns null for premium/admin users (proper auto-hide)
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
  const isMounted = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;
    
    // ✅ Immediate check on mount
    const immediateCheck = () => {
      const status = adMobService.getStatus();
      console.log('[Banner] 📊 Immediate status check:', {
        shouldShowAds: status.shouldShowAds,
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        isInitialized: status.isInitialized,
        premiumStatusLoaded: status.premiumStatusLoaded
      });
      evaluateDisplayConditions(status);
    };
    
    immediateCheck();
    
    // ✅ Subscribe to AdMob status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (!isMounted.current) return;
      
      console.log('[Banner] 📢 Status update');
      evaluateDisplayConditions(status);
    });

    // ✅ Delayed checks for late initialization
    const delays = [200, 500, 1000, 2000];
    const timeoutIds = delays.map((delay) =>
      setTimeout(() => {
        if (isMounted.current) {
          const currentStatus = adMobService.getStatus();
          console.log('[Banner] ⏰ Delayed check (' + delay + 'ms)');
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

    // ✅ FIX: Check #1 - Premium/Admin users (HIGHEST PRIORITY)
    if (status.isPremium || status.isAdmin) {
      console.log(`[Banner] 👑 ${status.isPremium ? 'Premium' : 'Admin'} user - HIDING ADS`);
      setShouldDisplay(false);
      return;
    }

    // Check #2: Platform
    if (Platform.OS === 'web') {
      setShouldDisplay(false);
      return;
    }

    // Check #3: SDK availability
    if (!BannerAd || !BannerAdSize) {
      setShouldDisplay(false);
      return;
    }

    // Check #4: Get ad configuration
    const config = adMobService.getBannerConfig();
    if (!config || !config.adUnitId) {
      console.log('[Banner] ⚠️ Ad configuration unavailable');
      setShouldDisplay(false);
      return;
    }

    // Check #5: All conditions met?
    if (status.shouldShowAds && status.isInitialized && status.premiumStatusLoaded) {
      console.log('[Banner] ✅ FREE USER - DISPLAYING BANNER AD');
      console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
      setAdConfig(config);
      setShouldDisplay(true);
    } else {
      setShouldDisplay(false);
    }
  };

  // ✅ FIX: Return null when ads should NOT display
  if (Platform.OS === 'web') {
    return null;
  }

  if (!BannerAd || !BannerAdSize) {
    return null;
  }

  if (!shouldDisplay) {
    return null;
  }

  // ✅ Display the actual banner ad
  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adConfig.adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[Banner] ✅ AD LOADED SUCCESSFULLY');
          adMobService.trackAdImpression('banner', 'loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Ad load failed:', error.message);
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
});

export default AdMobBanner;
