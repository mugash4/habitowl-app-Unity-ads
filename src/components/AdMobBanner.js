/**
 * AdMob Banner Component - COMPLETE FIX
 * ✅ Displays real banner ad content (no placeholder)
 * ✅ Auto-hides for admin/premium users
 * ✅ Better error handling and fallback logic
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
  const [adLoaded, setAdLoaded] = useState(false);
  const isMounted = useRef(true);
  const checkCounter = useRef(0);
  const hasLoggedDisplay = useRef(false);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;
    hasLoggedDisplay.current = false;
    
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
      console.log('[Banner] 📢 Status update #' + checkCounter.current + ':', {
        shouldShowAds: status.shouldShowAds,
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        isInitialized: status.isInitialized,
        premiumStatusLoaded: status.premiumStatusLoaded
      });
      
      evaluateDisplayConditions(status);
    });

    // ✅ Aggressive delayed checks for late initialization
    const checkDelays = [100, 300, 500, 1000, 1500, 2000, 3000];
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

    // ✅ Check #3: Premium/Admin users (should NOT show ads)
    if (status.isPremium || status.isAdmin) {
      const userType = status.isPremium ? 'premium' : 'admin';
      console.log(`[Banner] 👑 ${userType} user - hiding ads`);
      setDebugMsg(`Hidden: ${userType} user`);
      setShouldDisplay(false);
      return;
    }

    // ✅ Check #4: Initialization status
    if (!status.isInitialized) {
      console.log('[Banner] ⏳ AdMob not initialized yet');
      setDebugMsg('Initializing AdMob...');
      // Don't return - allow it to show when ready
    }

    // ✅ Check #5: Premium status loading
    if (!status.premiumStatusLoaded) {
      console.log('[Banner] ⏳ Premium status loading...');
      setDebugMsg('Checking user status...');
      // Don't return - allow it to show when ready
    }

    // ✅ Check #6: Get ad configuration
    const config = adMobService.getBannerConfig();
    if (!config || !config.adUnitId) {
      console.log('[Banner] ⚠️ Ad configuration unavailable');
      setDebugMsg('Ad configuration unavailable');
      setShouldDisplay(false);
      return;
    }

    // ✅ Check #7: All conditions met?
    if (status.shouldShowAds && status.isInitialized && status.premiumStatusLoaded) {
      // ✅ ALL CHECKS PASSED - Show banner ad
      if (!hasLoggedDisplay.current) {
        console.log('[Banner] ✅✅✅ DISPLAYING BANNER AD ✅✅✅');
        console.log('[Banner] 📱 Ad Unit ID:', config.adUnitId);
        hasLoggedDisplay.current = true;
      }
      setDebugMsg('Active: ' + config.adUnitId);
      setAdConfig(config);
      setShouldDisplay(true);
    } else {
      // Still waiting for conditions
      const reasons = [];
      if (!status.shouldShowAds) reasons.push('shouldShowAds=false');
      if (!status.isInitialized) reasons.push('not initialized');
      if (!status.premiumStatusLoaded) reasons.push('loading status');
      
      const message = 'Waiting: ' + reasons.join(', ');
      console.log('[Banner] ⏳', message);
      setDebugMsg(message);
      setShouldDisplay(false);
    }
  };

  // ✅ Render logic: Show actual banner or debug info
  const renderContent = () => {
    // Case 1: Web platform - don't show anything
    if (Platform.OS === 'web') {
      return null;
    }

    // Case 2: SDK not available - show debug in dev mode only
    if (!BannerAd || !BannerAdSize) {
      if (__DEV__) {
        return (
          <View style={[styles.debugContainer, style]}>
            <Text style={styles.debugText}>⚠️ SDK not available</Text>
            <Text style={[styles.debugText, { fontSize: 9 }]}>
              Build with EAS to enable ads
            </Text>
          </View>
        );
      }
      return null;
    }

    // Case 3: Should display - render actual AdMob banner
    if (shouldDisplay && adConfig) {
      console.log('[Banner] 🎨 Rendering BannerAd component with:', adConfig.adUnitId);
      
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
                setDebugMsg('Ad displayed');
              }
              adMobService.trackAdImpression('banner', 'loaded');
            }}
            onAdFailedToLoad={(error) => {
              console.log('[Banner] ❌ Ad load failed:', error.message);
              console.log('[Banner] ❌ Error code:', error.code);
              if (isMounted.current) {
                setAdLoaded(false);
                setDebugMsg('Load failed: ' + (error.message || 'Unknown'));
              }
            }}
            onAdOpened={() => {
              console.log('[Banner] 👁️ Ad clicked by user');
              adMobService.trackAdImpression('banner', 'click');
            }}
          />
          {/* Debug overlay in dev mode */}
          {__DEV__ && !adLoaded && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Loading ad...</Text>
            </View>
          )}
        </View>
      );
    }

    // Case 4: Not ready to display - show debug in dev mode
    if (__DEV__) {
      return (
        <View style={[styles.debugContainer, style]}>
          <Text style={styles.debugText}>Banner: {debugMsg}</Text>
          <Text style={[styles.debugText, { fontSize: 8 }]}>
            Checks: {checkCounter.current}
          </Text>
        </View>
      );
    }

    // Case 5: Production & not ready - show nothing
    return null;
  };

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50, // Standard banner height
    backgroundColor: 'transparent',
    overflow: 'hidden',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 243, 205, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 10,
    color: '#856404',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default AdMobBanner;