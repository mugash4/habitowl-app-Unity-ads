/**
 * Unity Ads Configuration - FIXED FOR FREE PLAN
 * 
 * ✅ STEP 1: Get your Ad Unit IDs from Unity LevelPlay Dashboard:
 *    - Go to: https://dashboard.unity3d.com/
 *    - Navigate to: Monetization → Ad Units
 *    - Copy the Ad Unit ID for each ad type (Interstitial, Rewarded, Banner)
 * 
 * 🎮 YOUR GAME IDs: 5966553 (Android), 5966552 (iOS)
 */

export const UNITY_ADS_CONFIG = {
  // ==========================================
  // GAME IDs (✅ These are correct!)
  // ==========================================
  ANDROID_GAME_ID: '5966553',
  IOS_GAME_ID: '5966552',
  
  // ==========================================
  // AD UNIT IDs (🔧 YOU MUST UPDATE THESE!)
  // ==========================================
  // Go to Unity Dashboard → Monetization → Ad Units
  // Replace these with your actual Ad Unit IDs from the dashboard
  AD_UNIT_IDS: {
    // Example formats:
    // INTERSTITIAL: 'Interstitial_Android' or 'DefaultInterstitial'
    // REWARDED: 'Rewarded_Android' or 'DefaultRewarded' 
    // BANNER: 'Banner_Android' or 'DefaultBanner'
    
    INTERSTITIAL: 'Interstitial_Android',  // 🔧 REPLACE with your Ad Unit ID
    REWARDED: 'Rewarded_Android',          // 🔧 REPLACE with your Ad Unit ID
    BANNER: 'Banner_Android',              // 🔧 REPLACE with your Ad Unit ID
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
  
  // ==========================================
  // TEST MODE CONFIGURATION
  // ==========================================
  // ⚠️ CRITICAL: Set to TRUE during development to see test ads
  // ⚠️ Set to FALSE before publishing to app stores!
  // 
  // Free plan users: Keep this TRUE until you're ready to publish
  FORCE_TEST_MODE: true, // 🔧 Set to false for production!
  
  // Auto-load ads after initialization
  AUTO_LOAD_ADS: true,
};

export default UNITY_ADS_CONFIG;
