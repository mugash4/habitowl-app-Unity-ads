/**
 * Google AdMob Configuration
 * ✅ Production-ready configuration
 */

import { Platform } from 'react-native';

export const ADMOB_CONFIG = {
  // ==========================================
  // AD UNIT IDs - REPLACE WITH YOUR REAL IDS
  // ==========================================
  AD_UNIT_IDS: {
    // ANDROID Ad Unit IDs
    ANDROID: {
      BANNER: 'ca-app-pub-2371616866592450/1677929899',
      INTERSTITIAL: 'ca-app-pub-2371616866592450/8051766556',
      REWARDED: 'ca-app-pub-2371616866592450/9388898951',
    },
    // iOS Ad Unit IDs
    IOS: {
      BANNER: 'ca-app-pub-2371616866592450/1677929899',
      INTERSTITIAL: 'ca-app-pub-2371616866592450/8051766556',
      REWARDED: 'ca-app-pub-2371616866592450/9388898951',
    }
  },

  // ==========================================
  // AD BEHAVIOR SETTINGS
  // ==========================================
  
  // Cooldown between interstitial ads (milliseconds)
  INTERSTITIAL_COOLDOWN: 30000, // 30 seconds
  
  // Max interstitials per session
  MAX_INTERSTITIALS_PER_SESSION: 5,
  
  // Debug mode - set to false in production
  DEBUG_MODE: true, // ✅ Keep true to see logs
  
  // Auto-load ads after initialization
  AUTO_LOAD_ADS: true,

  // ==========================================
  // REQUEST CONFIGURATION
  // ==========================================
  
  // Ad request configuration
  getRequestOptions: () => ({
    requestNonPersonalizedAdsOnly: false,
  }),
};

/**
 * Get the correct Ad Unit ID for current platform
 */
export const getAdUnitId = (adType) => {
  const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  const adUnitId = ADMOB_CONFIG.AD_UNIT_IDS[platform][adType];
  
  console.log(`[AdMob Config] Getting ${adType} ad unit for ${platform}:`, adUnitId);
  
  return adUnitId;
};

export default ADMOB_CONFIG;
