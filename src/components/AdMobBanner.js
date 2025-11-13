/**
 * ✅ FIXED: AdMob Banner Component - Displays correctly for free users
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
  console.log('[Banner] ✅ AdMob SDK components loaded');
} catch (error) {
  console.log('[Banner] ℹ️ AdMob SDK not available (requires EAS build)');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShowBanner, setShouldShowBanner] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    // Early exit for web or no SDK
    if (Platform.OS === 'web' || !BannerAd || !BannerAdSize) {
      console.log('[Banner] ℹ️ Skipping banner (web or no SDK)');
      return;
    }

    // ✅ FIX: Wait for initialization, THEN decide to show banner
    const initAndSubscribe = async () => {
      try {
        // Wait for AdMobService to fully initialize
        await adMobService.waitForInitialization();
        
        if (!isMounted.current) return;

        // Now get the status (it's guaranteed to be loaded)
        const status = adMobService.getStatus();
        
        console.log('[Banner] 📊 Status after init:', {
          loaded: status.premiumStatusLoaded,
          premium: status.isPremium,
          admin: status.isAdmin
        });
        
        const shouldShow = !status.isPremium && !status.isAdmin;
        console.log('[Banner] 🎯 Decision:', shouldShow ? 'SHOW' : 'HIDE');
        
        if (isMounted.current) {
          setShouldShowBanner(shouldShow);
          setIsReady(true);
          
          if (shouldShow) {
            const config = adMobService.getBannerConfig();
            if (config) {
              setAdUnitId(config.adUnitId);
              console.log('[Banner] ✅ Banner configured with ad unit:', config.adUnitId);
            }
          }
        }

        // Subscribe to future status changes
        const unsubscribe = adMobService.onStatusChange((newStatus) => {
          if (!isMounted.current) return;
          
          console.log('[Banner] 📢 Status update:', {
            loaded: newStatus.premiumStatusLoaded,
            premium: newStatus.isPremium,
            admin: newStatus.isAdmin
          });
          
          const shouldShow = newStatus.premiumStatusLoaded && 
                            !newStatus.isPremium && 
                            !newStatus.isAdmin;
          
          console.log('[Banner] 🎯 Update decision:', shouldShow ? 'SHOW' : 'HIDE');
          setShouldShowBanner(shouldShow);
          setIsReady(true);
          
          if (shouldShow) {
            const config = adMobService.getBannerConfig();
            if (config) setAdUnitId(config.adUnitId);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.log('[Banner] ❌ Error during init:', error);
        if (isMounted.current) {
          setIsReady(true);
          setShouldShowBanner(false);
        }
      }
    };

    const unsubscribePromise = initAndSubscribe();

    return () => {
      console.log('[Banner] 🚪 Component unmounting');
      isMounted.current = false;
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
        {/* Empty placeholder while loading */}
      </View>
    );
  }

  // Premium/Admin user - NO BANNER
  if (!shouldShowBanner) {
    console.log('[Banner] 👑 Premium/Admin - no banner');
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
            console.log('[Banner] ❌ Ad failed:', error.code, error.message);
          }}
          onAdOpened={() => {
            console.log('[Banner] 👆 Ad clicked');
            adMobService.trackAdImpression('banner', 'click');
          }}
        />
      </View>
    );
  }

  // Fallback
  console.log('[Banner] ⚠️ Fallback - no banner shown');
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
});

export default AdMobBanner;
