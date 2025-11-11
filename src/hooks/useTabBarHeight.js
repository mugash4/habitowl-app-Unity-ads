import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdMobService from '../services/AdMobService';

const TAB_ICONS_HEIGHT = 60; // Tab icons + labels
const BANNER_HEIGHT = 50; // Standard AdMob banner

/**
 * ✅ FIXED: Custom hook to calculate dynamic tab bar height
 * Tab bar includes banner ad space for free users
 * Tab bar shrinks (no banner) for admin/premium users
 */
export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    console.log('[useTabBarHeight] 🎬 Initializing hook');
    
    // ✅ Subscribe to status changes
    const unsubscribe = AdMobService.onStatusChange((status) => {
      console.log('[useTabBarHeight] 📢 Status update:', status);
      
      // Show banner only when all conditions are met
      const shouldShow = status.shouldShowAds && 
                        status.isInitialized && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        status.premiumStatusLoaded &&
                        Platform.OS !== 'web';
      
      console.log(`[useTabBarHeight] Setting showBanner = ${shouldShow}`);
      setShowBanner(shouldShow);
    });

    // Initial check with retries
    const checkInitial = () => {
      const shouldShow = AdMobService.shouldShowAds() && Platform.OS !== 'web';
      console.log(`[useTabBarHeight] Initial check: ${shouldShow}`);
      setShowBanner(shouldShow);
    };

    checkInitial();
    
    // Retry checks to catch late initialization
    const timeout1 = setTimeout(checkInitial, 500);
    const timeout2 = setTimeout(checkInitial, 1500);
    const timeout3 = setTimeout(checkInitial, 3000);

    return () => {
      console.log('[useTabBarHeight] 🚪 Cleaning up');
      unsubscribe();
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  const systemNavHeight = insets.bottom || 0;
  const bannerSpace = showBanner ? BANNER_HEIGHT : 0;
  const totalHeight = TAB_ICONS_HEIGHT + bannerSpace + systemNavHeight;

  console.log(`[useTabBarHeight] 📐 Calculated - Total: ${totalHeight}px, Banner: ${bannerSpace}px, System: ${systemNavHeight}px`);

  return {
    totalHeight,              // Total space: tabs + banner (if showing) + system nav
    tabBarHeight: TAB_ICONS_HEIGHT,
    bannerHeight: bannerSpace,
    systemNavHeight,
    showBanner,
  };
};
