/**
 * ✅ COMPLETELY FIXED: AdMob Banner Component
 * Returns null (nothing) for premium/admin users - NO gray box, NO container
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
    
    const evaluateDisplayConditions = (status) => {
      if (!isMounted.current) return;

      console.log('[Banner] 📊 Evaluating display conditions:', status);

      // ✅ FIX #1: Premium/Admin users - HIGHEST PRIORITY
      if (status.isPremium || status.isAdmin) {
        console.log('[Banner] 👑 Premium/Admin user - RETURNING NULL (no banner, no container)');
        setShouldDisplay(false);
        return;
      }

      // Check #2: Platform
      if (Platform.OS === 'web') {
        console.log('[Banner] 🌐 Web platform - ads not supported');
        setShouldDisplay(false);
        return;
      }

      // Check #3: SDK availability
      if (!BannerAd || !BannerAdSize) {
        console.log('[Banner] ⚠️ AdMob SDK not available');
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

      // Check #5: All conditions met for FREE users
      if (status.shouldShowAds && status.isInitialized && status.premiumStatusLoaded) {
        console.log('[Banner] ✅ FREE USER - DISPLAYING BANNER AD');
        setAdConfig(config);
        setShouldDisplay(true);
      } else {
        console.log('[Banner] ❌ Conditions not met:', {
          shouldShowAds: status.shouldShowAds,
          isInitialized: status.isInitialized,
          premiumStatusLoaded: status.premiumStatusLoaded
        });
        setShouldDisplay(false);
      }
    };
    
    // Immediate check
    const immediateStatus = adMobService.getStatus();
    evaluateDisplayConditions(immediateStatus);
    
    // Subscribe to status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (isMounted.current) {
        console.log('[Banner] 📢 Status update received');
        evaluateDisplayConditions(status);
      }
    });

    // Multiple delayed checks to catch late initialization
    const timeouts = [100, 300, 500, 1000, 2000, 3000].map((delay) =>
      setTimeout(() => {
        if (isMounted.current) {
          const currentStatus = adMobService.getStatus();
          console.log(`[Banner] ⏰ Delayed check (${delay}ms)`);
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

  // ✅ CRITICAL FIX: Return NULL immediately when ads should NOT display
  // This means NO CONTAINER, NO GRAY BOX - absolutely nothing rendered
  if (Platform.OS === 'web') {
    return null;
  }

  if (!BannerAd || !BannerAdSize) {
    return null;
  }

  if (!shouldDisplay) {
    console.log('[Banner] 🚫 Returning NULL - no banner, no container');
    return null;
  }

  // Only render when we have a FREE user with ad to display
  console.log('[Banner] ✅ Rendering banner container for FREE user');
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