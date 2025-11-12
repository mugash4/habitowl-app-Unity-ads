import { useState, useEffect } from 'react';
import { Platform } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdMobService from '../services/AdMobService';

const TAB_ICONS_HEIGHT = 60; // Tab icons + labels
const BANNER_HEIGHT = 50; // Standard AdMob banner

/**
 * ✅ FIXED: Custom hook to calculate dynamic tab bar height
 * Tab bar includes banner ad space ONLY when banner will actually render
 * Tab bar shrinks (no banner) for admin/premium users
 */
export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    console.log('[useTabBarHeight] 🎬 Initializing hook');
    
    const evaluateBannerDisplay = () => {
      if (Platform.OS === 'web') {
        setShowBanner(false);
        return;
      }
      
      const status = AdMobService.getStatus();
      console.log('[useTabBarHeight] 📊 Status check:', status);
      
      // ✅ CRITICAL: All conditions must be true for banner to show
      const shouldShow = status.shouldShowAds && 
                        status.isInitialized && 
                        !status.isPremium && 
                        !status.isAdmin &&
                        status.premiumStatusLoaded;
      
      console.log(`[useTabBarHeight] Setting showBanner = ${shouldShow}`);
      setShowBanner(shouldShow);
    };
    
    // Initial check
    evaluateBannerDisplay();
    
    // ✅ Subscribe to status changes
    const unsubscribe = AdMobService.onStatusChange((status) => {
      console.log('[useTabBarHeight] 📢 Status update:', status);
      evaluateBannerDisplay();
    });

    // Retry checks to catch late initialization
    const timeout1 = setTimeout(evaluateBannerDisplay, 300);
    const timeout2 = setTimeout(evaluateBannerDisplay, 1000);
    const timeout3 = setTimeout(evaluateBannerDisplay, 2000);

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

  console.log(`[useTabBarHeight] 📐 Calculated - Total: ${totalHeight}px, Banner: ${bannerSpace}px, System: ${systemNavHeight}px, Show: ${showBanner}`);

  return {
    totalHeight,              // Total space: tabs + banner (if showing) + system nav
    tabBarHeight: TAB_ICONS_HEIGHT,
    bannerHeight: bannerSpace,
    systemNavHeight,
    showBanner,
  };
};
