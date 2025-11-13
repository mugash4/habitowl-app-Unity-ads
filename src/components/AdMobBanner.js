/**
 * ✅ INSTANT DISPLAY FIX: AdMob Banner Component
 * Banner displays IMMEDIATELY - no loading state needed
 * Premium status is always ready before this renders
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
  console.log('[Banner] ✅ AdMob SDK components loaded');
} catch (error) {
  console.log('[Banner] ℹ️ AdMob SDK not available (requires EAS build)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShowBanner, setShouldShowBanner] = useState(() => {
    // ✅ INSTANT EVALUATION - status is already loaded
    if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
      return false;
    }
    
    const status = adMobService.getStatus();
    const shouldShow = status.premiumStatusLoaded && 
                      !status.isPremium && 
                      !status.isAdmin;
    
    console.log('[Banner] 🎬 Initial state:', shouldShow ? 'SHOW' : 'HIDE');
    return shouldShow;
  });
  
  const [adUnitId, setAdUnitId] = useState(() => {
    const config = adMobService.getBannerConfig();
    return config ? config.adUnitId : null;
  });
  
  const isMounted = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    // Early exit for web or no SDK
    if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
      return;
    }

    // Subscribe to status changes (for upgrades/downgrades)
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (!isMounted.current) return;
      
      const shouldShow = status.premiumStatusLoaded && 
                        !status.isPremium && 
                        !status.isAdmin;
      
      console.log('[Banner] 📢 Status update:', shouldShow ? 'SHOW' : 'HIDE');
      setShouldShowBanner(shouldShow);
      
      if (shouldShow) {
        const config = adMobService.getBannerConfig();
        if (config) setAdUnitId(config.adUnitId);
      }
    });

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  // Web or SDK unavailable
  if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
    return null;
  }

  // Premium/Admin user
  if (!shouldShowBanner) {
    return null;
  }

  // Free user - SHOW BANNER
  if (shouldShowBanner && adUnitId) {
    console.log('[Banner] ✅ RENDERING BANNER AD');
    
    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅ AD LOADED!');
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed:', error.code, error.message);
          }}
          onAdOpened={() => {
            console.log('[Banner] 👆 Ad clicked');
            adMobService.trackAdImpression('banner', 'click');
          }}
        />
      </View>
    );
  }

  // Fallback
  return null;
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
