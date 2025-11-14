/**
 * Google AdMob Configuration
 * ✅ Production-ready configuration
 */

import { Platform } from 'react-native';

export const ADMOB_CONFIG = {
  // ==========================================
  // AD UNIT IDs
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
  
  // ✅ PRODUCTION: Set to false to hide console logs
  DEBUG_MODE: __DEV__, // Automatically false in production builds
  
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
  return ADMOB_CONFIG.AD_UNIT_IDS[platform][adType];
};

export default ADMOB_CONFIG;
