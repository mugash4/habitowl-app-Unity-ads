/**
 * Unity Ads Configuration - COMPLETE FIX
 * 
 * ✅ FIXED ISSUES:
 * - Uses Unity's default placement naming
 * - Proper test mode configuration
 * - Better error messages
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
  // AD PLACEMENT IDs - FIXED!
  // ==========================================
  // Unity Ads has DEFAULT placements that work automatically.
  // We'll try both default and custom names for maximum compatibility.
  
  // Android Placements
  // Try these in order: default placement → custom name
  ANDROID_BANNER: 'DefaultBanner',           // Unity's default banner placement
  ANDROID_INTERSTITIAL: 'DefaultInterstitial', // Unity's default interstitial
  ANDROID_REWARDED: 'DefaultRewarded',       // Unity's default rewarded video
  
  // iOS Placements  
  IOS_BANNER: 'DefaultBanner',
  IOS_INTERSTITIAL: 'DefaultInterstitial',
  IOS_REWARDED: 'DefaultRewarded',
  
  // ==========================================
  // FALLBACK PLACEMENT IDs
  // ==========================================
  // If default placements don't work, try these custom names
  // You can create these in Unity Dashboard → Monetization → Ad Units
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
  // Turn OFF before publishing to app stores!
  FORCE_TEST_MODE: true, // 🔧 Set to false for production!
};

export default UNITY_ADS_CONFIG;