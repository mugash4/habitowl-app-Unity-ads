/**
 * ✅ COMPLETELY FIXED: AdMob Banner Component
 * Now ALWAYS shows for free users (with placeholder while loading)
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
  const [userType, setUserType] = useState('loading'); // 'loading', 'free', 'premium'
  const [adReady, setAdReady] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const isMounted = useRef(true);
  const checkAttempts = useRef(0);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;
    checkAttempts.current = 0;

    // Early exit for web
    if (Platform.OS === 'web') {
      console.log('[Banner] 🌐 Web platform - ads not supported');
      setUserType('premium'); // Treat as premium to hide ad
      return;
    }

    // Early exit if SDK not available
    if (!BannerAd || !BannerAdSize) {
      console.log('[Banner] ⚠️ AdMob SDK not available');
      setUserType('premium'); // Treat as premium to hide ad
      return;
    }

    const checkUserTypeAndInitAd = () => {
      if (!isMounted.current) return;

      checkAttempts.current++;
      console.log(`[Banner] 📊 Check attempt #${checkAttempts.current}`);

      const status = adMobService.getStatus();
      console.log('[Banner] Status:', {
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        premiumStatusLoaded: status.premiumStatusLoaded,
        isInitialized: status.isInitialized,
      });

      // ✅ CRITICAL: Wait for premium status to load
      if (!status.premiumStatusLoaded) {
        console.log('[Banner] ⏳ Waiting for premium status to load...');
        return; // Keep loading state
      }

      // ✅ Check if user is premium/admin
      if (status.isPremium || status.isAdmin) {
        console.log('[Banner] 👑 Premium/Admin user - hiding banner');
        setUserType('premium');
        return;
      }

      // ✅ User is FREE - prepare to show banner
      console.log('[Banner] ✅ FREE user detected - preparing banner');
      setUserType('free');

      // Get ad configuration
      const config = adMobService.getBannerConfig();
      if (config && config.adUnitId) {
        console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
        setAdUnitId(config.adUnitId);
        
        // Wait for AdMob initialization before marking as ready
        if (status.isInitialized) {
          console.log('[Banner] ✅ AdMob initialized - banner ready to display');
          setAdReady(true);
        } else {
          console.log('[Banner] ⏳ Waiting for AdMob initialization...');
        }
      } else {
        console.log('[Banner] ⚠️ Ad configuration not available');
      }
    };

    // Initial check
    checkUserTypeAndInitAd();

    // Subscribe to status changes
    const unsubscribe = adMobService.onStatusChange((status) => {
      if (isMounted.current) {
        console.log('[Banner] 📢 Status update received');
        checkUserTypeAndInitAd();
      }
    });

    // Periodic checks to catch late initialization (every 500ms for first 5 seconds)
    const intervals = [];
    for (let i = 1; i <= 10; i++) {
      const timer = setTimeout(() => {
        if (isMounted.current && userType === 'loading') {
          checkUserTypeAndInitAd();
        }
      }, i * 500);
      intervals.push(timer);
    }

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
      unsubscribe();
      intervals.forEach(clearTimeout);
    };
  }, []);

  // ============================================
  // RENDER LOGIC
  // ============================================

  // Web platform - don't show
  if (Platform.OS === 'web') {
    return null;
  }

  // SDK not available - don't show
  if (!BannerAd || !BannerAdSize) {
    return null;
  }

  // Premium/Admin user - don't show
  if (userType === 'premium') {
    console.log('[Banner] 🚫 Not showing (premium/admin user)');
    return null;
  }

  // Still determining user type - show loading placeholder
  if (userType === 'loading') {
    console.log('[Banner] ⏳ Showing loading placeholder');
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#9ca3af" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Free user - show banner or "preparing" message
  if (userType === 'free') {
    if (!adReady || !adUnitId) {
      console.log('[Banner] ⏳ Ad not ready yet - showing placeholder');
      return (
        <View style={[styles.container, style]}>
          <ActivityIndicator size="small" color="#9ca3af" />
          <Text style={styles.loadingText}>Preparing ad...</Text>
        </View>
      );
    }

    // ✅ SHOW THE ACTUAL BANNER AD
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
            // Keep the placeholder visible even if ad fails
          }}
          onAdOpened={() => {
            console.log('[Banner] 👆 Ad clicked');
            adMobService.trackAdImpression('banner', 'click');
          }}
        />
      </View>
    );
  }

  // Fallback - shouldn't reach here
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
