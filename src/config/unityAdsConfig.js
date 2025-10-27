/**
 * Unity Ads Configuration - COMPLETE FIX FOR FREE PLAN
 * 
 * ✅ FIXED ISSUES:
 * - Uses Unity's default placement naming that works on free plan
 * - Proper test mode configuration
 * - Better documentation
 * 
 * 🎮 YOUR GAME IDs: 5966553 (Android), 5966552 (iOS)
 * 
 * ⚠️ IMPORTANT: Unity Ads Free Plan Limitations
 * - Default placements (DefaultBanner, DefaultInterstitial, DefaultRewarded) work automatically
 * - Custom placement names require paid plan
 * - Test mode should be enabled during development
 */

export const UNITY_ADS_CONFIG = {
  // ==========================================
  // GAME IDs (✅ These are correct!)
  // ==========================================
  ANDROID_GAME_ID: '5966553',
  IOS_GAME_ID: '5966552',
  
  // ==========================================
  // AD PLACEMENT IDs - FIXED FOR FREE PLAN!
  // ==========================================
  // Unity Ads FREE PLAN only supports DEFAULT placements
  // These work automatically without any dashboard configuration
  
  // Android Placements (Default names - no custom setup needed)
  ANDROID_BANNER: 'DefaultBanner',
  ANDROID_INTERSTITIAL: 'DefaultInterstitial',
  ANDROID_REWARDED: 'DefaultRewarded',
  
  // iOS Placements (Default names - no custom setup needed)
  IOS_BANNER: 'DefaultBanner',
  IOS_INTERSTITIAL: 'DefaultInterstitial',
  IOS_REWARDED: 'DefaultRewarded',
  
  // ==========================================
  // FALLBACK PLACEMENT IDs
  // ==========================================
  // These will be tried if defaults fail (paid plan only)
  // You can ignore these if you're on free plan
  ANDROID_BANNER_FALLBACK: 'Banner_Android',
  ANDROID_INTERSTITIAL_FALLBACK: 'Interstitial_Android',
  ANDROID_REWARDED_FALLBACK: 'Rewarded_Android',
  
  IOS_BANNER_FALLBACK: 'Banner_iOS',
  IOS_INTERSTITIAL_FALLBACK: 'Interstitial_iOS',
  IOS_REWARDED_FALLBACK: 'Rewarded_iOS',
  
  // ==========================================
  // AD BEHAVIOR SETTINGS
  // ==========================================
  
  // Cooldown between interstitial ads (milliseconds)
  INTERSTITIAL_COOLDOWN: 30000, // 30 seconds
  
  // Max interstitials per session
  MAX_INTERSTITIALS_PER_SESSION: 5,
  
  // Enable test ads in development
  ENABLE_TEST_ADS_IN_DEV: true,
  
  // Enable verbose logging (helpful for debugging)
  DEBUG_MODE: true,
  
  // ==========================================
  // TEST MODE CONFIGURATION
  // ==========================================
  // When true, shows test ads even in production builds
  // 
  // ⚠️ IMPORTANT: Set to TRUE during development to see test ads
  // ⚠️ IMPORTANT: Set to FALSE before publishing to app stores!
  // 
  // Free plan users: Keep this TRUE until you're ready to publish
  // This ensures you can test ads without needing real ad inventory
  FORCE_TEST_MODE: true, // 🔧 Set to false for production!
};

export default UNITY_ADS_CONFIG;