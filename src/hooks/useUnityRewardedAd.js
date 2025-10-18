/**
 * Unity Rewarded Ad Hook
 * Use this hook to show rewarded video ads
 */

import { useEffect, useCallback, useState } from 'react';
import unityAdsService from '../services/UnityAdsService';

/**
 * Hook for managing rewarded ads
 * 
 * Usage:
 * const { showRewardedAd, isReady } = useUnityRewardedAd((reward) => {
 *   console.log('User earned reward:', reward);
 *   // Give user their reward
 * });
 * 
 * // Show ad
 * if (isReady) {
 *   showRewardedAd();
 * }
 */
export const useUnityRewardedAd = (onReward = null) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check ad ready status periodically
    const interval = setInterval(() => {
      const ready = unityAdsService.isRewardedAdReady();
      setIsReady(ready);
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const showRewardedAd = useCallback(async () => {
    try {
      const shown = await unityAdsService.showRewardedAd(onReward);
      return shown;
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      return false;
    }
  }, [onReward]);

  const checkAdReady = useCallback(() => {
    return unityAdsService.isRewardedAdReady();
  }, []);

  return {
    showRewardedAd,
    isReady,
    checkAdReady,
    isInitialized: unityAdsService.getInitializationStatus()
  };
};

export default useUnityRewardedAd;
