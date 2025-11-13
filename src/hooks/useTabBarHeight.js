/**
 * ✅ NO FLICKER FIX: useTabBarHeight Hook
 * Calculates height ONCE - no periodic rechecks
 * Premium status is ready before this runs
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdMobService from '../services/AdMobService';

const TAB_ICONS_HEIGHT = 60; // Tab icons + labels
const BANNER_HEIGHT = 50; // Standard AdMob banner

export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  
  // ✅ INSTANT EVALUATION - status is already loaded
  const [showBanner, setShowBanner] = useState(() => {
    if (Platform.OS === 'web') return false;
    
    const status = AdMobService.getStatus();
    const shouldShow = status.premiumStatusLoaded && 
                      !status.isPremium && 
                      !status.isAdmin;
    
    console.log('[useTabBarHeight] 🎬 Initial:', shouldShow ? 'WITH banner' : 'NO banner');
    return shouldShow;
  });

  useEffect(() => {
    let isMounted = true;
    
    // Subscribe to status changes (for upgrades/downgrades)
    const unsubscribe = AdMobService.onStatusChange((status) => {
      if (!isMounted) return;
      
      const shouldShow = status.premiumStatusLoaded && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        Platform.OS !== 'web';
      
      // Only update if actually changed
      setShowBanner(prev => {
        if (prev !== shouldShow) {
          console.log('[useTabBarHeight] 📢 Update:', shouldShow ? 'WITH banner' : 'NO banner');
          return shouldShow;
        }
        return prev;
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const systemNavHeight = insets.bottom || 0;
  const bannerSpace = showBanner ? BANNER_HEIGHT : 0;
  const totalHeight = TAB_ICONS_HEIGHT + bannerSpace + systemNavHeight;

  return {
    totalHeight,
    tabBarHeight: TAB_ICONS_HEIGHT,
    bannerHeight: bannerSpace,
    systemNavHeight,
    showBanner,
  };
};
