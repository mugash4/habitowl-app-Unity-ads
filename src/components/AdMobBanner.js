/**
 * ✅ FIXED: AdMob Banner Component - Now displays correctly
 * Fixed race condition with status loading
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
  console.log('[Banner] ✅ AdMob SDK components loaded');
} catch (error) {
  console.log('[Banner] ℹ️ AdMob SDK not available (requires EAS build)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShowBanner, setShouldShowBanner] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const isMounted = useRef(true);
  const initAttempted = useRef(false);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    // Early exit for web or no SDK
    if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
      console.log('[Banner] ℹ️ Skipping banner (web or no SDK)');
      setIsReady(true);
      return;
    }

    // ✅ FIX: Proper initialization with status subscription
    const initBanner = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      try {
        console.log('[Banner] 🔄 Initializing banner...');
        
        // Wait for AdMobService to load status
        await adMobService.waitForInitialization();
        
        if (!isMounted.current) return;

        // Subscribe to status changes
        // ✅ This will be called immediately if status is already loaded
        const unsubscribe = adMobService.onStatusChange((status) => {
          if (!isMounted.current) return;
          
          console.log('[Banner] 📢 Status received:', {
            loaded: status.premiumStatusLoaded,
            premium: status.isPremium,
            admin: status.isAdmin,
            sdkAvailable: status.sdkAvailable,
            initialized: status.isInitialized
          });
          
          const shouldShow = status.premiumStatusLoaded && 
                            !status.isPremium && 
                            !status.isAdmin &&
                            status.sdkAvailable;
          
          console.log('[Banner] 🎯 Decision:', shouldShow ? 'SHOW BANNER' : 'HIDE BANNER');
          
          setShouldShowBanner(shouldShow);
          setIsReady(true);
          setDebugInfo(`${shouldShow ? 'SHOW' : 'HIDE'}, P:${status.isPremium}, A:${status.isAdmin}`);
          
          if (shouldShow) {
            const config = adMobService.getBannerConfig();
            if (config) {
              setAdUnitId(config.adUnitId);
              console.log('[Banner] ✅ Banner configured with ad unit:', config.adUnitId);
            } else {
              console.log('[Banner] ⚠️ No banner config returned');
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        console.log('[Banner] ❌ Error during init:', error);
        if (isMounted.current) {
          setIsReady(true);
          setShouldShowBanner(false);
          setDebugInfo(`Error: ${error.message}`);
        }
      }
    };

    const unsubscribePromise = initBanner();

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
      initAttempted.current = false;
      unsubscribePromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, []);

  // Web or SDK unavailable
  if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
    return null;
  }

  // Still loading status
  if (!isReady) {
    console.log('[Banner] ⏳ Still loading...');
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading ad...</Text>
        </View>
      </View>
    );
  }

  // Premium/Admin user - NO BANNER
  if (!shouldShowBanner) {
    console.log('[Banner] 👑 Premium/Admin or no SDK - no banner');
    return null;
  }

  // Free user - SHOW BANNER
  if (shouldShowBanner && adUnitId) {
    console.log('[Banner] ✅ RENDERING BANNER AD with unit:', adUnitId);
    
    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅ AD LOADED AND DISPLAYED!');
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed to load:');
            console.log('[Banner]    Code:', error.code);
            console.log('[Banner]    Message:', error.message);
            console.log('[Banner]    Domain:', error.domain);
            
            // Show helpful error messages
            if (error.code === 3) {
              console.log('[Banner] 💡 ERROR CODE 3 (No Fill) - This is NORMAL and means:');
              console.log('[Banner]    1. Your ad unit is new (takes 24-48 hours to activate)');
              console.log('[Banner]    2. No ads available for your location/device right now');
              console.log('[Banner]    3. Ad inventory is low (try again later)');
              console.log('[Banner]    4. If using REAL ad units on test device, add device to test devices list');
              console.log('[Banner]    ✅ This does NOT mean your integration is broken!');
            } else if (error.code === 0) {
              console.log('[Banner] 💡 ERROR CODE 0 - Internal error, usually temporary');
            } else if (error.code === 1) {
              console.log('[Banner] 💡 ERROR CODE 1 - Invalid ad unit ID, check your config');
            } else if (error.code === 2) {
              console.log('[Banner] 💡 ERROR CODE 2 - Network error, check internet connection');
            }
          }}
          onAdOpened={() => {
            console.log('[Banner] 👆 Ad clicked/opened');
            adMobService.trackAdImpression('banner', 'click');
          }}
          onAdClosed={() => {
            console.log('[Banner] 🚪 Ad closed');
          }}
        />
        {__DEV__ && (
          <Text style={styles.debugText}>{debugInfo}</Text>
        )}
      </View>
    );
  }

  // Fallback
  console.log('[Banner] ⚠️ Fallback - no banner shown (adUnitId:', adUnitId, ')');
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  debugText: {
    fontSize: 8,
    color: '#ef4444',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 2,
    textAlign: 'center',
  },
});

export default AdMobBanner;
