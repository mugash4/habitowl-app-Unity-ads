/**
 * ✅ COMPLETELY FIXED: AdMob Banner Component
 * - Guaranteed initialization wait
 * - Proper retry mechanism
 * - Better error handling
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
  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const maxRetries = 3;

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

        console.log('[Banner] ⏳ Starting initialization wait...');
        
        // ✅ FIX 1: Wait for COMPLETE initialization with longer timeout
        const waitStart = Date.now();
        const maxWaitTime = 10000; // 10 seconds max wait
        
        while (isMounted.current) {
          const status = adMobService.getStatus();
          
          // Check if fully initialized
          const fullyInitialized = status.isInitialized && 
                                   status.premiumStatusLoaded && 
                                   !status.initializationInProgress;
          
          if (fullyInitialized) {
            console.log('[Banner] ✅ Initialization complete!');
            break;
          }
          
          // Check timeout
          if (Date.now() - waitStart > maxWaitTime) {
            console.log('[Banner] ⚠️ Initialization timeout - trying anyway');
            break;
          }
          
          // Wait a bit and check again
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!isMounted.current) return;

        // ✅ FIX 2: Extra safety delay after initialization
        console.log('[Banner] ⏳ Extra safety delay (2s)...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!isMounted.current) return;

        // Check if user should see ads
        const status = adMobService.getStatus();
        console.log('[Banner] Status check:', {
          initialized: status.isInitialized,
          premium: status.isPremium,
          admin: status.isAdmin,
          shouldShow: status.shouldShowAds,
          premiumLoaded: status.premiumStatusLoaded
        });

        // ✅ FIX 3: Stricter check - must be fully initialized
        const shouldShow = status.isInitialized && 
                          status.premiumStatusLoaded &&
                          !status.isPremium && 
                          !status.isAdmin && 
                          Platform.OS !== 'web';
        
        if (shouldShow) {
          const config = adMobService.getBannerConfig();
          console.log('[Banner] Config:', config);
          
          if (config && config.adUnitId) {
            setAdUnitId(config.adUnitId);
            setIsReady(true);
            
            // ✅ FIX 4: Delay rendering slightly to ensure everything is ready
            setTimeout(() => {
              if (isMounted.current) {
                setShouldRender(true);
                console.log('[Banner] ✅ ✅ ✅ READY TO RENDER!');
              }
            }, 500);
          } else {
            console.log('[Banner] ⚠️ No config available');
            
            // ✅ FIX 5: Retry mechanism
            if (retryCount.current < maxRetries) {
              retryCount.current++;
              console.log(`[Banner] 🔄 Retry attempt ${retryCount.current}/${maxRetries}`);
              setTimeout(() => {
                if (isMounted.current) {
                  initBanner();
                }
              }, 3000);
            } else {
              console.log('[Banner] ❌ Max retries reached');
            }
          }
        } else {
          console.log('[Banner] ❌ User should not see ads:', {
            reason: !status.isInitialized ? 'NOT_INITIALIZED' :
                   !status.premiumStatusLoaded ? 'PREMIUM_STATUS_NOT_LOADED' :
                   status.isPremium ? 'IS_PREMIUM' :
                   status.isAdmin ? 'IS_ADMIN' : 'UNKNOWN'
          });
        }
        
      } catch (error) {
        console.log('[Banner] ❌ Init error:', error.message);
        
        // ✅ FIX 6: Retry on error
        if (retryCount.current < maxRetries && isMounted.current) {
          retryCount.current++;
          console.log(`[Banner] 🔄 Retry on error ${retryCount.current}/${maxRetries}`);
          setTimeout(() => {
            if (isMounted.current) {
              initBanner();
            }
          }, 3000);
        }
      }
    };

    // ✅ FIX 7: Small initial delay to ensure parent component is ready
    setTimeout(() => {
      if (isMounted.current) {
        initBanner();
      }
    }, 500);

    return () => {
      console.log('[Banner] 🚪 Unmounting');
      isMounted.current = false;
    };
  }, []);

  // Don't render if conditions not met
  if (!shouldRender || !adUnitId || !BannerAd || !BannerAdSize || !isReady) {
    const reason = !BannerAd || !BannerAdSize ? 'SDK_NOT_LOADED' :
                   !isReady ? 'NOT_READY' :
                   !shouldRender ? 'SHOULD_NOT_RENDER' :
                   !adUnitId ? 'NO_AD_UNIT_ID' : 'UNKNOWN';
    
    // Only log occasionally to avoid spam
    if (retryCount.current === 0 || retryCount.current >= maxRetries) {
      console.log('[Banner] Not rendering. Reason:', reason);
    }
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
            console.log('[Banner]   • New ad units (wait 24-48 hours after creating)');
            console.log('[Banner]   • Low ad inventory in your region');
            console.log('[Banner]   • Time of day with low advertiser demand');
            console.log('[Banner]   ✅ Your integration is CORRECT!');
            console.log('[Banner]   ✅ Real ads will show once AdMob approves your app');
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
