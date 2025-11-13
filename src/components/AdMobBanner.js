/**
 * ✅ COMPLETE FIX: AdMob Banner Component - Now ALWAYS VISIBLE
 * 
 * Changes:
 * 1. Added visible container border for debugging
 * 2. Added fallback UI when ads fail to load
 * 3. Added error state display
 * 4. Improved visual feedback
 * 5. Better logging for troubleshooting
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react';
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
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(null);
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

    // Initialize banner
    const initBanner = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      try {
        console.log('[Banner] 🔄 Initializing banner...');
        
        // Wait for AdMobService to load status
        await adMobService.waitForInitialization();
        
        if (!isMounted.current) return;

        // Subscribe to status changes
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
      <View style={[styles.container, styles.debugBorder, style]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🔄 Loading ad...</Text>
          {__DEV__ && <Text style={styles.debugTextSmall}>{debugInfo}</Text>}
        </View>
      </View>
    );
  }

  // Premium/Admin user - NO BANNER
  if (!shouldShowBanner) {
    console.log('[Banner] 👑 Premium/Admin or no SDK - no banner');
    return null;
  }

  // Free user - SHOW BANNER (with fallback for failed ads)
  if (shouldShowBanner && adUnitId) {
    console.log('[Banner] ✅ RENDERING BANNER AD with unit:', adUnitId);
    
    return (
      <View style={[styles.container, styles.debugBorder, style]}>
        {/* The actual AdMob Banner */}
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅ AD LOADED AND DISPLAYED!');
            setAdLoaded(true);
            setAdError(null);
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed to load:');
            console.log('[Banner]    Code:', error.code);
            console.log('[Banner]    Message:', error.message);
            
            setAdLoaded(false);
            setAdError(error);
            
            // Show helpful error messages
            if (error.code === 3) {
              console.log('[Banner] 💡 ERROR CODE 3 (No Fill) - This is NORMAL:');
              console.log('[Banner]    - Ad unit may be new (takes 24-48 hours)');
              console.log('[Banner]    - No ads available right now');
              console.log('[Banner]    - Try again later');
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
        
        {/* ✅ NEW: Fallback UI when ad fails to load */}
        {!adLoaded && adError && (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>
              {adError.code === 3 
                ? '📱 Ad loading... (may take 24-48 hrs for new ad units)' 
                : '📱 Ad space (no ads available)'}
            </Text>
            {__DEV__ && (
              <Text style={styles.fallbackDebug}>
                Error {adError.code}: {adError.message}
              </Text>
            )}
          </View>
        )}

        {/* ✅ NEW: Success indicator when ad loads */}
        {adLoaded && __DEV__ && (
          <View style={styles.successIndicator}>
            <Text style={styles.successText}>✅ Ad Loaded</Text>
          </View>
        )}

        {/* Debug info */}
        {__DEV__ && (
          <Text style={styles.debugText}>
            {debugInfo} | Loaded: {adLoaded ? 'Yes' : 'No'} | Unit: {adUnitId.slice(-8)}
          </Text>
        )}
      </View>
    );
  }

  // Fallback
  console.log('[Banner] ⚠️ Fallback - no banner shown (adUnitId:', adUnitId, ')');
  return (
    <View style={[styles.container, styles.debugBorder, style]}>
      <Text style={styles.fallbackText}>📱 Ad space (initializing...)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  // ✅ NEW: Debug border to make banner area ALWAYS visible
  debugBorder: {
    borderWidth: 2,
    borderColor: '#10b981', // Green border
    borderStyle: 'dashed',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  // ✅ NEW: Fallback UI when ad fails
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  fallbackText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  fallbackDebug: {
    fontSize: 8,
    color: '#ef4444',
    marginTop: 2,
    textAlign: 'center',
  },
  // ✅ NEW: Success indicator
  successIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  successText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  debugText: {
    fontSize: 7,
    color: '#7c3aed',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 2,
    textAlign: 'center',
  },
  debugTextSmall: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 4,
  },
});

export default AdMobBanner;