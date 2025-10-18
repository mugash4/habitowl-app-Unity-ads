/**
 * Unity Interstitial Ad Hook
 * Use this hook to show full-screen interstitial ads
 */

import { useEffect, useCallback } from 'react';
import unityAdsService from '../services/UnityAdsService';

/**
 * Hook for managing interstitial ads
 * 
 * Usage:
 * const { showInterstitialAd, isReady } = useUnityInterstitialAd();
 * 
 * // Show ad
 * showInterstitialAd('habit_completion');
 */
export const useUnityInterstitialAd = () => {
  const showInterstitialAd = useCallback(async (context = 'general') => {
    try {
      const shown = await unityAdsService.showInterstitialAd(context);
      return shown;
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      return false;
    }
  }, []);

  const isReady = useCallback(() => {
    return unityAdsService.isInitialized && unityAdsService.interstitialLoaded;
  }, []);

  return {
    showInterstitialAd,
    isReady: isReady(),
    isInitialized: unityAdsService.getInitializationStatus()
  };
};

export default useUnityInterstitialAd;
