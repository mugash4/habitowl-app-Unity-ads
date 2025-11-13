import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdMobService from '../services/AdMobService';

const TAB_ICONS_HEIGHT = 60; // Tab icons + labels
const BANNER_HEIGHT = 50; // Standard AdMob banner

/**
 * ✅ Dynamic tab bar height calculation
 * Returns different heights based on user type:
 * - Free users: tabs + banner + system nav
 * - Premium/Admin users: tabs + system nav (no banner)
 */
export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    console.log('[useTabBarHeight] 🎬 Hook initialized');
    let isMounted = true;
    
    const evaluateBannerDisplay = () => {
      if (!isMounted) return;
      
      // Web platform - no banner
      if (Platform.OS === 'web') {
        setShowBanner(false);
        return;
      }
      
      const status = AdMobService.getStatus();
      console.log('[useTabBarHeight] 📊 Status:', {
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        shouldShowAds: status.shouldShowAds,
        premiumStatusLoaded: status.premiumStatusLoaded
      });
      
      // ✅ Show banner ONLY if: free user + status loaded + AdMob ready
      const shouldShow = !status.isPremium && 
                        !status.isAdmin && 
                        status.premiumStatusLoaded;
      
      console.log(`[useTabBarHeight] Setting showBanner = ${shouldShow}`);
      setShowBanner(shouldShow);
    };
    
    // Initial check
    evaluateBannerDisplay();
    
    // Subscribe to status changes
    const unsubscribe = AdMobService.onStatusChange(() => {
      if (isMounted) {
        console.log('[useTabBarHeight] 📢 Status update');
        evaluateBannerDisplay();
      }
    });

    // Periodic checks for first 3 seconds
    const timeouts = [100, 300, 500, 1000, 2000, 3000].map(delay =>
      setTimeout(() => {
        if (isMounted) evaluateBannerDisplay();
      }, delay)
    );

    return () => {
      console.log('[useTabBarHeight] 🚪 Hook cleanup');
      isMounted = false;
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const systemNavHeight = insets.bottom || 0;
  
  // ✅ Allocate banner space only for free users
  const bannerSpace = showBanner ? BANNER_HEIGHT : 0;
  const totalHeight = TAB_ICONS_HEIGHT + bannerSpace + systemNavHeight;

  console.log(`[useTabBarHeight] 📐 Total: ${totalHeight}px (tabs: ${TAB_ICONS_HEIGHT}, banner: ${bannerSpace}, system: ${systemNavHeight})`);

  return {
    totalHeight,              // Total space needed
    tabBarHeight: TAB_ICONS_HEIGHT,
    bannerHeight: bannerSpace,
    systemNavHeight,
    showBanner,
  };
};
