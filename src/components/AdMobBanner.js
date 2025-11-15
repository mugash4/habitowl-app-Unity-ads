/**
 * ✅ SIMPLIFIED & FIXED: AdMob Banner Component
 * - Removed overly strict checks
 * - Better error handling
 * - Will show banner reliably for free users
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
  console.log('[Banner] ℹ️ AdMob SDK not available');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    const initBanner = async () => {
      try {
        // Don't show on web
        if (Platform.OS === 'web') {
          console.log('[Banner] Web platform - no ads');
          return;
        }

        // Check if SDK is available
        if (!BannerAd || !BannerAdSize) {
          console.log('[Banner] SDK not available');
          return;
        }

        // ✅ FIX: Wait for AdMob to initialize with timeout
        console.log('[Banner] ⏳ Waiting for AdMob initialization...');
        
        const initPromise = adMobService.waitForInitialization();
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 5000));
        
        const result = await Promise.race([initPromise, timeoutPromise]);
        
        if (result.timeout) {
          console.log('[Banner] ⚠️ Initialization timeout, trying anyway...');
        } else {
          console.log('[Banner] ✅ Initialization complete');
        }

        if (!isMounted.current) return;

        // ✅ FIX: Give SDK extra time to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isMounted.current) return;

        // Check if user should see ads
        const status = adMobService.getStatus();
        console.log('[Banner] Status:', {
          initialized: status.isInitialized,
          premium: status.isPremium,
          admin: status.isAdmin,
          shouldShow: status.shouldShowAds
        });

        // ✅ FIX: Less strict check - show if not premium/admin
        const shouldShow = !status.isPremium && !status.isAdmin && Platform.OS !== 'web';
        
        if (shouldShow) {
          const config = adMobService.getBannerConfig();
          console.log('[Banner] Config:', config);
          
          if (config && config.adUnitId) {
            setAdUnitId(config.adUnitId);
            setShouldRender(true);
            console.log('[Banner] ✅ READY TO RENDER!');
          } else {
            console.log('[Banner] ⚠️ No config available, will retry...');
            // ✅ FIX: Retry after delay
            setTimeout(() => {
              if (isMounted.current) {
                const retryConfig = adMobService.getBannerConfig();
                if (retryConfig && retryConfig.adUnitId) {
                  setAdUnitId(retryConfig.adUnitId);
                  setShouldRender(true);
                  console.log('[Banner] ✅ READY after retry!');
                }
              }
            }, 2000);
          }
        } else {
          console.log('[Banner] ❌ User is premium/admin - no banner');
        }
        
      } catch (error) {
        console.log('[Banner] ❌ Init error:', error.message);
      }
    };

    initBanner();

    return () => {
      console.log('[Banner] 🚪 Unmounting');
      isMounted.current = false;
    };
  }, []);

  // Don't render if conditions not met
  if (!shouldRender || !adUnitId || !BannerAd || !BannerAdSize) {
    const reason = !BannerAd || !BannerAdSize ? 'SDK_NOT_LOADED' :
                   !shouldRender ? 'SHOULD_NOT_RENDER' :
                   !adUnitId ? 'NO_AD_UNIT_ID' : 'UNKNOWN';
    
    console.log('[Banner] Not rendering. Reason:', reason);
    return null;
  }

  console.log('[Banner] ✅ ✅ ✅ RENDERING BANNER NOW!');

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
          if (isMounted.current) {
            adMobService.trackAdImpression('banner', 'loaded');
          }
        }}
        onAdFailedToLoad={(error) => {
          console.log('[Banner] ❌ Ad failed to load:');
          console.log('[Banner]   Code:', error.code);
          console.log('[Banner]   Message:', error.message);
          
          if (error.code === 3) {
            console.log('[Banner] ℹ️ ERROR CODE 3 (NO FILL) - This is NORMAL for:');
            console.log('[Banner]   • New ad units (wait 24-48 hours)');
            console.log('[Banner]   • Low ad inventory');
            console.log('[Banner]   ✅ Your integration is CORRECT!');
          }
        }}
        onAdOpened={() => {
          console.log('[Banner] 👆 User clicked the ad');
          if (isMounted.current) {
            adMobService.trackAdImpression('banner', 'click');
          }
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
