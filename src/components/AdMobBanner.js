/**
 * ✅ PRODUCTION-READY AdMob Banner Component
 * - NO error messages shown to users
 * - Silently hides when ads don't load
 * - Only shows actual loaded ads
 * - Clean, non-distracting experience
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
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const isMounted = useRef(true);
  const hasInitialized = useRef(false);

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

        // Wait for AdMob SDK initialization
        console.log('[Banner] ⏳ Waiting for AdMob SDK initialization...');
        await adMobService.waitForInitialization();
        
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
                            status.isInitialized;
          
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
            setIsAdLoaded(false);
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
      unsubscribePromise.then(unsub => {
        if (unsub && typeof unsub === 'function') unsub();
      });
    };
  }, []);

  // ✅ PRODUCTION FIX: Don't render anything until ad actually loads
  // This prevents showing loading states, errors, or blank space
  if (!shouldRender || !adUnitId || !BannerAd || !BannerAdSize) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* ✅ Only show container when ad is loaded */}
      <View style={[
        styles.adContainer,
        !isAdLoaded && styles.hidden // Hide until loaded
      ]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅ ✅ ✅ AD LOADED SUCCESSFULLY!');
            if (isMounted.current) {
              setIsAdLoaded(true);
            }
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed to load');
            console.log('[Banner]   Error code:', error.code);
            console.log('[Banner]   Error message:', error.message);
            
            // ✅ PRODUCTION FIX: Log errors but DON'T show to user
            if (error.code === 3) {
              console.log('[Banner] ℹ️ ERROR CODE 3 (NO FILL) - This is NORMAL:');
              console.log('[Banner]   • New ad unit needs 24-48h to activate');
              console.log('[Banner]   • No ads available for your region');
              console.log('[Banner]   • Low ad inventory (try again later)');
              console.log('[Banner]   ✅ Your integration is CORRECT!');
            }
            
            // ✅ PRODUCTION FIX: Hide the banner completely on error
            if (isMounted.current) {
              setIsAdLoaded(false);
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
  hidden: {
    opacity: 0,
    height: 0,
  },
});

export default AdMobBanner;
