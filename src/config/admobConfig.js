/**
 * ✅ ENHANCED: Google AdMob Configuration
 * 
 * Improvements:
 * 1. Added TEST_MODE flag for easier debugging
 * 2. Automatic test ad unit detection
 * 3. Better documentation
 * 4. Device ID registration helper
 */

import { Platform } from 'react-native';

// ==========================================
// TEST MODE CONFIGURATION
// ==========================================
// ✅ Set to true to use TEST ad units (always shows ads)
// ✅ Set to false to use REAL ad units (your actual ads)
const TEST_MODE = __DEV__; // Automatically use test ads in development

// Test Ad Unit IDs (these always work and show test ads)
const TEST_AD_UNITS = {
  BANNER: Platform.OS === 'ios' 
    ? 'ca-app-pub-3940256099942544/2934735716'  // iOS test banner
    : 'ca-app-pub-3940256099942544/6300978111', // Android test banner
  INTERSTITIAL: Platform.OS === 'ios'
    ? 'ca-app-pub-3940256099942544/4411468910'  // iOS test interstitial
    : 'ca-app-pub-3940256099942544/1033173712', // Android test interstitial
  REWARDED: Platform.OS === 'ios'
    ? 'ca-app-pub-3940256099942544/1712485313'  // iOS test rewarded
    : 'ca-app-pub-3940256099942544/5224354917', // Android test rewarded
};

export const ADMOB_CONFIG = {
  // ==========================================
  // YOUR REAL AD UNIT IDs
  // ==========================================
  // 🔧 Replace these with your REAL Ad Unit IDs from AdMob Dashboard
  // Get them here: https://apps.admob.com/
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
  // TEST MODE
  // ==========================================
  TEST_MODE,
  TEST_AD_UNITS,

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
    // ✅ Add your test device IDs here to use real ad units in testing
    // Find your device ID in logs: Look for "Use RequestConfiguration.Builder().setTestDeviceIds()"
    // testDeviceIds: ['YOUR_DEVICE_ID_HERE'],
  }),
};

/**
 * ✅ ENHANCED: Get the correct Ad Unit ID for current platform
 * Automatically switches between test and real ad units based on TEST_MODE
 */
export const getAdUnitId = (adType) => {
  // Use test ads in TEST_MODE
  if (TEST_MODE && TEST_AD_UNITS[adType]) {
    console.log(`[AdMob] 🧪 Using TEST ad unit for ${adType}`);
    return TEST_AD_UNITS[adType];
  }
  
  // Use real ads in production
  const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  const adUnitId = ADMOB_CONFIG.AD_UNIT_IDS[platform][adType];
  console.log(`[AdMob] 📱 Using REAL ad unit for ${adType}`);
  return adUnitId;
};

/**
 * ✅ NEW: Helper to log test device setup instructions
 */
export const logTestDeviceInstructions = () => {
  if (!TEST_MODE) return;
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST MODE ENABLED');
  console.log('='.repeat(60));
  console.log('Using TEST ad units - you will see Google test ads');
  console.log('');
  console.log('To test with REAL ad units on your device:');
  console.log('1. Look for this log message when ads load:');
  console.log('   "Use RequestConfiguration.Builder().setTestDeviceIds()"');
  console.log('2. Copy your device ID from that message');
  console.log('3. Add it to admobConfig.js in getRequestOptions():');
  console.log('   testDeviceIds: ["YOUR_DEVICE_ID"]');
  console.log('4. Set TEST_MODE = false');
  console.log('='.repeat(60) + '\n');
};

export default ADMOB_CONFIG;