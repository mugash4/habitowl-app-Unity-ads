import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FLOATING_TAB_BAR_HEIGHT = 72;
const FLOATING_TAB_BAR_MARGIN = 16;

export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const systemNavHeight = insets.bottom || 0;
    const totalHeight = FLOATING_TAB_BAR_HEIGHT + systemNavHeight + (FLOATING_TAB_BAR_MARGIN * 2);

    return {
      totalHeight,
      tabBarHeight: FLOATING_TAB_BAR_HEIGHT,
      bannerHeight: 0,
      systemNavHeight,
      showBanner: false,
    };
  }, [insets.bottom]);
};
