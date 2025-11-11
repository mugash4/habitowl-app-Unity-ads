/**
 * AdMob Banner Component - COMPLETE FIX
 * ✅ Always displays content when container expects it
 * ✅ Properly auto-hides for admin/premium users
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
  const [adLoaded, setAdLoaded] = useState(false);
  const isMounted = useRef(true);
  const checkCounter = useRef(0);

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
      
      checkCounter.current++;
      console.log('[Banner] 📢 Status update #' + checkCounter.current);
      evaluateDisplayConditions(status);
    });

    // ✅ Delayed checks for late initialization
    const delays = [200, 500, 1000, 2000, 3000];
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

    // Check #1: Platform
    if (Platform.OS === 'web') {
      setShouldDisplay(false);
      return;
    }

    // Check #2: SDK availability
    if (!BannerAd || !BannerAdSize) {
      setShouldDisplay(false);
      return;
    }

    // Check #3: Premium/Admin users (should NOT show ads)
    if (status.isPremium || status.isAdmin) {
      console.log(`[Banner] 👑 ${status.isPremium ? 'Premium' : 'Admin'} user - hiding ads`);
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
      console.log('[Banner] ✅✅✅ DISPLAYING BANNER AD ✅✅✅');
      console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
      setAdConfig(config);
      setShouldDisplay(true);
    } else {
      setShouldDisplay(false);
    }
  };

  // ✅ FIX: Always return a visible component when expected to display
  if (Platform.OS === 'web') {
    return null;
  }

  if (!BannerAd || !BannerAdSize) {
    // ✅ FIX: Return visible placeholder instead of null
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.placeholderText}>Loading...</Text>
      </View>
    );
  }

  if (!shouldDisplay) {
    // ✅ FIX: Return visible loading state instead of null
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.placeholderText}>Loading ad...</Text>
      </View>
    );
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
          console.log('[Banner] ✅✅✅ AD LOADED SUCCESSFULLY! ✅✅✅');
          if (isMounted.current) {
            setAdLoaded(true);
          }
          adMobService.trackAdImpression('banner', 'loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Ad load failed:', error.message);
          if (isMounted.current) {
            setAdLoaded(false);
          }
        }}
        onAdOpened={() => {
          console.log('[Banner] 👁️ Ad clicked by user');
          adMobService.trackAdImpression('banner', 'click');
        }}
      />
      {/* Loading indicator while ad loads */}
      {!adLoaded && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50, // Standard banner height
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  placeholderText: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(249, 250, 251, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default AdMobBanner;
