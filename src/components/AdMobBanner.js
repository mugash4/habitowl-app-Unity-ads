/**
 * ✅ FIXED: AdMob Banner Component
 * Banner displays immediately for free users once premium status is loaded
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
  console.log('[Banner] ✅ AdMob SDK components loaded');
} catch (error) {
  console.log('[Banner] ℹ️ AdMob SDK not available (requires EAS build)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShowBanner, setShouldShowBanner] = useState(null); // null = loading
  const [adUnitId, setAdUnitId] = useState(null);
  const isMounted = useRef(true);
  const checkAttempts = useRef(0);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    // Early exit for web
    if (Platform.OS === 'web') {
      console.log('[Banner] 🌐 Web platform - no ads');
      setShouldShowBanner(false);
      return;
    }

    // Early exit if SDK not available
    if (!BannerAd || !BannerAdSize) {
      console.log('[Banner] ⚠️ AdMob SDK not available');
      setShouldShowBanner(false);
      return;
    }

    // Check banner visibility
    const checkBannerVisibility = () => {
      if (!isMounted.current) return;

      const status = adMobService.getStatus();
      checkAttempts.current++;
      
      console.log('[Banner] 📊 Check #' + checkAttempts.current, {
        premiumLoaded: status.premiumStatusLoaded,
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        sdkInitialized: status.isInitialized
      });

      // Wait for premium status
      if (!status.premiumStatusLoaded) {
        console.log('[Banner] ⏳ Waiting for premium status...');
        return; // Keep showing loading
      }

      // Check if premium/admin
      if (status.isPremium || status.isAdmin) {
        console.log('[Banner] 👑 Premium/Admin user - hiding banner');
        setShouldShowBanner(false);
        return;
      }

      // ✅ FREE USER - SHOW BANNER
      console.log('[Banner] ✅✅✅ FREE USER - SHOWING BANNER! ✅✅✅');
      setShouldShowBanner(true);

      // Get ad unit ID
      const config = adMobService.getBannerConfig();
      if (config && config.adUnitId) {
        console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
        setAdUnitId(config.adUnitId);
      } else {
        console.log('[Banner] ⚠️ No banner config available');
      }
    };

    // Initial check
    checkBannerVisibility();

    // Subscribe to status changes
    const unsubscribe = adMobService.onStatusChange(() => {
      if (isMounted.current) {
        console.log('[Banner] 📢 Status change received');
        checkBannerVisibility();
      }
    });

    // Fallback: Keep checking until we have a decision
    const checkInterval = setInterval(() => {
      if (isMounted.current && shouldShowBanner === null && checkAttempts.current < 20) {
        checkBannerVisibility();
      } else {
        clearInterval(checkInterval);
      }
    }, 200);

    // Timeout after 4 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (isMounted.current && shouldShowBanner === null) {
        console.log('[Banner] ⏱️ Timeout - defaulting to show banner for free users');
        const status = adMobService.getStatus();
        // Default to showing banner if we're unsure
        if (!status.isPremium && !status.isAdmin) {
          setShouldShowBanner(true);
          const config = adMobService.getBannerConfig();
          if (config) setAdUnitId(config.adUnitId);
        } else {
          setShouldShowBanner(false);
        }
      }
    }, 4000);

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
      unsubscribe();
      clearInterval(checkInterval);
    };
  }, []);

  // Web or SDK unavailable
  if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
    return null;
  }

  // Still loading
  if (shouldShowBanner === null) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading ad...</Text>
      </View>
    );
  }

  // Premium/Admin user
  if (shouldShowBanner === false) {
    console.log('[Banner] 🚫 Not rendering banner');
    return null;
  }

  // Free user - SHOW BANNER
  if (shouldShowBanner === true && adUnitId) {
    console.log('[Banner] ✅✅✅ RENDERING BANNER AD NOW ✅✅✅');
    console.log('[Banner] 📱 Using Ad Unit ID:', adUnitId);
    
    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅✅✅ AD LOADED SUCCESSFULLY! ✅✅✅');
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed to load:', error);
            console.log('[Banner] Error code:', error.code);
            console.log('[Banner] Error message:', error.message);
          }}
          onAdOpened={() => {
            console.log('[Banner] 👆 Ad clicked/opened');
            adMobService.trackAdImpression('banner', 'click');
          }}
          onAdClosed={() => {
            console.log('[Banner] ❌ Ad closed');
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
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default AdMobBanner;
