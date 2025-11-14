/**
 * ✅ FIXED: AdMob Banner Component - Always Visible Mode
 * - Shows container immediately for free users
 * - Ad loads in background
 * - No flickering or hiding
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
  console.log('[Banner] ℹ️ AdMob SDK not available (Expo Go mode)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const isMounted = useRef(true);
  const hasInitialized = useRef(false);
  const initTimeoutRef = useRef(null);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    const initBanner = async () => {
      if (hasInitialized.current) {
        console.log('[Banner] ⚠️ Already initialized, skipping');
        return;
      }
      hasInitialized.current = true;

      try {
        console.log('[Banner] 🔄 Initializing...');
        
        // Check platform first
        if (Platform.OS === 'web') {
          console.log('[Banner] ℹ️ Web platform - no ads');
          return;
        }

        // Check SDK availability
        if (!BannerAd || !BannerAdSize) {
          console.log('[Banner] ⚠️ SDK not available (Expo Go mode)');
          return;
        }

        // Wait for AdMob SDK initialization with timeout
        console.log('[Banner] ⏳ Waiting for AdMob SDK initialization...');
        
        // Set a timeout to prevent infinite waiting
        const timeoutPromise = new Promise((resolve) => {
          initTimeoutRef.current = setTimeout(() => {
            console.log('[Banner] ⚠️ Init timeout reached, proceeding anyway');
            resolve(false);
          }, 5000); // 5 second timeout
        });

        const initPromise = adMobService.waitForInitialization();
        await Promise.race([initPromise, timeoutPromise]);
        
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        
        // Additional wait to ensure SDK is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted.current) {
          console.log('[Banner] ⚠️ Component unmounted during init');
          return;
        }

        console.log('[Banner] ✅ SDK initialized, checking status...');

        // Subscribe to status changes
        const unsubscribe = adMobService.onStatusChange((status) => {
          if (!isMounted.current) return;
          
          console.log('[Banner] 📢 Status update:', {
            loaded: status.premiumStatusLoaded,
            premium: status.isPremium,
            admin: status.isAdmin,
            sdkInit: status.isInitialized,
            sdkAvailable: status.sdkAvailable,
          });
          
          // Only render if: free user + SDK ready + not admin
          const shouldShow = status.premiumStatusLoaded && 
                            !status.isPremium && 
                            !status.isAdmin &&
                            status.sdkAvailable &&
                            Platform.OS !== 'web';
          
          console.log('[Banner] 🎯', shouldShow ? 'WILL RENDER BANNER' : 'WILL HIDE BANNER');
          
          if (shouldShow) {
            const config = adMobService.getBannerConfig();
            if (config && config.adUnitId) {
              setAdUnitId(config.adUnitId);
              setShouldRender(true);
              console.log('[Banner] ✅ Banner will render with ID:', config.adUnitId);
            } else {
              console.log('[Banner] ⚠️ No banner config available');
              setShouldRender(false);
            }
          } else {
            setShouldRender(false);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.log('[Banner] ❌ Init error:', error.message);
        if (isMounted.current) {
          setShouldRender(false);
        }
      }
    };

    const unsubscribePromise = initBanner();

    return () => {
      console.log('[Banner] 🚪 Unmounting');
      isMounted.current = false;
      hasInitialized.current = false;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      unsubscribePromise.then(unsub => {
        if (unsub && typeof unsub === 'function') unsub();
      });
    };
  }, []);

  // ✅ Don't render anything if conditions not met
  if (!shouldRender || !adUnitId || !BannerAd || !BannerAdSize) {
    console.log('[Banner] ❌ Not rendering:', {
      shouldRender,
      hasAdUnitId: !!adUnitId,
      hasBannerAd: !!BannerAd,
      hasBannerAdSize: !!BannerAdSize
    });
    return null;
  }

  console.log('[Banner] ✅ RENDERING BANNER AD with ID:', adUnitId);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.adContainer}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅ ✅ ✅ AD LOADED AND DISPLAYED!');
            if (isMounted.current) {
              adMobService.trackAdImpression('banner', 'loaded');
            }
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed to load');
            console.log('[Banner]   Error code:', error.code);
            console.log('[Banner]   Error message:', error.message);
            console.log('[Banner]   Domain:', error.domain);
            
            // Log common error codes
            if (error.code === 0) {
              console.log('[Banner] ℹ️ ERROR CODE 0: Internal error');
            } else if (error.code === 1) {
              console.log('[Banner] ℹ️ ERROR CODE 1: Invalid request');
            } else if (error.code === 2) {
              console.log('[Banner] ℹ️ ERROR CODE 2: Network error');
            } else if (error.code === 3) {
              console.log('[Banner] ℹ️ ERROR CODE 3 (NO FILL) - This is NORMAL:');
              console.log('[Banner]   • New ad unit needs 24-48h to activate');
              console.log('[Banner]   • No ads available for your region');
              console.log('[Banner]   • Low ad inventory (try again later)');
              console.log('[Banner]   ✅ Your integration is CORRECT!');
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
      </View>
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
  adContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdMobBanner;
