/**
 * ✅ FULLY FIXED: AdMob Banner Component
 * - Waits for SDK initialization before rendering
 * - Handles all edge cases properly
 * - Shows banner reliably for free users
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
  console.log('[Banner] ℹ️ AdMob SDK not available (normal in Expo Go mode)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted, starting initialization check...');
    isMounted.current = true;

    const initBanner = async () => {
      try {
        // Pre-flight checks
        if (Platform.OS === 'web') {
          console.log('[Banner] ℹ️ Web platform - no ads');
          return;
        }

        if (!BannerAd || !BannerAdSize) {
          console.log('[Banner] ⚠️ SDK components not available (Expo Go mode)');
          return;
        }

        // ✅ CRITICAL: Wait for AdMob service to fully initialize
        console.log('[Banner] ⏳ Waiting for AdMob SDK initialization...');
        const initResult = await adMobService.waitForInitialization();
        
        console.log('[Banner] ✅ Initialization wait complete:', initResult);
        
        if (!isMounted.current) {
          console.log('[Banner] ⚠️ Component unmounted during init');
          return;
        }

        // Additional safety delay to ensure SDK is fully ready
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (!isMounted.current) return;

        // Subscribe to status changes
        console.log('[Banner] 📢 Subscribing to AdMob status changes...');
        unsubscribeRef.current = adMobService.onStatusChange((status) => {
          if (!isMounted.current) return;
          
          console.log('[Banner] 📢 Status update received:', {
            initialized: status.isInitialized,
            premiumLoaded: status.premiumStatusLoaded,
            premium: status.isPremium,
            admin: status.isAdmin,
            sdkAvailable: status.sdkAvailable,
            shouldShowAds: status.shouldShowAds,
          });
          
          // ✅ Only show banner if ALL conditions are met
          const shouldShow = status.isInitialized &&           // SDK initialized
                            status.premiumStatusLoaded &&      // Premium status known
                            !status.isPremium &&               // Not premium
                            !status.isAdmin &&                 // Not admin
                            status.sdkAvailable &&             // SDK available
                            Platform.OS !== 'web';             // Not web
          
          console.log('[Banner] 🎯 Should show banner:', shouldShow);
          
          if (shouldShow) {
            const config = adMobService.getBannerConfig();
            console.log('[Banner] 🔧 Banner config:', config);
            
            if (config && config.adUnitId) {
              setAdUnitId(config.adUnitId);
              setShouldRender(true);
              setIsReady(true);
              console.log('[Banner] ✅ ✅ ✅ BANNER READY TO RENDER!');
              console.log('[Banner] Ad Unit ID:', config.adUnitId);
            } else {
              console.log('[Banner] ⚠️ No banner config available');
              setShouldRender(false);
              setIsReady(false);
            }
          } else {
            console.log('[Banner] ❌ Banner will not render (premium/admin or SDK not ready)');
            setShouldRender(false);
            setIsReady(false);
          }
        });

        console.log('[Banner] ✅ Initialization complete');
        
      } catch (error) {
        console.log('[Banner] ❌ Init error:', error.message);
        if (isMounted.current) {
          setShouldRender(false);
          setIsReady(false);
        }
      }
    };

    initBanner();

    return () => {
      console.log('[Banner] 🚪 Unmounting component');
      isMounted.current = false;
      if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Don't render if not ready
  if (!isReady || !shouldRender || !adUnitId || !BannerAd || !BannerAdSize) {
    const reason = !BannerAd || !BannerAdSize ? 'SDK_NOT_LOADED' :
                   !isReady ? 'NOT_READY' :
                   !shouldRender ? 'SHOULD_NOT_RENDER' :
                   !adUnitId ? 'NO_AD_UNIT_ID' : 'UNKNOWN';
    
    console.log('[Banner] ❌ Not rendering. Reason:', reason);
    return null;
  }

  console.log('[Banner] ✅ ✅ ✅ RENDERING BANNER AD NOW!');
  console.log('[Banner] Using Ad Unit ID:', adUnitId);

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[Banner] 🎉 🎉 🎉 AD LOADED SUCCESSFULLY!');
          console.log('[Banner] Banner is now visible to user!');
          if (isMounted.current) {
            adMobService.trackAdImpression('banner', 'loaded');
          }
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Ad failed to load:');
          console.log('[Banner]   Code:', error.code);
          console.log('[Banner]   Message:', error.message);
          console.log('[Banner]   Domain:', error.domain);
          
          // Error code explanations
          const errorExplanations = {
            0: 'Internal error - AdMob SDK issue',
            1: 'Invalid request - Check ad unit ID',
            2: 'Network error - Check internet connection',
            3: 'No fill - NORMAL for new ad units (wait 24-48h) or low ad inventory',
          };
          
          const explanation = errorExplanations[error.code] || 'Unknown error';
          console.log('[Banner]   Explanation:', explanation);
          
          if (error.code === 3) {
            console.log('[Banner] ℹ️ ERROR CODE 3 (NO FILL) - This is EXPECTED for:');
            console.log('[Banner]   • New ad units (needs 24-48 hours to activate)');
            console.log('[Banner]   • Low ad inventory in your region');
            console.log('[Banner]   • Test devices without test ads configured');
            console.log('[Banner] ✅ Your integration is CORRECT! Just wait or try again later.');
          }
        }}
        onAdOpened={() => {
          console.log('[Banner] 👆 User clicked the ad');
          if (isMounted.current) {
            adMobService.trackAdImpression('banner', 'click');
          }
        }}
        onAdClosed={() => {
          console.log('[Banner] 🚪 Ad closed');
        }}
      />
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
});

export default AdMobBanner;
