/**
 * ✅ FIXED: AdMob Banner Component with proper state updates
 * Banner displays correctly after login
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
  // ✅ FIX: Start with loading state, then update based on actual status
  const [shouldShowBanner, setShouldShowBanner] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const isMounted = useRef(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    // Early exit for web or no SDK
    if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
      return;
    }

    // ✅ FIX: Wait for status to be loaded, then decide
    const checkStatusAndShow = () => {
      const status = adMobService.getStatus();
      
      console.log('[Banner] 📊 Status check:', {
        loaded: status.premiumStatusLoaded,
        premium: status.isPremium,
        admin: status.isAdmin
      });
      
      if (status.premiumStatusLoaded) {
        const shouldShow = !status.isPremium && !status.isAdmin;
        console.log('[Banner] 🎯 Decision:', shouldShow ? 'SHOW' : 'HIDE');
        
        if (isMounted.current) {
          setShouldShowBanner(shouldShow);
          setIsReady(true);
          
          if (shouldShow) {
            const config = adMobService.getBannerConfig();
            if (config) setAdUnitId(config.adUnitId);
          }
        }
      }
    };

    // Check immediately
    checkStatusAndShow();

    // Subscribe to status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (!isMounted.current) return;
      
      console.log('[Banner] 📢 Status update received:', {
        loaded: status.premiumStatusLoaded,
        premium: status.isPremium,
        admin: status.isAdmin
      });
      
      const shouldShow = status.premiumStatusLoaded && 
                        !status.isPremium && 
                        !status.isAdmin;
      
      console.log('[Banner] 🎯 Update decision:', shouldShow ? 'SHOW' : 'HIDE');
      setShouldShowBanner(shouldShow);
      setIsReady(true);
      
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

  // Still loading status
  if (!isReady) {
    return (
      <View style={[styles.container, style]}>
        {/* Empty placeholder while loading */}
      </View>
    );
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
