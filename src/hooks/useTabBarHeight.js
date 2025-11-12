import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdMobService from '../services/AdMobService';

const TAB_ICONS_HEIGHT = 60; // Tab icons + labels
const BANNER_HEIGHT = 50; // Standard AdMob banner

/**
 * ✅ COMPLETELY FIXED: Dynamic tab bar height calculation
 * Tab bar shrinks (no banner space) for admin/premium users
 * Tab bar expands (includes banner space) for free users
 */
export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    console.log('[useTabBarHeight] 🎬 Hook initialized');
    let isMounted = true;
    
    const evaluateBannerDisplay = () => {
      if (!isMounted) return;
      
      if (Platform.OS === 'web') {
        setShowBanner(false);
        return;
      }
      
      const status = AdMobService.getStatus();
      console.log('[useTabBarHeight] 📊 Status check:', {
        isPremium: status.isPremium,
        isAdmin: status.isAdmin,
        shouldShowAds: status.shouldShowAds,
        isInitialized: status.isInitialized,
        premiumStatusLoaded: status.premiumStatusLoaded
      });
      
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
    
    // Subscribe to status changes
    const unsubscribe = AdMobService.onStatusChange((status) => {
      if (isMounted) {
        console.log('[useTabBarHeight] 📢 Status update received');
        evaluateBannerDisplay();
      }
    });

    // Multiple delayed checks to catch late initialization
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
  
  // ✅ CRITICAL FIX: Only allocate banner space when banner WILL show (free users)
  const bannerSpace = showBanner ? BANNER_HEIGHT : 0;
  const totalHeight = TAB_ICONS_HEIGHT + bannerSpace + systemNavHeight;

  console.log(`[useTabBarHeight] 📐 Heights - Total: ${totalHeight}px, Banner: ${bannerSpace}px, System: ${systemNavHeight}px, ShowBanner: ${showBanner}`);

  return {
    totalHeight,              // Total space: tabs + banner (if showing) + system nav
    tabBarHeight: TAB_ICONS_HEIGHT,
    bannerHeight: bannerSpace, // 0 for premium/admin, 50 for free users
    systemNavHeight,
    showBanner,               // false for premium/admin, true for free users (if initialized)
  };
};
