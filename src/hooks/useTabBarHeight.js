import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdMobService from '../services/AdMobService';

const TAB_BAR_HEIGHT = 60;
const BANNER_HEIGHT = 60;

/**
 * Custom hook to calculate dynamic tab bar height
 * Returns total height including banner when visible
 */
export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Initial check
    const shouldShow = AdMobService.shouldShowAds();
    setShowBanner(shouldShow);

    // Subscribe to changes
    const unsubscribe = AdMobService.onPremiumStatusChange((isPremiumOrAdmin) => {
      const shouldShow = !isPremiumOrAdmin && AdMobService.isInitialized;
      setShowBanner(shouldShow);
    });

    return unsubscribe;
  }, []);

  const systemNavHeight = insets.bottom || 0;
  const bannerSpace = showBanner ? BANNER_HEIGHT : 0;
  const totalHeight = TAB_BAR_HEIGHT + bannerSpace + systemNavHeight;

  return {
    totalHeight,
    tabBarHeight: TAB_BAR_HEIGHT,
    bannerHeight: bannerSpace,
    systemNavHeight,
    showBanner,
  };
};
