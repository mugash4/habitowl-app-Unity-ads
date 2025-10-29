/**
 * Google AdMob Configuration
 * 
 * 🔧 SETUP INSTRUCTIONS:
 * 1. Go to: https://apps.admob.com/
 * 2. Create an app for your platform (Android/iOS)
 * 3. Create ad units for: Banner, Interstitial, Rewarded
 * 4. Replace the TEST IDs below with your REAL Ad Unit IDs
 */

import { Platform } from 'react-native';

export const ADMOB_CONFIG = {
  // ==========================================
  // AD UNIT IDs
  // ==========================================
  // 🔧 REPLACE THESE WITH YOUR REAL AD UNIT IDs FROM ADMOB DASHBOARD
  AD_UNIT_IDS: {
    // ANDROID Ad Unit IDs
    ANDROID: {
      BANNER: 'ca-app-pub-2371616866592450/1677929899',        // TEST ID - Replace with yours
      INTERSTITIAL: 'ca-app-pub-2371616866592450/8051766556',  // TEST ID - Replace with yours
      REWARDED: 'ca-app-pub-2371616866592450/9388898951',      // TEST ID - Replace with yours
    },
    // iOS Ad Unit IDs
    IOS: {
      BANNER: 'ca-app-pub-2371616866592450/1677929899',        // TEST ID - Replace with yours
      INTERSTITIAL: 'ca-app-pub-2371616866592450/8051766556',  // TEST ID - Replace with yours
      REWARDED: 'ca-app-pub-2371616866592450/9388898951',      // TEST ID - Replace with yours
    }
  },

  // ==========================================
  // AD BEHAVIOR SETTINGS
  // ==========================================
  
  // Cooldown between interstitial ads (milliseconds)
  INTERSTITIAL_COOLDOWN: 30000, // 30 seconds
  
  // Max interstitials per session
  MAX_INTERSTITIALS_PER_SESSION: 5,
  
  // Enable verbose logging (helpful for debugging)
  DEBUG_MODE: true,
  
  // Auto-load ads after initialization
  AUTO_LOAD_ADS: true,

  // ==========================================
  // REQUEST CONFIGURATION
  // ==========================================
  
  // Ad request configuration (for GDPR, targeting, etc.)
  getRequestOptions: () => ({
    requestNonPersonalizedAdsOnly: false,
    // Add more options as needed for GDPR compliance
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
