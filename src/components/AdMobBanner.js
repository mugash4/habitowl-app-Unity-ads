/**
 * ✅ FIXED: AdMob Banner Component - Banner displays immediately for free users
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Text, ActivityIndicator } from 'react-native';
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
  const [shouldShowBanner, setShouldShowBanner] = useState(null); // null = loading, true = show, false = hide
  const [adUnitId, setAdUnitId] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    // Early exit for web
    if (Platform.OS === 'web') {
      console.log('[Banner] 🌐 Web platform - ads not supported');
      setShouldShowBanner(false);
      return;
    }

    // Early exit if SDK not available
    if (!BannerAd || !BannerAdSize) {
      console.log('[Banner] ⚠️ AdMob SDK not available');
      setShouldShowBanner(false);
      return;
    }

    // Function to check if we should show banner
    const checkBannerVisibility = () => {
      if (!isMounted.current) return;

      const status = adMobService.getStatus();
      console.log('[Banner] 📊 Status check:', {
        premiumStatusLoaded: status.premiumStatusLoaded,
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
      });

      // Wait for premium status to load
      if (!status.premiumStatusLoaded) {
        console.log('[Banner] ⏳ Waiting for premium status...');
        setShouldShowBanner(null); // Keep loading state
        return;
      }

      // Check if user is premium/admin
      if (status.isPremium || status.isAdmin) {
        console.log('[Banner] 👑 Premium/Admin user - hiding banner');
        setShouldShowBanner(false);
        return;
      }

      // ✅ FREE USER - SHOW BANNER
      console.log('[Banner] ✅ FREE user - showing banner');
      setShouldShowBanner(true);

      // Get ad unit ID
      const config = adMobService.getBannerConfig();
      if (config && config.adUnitId) {
        console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
        setAdUnitId(config.adUnitId);
      }
    };

    // Initial check
    checkBannerVisibility();

    // Subscribe to status changes
    const unsubscribe = adMobService.onStatusChange(() => {
      if (isMounted.current) {
        console.log('[Banner] 📢 Status update received, rechecking...');
        checkBannerVisibility();
      }
    });

    // Fallback: Check periodically for first 3 seconds
    const checkTimer = setInterval(() => {
      if (isMounted.current && shouldShowBanner === null) {
        checkBannerVisibility();
      }
    }, 300);

    setTimeout(() => clearInterval(checkTimer), 3000);

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
      unsubscribe();
      clearInterval(checkTimer);
    };
  }, []);

  // ============================================
  // RENDER LOGIC
  // ============================================

  // Web or SDK unavailable
  if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
    return null;
  }

  // Still loading premium status
  if (shouldShowBanner === null) {
    console.log('[Banner] ⏳ Loading...');
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#9ca3af" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Premium/Admin user - don't show
  if (shouldShowBanner === false) {
    console.log('[Banner] 🚫 Not showing banner');
    return null;
  }

  // Free user - show banner
  if (shouldShowBanner === true && adUnitId) {
    console.log('[Banner] ✅✅✅ RENDERING BANNER AD ✅✅✅');
    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅✅✅ AD LOADED SUCCESSFULLY ✅✅✅');
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed to load:', error);
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
  loadingText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
});

export default AdMobBanner;
